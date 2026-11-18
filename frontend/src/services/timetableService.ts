// ==========================================
// Timetable Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { TimetablePeriod } from '../types';
import { ERPStorage } from './storage';
import { PERIOD_SLOTS, LUNCH_BREAK, PeriodSlot } from '../utils/timetableConstants';

export { PERIOD_SLOTS, LUNCH_BREAK };
export type { PeriodSlot };

export const timetableService = {
  getByClass: (classId: string, section?: string): TimetablePeriod[] => {
    return ERPStorage.get().timetable.filter(p => {
      const matchClass = p.classId === classId;
      const matchSection = section ? p.section.toLowerCase() === section.toLowerCase() : true;
      return matchClass && matchSection;
    });
  },

  getByTeacher: (teacherId: string): TimetablePeriod[] => {
    return ERPStorage.get().timetable.filter(p => p.teacherId === teacherId);
  },

  createPeriod: (
    data: Omit<TimetablePeriod, 'id'>
  ): { success: boolean; data?: TimetablePeriod; warning?: string; error?: string } => {
    const store = ERPStorage.get();

    // Check teacher conflict: Is the teacher already booked at this day and period?
    const teacherConflict = store.timetable.find(
      p => p.day === data.day && p.periodNo === data.periodNo && p.teacherId === data.teacherId
    );
    if (teacherConflict) {
      return {
        success: false,
        error: `Teacher Conflict: ${data.teacherName} is already assigned to ${teacherConflict.className} (${teacherConflict.section}) during Period ${data.periodNo} on ${data.day}.`,
      };
    }

    // Check room conflict
    const roomConflict = store.timetable.find(
      p => p.day === data.day && p.periodNo === data.periodNo && p.roomNo.toLowerCase() === data.roomNo.toLowerCase()
    );
    let warning: string | undefined;
    if (roomConflict) {
      warning = `Room Warning: ${data.roomNo} is already occupied by ${roomConflict.className} during this period.`;
    }

    const newPeriod: TimetablePeriod = {
      ...data,
      id: `tt-${Date.now()}`,
    };

    store.timetable.push(newPeriod);
    ERPStorage.set(store);
    return { success: true, data: newPeriod, warning };
  },

  deletePeriod: (id: string): boolean => {
    const store = ERPStorage.get();
    const len = store.timetable.length;
    store.timetable = store.timetable.filter(p => p.id !== id);
    if (store.timetable.length !== len) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },
};

