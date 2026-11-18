import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attendanceService } from './attendanceService';
import { httpClient } from './api/httpClient';
import { AttendanceRecord } from '../types';

const rec = (studentId: string, date: string, status: AttendanceRecord['status']): AttendanceRecord => ({
  id: `${studentId}-${date}`,
  studentId,
  classId: 'sec-10a',
  section: 'A',
  date,
  status,
});

describe('attendanceService (server-backed)', () => {
  beforeEach(() => attendanceService.reset());
  afterEach(() => vi.restoreAllMocks());

  it('loads records for a class and date from the API', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({
      success: true,
      data: [rec('s1', '2026-11-18', 'present'), rec('s2', '2026-11-18', 'absent')],
    } as any);
    await attendanceService.load({ classId: 'sec-10a', date: '2026-11-18' });
    expect(get).toHaveBeenCalledWith('/attendance/students?date=2026-11-18&class_id=sec-10a');
    expect(attendanceService.getByClassAndDate('sec-10a', 'A', '2026-11-18')).toHaveLength(2);
    expect(attendanceService.calculateClassTodayPercentage('sec-10a', 'A', '2026-11-18')).toBe(50);
  });

  it('reports an honest zero (not 100%) when nothing is marked', () => {
    const s = attendanceService.calculateStudentPercentage('nobody');
    expect(s.isMarked).toBe(false);
    expect(s.percentage).toBe(0);
  });

  it('counts late as attended in the student percentage', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      success: true,
      data: [rec('s1', '2026-11-16', 'present'), rec('s1', '2026-11-17', 'late'), rec('s1', '2026-11-18', 'absent'), rec('s1', '2026-11-19', 'excused')],
    } as any);
    await attendanceService.load({ studentId: 's1' });
    const s = attendanceService.calculateStudentPercentage('s1');
    expect(s).toMatchObject({ present: 1, late: 1, absent: 1, excused: 1, total: 4, percentage: 50, isMarked: true });
  });

  it('a reload for a class/date replaces stale entries (e.g. an unmarked student)', async () => {
    const get = vi.spyOn(httpClient, 'get');
    get.mockResolvedValueOnce({ success: true, data: [rec('s1', '2026-11-18', 'present'), rec('s2', '2026-11-18', 'late')] } as any);
    await attendanceService.load({ classId: 'sec-10a', date: '2026-11-18' });
    get.mockResolvedValueOnce({ success: true, data: [rec('s1', '2026-11-18', 'present')] } as any);
    await attendanceService.load({ classId: 'sec-10a', date: '2026-11-18' });
    expect(attendanceService.getByDate('2026-11-18').map(r => r.studentId)).toEqual(['s1']);
  });

  it('saves the roll call on the server and surfaces errors', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({ success: true, data: [] } as any);
    const post = vi.spyOn(httpClient, 'post').mockResolvedValueOnce({ success: true, data: { saved: 1, removed: 0 } } as any);
    const ok = await attendanceService.saveRosterAttendance('sec-10a', '2026-11-18', [{ studentId: 's1', status: 'present' }]);
    expect(post).toHaveBeenCalledWith('/attendance/students/batch', {
      classId: 'sec-10a', date: '2026-11-18', records: [{ studentId: 's1', status: 'present' }],
    });
    expect(ok).toEqual({ success: true, savedCount: 1 });

    post.mockResolvedValueOnce({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'You are not assigned' } } as any);
    const denied = await attendanceService.saveRosterAttendance('sec-9b', '2026-11-18', [{ studentId: 's9', status: 'absent' }]);
    expect(denied).toEqual({ success: false, error: 'You are not assigned' });
  });
});
