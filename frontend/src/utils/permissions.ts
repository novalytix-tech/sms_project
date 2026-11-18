// ==========================================
// Centralized Role-Based Access Control (RBAC) Policy
// Developed by NTS Novalytix
// ==========================================

import { UserRole, User, LibraryStaffAssignment } from '../types';

export interface RoleCapabilities {
  // Student Data
  canViewAllStudents: boolean;
  canViewAssignedClassStudents: boolean;
  canManageStudents: boolean; // Add, Edit, Delete, Toggle Status
  canExportStudentDirectory: boolean;

  // Attendance
  canMarkStudentAttendance: boolean;
  canViewStudentAttendance: boolean;
  canMarkStaffAttendance: boolean;
  canViewStaffAttendance: boolean;

  // Academics & Admissions
  canManageAdmissions: boolean;
  canManageGradingSchemes: boolean;
  canEnterExamMarks: boolean;
  canManageClasses: boolean;
  canManageTeachers: boolean;

  // Finance & Procurement
  canManageFees: boolean;
  canPayFeesOnline: boolean;
  canAccessSuppliers: boolean;

  // System & Administration
  canManageInstitutions: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;

  // Staff Groups & Messaging
  canAccessStaffGroups: boolean;
  canCreateAllStaffGroups: boolean;
  canCreateDepartmentGroups: boolean;
  canCreateRoleBasedGroups: boolean;
  canCreateCustomStaffGroups: boolean;
  canArchiveStaffGroups: boolean;

  // Academic Sessions, Import & Promotion
  canPromoteStudents: boolean;
  canManageAcademicSessions: boolean;
  canBulkImportStudents: boolean;

  // Student-Teacher Class Groups & Messaging
  canAccessClassGroups: boolean;
  canManageClassGroups: boolean;
  canPostClassGroupMessages: boolean;

  // GPS School Bus Tracking & Safety
  canManageTransport: boolean;
  canTrackFleetLive: boolean;
  canRecordSafetyEvents: boolean;
  canViewChildBus: boolean;
}

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapabilities> = {
  super_admin: {
    canViewAllStudents: false, // School-level operational capability
    canViewAssignedClassStudents: false,
    canManageStudents: false,
    canExportStudentDirectory: false,
    canMarkStudentAttendance: false,
    canViewStudentAttendance: false,
    canMarkStaffAttendance: false,
    canViewStaffAttendance: false,
    canManageAdmissions: false,
    canManageGradingSchemes: false,
    canEnterExamMarks: false,
    canManageClasses: false,
    canManageTeachers: false,
    canManageFees: false,
    canPayFeesOnline: false,
    canAccessSuppliers: false,
    canManageInstitutions: true, // Platform-wide management
    canManageSettings: true,    // Global configuration
    canViewReports: true,        // Platform & school-scoped reports
    canAccessStaffGroups: false,
    canCreateAllStaffGroups: false,
    canCreateDepartmentGroups: false,
    canCreateRoleBasedGroups: false,
    canCreateCustomStaffGroups: false,
    canArchiveStaffGroups: false,
    canPromoteStudents: false,
    canManageAcademicSessions: false,
    canBulkImportStudents: false,
    canAccessClassGroups: false,
    canManageClassGroups: false,
    canPostClassGroupMessages: false,
    canManageTransport: false,
    canTrackFleetLive: false,
    canRecordSafetyEvents: false,
    canViewChildBus: false,
  },

  school_admin: {
    canViewAllStudents: true,
    canViewAssignedClassStudents: true,
    canManageStudents: true,
    canExportStudentDirectory: true,
    canMarkStudentAttendance: true,
    canViewStudentAttendance: true,
    canMarkStaffAttendance: true,
    canViewStaffAttendance: true,
    canManageAdmissions: true,
    canManageGradingSchemes: true,
    canEnterExamMarks: true,
    canManageClasses: true,
    canManageTeachers: true,
    canManageFees: true,
    canPayFeesOnline: false,
    canAccessSuppliers: true,
    canManageInstitutions: false,
    canManageSettings: true,
    canViewReports: true,
    canAccessStaffGroups: true,
    canCreateAllStaffGroups: true,
    canCreateDepartmentGroups: true,
    canCreateRoleBasedGroups: true,
    canCreateCustomStaffGroups: true,
    canArchiveStaffGroups: true,
    canPromoteStudents: true,
    canManageAcademicSessions: true,
    canBulkImportStudents: true,
    canAccessClassGroups: true,
    canManageClassGroups: true,
    canPostClassGroupMessages: true,
    canManageTransport: true,
    canTrackFleetLive: true,
    canRecordSafetyEvents: true,
    canViewChildBus: false,
  },

  teacher: {
    canViewAllStudents: false, // Scoped to assigned classes only
    canViewAssignedClassStudents: true,
    canManageStudents: false,
    canExportStudentDirectory: false,
    canMarkStudentAttendance: true, // Only for assigned classes
    canViewStudentAttendance: true,
    canMarkStaffAttendance: false,
    canViewStaffAttendance: true, // Own records only
    canManageAdmissions: false,
    canManageGradingSchemes: false,
    canEnterExamMarks: true, // For assigned subjects
    canManageClasses: false,
    canManageTeachers: false,
    canManageFees: false,
    canPayFeesOnline: false,
    canAccessSuppliers: false,
    canManageInstitutions: false,
    canManageSettings: false,
    canViewReports: false,
    canAccessStaffGroups: true,
    canCreateAllStaffGroups: false,
    canCreateDepartmentGroups: false,
    canCreateRoleBasedGroups: false,
    canCreateCustomStaffGroups: true,
    canArchiveStaffGroups: false,
    canPromoteStudents: false,
    canManageAcademicSessions: false,
    canBulkImportStudents: false,
    canAccessClassGroups: true,
    canManageClassGroups: true,
    canPostClassGroupMessages: true,
    canManageTransport: false,
    canTrackFleetLive: false,
    canRecordSafetyEvents: false,
    canViewChildBus: false,
  },

  parent: {
    canViewAllStudents: false,
    canViewAssignedClassStudents: false,
    canManageStudents: false,
    canExportStudentDirectory: false,
    canMarkStudentAttendance: false,
    canViewStudentAttendance: true, // Ward only (read-only)
    canMarkStaffAttendance: false,
    canViewStaffAttendance: false,
    canManageAdmissions: false,
    canManageGradingSchemes: false,
    canEnterExamMarks: false,
    canManageClasses: false,
    canManageTeachers: false,
    canManageFees: false,
    canPayFeesOnline: true,
    canAccessSuppliers: false,
    canManageInstitutions: false,
    canManageSettings: false,
    canViewReports: false,
    canAccessStaffGroups: false,
    canCreateAllStaffGroups: false,
    canCreateDepartmentGroups: false,
    canCreateRoleBasedGroups: false,
    canCreateCustomStaffGroups: false,
    canArchiveStaffGroups: false,
    canPromoteStudents: false,
    canManageAcademicSessions: false,
    canBulkImportStudents: false,
    canAccessClassGroups: true,
    canManageClassGroups: false,
    canPostClassGroupMessages: false,
    canManageTransport: false,
    canTrackFleetLive: false,
    canRecordSafetyEvents: false,
    canViewChildBus: true,
  },

  student: {
    canViewAllStudents: false,
    canViewAssignedClassStudents: false,
    canManageStudents: false,
    canExportStudentDirectory: false,
    canMarkStudentAttendance: false,
    canViewStudentAttendance: true, // Self only (read-only)
    canMarkStaffAttendance: false,
    canViewStaffAttendance: false,
    canManageAdmissions: false,
    canManageGradingSchemes: false,
    canEnterExamMarks: false,
    canManageClasses: false,
    canManageTeachers: false,
    canManageFees: false,
    canPayFeesOnline: true,
    canAccessSuppliers: false,
    canManageInstitutions: false,
    canManageSettings: false,
    canViewReports: false,
    canAccessStaffGroups: false,
    canCreateAllStaffGroups: false,
    canCreateDepartmentGroups: false,
    canCreateRoleBasedGroups: false,
    canCreateCustomStaffGroups: false,
    canArchiveStaffGroups: false,
    canPromoteStudents: false,
    canManageAcademicSessions: false,
    canBulkImportStudents: false,
    canAccessClassGroups: true,
    canManageClassGroups: false,
    canPostClassGroupMessages: false,
    canManageTransport: false,
    canTrackFleetLive: false,
    canRecordSafetyEvents: false,
    canViewChildBus: true,
  },

  supplier: {
    canViewAllStudents: false,
    canViewAssignedClassStudents: false,
    canManageStudents: false,
    canExportStudentDirectory: false,
    canMarkStudentAttendance: false,
    canViewStudentAttendance: false,
    canMarkStaffAttendance: false,
    canViewStaffAttendance: false,
    canManageAdmissions: false,
    canManageGradingSchemes: false,
    canEnterExamMarks: false,
    canManageClasses: false,
    canManageTeachers: false,
    canManageFees: false,
    canPayFeesOnline: false,
    canAccessSuppliers: true,
    canManageInstitutions: false,
    canManageSettings: false,
    canViewReports: false,
    canAccessStaffGroups: false,
    canCreateAllStaffGroups: false,
    canCreateDepartmentGroups: false,
    canCreateRoleBasedGroups: false,
    canCreateCustomStaffGroups: false,
    canArchiveStaffGroups: false,
    canPromoteStudents: false,
    canManageAcademicSessions: false,
    canBulkImportStudents: false,
    canAccessClassGroups: false,
    canManageClassGroups: false,
    canPostClassGroupMessages: false,
    canManageTransport: false,
    canTrackFleetLive: false,
    canRecordSafetyEvents: false,
    canViewChildBus: false,
  },
};

/**
 * Checks whether the given user role possesses a specific functional capability.
 */
export function hasCapability(role: UserRole, capability: keyof RoleCapabilities): boolean {
  return !!ROLE_CAPABILITIES[role]?.[capability];
}

/**
 * Determines whether a user role is permitted to access a given URL path.
 */
export function canAccessPath(role: UserRole, path: string): boolean {
  const cleanPath = path.split('?')[0].replace(/^\//, '');

  switch (cleanPath) {
    case '':
    case 'dashboard':
      return true; // All authenticated roles have their dedicated dashboard

    case 'institutions':
      return hasCapability(role, 'canManageInstitutions');

    case 'service-entitlements':
      return role === 'super_admin';

    case 'digital-marketing':
      return ['school_admin', 'super_admin'].includes(role);

    case 'reports':
      return hasCapability(role, 'canViewReports');

    case 'settings':
      return hasCapability(role, 'canManageSettings');

    case 'about':
      return ['school_admin', 'super_admin'].includes(role);

    // School-level operational routes: BLOCKED for super_admin
    case 'admissions':
      return role !== 'super_admin' && hasCapability(role, 'canManageAdmissions');

    case 'students':
      // school_admin sees full directory;
      // teacher sees assigned class students;
      // parent sees linked children;
      // student sees own personal profile.
      // super_admin & supplier have NO access to school student directory.
      return !['super_admin', 'supplier'].includes(role);

    case 'teachers':
      return role !== 'super_admin' && hasCapability(role, 'canManageTeachers');

    case 'classes':
      return ['school_admin', 'teacher'].includes(role);

    case 'attendance':
      // school_admin & teacher can mark/view;
      // parent and student have read-only view;
      // super_admin & supplier have NO access.
      return !['super_admin', 'supplier'].includes(role);

    case 'assignments':
      return !['super_admin', 'supplier'].includes(role);

    case 'examinations':
      return !['super_admin', 'supplier'].includes(role);

    case 'question-papers':
      return role === 'teacher';

    case 'question-paper-review':
      return role === 'school_admin';

    case 'fees':
      return ['school_admin', 'parent', 'student'].includes(role);

    case 'timetable':
      return !['super_admin', 'supplier'].includes(role);

    case 'calendar':
      return ['school_admin', 'teacher', 'student'].includes(role);

    case 'notices':
      return role !== 'super_admin'; // Super admin uses platform alerts, not school circulars

    case 'messages':
      return ['school_admin', 'teacher', 'parent', 'supplier'].includes(role);

    case 'staff-groups':
      return role !== 'super_admin' && hasCapability(role, 'canAccessStaffGroups');

    case 'class-groups':
      return role !== 'super_admin' && hasCapability(role, 'canAccessClassGroups');

    case 'leave':
      return !['super_admin', 'supplier'].includes(role);

    case 'library':
      return ['school_admin', 'teacher', 'student'].includes(role);

    case 'transport':
      return ['school_admin', 'parent', 'student'].includes(role);

    case 'suppliers':
      return role !== 'super_admin' && hasCapability(role, 'canAccessSuppliers');

    default:
      return false;
  }
}

/**
 * Verifies whether a given teacher is explicitly assigned as a Class Teacher.
 */
export function isClassTeacher(teacherId: string, classes: { classTeacherId?: string }[]): boolean {
  if (!teacherId || !classes) return false;
  return classes.some(c => c.classTeacherId === teacherId);
}

/**
 * Retrieves the active library staff assignment for a teacher, if any.
 */
export function getTeacherLibraryAssignment(
  user: User | { id?: string; referenceId?: string; role?: string } | null | undefined,
  staffAssignments?: LibraryStaffAssignment[]
): LibraryStaffAssignment | undefined {
  if (!user || user.role !== 'teacher') return undefined;
  const teacherId = user.referenceId || user.id;
  return (staffAssignments || []).find(
    a => (a.teacherId === teacherId || a.teacherId === user.id) && a.status === 'active'
  );
}

/**
 * Checks whether a teacher holds an active librarian responsibility.
 */
export function isTeacherLibrarian(
  user: User | { id?: string; referenceId?: string; role?: string } | null | undefined,
  staffAssignments?: LibraryStaffAssignment[]
): boolean {
  return !!getTeacherLibraryAssignment(user, staffAssignments);
}

/**
 * Evaluates whether a user is authorized for a specific library permission.
 * - school_admin and super_admin have universal access.
 * - teachers require an active staff assignment granting the requested permission or '*'.
 * - students/parents have read-only access where permitted.
 */
export function hasLibraryPermission(
  user: User | null | undefined,
  permissionKey: string,
  staffAssignments?: LibraryStaffAssignment[]
): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'school_admin') return true;

  if (user.role === 'teacher') {
    const assignment = getTeacherLibraryAssignment(user, staffAssignments);
    if (!assignment) return false;
    if (assignment.permissions.includes('*')) return true;
    return assignment.permissions.includes(permissionKey);
  }

  // General catalogue browsing is open to students and faculty
  if (permissionKey === 'library.books.view' || permissionKey === 'library.catalogue.browse') {
    return true;
  }

  return false;
}

/**
 * Returns all active library permission keys for the user.
 */
export function getLibraryPermissionsForUser(
  user: User | null | undefined,
  staffAssignments?: LibraryStaffAssignment[]
): string[] {
  if (!user) return [];
  if (user.role === 'super_admin' || user.role === 'school_admin') return ['*'];

  if (user.role === 'teacher') {
    const assignment = getTeacherLibraryAssignment(user, staffAssignments);
    return assignment ? assignment.permissions : [];
  }

  return ['library.books.view'];
}



