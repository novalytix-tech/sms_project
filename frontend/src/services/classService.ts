// ==========================================
// Class & Section Service - Session-Aware
// Developed by NTS Novalytix
// ==========================================

import { ClassRoom, User } from '../types';
import { ERPStorage } from './storage';
import { academicSessionService } from './academicSessionService';

export const classService = {
  /**
   * Retrieves all classes, optionally filtered by academic session
   */
  getAll: (sessionId?: string): ClassRoom[] => {
    const classes = ERPStorage.get().classes || [];
    if (!sessionId) return classes;
    return classes.filter(c => c.sessionId === sessionId);
  },

  /**
   * Retrieves single class by ID
   */
  getById: (id: string): ClassRoom | undefined => {
    return (ERPStorage.get().classes || []).find(c => c.id === id);
  },

  /**
   * Retrieves classes belonging to a specific academic session
   */
  getBySession: (sessionId: string): ClassRoom[] => {
    return (ERPStorage.get().classes || []).filter(c => c.sessionId === sessionId);
  },

  /**
   * Retrieves classes where a teacher is assigned as Class Teacher
   */
  getByClassTeacher: (teacherId: string, sessionId?: string): ClassRoom[] => {
    const classes = classService.getAll(sessionId);
    return classes.filter(c => c.classTeacherId === teacherId);
  },

  /**
   * Creates a new class/section with duplicate prevention per session
   */
  create: (
    data: Omit<ClassRoom, 'id' | 'studentCount'>,
    operator?: User
  ): { success: boolean; data?: ClassRoom; error?: string } => {
    if (operator && !['super_admin', 'school_admin'].includes(operator.role)) {
      return { success: false, error: 'Permission denied: Only School Administrators can create new classes.' };
    }

    const store = ERPStorage.get();
    if (!store.classes) store.classes = [];

    const currentSession = academicSessionService.getCurrentSession();
    const sessionId = data.sessionId || currentSession.id;
    const academicYear = data.academicYear || currentSession.name;
    const section = data.section.toUpperCase().trim();
    const grade = Number(data.grade);

    // Prevent duplicate class and section in same academic session
    const exists = store.classes.some(
      c =>
        c.grade === grade &&
        c.section.toUpperCase() === section &&
        (c.sessionId ? c.sessionId === sessionId : c.academicYear === academicYear)
    );
    if (exists) {
      return {
        success: false,
        error: `Class Grade ${grade} Section "${section}" already exists for session ${academicYear}.`,
      };
    }

    const newClass: ClassRoom = {
      ...data,
      id: `cls-${grade}${section.toLowerCase()}-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5)}`,
      grade,
      section,
      sessionId,
      academicYear,
      studentCount: 0,
      capacity: Number(data.capacity) || 40,
      status: data.status || 'active',
      subjects: data.subjects || [],
    };

    store.classes.push(newClass);
    ERPStorage.set(store);

    return { success: true, data: newClass };
  },

  /**
   * Updates an existing class
   */
  update: (
    id: string,
    updates: Partial<ClassRoom>,
    operator?: User
  ): { success: boolean; data?: ClassRoom; error?: string } => {
    if (operator && !['super_admin', 'school_admin'].includes(operator.role)) {
      return { success: false, error: 'Permission denied: Only School Administrators can update class details.' };
    }

    const store = ERPStorage.get();
    if (!store.classes) store.classes = [];

    const index = store.classes.findIndex(c => c.id === id);
    if (index === -1) {
      return { success: false, error: 'Class not found.' };
    }

    const existing = store.classes[index];

    // Check duplicate if grade or section or session is changed
    const targetGrade = updates.grade !== undefined ? Number(updates.grade) : existing.grade;
    const targetSection = updates.section ? updates.section.toUpperCase().trim() : existing.section;
    const targetSessionId = updates.sessionId || existing.sessionId;

    if (
      targetGrade !== existing.grade ||
      targetSection !== existing.section ||
      targetSessionId !== existing.sessionId
    ) {
      const duplicate = store.classes.some(
        c =>
          c.id !== id &&
          c.grade === targetGrade &&
          c.section.toUpperCase() === targetSection &&
          c.sessionId === targetSessionId
      );
      if (duplicate) {
        return {
          success: false,
          error: `Another class with Grade ${targetGrade} Section "${targetSection}" already exists in this session.`,
        };
      }
    }

    const updated: ClassRoom = {
      ...existing,
      ...updates,
      section: targetSection,
      grade: targetGrade,
    };

    store.classes[index] = updated;
    ERPStorage.set(store);

    return { success: true, data: updated };
  },

  /**
   * Deletes a class with active enrollment safeguard
   */
  delete: (
    id: string,
    operator?: User
  ): { success: boolean; error?: string } => {
    if (operator && !['super_admin', 'school_admin'].includes(operator.role)) {
      return { success: false, error: 'Permission denied: Only School Administrators can delete classes.' };
    }

    const store = ERPStorage.get();
    const cls = (store.classes || []).find(c => c.id === id);
    if (!cls) return { success: false, error: 'Class not found.' };

    // Check if class has active enrollments
    const activeEnrollments = (store.studentEnrollments || []).filter(
      e => e.classId === id && e.status === 'active'
    );
    if (activeEnrollments.length > 0) {
      return {
        success: false,
        error: `Cannot delete ${cls.name} (${cls.section}): There are ${activeEnrollments.length} active students enrolled in this class. Transfer or withdraw students before deleting.`,
      };
    }

    store.classes = store.classes.filter(c => c.id !== id);
    ERPStorage.set(store);

    return { success: true };
  },

  /**
   * Recalculates student count on all classes based on active session enrollments
   */
  recalculateStudentCounts: (sessionId?: string): void => {
    const store = ERPStorage.get();
    const targetSessionId = sessionId || academicSessionService.getCurrentSession().id;
    const enrollments = store.studentEnrollments || [];

    store.classes.forEach(c => {
      const activeCount = enrollments.filter(
        e =>
          e.classId === c.id &&
          e.section.toLowerCase() === c.section.toLowerCase() &&
          (c.sessionId ? e.sessionId === c.sessionId : e.sessionId === targetSessionId) &&
          e.status === 'active'
      ).length;
      c.studentCount = activeCount;
    });

    ERPStorage.set(store);
  },
};
