import { describe, it, expect, beforeEach } from 'vitest';
import { timetableService } from './timetableService';
import { ERPStorage } from './storage';

describe('timetableService Class Schedule & Collision Detection', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves class timetable by class ID and section', () => {
    const timetable = timetableService.getByClass('cls-10a', 'A');
    expect(Array.isArray(timetable)).toBe(true);
    expect(timetable.length).toBeGreaterThan(0);
  });

  it('detects and blocks teacher schedule collision', () => {
    // In seed data, teach-1 (Mrs. Ananya Sharma) is already scheduled on Monday Period 1
    const collidingSlot = {
      classId: 'cls-9a',
      className: 'Class 9A',
      section: 'A',
      subject: 'General Science',
      teacherId: 'teach-1', // Already booked!
      teacherName: 'Mrs. Ananya Sharma',
      day: 'Monday' as const,
      periodNo: 1, // Same day & period!
      startTime: '08:30',
      endTime: '09:15',
      roomNo: 'Room-204',
    };

    const res = timetableService.createPeriod(collidingSlot);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Teacher Conflict');
  });

  it('warns when a room collision occurs', () => {
    // Room 301 is occupied on Monday Period 1 by Class 10A
    // Different teacher, but SAME room and time
    const slot2 = {
      classId: 'cls-12a',
      className: 'Class 12A',
      section: 'A',
      subject: 'Applied Chemistry',
      teacherId: 'teach-8',
      teacherName: 'Dr. Ramesh Kumar',
      day: 'Monday' as const,
      periodNo: 1,
      startTime: '08:30',
      endTime: '09:15',
      roomNo: 'Room 301',
    };

    const res2 = timetableService.createPeriod(slot2);
    expect(res2.success).toBe(true);
    expect(res2.warning).toContain('Room Warning');
  });
});
