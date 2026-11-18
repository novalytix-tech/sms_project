import { describe, it, expect, beforeEach } from 'vitest';
import { ERPStorage } from './storage';

describe('ERPStorage Frontend Local Data Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('initializes store with default seed entities when storage is empty', () => {
    const store = ERPStorage.get();
    expect(store).toBeDefined();
    expect(Array.isArray(store.students)).toBe(true);
    expect(store.students.length).toBeGreaterThan(0);
    expect(Array.isArray(store.teachers)).toBe(true);
    expect(store.teachers.length).toBeGreaterThan(0);
    expect(Array.isArray(store.classes)).toBe(true);
    expect(store.classes.length).toBeGreaterThan(0);
  });

  it('persists data modifications to localStorage and cached state', () => {
    const store = ERPStorage.get();
    const originalCount = store.students.length;

    const newStudent = {
      id: 'stud-unit-test-1',
      admissionNo: 'ADM-2026-999',
      firstName: 'Priya',
      lastName: 'Mukherjee',
      fullName: 'Priya Mukherjee',
      rollNo: 'STX-2026-999',
      className: 'Class 10',
      section: 'A',
      classId: 'cls-10a',
      academicYear: '2026-2027',
      parentName: 'Ramesh Mukherjee',
      parentEmail: 'ramesh.m@test.com',
      parentPhone: '+91 99999 88888',
      dob: '2010-05-15',
      gender: 'Female' as const,
      bloodGroup: 'B+',
      address: 'Indiranagar, Bengaluru',
      status: 'active' as const,
      admissionDate: '2026-04-01',
      institutionId: 'inst-1',
    };

    store.students.push(newStudent as any);
    ERPStorage.set(store);

    // Retrieve again to verify persistence
    const reloaded = ERPStorage.get();
    expect(reloaded.students.length).toBe(originalCount + 1);
    expect(reloaded.students.find(s => s.id === 'stud-unit-test-1')?.fullName).toBe('Priya Mukherjee');
  });

  it('resets store back to original factory demo data', () => {
    const store = ERPStorage.get();
    store.students = [];
    ERPStorage.set(store);
    expect(ERPStorage.get().students.length).toBe(0);

    const resetStore = ERPStorage.reset();
    expect(resetStore.students.length).toBeGreaterThan(0);
  });

  it('validates and restores backup JSON data', () => {
    const validBackup = ERPStorage.get();
    const result = ERPStorage.restore(validBackup);
    expect(result).toBe(true);

    // Corrupted data without required arrays
    const invalidBackup = { randomField: 'corrupted' } as any;
    const invalidResult = ERPStorage.restore(invalidBackup);
    expect(invalidResult).toBe(false);
  });
});
