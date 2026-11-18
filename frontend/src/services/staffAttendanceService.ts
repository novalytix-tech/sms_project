// Staff & teacher attendance — backed by /api/v1/attendance/staff.
// Admins mark and correct; teachers only ever receive their own records from the server.

import { LeaveRequest, StaffAttendanceRecord, StaffAttendanceStatus } from '../types';
import { httpClient } from './api/httpClient';
import { leaveService } from './leaveService';
import { teacherService } from './teacherService';

export interface StaffDailyAttendanceSummary {
  totalStaff: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  unmarked: number;
  attendanceRate: number;
}

export interface StaffMemberAttendanceStat {
  totalDays: number;
  workingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  absentDays: number;
  rate: number;
}

const cache: { records: StaffAttendanceRecord[]; loaded: boolean } = { records: [], loaded: false };

function notify() {
  window.dispatchEvent(new CustomEvent('nts_erp_storage_updated'));
}

function upsert(records: StaffAttendanceRecord[]) {
  const map = new Map(cache.records.map(r => [r.id, r]));
  records.forEach(r => map.set(r.id, r));
  cache.records = [...map.values()];
}

export const staffAttendanceService = {
  /** Load records (optionally for one date or a range) from the server. */
  load: async (filters: { date?: string; from?: string; to?: string } = {}): Promise<void> => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
    const res = await httpClient.get<StaffAttendanceRecord[]>(`/attendance/staff?${q.toString()}`);
    if (res.success) {
      if (filters.date) cache.records = cache.records.filter(r => r.date !== filters.date);
      upsert(res.data);
    }
    cache.loaded = true;
    notify();
  },

  reset: () => {
    cache.records = [];
    cache.loaded = false;
  },

  getAll: (): StaffAttendanceRecord[] => cache.records,
  getByDate: (date: string): StaffAttendanceRecord[] => cache.records.filter(r => r.date === date),
  getByTeacherId: (teacherId: string): StaffAttendanceRecord[] => cache.records.filter(r => r.teacherId === teacherId),
  getById: (id: string): StaffAttendanceRecord | undefined => cache.records.find(r => r.id === id),

  /** Advisory check against the leave module (still browser-side; see AUDIT.md). */
  getLeaveForStaffOnDate: (
    teacherId: string,
    staffName: string,
    date: string,
  ): { approvedLeave?: LeaveRequest; pendingLeave?: LeaveRequest } => {
    const staffLeaves = leaveService.getAll().filter(
      l =>
        (l.applicantId === teacherId || l.applicantName.toLowerCase() === staffName.toLowerCase()) &&
        l.startDate <= date &&
        l.endDate >= date,
    );
    return {
      approvedLeave: staffLeaves.find(l => l.status === 'approved'),
      pendingLeave: staffLeaves.find(l => l.status === 'pending'),
    };
  },

  saveDailyStaffRoster: async (
    records: Array<{
      teacherId: string;
      date: string;
      status: StaffAttendanceStatus;
      checkInTime?: string;
      checkOutTime?: string;
      remarks?: string;
      allowLeaveOverride?: boolean;
    }>,
  ): Promise<{ success: boolean; savedCount: number; errors?: string[] }> => {
    const teachers = teacherService.getAll();
    const errors: string[] = [];
    const toSave = records.filter(rec => {
      const name = teachers.find(t => t.id === rec.teacherId)?.fullName || 'Staff member';
      const { approvedLeave } = staffAttendanceService.getLeaveForStaffOnDate(rec.teacherId, name, rec.date);
      if (approvedLeave && ['present', 'late', 'half_day'].includes(rec.status) && !rec.allowLeaveOverride) {
        errors.push(`${name} has approved leave (${approvedLeave.leaveType}) on ${rec.date}. Confirmation required to override.`);
        return false;
      }
      return true;
    });
    if (!toSave.length) return { success: false, savedCount: 0, errors };

    const res = await httpClient.post<StaffAttendanceRecord[]>('/attendance/staff/batch', {
      records: toSave.map(({ allowLeaveOverride: _ignored, ...r }) => r),
    });
    if (!res.success) {
      return { success: false, savedCount: 0, errors: [res.error?.message || 'Could not save staff attendance.'] };
    }
    upsert(res.data);
    notify();
    return { success: true, savedCount: res.data.length, errors: errors.length ? errors : undefined };
  },

  correctAttendance: async (
    recordId: string,
    newStatus: StaffAttendanceStatus,
    correctionReason: string,
    remarks?: string,
  ): Promise<{ success: boolean; data?: StaffAttendanceRecord; error?: string }> => {
    if (!correctionReason || correctionReason.trim().length < 5) {
      return { success: false, error: 'A valid reason for correction (at least 5 characters) must be provided for audit tracking.' };
    }
    const res = await httpClient.post<StaffAttendanceRecord>(`/attendance/staff/${recordId}/correct`, {
      status: newStatus,
      reason: correctionReason.trim(),
      remarks,
    });
    if (!res.success) return { success: false, error: res.error?.message || 'Could not correct the record.' };
    upsert([res.data]);
    notify();
    return { success: true, data: res.data };
  },

  calculateStaffDailyStats: (date: string): StaffDailyAttendanceSummary => {
    const teachers = teacherService.getAll().filter(t => t.status === 'active');
    const records = staffAttendanceService.getByDate(date);
    const counts = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 };
    teachers.forEach(t => {
      const rec = records.find(r => r.teacherId === t.id);
      if (rec) counts[rec.status] += 1;
    });
    const recorded = counts.present + counts.absent + counts.late + counts.half_day + counts.on_leave;
    return {
      totalStaff: teachers.length,
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      halfDay: counts.half_day,
      onLeave: counts.on_leave,
      unmarked: Math.max(0, teachers.length - recorded),
      attendanceRate: recorded > 0 ? Math.round(((counts.present + counts.late + counts.half_day * 0.5) / recorded) * 100) : 0,
    };
  },

  calculateIndividualStats: (teacherId: string): StaffMemberAttendanceStat => {
    const records = staffAttendanceService.getByTeacherId(teacherId);
    const totalDays = records.length;
    if (!totalDays) {
      return { totalDays: 0, workingDays: 0, presentDays: 0, lateDays: 0, halfDays: 0, leaveDays: 0, absentDays: 0, rate: 0 };
    }
    const count = (s: StaffAttendanceStatus) => records.filter(r => r.status === s).length;
    const presentDays = count('present');
    const lateDays = count('late');
    const halfDays = count('half_day');
    const leaveDays = count('on_leave');
    const absentDays = count('absent');
    const workingDays = Math.max(0, totalDays - leaveDays);
    const denominator = workingDays > 0 ? workingDays : totalDays;
    return {
      totalDays,
      workingDays,
      presentDays,
      lateDays,
      halfDays,
      leaveDays,
      absentDays,
      rate: Math.min(100, Math.round(((presentDays + lateDays + halfDays * 0.5) / denominator) * 100)),
    };
  },
};
