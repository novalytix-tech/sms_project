import { describe, it, expect, beforeEach } from 'vitest';
import { studentService } from './studentService';
import { ERPStorage } from './storage';

describe('studentService Student Lifecycle Management', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves all seeded students and fetches by ID', () => {
    const students = studentService.getAll();
    expect(students.length).toBeGreaterThan(0);

    const first = students[0];
    const retrieved = studentService.getById(first.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.admissionNo).toBe(first.admissionNo);
  });

  it('filters students by class and section', () => {
    const classStudents = studentService.getByClassAndSection('cls-10a', 'A');
    expect(Array.isArray(classStudents)).toBe(true);
    classStudents.forEach(s => {
      expect(s.classId).toBe('cls-10a');
      expect(s.section.toUpperCase()).toBe('A');
    });
  });

  it('creates a new student and rejects duplicate admission numbers', () => {
    const newStudentData = {
      admissionNo: 'ADM-TEST-999',
      firstName: 'Kabir',
      lastName: 'Khanna',
      fullName: 'Kabir Khanna',
      gender: 'Male' as const,
      dob: '2010-05-15',
      classId: 'cls-10a',
      className: 'Class 10A',
      section: 'A',
      rollNo: '45',
      academicYear: '2026-2027',
      admissionDate: '2026-04-01',
      parentName: 'Sanjay Khanna',
      parentPhone: '+91 98888 12345',
      parentEmail: 'sanjay.khanna@test.com',
      address: 'Civil Lines, Kanpur',
      status: 'active' as const,
      bloodGroup: 'B+',
      category: 'General',
    };

    const res = studentService.create(newStudentData);
    expect(res.success).toBe(true);
    expect(res.data?.id).toBeDefined();
    expect(res.data?.fullName).toBe('Kabir Khanna');

    // Duplicate admission number must be rejected
    const duplicateRes = studentService.create(newStudentData);
    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.error).toContain('already exists');
  });

  it('updates an existing student record and changes status', () => {
    const students = studentService.getAll();
    const target = students[0];

    const updateRes = studentService.update(target.id, {
      rollNo: '99',
      parentPhone: '+91 99999 00000',
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.data?.rollNo).toBe('99');
    expect(updateRes.data?.parentPhone).toBe('+91 99999 00000');

    // Toggle active / inactive status
    const initialStatus = updateRes.data?.status;
    const toggled = studentService.toggleStatus(target.id);
    expect(toggled?.status).not.toBe(initialStatus);
  });

  it('deletes a student record cleanly from storage', () => {
    const students = studentService.getAll();
    const targetId = students[0].id;

    const deleted = studentService.delete(targetId);
    expect(deleted).toBe(true);

    const check = studentService.getById(targetId);
    expect(check).toBeUndefined();
  });
});
