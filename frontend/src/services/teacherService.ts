// ==========================================
// Teacher & Staff Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { Teacher } from '../types';
import { ERPStorage } from './storage';

export const teacherService = {
  getAll: (): Teacher[] => {
    return ERPStorage.get().teachers;
  },

  getById: (id: string): Teacher | undefined => {
    return (ERPStorage.get().teachers || []).find(
      t => t.id === id || (t as any).refId === id || t.staffId === id || (id === 'teach-1' && t.email?.toLowerCase().includes('ananya'))
    );
  },

  create: (data: Omit<Teacher, 'id'>): { success: boolean; data?: Teacher; error?: string } => {
    const store = ERPStorage.get();

    const exists = store.teachers.some(
      t => t.staffId.toLowerCase() === data.staffId.toLowerCase().trim()
    );
    if (exists) {
      return { success: false, error: `Staff ID "${data.staffId}" already exists.` };
    }

    const newTeacher: Teacher = {
      ...data,
      id: `teach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: `${data.firstName.trim()} ${data.lastName.trim()}`,
    };

    store.teachers = [newTeacher, ...store.teachers];
    ERPStorage.set(store);
    return { success: true, data: newTeacher };
  },

  update: (id: string, updates: Partial<Teacher>): { success: boolean; data?: Teacher; error?: string } => {
    const store = ERPStorage.get();
    const index = store.teachers.findIndex(t => t.id === id);
    if (index === -1) {
      return { success: false, error: 'Teacher record not found.' };
    }

    const existing = store.teachers[index];
    const updated: Teacher = {
      ...existing,
      ...updates,
      fullName:
        updates.firstName || updates.lastName
          ? `${(updates.firstName || existing.firstName).trim()} ${(updates.lastName || existing.lastName).trim()}`
          : existing.fullName,
    };

    store.teachers[index] = updated;
    ERPStorage.set(store);
    return { success: true, data: updated };
  },

  getTeacherPhoto: (teacher?: Partial<Teacher> | null): string => {
    if (!teacher) return '/teacher-female.svg';
    if (teacher.photoUrl) return teacher.photoUrl;
    if (teacher.gender === 'Female') return '/teacher-female.svg';
    if (teacher.gender === 'Male') return '/teacher-male.svg';
    return '/teacher-female.svg';
  },

  delete: (id: string): boolean => {
    const store = ERPStorage.get();
    const initialLen = store.teachers.length;
    store.teachers = store.teachers.filter(t => t.id !== id);
    if (store.teachers.length !== initialLen) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },
};

