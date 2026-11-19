import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { examService } from './examService';
import { httpClient } from './api/httpClient';
import { Examination, ExamMark } from '../types';

const exam: Examination = {
  id: 'ex-1',
  title: 'Mid-Term',
  examType: 'Mid-Term',
  classId: 'sec-10a',
  className: 'Class 10',
  section: 'A',
  academicYear: '2026-2027',
  startDate: '2026-12-01',
  endDate: '2026-12-10',
  status: 'upcoming',
  schedules: [],
};
const mark = (studentId: string, marksObtained: number): ExamMark => ({
  id: `m-${studentId}`, examId: 'ex-1', scheduleId: 'p-1', studentId, marksObtained, isAbsent: false,
});

describe('examService (server-backed)', () => {
  beforeEach(() => {
    examService.reset();
    vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/examinations/exams') return { success: true, data: [exam] } as any;
      if (url.startsWith('/examinations/marks')) return { success: true, data: [mark('s1', 70), mark('s2', 40)] } as any;
      return { success: false, data: null } as any;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('loads exams and marks from the API', async () => {
    await examService.load();
    expect(examService.getAll()).toHaveLength(1);
    expect(examService.getByClass('sec-10a')[0].title).toBe('Mid-Term');
    expect(examService.getMarksForStudent('s1')[0].marksObtained).toBe(70);
  });

  it('saves marks on the server, then refreshes that exam from the server', async () => {
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue({ success: true, data: { count: 1 } } as any);
    const res = await examService.saveMarksBatch('ex-1', 'p-1', [{ studentId: 's1', marksObtained: 70, isAbsent: false }]);
    expect(post).toHaveBeenCalledWith('/examinations/marks/batch', {
      examId: 'ex-1', scheduleId: 'p-1', records: [{ studentId: 's1', marksObtained: 70, isAbsent: false }],
    });
    expect(res).toEqual({ success: true, count: 1 });
    expect(examService.getMarksForExam('ex-1')).toHaveLength(2);
  });

  it('rejects negative marks before calling the server', async () => {
    const post = vi.spyOn(httpClient, 'post');
    const res = await examService.saveMarksBatch('ex-1', 'p-1', [{ studentId: 's1', marksObtained: -1, isAbsent: false }]);
    expect(res.success).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it('reports server refusals (e.g. teacher not assigned) without changing the cache', async () => {
    await examService.load();
    vi.spyOn(httpClient, 'delete').mockResolvedValue({
      success: false, data: null, error: { code: 'CONFLICT', message: 'This exam already has marks recorded' },
    } as any);
    const res = await examService.delete('ex-1');
    expect(res).toEqual({ success: false, error: 'This exam already has marks recorded' });
    expect(examService.getAll()).toHaveLength(1);
  });
});
