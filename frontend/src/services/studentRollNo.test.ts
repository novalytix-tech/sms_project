import { describe, it, expect, beforeEach } from 'vitest';
import { studentService } from './studentService';
import { ERPStorage } from './storage';

describe('Student Service - Class-Wise Unique Roll Numbers', () => {
  beforeEach(() => {
    ERPStorage.reset();
  });

  it('calculates the next sequential roll number for a class', () => {
    // Class 6-A initially has 5 students (rolls 1 to 5)
    const nextRoll = studentService.getNextRollNo('cls-6a', 'A');
    expect(nextRoll).toBe('6');
  });

  it('prevents duplicate roll numbers within the same class and section', () => {
    // Attempting to add a student with roll '1' in Class 6-A where Aarav Sharma is already roll '1'
    const res = studentService.create({
      admissionNo: 'ADM-TEST-ROLL-01',
      firstName: 'New',
      lastName: 'Learner',
      fullName: 'New Learner',
      gender: 'Male',
      dob: '2015-01-01',
      bloodGroup: 'O+',
      classId: 'cls-6a',
      className: 'Class 6',
      section: 'A',
      rollNo: '1',
      academicYear: '2026-2027',
      admissionDate: '2026-04-01',
      parentName: 'Test Parent',
      parentPhone: '+91 99999 88888',
      parentEmail: 'parent@test.com',
      address: 'Test Address',
      status: 'active',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('already assigned');
    expect(res.error).toContain('unique within each class');
  });

  it('allows the same roll number in a DIFFERENT class', () => {
    // Roll '1' exists in Class 6-A (Vihaan Kapoor) and Class 10-A (Aarav Patel),
    // and should be allowed in another class like Class 6-B or a new class
    const res = studentService.create({
      admissionNo: 'ADM-TEST-ROLL-02',
      firstName: 'Different',
      lastName: 'ClassStudent',
      fullName: 'Different ClassStudent',
      gender: 'Male',
      dob: '2015-01-01',
      bloodGroup: 'O+',
      classId: 'cls-6b',
      className: 'Class 6',
      section: 'B',
      rollNo: '1',
      academicYear: '2026-2027',
      admissionDate: '2026-04-01',
      parentName: 'Test Parent 2',
      parentPhone: '+91 99999 88887',
      parentEmail: 'parent2@test.com',
      address: 'Test Address 2',
      status: 'active',
    });

    expect(res.success).toBe(true);
    expect(res.data?.rollNo).toBe('1');
  });

  it('prevents updating a student to a duplicate roll number in their class', () => {
    // In Class 6-A, stud-601 has roll '1' (Vihaan Kapoor) and stud-602 has roll '2' (Sneha Nambiar).
    // Try updating stud-602's roll to '1' (which is already taken by stud-601 in Class 6-A)
    const res = studentService.update('stud-602', {
      rollNo: '1',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('already assigned to Vihaan Kapoor');
  });
});
