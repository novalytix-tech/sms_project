// ==========================================
// Staff & Teacher Attendance Service
// Developed by NTS Novalytix
// ==========================================

import { StaffAttendanceRecord, StaffAttendanceStatus, LeaveRequest } from '../types';
import { ERPStorage } from './storage';
import { teacherService } from './teacherService';
import { leaveService } from './leaveService';

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

export const staffAttendanceService = {
  getAll: (): StaffAttendanceRecord[] => {
    return ERPStorage.get().staffAttendance || [];
  },

  getByDate: (date: string): StaffAttendanceRecord[] => {
    return (ERPStorage.get().staffAttendance || []).filter(r => r.date === date);
  },

  getByTeacherId: (teacherId: string): StaffAttendanceRecord[] => {
    return (ERPStorage.get().staffAttendance || []).filter(r => r.teacherId === teacherId);
  },

  getById: (id: string): StaffAttendanceRecord | undefined => {
    return (ERPStorage.get().staffAttendance || []).find(r => r.id === id);
  },

  /**
   * Check if a staff member has approved or pending leave on a specific date.
   */
  getLeaveForStaffOnDate: (
    teacherId: string,
    staffName: string,
    date: string
  ): { approvedLeave?: LeaveRequest; pendingLeave?: LeaveRequest } => {
    const leaves = leaveService.getAll();
    const staffLeaves = leaves.filter(l => {
      const matchStaff = l.applicantId === teacherId || l.applicantName.toLowerCase() === staffName.toLowerCase();
      const inDateRange = l.startDate <= date && l.endDate >= date;
      return matchStaff && inDateRange;
    });

    const approvedLeave = staffLeaves.find(l => l.status === 'approved');
    const pendingLeave = staffLeaves.find(l => l.status === 'pending');

    return { approvedLeave, pendingLeave };
  },

  /**
   * Mark or update staff attendance roster for a date.
   * Enforces duplicate prevention and prevents marking 'present' during approved leave without explicit override.
   */
  saveDailyStaffRoster: (
    records: Array<{
      teacherId: string;
      date: string;
      status: StaffAttendanceStatus;
      checkInTime?: string;
      checkOutTime?: string;
      remarks?: string;
      allowLeaveOverride?: boolean;
    }>
  ): { success: boolean; savedCount: number; errors?: string[] } => {
    const store = ERPStorage.get();
    if (!store.staffAttendance) {
      store.staffAttendance = [];
    }

    const teachers = teacherService.getAll();
    const errors: string[] = [];

    records.forEach(rec => {
      const teacher = teachers.find(t => t.id === rec.teacherId);
      const staffName = teacher ? teacher.fullName : 'Staff Member';
      const department = teacher ? teacher.department : 'General';
      const staffId = teacher ? teacher.staffId : 'STAFF';

      // Check leave constraints
      const { approvedLeave } = staffAttendanceService.getLeaveForStaffOnDate(rec.teacherId, staffName, rec.date);
      if (approvedLeave && (rec.status === 'present' || rec.status === 'late' || rec.status === 'half_day')) {
        if (!rec.allowLeaveOverride) {
          errors.push(
            `${staffName} has approved leave (${approvedLeave.leaveType}) on ${rec.date}. Confirmation required to override.`
          );
          return;
        }
      }

      // Check for existing record to prevent duplicates
      const existingIdx = store.staffAttendance!.findIndex(
        r => r.teacherId === rec.teacherId && r.date === rec.date
      );

      if (existingIdx >= 0) {
        store.staffAttendance![existingIdx] = {
          ...store.staffAttendance![existingIdx],
          status: rec.status,
          checkInTime: rec.checkInTime || store.staffAttendance![existingIdx].checkInTime,
          checkOutTime: rec.checkOutTime || store.staffAttendance![existingIdx].checkOutTime,
          remarks: rec.remarks !== undefined ? rec.remarks : store.staffAttendance![existingIdx].remarks,
          leaveRequestId: approvedLeave ? approvedLeave.id : store.staffAttendance![existingIdx].leaveRequestId,
          updatedAt: new Date().toISOString(),
        };
      } else {
        const newRecord: StaffAttendanceRecord = {
          id: `stf-att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          teacherId: rec.teacherId,
          staffId,
          staffName,
          department,
          date: rec.date,
          status: rec.status,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          remarks: rec.remarks,
          leaveRequestId: approvedLeave?.id,
          updatedAt: new Date().toISOString(),
        };
        store.staffAttendance!.push(newRecord);
      }
    });

    if (errors.length > 0 && records.length === 1) {
      return { success: false, savedCount: 0, errors };
    }

    ERPStorage.set(store);
    return { success: true, savedCount: records.length - errors.length, errors: errors.length ? errors : undefined };
  },

  /**
   * Correct an existing attendance record with mandatory audit reason.
   */
  correctAttendance: (
    recordId: string,
    newStatus: StaffAttendanceStatus,
    correctionReason: string,
    remarks?: string,
    correctedBy = 'School Admin'
  ): { success: boolean; data?: StaffAttendanceRecord; error?: string } => {
    if (!correctionReason || correctionReason.trim().length < 5) {
      return {
        success: false,
        error: 'A valid reason for correction (at least 5 characters) must be provided for audit tracking.',
      };
    }

    const store = ERPStorage.get();
    if (!store.staffAttendance) store.staffAttendance = [];

    const index = store.staffAttendance.findIndex(r => r.id === recordId);
    if (index === -1) {
      return { success: false, error: 'Attendance record not found.' };
    }

    const existing = store.staffAttendance[index];
    const now = new Date().toISOString();
    const updated: StaffAttendanceRecord = {
      ...existing,
      status: newStatus,
      isCorrected: true,
      previousStatus: existing.status,
      correctedBy,
      correctedAt: now,
      correctionReason: correctionReason.trim(),
      remarks: remarks !== undefined ? remarks : existing.remarks,
      updatedAt: now,
    };

    store.staffAttendance[index] = updated;
    ERPStorage.set(store);
    return { success: true, data: updated };
  },

  /**
   * Daily staff attendance summary statistics.
   */
  calculateStaffDailyStats: (date: string): StaffDailyAttendanceSummary => {
    const teachers = teacherService.getAll().filter(t => t.status === 'active');
    const records = staffAttendanceService.getByDate(date);

    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let onLeave = 0;

    teachers.forEach(t => {
      const rec = records.find(r => r.teacherId === t.id);
      if (!rec) return;

      switch (rec.status) {
        case 'present':
          present++;
          break;
        case 'late':
          late++;
          break;
        case 'half_day':
          halfDay++;
          break;
        case 'on_leave':
          onLeave++;
          break;
        case 'absent':
          absent++;
          break;
      }
    });

    const recordedCount = present + late + halfDay + onLeave + absent;
    const unmarked = Math.max(0, teachers.length - recordedCount);
    // Attendance rate = (present + late + halfDay * 0.5) / recorded
    const attendanceRate =
      recordedCount > 0 ? Math.round(((present + late + halfDay * 0.5) / recordedCount) * 100) : 0;

    return {
      totalStaff: teachers.length,
      present,
      absent,
      late,
      halfDay,
      onLeave,
      unmarked,
      attendanceRate,
    };
  },

  /**
   * Calculate cumulative statistics for an individual staff member.
   */
  calculateIndividualStats: (teacherId: string): StaffMemberAttendanceStat => {
    const records = staffAttendanceService.getByTeacherId(teacherId);
    const totalDays = records.length;
    if (totalDays === 0) {
      return { totalDays: 0, workingDays: 0, presentDays: 0, lateDays: 0, halfDays: 0, leaveDays: 0, absentDays: 0, rate: 0 };
    }

    const presentDays = records.filter(r => r.status === 'present').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const halfDays = records.filter(r => r.status === 'half_day').length;
    const leaveDays = records.filter(r => r.status === 'on_leave').length;
    const absentDays = records.filter(r => r.status === 'absent').length;

    // Working days exclude authorized institutional leaves so approved leave does not penalize staff attendance rate
    const workingDays = Math.max(0, totalDays - leaveDays);
    const denominator = workingDays > 0 ? workingDays : totalDays;
    const rate = Math.min(100, Math.round(((presentDays + lateDays + halfDays * 0.5) / denominator) * 100));

    return {
      totalDays,
      workingDays,
      presentDays,
      lateDays,
      halfDays,
      leaveDays,
      absentDays,
      rate,
    };
  },
};

