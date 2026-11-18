// ==========================================
// Attendance Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { AttendanceRecord, AttendanceStatus } from '../types';
import { ERPStorage } from './storage';

export const attendanceService = {
  getAll: (): AttendanceRecord[] => {
    return ERPStorage.get().attendance;
  },

  getByClassAndDate: (classId: string, section: string, date: string): AttendanceRecord[] => {
    return ERPStorage.get().attendance.filter(
      a => a.classId === classId && a.section.toLowerCase() === section.toLowerCase() && a.date === date
    );
  },

  getByDate: (date: string): AttendanceRecord[] => {
    return ERPStorage.get().attendance.filter(a => a.date === date);
  },

  getByStudentId: (studentId: string): AttendanceRecord[] => {
    return ERPStorage.get().attendance.filter(a => a.studentId === studentId);
  },

  saveRosterAttendance: (
    records: Array<{
      studentId: string;
      classId: string;
      section: string;
      date: string;
      status: AttendanceStatus | 'not_marked';
      remarks?: string;
    }>
  ): { success: boolean; savedCount: number } => {
    const store = ERPStorage.get();
    let savedCount = 0;

    records.forEach(rec => {
      const existingIndex = store.attendance.findIndex(
        a => a.studentId === rec.studentId && a.date === rec.date
      );

      if (rec.status === 'not_marked') {
        // If status was reset to not marked, remove any existing record
        if (existingIndex >= 0) {
          store.attendance.splice(existingIndex, 1);
        }
      } else {
        savedCount++;
        if (existingIndex >= 0) {
          // Update existing record
          store.attendance[existingIndex] = {
            ...store.attendance[existingIndex],
            status: rec.status,
            remarks: rec.remarks,
          };
        } else {
          // Create new record
          store.attendance.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            studentId: rec.studentId,
            classId: rec.classId,
            section: rec.section,
            date: rec.date,
            status: rec.status,
            remarks: rec.remarks,
          });
        }
      }
    });

    ERPStorage.set(store);
    return { success: true, savedCount };
  },

  calculateStudentPercentage: (
    studentId: string
  ): {
    percentage: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    total: number;
    isMarked: boolean;
  } => {
    const records = ERPStorage.get().attendance.filter(
      a => a.studentId === studentId && (['present', 'late', 'excused', 'absent'] as string[]).includes(a.status)
    );

    if (!records.length) {
      return {
        percentage: 100,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        total: 0,
        isMarked: false,
      };
    }

    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    // Attended sessions: present (full) + late (counted as attended)
    const attendedCount = presentCount + lateCount;
    const totalMarkedDays = records.length;
    const percentage = totalMarkedDays > 0 ? Math.round((attendedCount / totalMarkedDays) * 100) : 100;

    return {
      percentage,
      present: presentCount,
      late: lateCount,
      excused: excusedCount,
      absent: absentCount,
      total: totalMarkedDays,
      isMarked: true,
    };
  },

  calculateClassTodayPercentage: (classId: string, section?: string, date?: string): number => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const records = ERPStorage.get().attendance.filter(a => {
      const matchClass = a.classId === classId;
      const matchSection = section ? a.section.toLowerCase() === section.toLowerCase() : true;
      const matchDate = a.date === targetDate;
      return matchClass && matchSection && matchDate;
    });

    if (!records.length) return 0; // Honest zero when attendance has not been recorded
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round((present / records.length) * 100);
  },

  calculateOverallTodayPercentage: (date?: string): { percentage: number; present: number; total: number; isMarked: boolean } => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const records = ERPStorage.get().attendance.filter(a => a.date === targetDate);
    if (!records.length) {
      return { percentage: 0, present: 0, total: 0, isMarked: false };
    }
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
    return {
      percentage: Math.round((present / records.length) * 100),
      present,
      total: records.length,
      isMarked: true,
    };
  },
};

