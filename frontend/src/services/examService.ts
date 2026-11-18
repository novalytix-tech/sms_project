// ==========================================
// Examination & Gradebook Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { Examination, ExamMark, ExamSchedule, GradingScheme } from '../types';
import { ERPStorage } from './storage';
import { gradingService } from './gradingService';

export const examService = {
  getAll: (): Examination[] => {
    return ERPStorage.get().examinations;
  },

  getById: (id: string): Examination | undefined => {
    return ERPStorage.get().examinations.find(e => e.id === id);
  },

  getByClass: (classId: string): Examination[] => {
    return ERPStorage.get().examinations.filter(e => e.classId === classId);
  },

  create: (data: Omit<Examination, 'id'>): Examination => {
    const store = ERPStorage.get();
    const newExam: Examination = {
      ...data,
      id: `exam-${Date.now()}`,
    };
    store.examinations = [newExam, ...store.examinations];
    ERPStorage.set(store);
    return newExam;
  },

  update: (id: string, updates: Partial<Examination>): Examination | undefined => {
    const store = ERPStorage.get();
    const index = store.examinations.findIndex(e => e.id === id);
    if (index === -1) return undefined;

    const updated = { ...store.examinations[index], ...updates };
    store.examinations[index] = updated;
    ERPStorage.set(store);
    return updated;
  },

  delete: (id: string): boolean => {
    const store = ERPStorage.get();
    const len = store.examinations.length;
    store.examinations = store.examinations.filter(e => e.id !== id);
    if (store.examinations.length !== len) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },

  addScheduleItem: (examId: string, item: Omit<ExamSchedule, 'id' | 'examId'>): ExamSchedule | undefined => {
    const store = ERPStorage.get();
    const exam = store.examinations.find(e => e.id === examId);
    if (!exam) return undefined;

    const newSchedule: ExamSchedule = {
      ...item,
      id: `sch-${Date.now()}`,
      examId,
    };
    exam.schedules.push(newSchedule);
    ERPStorage.set(store);
    return newSchedule;
  },

  getMarksForExam: (examId: string): ExamMark[] => {
    return ERPStorage.get().examMarks.filter(m => m.examId === examId);
  },

  getMarksForStudent: (studentId: string): ExamMark[] => {
    return ERPStorage.get().examMarks.filter(m => m.studentId === studentId);
  },

  saveMarksBatch: (
    marks: Array<{
      examId: string;
      scheduleId: string;
      studentId: string;
      marksObtained: number;
      isAbsent: boolean;
      remarks?: string;
    }>
  ): { success: boolean; count: number; error?: string } => {
    const store = ERPStorage.get();

    // Validate marks non-negative
    for (const m of marks) {
      if (m.marksObtained < 0) {
        return { success: false, count: 0, error: 'Marks obtained cannot be less than zero.' };
      }
    }

    marks.forEach(item => {
      const existingIdx = store.examMarks.findIndex(
        m => m.examId === item.examId && m.scheduleId === item.scheduleId && m.studentId === item.studentId
      );

      if (existingIdx >= 0) {
        store.examMarks[existingIdx] = {
          ...store.examMarks[existingIdx],
          marksObtained: item.marksObtained,
          isAbsent: item.isAbsent,
          remarks: item.remarks,
        };
      } else {
        store.examMarks.push({
          id: `mk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...item,
        });
      }
    });

    ERPStorage.set(store);
    return { success: true, count: marks.length };
  },

  calculateGrade: (score: number, maxScore: number, scheme?: GradingScheme): { grade: string; remarks: string } => {
    const res = gradingService.calculateSubjectGrade(score, maxScore, false, scheme);
    return { grade: res.grade, remarks: res.remarks };
  },
};

