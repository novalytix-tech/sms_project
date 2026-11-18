import { describe, it, expect, beforeEach } from 'vitest';
import { attendanceService } from './attendanceService';
import { ERPStorage } from './storage';

describe('attendanceService Daily Attendance Operations', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves attendance records and filters by class and date', () => {
    const records = attendanceService.getAll();
    expect(Array.isArray(records)).toBe(true);

    const filtered = attendanceService.getByClassAndDate('cls-10a', 'A', '2026-10-21');
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('saves roster attendance for multiple students', () => {
    const testDate = '2026-11-01';
    const batch = [
      {
        studentId: 'stud-1',
        classId: 'cls-10a',
        section: 'A',
        date: testDate,
        status: 'present' as const,
        remarks: 'On time',
      },
      {
        studentId: 'stud-2',
        classId: 'cls-10a',
        section: 'A',
        date: testDate,
        status: 'late' as const,
        remarks: 'School bus delayed',
      },
      {
        studentId: 'stud-3',
        classId: 'cls-10a',
        section: 'A',
        date: testDate,
        status: 'absent' as const,
        remarks: 'Fever',
      },
    ];

    const res = attendanceService.saveRosterAttendance(batch);
    expect(res.success).toBe(true);
    expect(res.savedCount).toBe(3);

    const savedRecords = attendanceService.getByDate(testDate);
    expect(savedRecords.length).toBeGreaterThanOrEqual(3);
    const stud2Record = savedRecords.find(r => r.studentId === 'stud-2');
    expect(stud2Record?.status).toBe('late');
  });

  it('calculates student cumulative attendance percentage and stats', () => {
    const stats = attendanceService.calculateStudentPercentage('stud-1');
    expect(stats).toBeDefined();
    expect(typeof stats.percentage).toBe('number');
    expect(stats.percentage).toBeGreaterThanOrEqual(0);
    expect(stats.percentage).toBeLessThanOrEqual(100);
    expect(typeof stats.total).toBe('number');
  });
});

