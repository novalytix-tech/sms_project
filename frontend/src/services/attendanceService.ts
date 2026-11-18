// Student attendance — backed by /api/v1/attendance/students.
//
// load() fetches records into an in-memory cache; synchronous getters read it.
// Saving a roll call goes to the server first; the cache is refreshed afterwards.
// The server decides who sees what: teachers only their classes, parents only
// their linked children, students only themselves.

import { AttendanceRecord, AttendanceStatus } from '../types';
import { httpClient } from './api/httpClient';
import { todayISO } from '../utils/date';

const cache: { records: AttendanceRecord[]; loaded: boolean; error: string | null } = {
  records: [],
  loaded: false,
  error: null,
};

function notify() {
  window.dispatchEvent(new CustomEvent('nts_erp_storage_updated'));
}

function key(r: AttendanceRecord) {
  return `${r.studentId}|${r.date}`;
}

function merge(fresh: AttendanceRecord[], replace: (r: AttendanceRecord) => boolean) {
  const kept = cache.records.filter(r => !replace(r));
  const map = new Map(kept.map(r => [key(r), r]));
  fresh.forEach(r => map.set(key(r), r));
  cache.records = [...map.values()];
}

type Filters = { date?: string; classId?: string; studentId?: string; from?: string; to?: string };

function percentageOf(records: AttendanceRecord[]) {
  if (!records.length) {
    return { percentage: 0, present: 0, late: 0, excused: 0, absent: 0, total: 0, isMarked: false };
  }
  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const excused = records.filter(r => r.status === 'excused').length;
  const absent = records.filter(r => r.status === 'absent').length;
  return {
    percentage: Math.round(((present + late) / records.length) * 100),
    present,
    late,
    excused,
    absent,
    total: records.length,
    isMarked: true,
  };
}

export const attendanceService = {
  /** Fetch records matching the filters and merge them into the cache. */
  load: async (filters: Filters = {}): Promise<void> => {
    const q = new URLSearchParams();
    if (filters.date) q.set('date', filters.date);
    if (filters.classId) q.set('class_id', filters.classId);
    if (filters.studentId) q.set('student_id', filters.studentId);
    if (filters.from) q.set('from', filters.from);
    if (filters.to) q.set('to', filters.to);
    const res = await httpClient.get<AttendanceRecord[]>(`/attendance/students?${q.toString()}`);
    if (!res.success) {
      cache.error = res.error?.message || 'Could not load attendance.';
      cache.loaded = true;
      notify();
      return;
    }
    cache.error = null;
    merge(res.data, r =>
      (!filters.date || r.date === filters.date) &&
      (!filters.classId || r.classId === filters.classId) &&
      (!filters.studentId || r.studentId === filters.studentId) &&
      (!filters.from || r.date >= filters.from) &&
      (!filters.to || r.date <= filters.to),
    );
    cache.loaded = true;
    notify();
  },

  reset: () => {
    cache.records = [];
    cache.loaded = false;
    cache.error = null;
  },

  isLoaded: () => cache.loaded,
  getLoadError: () => cache.error,

  getAll: (): AttendanceRecord[] => cache.records,

  getByClassAndDate: (classId: string, section: string, date: string): AttendanceRecord[] =>
    cache.records.filter(
      a => a.classId === classId && a.section.toLowerCase() === section.toLowerCase() && a.date === date,
    ),

  getByDate: (date: string): AttendanceRecord[] => cache.records.filter(a => a.date === date),

  getByStudentId: (studentId: string): AttendanceRecord[] => cache.records.filter(a => a.studentId === studentId),

  /** Student ids that appear in the loaded records (used for parent/student views). */
  getStudentIds: (): string[] => [...new Set(cache.records.map(r => r.studentId))],

  saveRosterAttendance: async (
    classId: string,
    date: string,
    records: Array<{ studentId: string; status: AttendanceStatus | 'not_marked'; remarks?: string }>,
  ): Promise<{ success: true; savedCount: number } | { success: false; error: string }> => {
    const res = await httpClient.post<{ saved: number; removed: number }>('/attendance/students/batch', {
      classId,
      date,
      records,
    });
    if (!res.success) {
      return { success: false, error: res.error?.message || res.message || 'Could not save attendance.' };
    }
    await attendanceService.load({ classId, date });
    return { success: true, savedCount: res.data.saved };
  },

  calculateStudentPercentage: (studentId: string) =>
    percentageOf(cache.records.filter(a => a.studentId === studentId)),

  calculateClassTodayPercentage: (classId: string, section?: string, date?: string): number => {
    const target = date || todayISO();
    const records = cache.records.filter(
      a => a.classId === classId && (!section || a.section.toLowerCase() === section.toLowerCase()) && a.date === target,
    );
    return percentageOf(records).percentage;
  },

  calculateOverallTodayPercentage: (date?: string) => {
    const p = percentageOf(cache.records.filter(a => a.date === (date || todayISO())));
    return { percentage: p.percentage, present: p.present + p.late, total: p.total, isMarked: p.isMarked };
  },
};
