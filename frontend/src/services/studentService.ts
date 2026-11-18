// ==========================================
// Student Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { Student } from '../types';
import { ERPStorage } from './storage';
import { httpClient } from './api/httpClient';

export const studentService = {
  /**
   * Adds already-persisted students (e.g. returned from a backend bulk import)
   * to the local store for instant display — WITHOUT re-syncing to the backend.
   */
  addLocalBatch: (students: Student[]): void => {
    if (!students || students.length === 0) return;
    const store = ERPStorage.get();
    const existingIds = new Set(store.students.map(s => s.id));
    const existingAdm = new Set(store.students.map(s => (s.admissionNo || '').toLowerCase()));
    const fresh = students.filter(
      s => !existingIds.has(s.id) && !existingAdm.has((s.admissionNo || '').toLowerCase())
    );
    store.students = [...fresh, ...store.students];
    ERPStorage.set(store);
  },

  getAll: (): Student[] => {
    return ERPStorage.get().students;
  },

  getById: (id: string): Student | undefined => {
    return ERPStorage.get().students.find(s => s.id === id);
  },

  getByAdmissionNo: (admNo: string): Student | undefined => {
    return ERPStorage.get().students.find(s => s.admissionNo.toLowerCase() === admNo.toLowerCase().trim());
  },

  getByClassAndSection: (classId: string, section?: string): Student[] => {
    return ERPStorage.get().students.filter(s => {
      if (section) {
        return s.classId === classId && s.section.toLowerCase() === section.toLowerCase();
      }
      return s.classId === classId;
    });
  },

  getByParentEmailOrPhone: (parentContact: string): Student[] => {
    const term = parentContact.toLowerCase().trim();
    return ERPStorage.get().students.filter(
      s => s.parentEmail.toLowerCase().includes(term) || s.parentPhone.includes(term) || s.parentName.toLowerCase().includes(term)
    );
  },

  getStudentPhoto: (student?: Partial<Student> | null): string => {
    if (!student) return '/student-neutral-avatar.svg';
    if (student.photoUrl) return student.photoUrl;
    if (student.gender === 'Female') return '/student-female.svg';
    if (student.gender === 'Male') return '/student-male.svg';
    return '/default-student-avatar.svg';
  },

  getNextRollNo: (classId: string, section: string = 'A'): string => {
    const store = ERPStorage.get();
    const studentsInClass = store.students.filter(
      s => s.classId === classId && (s.section || 'A').toLowerCase() === section.toLowerCase()
    );
    const numericRolls = studentsInClass
      .map(s => {
        const match = s.rollNo ? String(s.rollNo).match(/\d+/) : null;
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => n > 0);
    const maxRoll = numericRolls.length > 0 ? Math.max(...numericRolls) : studentsInClass.length;
    return String(maxRoll + 1);
  },

  checkRollNoUnique: (
    classId: string,
    section: string,
    rollNo: string,
    excludeStudentId?: string
  ): { unique: boolean; existingStudent?: Student } => {
    const store = ERPStorage.get();
    const cleanRoll = rollNo.trim().toLowerCase();
    const cleanSec = (section || 'A').trim().toLowerCase();
    const existing = store.students.find(
      s =>
        s.id !== excludeStudentId &&
        s.classId === classId &&
        (s.section || 'A').trim().toLowerCase() === cleanSec &&
        (s.rollNo || '').trim().toLowerCase() === cleanRoll
    );
    return { unique: !existing, existingStudent: existing };
  },

  create: (data: Omit<Student, 'id'>): { success: boolean; data?: Student; error?: string } => {
    const store = ERPStorage.get();

    // Prevent duplicate admission numbers
    const exists = store.students.some(
      s => s.admissionNo.toLowerCase() === data.admissionNo.toLowerCase().trim()
    );
    if (exists) {
      return { success: false, error: `Admission number "${data.admissionNo}" already exists.` };
    }

    // Validate class-wise unique roll number
    if (data.rollNo && data.classId) {
      const targetSec = (data.section || 'A').trim();
      const { unique, existingStudent } = studentService.checkRollNoUnique(data.classId, targetSec, data.rollNo);
      if (!unique && existingStudent) {
        return {
          success: false,
          error: `Roll Number "${data.rollNo}" is already assigned to ${existingStudent.fullName} in ${existingStudent.className || 'this class'} (${targetSec}). Roll numbers must be unique within each class.`,
        };
      }
    }

    const parts = (data.fullName || `${data.firstName || ''} ${data.lastName || ''}`).trim().split(' ');
    const firstName = data.firstName || parts[0] || 'Student';
    const lastName = data.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : '');
    const fullName = data.fullName || `${firstName} ${lastName}`.trim();

    const newStudent: Student = {
      ...data,
      firstName,
      lastName,
      fullName,
      id: `stud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };

    store.students = [newStudent, ...store.students];
    ERPStorage.set(store);

    // Persist to PostgreSQL 18 backend
    httpClient.post('/students', newStudent).catch(err => {
      console.debug('Failed to sync student to backend:', err);
    });

    return { success: true, data: newStudent };
  },

  update: (id: string, updates: Partial<Student>): { success: boolean; data?: Student; error?: string } => {
    const store = ERPStorage.get();
    const index = store.students.findIndex(s => s.id === id);
    if (index === -1) {
      return { success: false, error: 'Student record not found.' };
    }

    if (updates.admissionNo) {
      const duplicate = store.students.some(
        s => s.id !== id && s.admissionNo.toLowerCase() === updates.admissionNo!.toLowerCase().trim()
      );
      if (duplicate) {
        return { success: false, error: `Admission number "${updates.admissionNo}" is already in use.` };
      }
    }

    const existing = store.students[index];
    const targetClassId = updates.classId || existing.classId;
    const targetSection = (updates.section || existing.section || 'A').trim();
    const targetRollNo = updates.rollNo !== undefined ? updates.rollNo : existing.rollNo;

    if (targetRollNo && targetClassId) {
      const { unique, existingStudent } = studentService.checkRollNoUnique(
        targetClassId,
        targetSection,
        targetRollNo,
        id
      );
      if (!unique && existingStudent) {
        return {
          success: false,
          error: `Roll Number "${targetRollNo}" is already assigned to ${existingStudent.fullName} in ${existingStudent.className || 'this class'} (${targetSection}). Roll numbers must be unique within each class.`,
        };
      }
    }
    const updated: Student = {
      ...existing,
      ...updates,
      fullName:
        updates.firstName || updates.lastName
          ? `${(updates.firstName || existing.firstName).trim()} ${(updates.lastName || existing.lastName).trim()}`
          : existing.fullName,
    };

    store.students[index] = updated;
    ERPStorage.set(store);

    // Persist to PostgreSQL 18 backend
    httpClient.put(`/students/${id}`, updates).catch(err => {
      console.debug('Failed to update student on backend:', err);
    });

    return { success: true, data: updated };
  },

  delete: (id: string): boolean => {
    const store = ERPStorage.get();
    const initialLen = store.students.length;
    store.students = store.students.filter(s => s.id !== id);
    if (store.students.length !== initialLen) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },

  toggleStatus: (id: string): Student | undefined => {
    const store = ERPStorage.get();
    const student = store.students.find(s => s.id === id);
    if (student) {
      student.status = student.status === 'active' ? 'inactive' : 'active';
      ERPStorage.set(store);
      return student;
    }
    return undefined;
  },
};

