import { describe, it, expect } from 'vitest';
import {
  ROLE_CAPABILITIES,
  hasCapability,
  canAccessPath,
  isClassTeacher,
} from './permissions';
import { UserRole } from '../types';

describe('ROLE_CAPABILITIES', () => {
  it('defines capabilities for all 6 active user roles', () => {
    const roles: UserRole[] = ['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'supplier'];
    roles.forEach(role => {
      expect(ROLE_CAPABILITIES[role]).toBeDefined();
      expect(typeof ROLE_CAPABILITIES[role].canManageSettings).toBe('boolean');
    });
  });

  it('restricts super_admin to platform governance while denying operational school actions', () => {
    const sa = ROLE_CAPABILITIES.super_admin;
    expect(sa.canManageInstitutions).toBe(true);
    expect(sa.canViewReports).toBe(true);
    expect(sa.canManageStudents).toBe(false);
    expect(sa.canMarkStudentAttendance).toBe(false);
    expect(sa.canManageFees).toBe(false);
    expect(sa.canManageAdmissions).toBe(false);
  });

  it('grants school_admin comprehensive institutional administration rights', () => {
    const admin = ROLE_CAPABILITIES.school_admin;
    expect(admin.canManageStudents).toBe(true);
    expect(admin.canManageAdmissions).toBe(true);
    expect(admin.canManageFees).toBe(true);
    expect(admin.canManageTeachers).toBe(true);
    expect(admin.canManageInstitutions).toBe(false); // Only super_admin
  });

  it('restricts teacher to assigned academic capabilities', () => {
    const teacher = ROLE_CAPABILITIES.teacher;
    expect(teacher.canViewAssignedClassStudents).toBe(true);
    expect(teacher.canMarkStudentAttendance).toBe(true);
    expect(teacher.canViewAllStudents).toBe(false); // Scoped to assigned classes
    expect(teacher.canManageFees).toBe(false);
    expect(teacher.canManageInstitutions).toBe(false);
  });

  it('restricts student and parent to personal or ward data only', () => {
    const student = ROLE_CAPABILITIES.student;
    const parent = ROLE_CAPABILITIES.parent;

    expect(student.canManageStudents).toBe(false);
    expect(student.canMarkStudentAttendance).toBe(false);
    expect(student.canViewStudentAttendance).toBe(true); // Self view

    expect(parent.canManageStudents).toBe(false);
    expect(parent.canPayFeesOnline).toBe(true);
    expect(parent.canViewChildBus).toBe(true);
  });

  it('restricts supplier to procurement orders', () => {
    const supplier = ROLE_CAPABILITIES.supplier;
    expect(supplier.canAccessSuppliers).toBe(true);
    expect(supplier.canManageStudents).toBe(false);
    expect(supplier.canViewStudentAttendance).toBe(false);
    expect(supplier.canManageFees).toBe(false);
  });
});

describe('hasCapability', () => {
  it('returns true when role possesses the capability', () => {
    expect(hasCapability('school_admin', 'canManageStudents')).toBe(true);
    expect(hasCapability('super_admin', 'canManageInstitutions')).toBe(true);
    expect(hasCapability('parent', 'canPayFeesOnline')).toBe(true);
  });

  it('returns false when role lacks the capability', () => {
    expect(hasCapability('student', 'canManageFees')).toBe(false);
    expect(hasCapability('supplier', 'canViewAllStudents')).toBe(false);
    expect(hasCapability('teacher', 'canManageInstitutions')).toBe(false);
  });
});

describe('canAccessPath', () => {
  it('correctly maps route access for super_admin', () => {
    expect(canAccessPath('super_admin', '/institutions')).toBe(true);
    expect(canAccessPath('super_admin', '/service-entitlements')).toBe(true);
    expect(canAccessPath('super_admin', '/students')).toBe(false);
    expect(canAccessPath('super_admin', '/fees')).toBe(false);
  });

  it('correctly maps route access for school_admin', () => {
    expect(canAccessPath('school_admin', '/students')).toBe(true);
    expect(canAccessPath('school_admin', '/fees')).toBe(true);
    expect(canAccessPath('school_admin', '/admissions')).toBe(true);
    expect(canAccessPath('school_admin', '/question-paper-review')).toBe(true);
    expect(canAccessPath('school_admin', '/institutions')).toBe(false);
  });

  it('correctly maps route access for teacher', () => {
    expect(canAccessPath('teacher', '/attendance')).toBe(true);
    expect(canAccessPath('teacher', '/assignments')).toBe(true);
    expect(canAccessPath('teacher', '/question-papers')).toBe(true);
    expect(canAccessPath('teacher', '/question-paper-review')).toBe(false);
    expect(canAccessPath('teacher', '/admissions')).toBe(false);
  });

  it('correctly maps route access for parent', () => {
    expect(canAccessPath('parent', '/fees')).toBe(true);
    expect(canAccessPath('parent', '/transport')).toBe(true);
    expect(canAccessPath('parent', '/attendance')).toBe(true);
    expect(canAccessPath('parent', '/admissions')).toBe(false);
    expect(canAccessPath('parent', '/suppliers')).toBe(false);
  });

  it('correctly maps route access for supplier', () => {
    expect(canAccessPath('supplier', '/suppliers')).toBe(true);
    expect(canAccessPath('supplier', '/messages')).toBe(true);
    expect(canAccessPath('supplier', '/students')).toBe(false);
    expect(canAccessPath('supplier', '/attendance')).toBe(false);
  });

  it('returns false for unrecognized paths', () => {
    expect(canAccessPath('school_admin', '/non-existent-module')).toBe(false);
  });
});

describe('isClassTeacher', () => {
  const classes = [
    { id: 'cls-1', name: 'Class 10A', classTeacherId: 'teach-101' },
    { id: 'cls-2', name: 'Class 9B', classTeacherId: 'teach-102' },
  ];

  it('returns true when teacher is assigned as class teacher', () => {
    expect(isClassTeacher('teach-101', classes)).toBe(true);
    expect(isClassTeacher('teach-102', classes)).toBe(true);
  });

  it('returns false when teacher is not assigned as class teacher', () => {
    expect(isClassTeacher('teach-999', classes)).toBe(false);
    expect(isClassTeacher('', classes)).toBe(false);
    expect(isClassTeacher('teach-101', [])).toBe(false);
  });
});

