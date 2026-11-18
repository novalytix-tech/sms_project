// ==========================================
// Student Boarding & Drop-Off Safety Event Service
// Developed by NTS Novalytix
// ==========================================

import { TransportSafetyEvent, User } from '../types';
import { ERPStorage } from './storage';
import { studentService } from './studentService';

export interface RecordSafetyEventInput {
  studentId: string;
  tripId: string;
  routeId: string;
  eventType: 'boarded' | 'dropped_off' | 'not_boarded' | 'exception';
  stopId?: string;
  stopName?: string;
  verificationMethod?: 'manual_attendant' | 'qr_code' | 'rfid_card' | 'emergency_override';
  notes?: string;
}

export const safetyEventService = {
  /**
   * Retrieves all recorded safety events in the ERP
   */
  getAllEvents: (): TransportSafetyEvent[] => {
    return ERPStorage.get().transportSafetyEvents || [];
  },

  /**
   * Retrieves safety events for a specific trip
   */
  getEventsByTrip: (tripId: string): TransportSafetyEvent[] => {
    return safetyEventService.getAllEvents().filter(e => e.tripId === tripId);
  },

  /**
   * Retrieves safety events for a specific student
   */
  getEventsForStudent: (studentId: string): TransportSafetyEvent[] => {
    return safetyEventService.getAllEvents().filter(e => e.studentId === studentId);
  },

  /**
   * Retrieves safety events accessible to a parent (strictly scoped to their linked children)
   */
  getEventsForParent: (parentUser: User): TransportSafetyEvent[] => {
    const parentId = parentUser.referenceId || parentUser.id;
    const linkedStudents = studentService
      .getAll()
      .filter(s => s.parentId === parentId || s.parentEmail?.toLowerCase() === parentUser.email?.toLowerCase());

    const allowedStudentIds = new Set(linkedStudents.map(s => s.id));
    return safetyEventService
      .getAllEvents()
      .filter(e => allowedStudentIds.has(e.studentId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Records a student boarding or drop-off safety event
   */
  recordSafetyEvent: (
    input: RecordSafetyEventInput,
    recordedByUser: User
  ): { success: boolean; event?: TransportSafetyEvent; error?: string } => {
    const student = studentService.getById(input.studentId);
    if (!student) {
      return { success: false, error: 'Student record not found.' };
    }

    const store = ERPStorage.get();
    const existingEvents = store.transportSafetyEvents || [];

    // Duplicate event prevention
    const existingSameEvent = existingEvents.find(
      e =>
        e.tripId === input.tripId &&
        e.studentId === input.studentId &&
        e.eventType === input.eventType
    );

    if (existingSameEvent) {
      return {
        success: false,
        error: `Duplicate safety event blocked: Student ${student.fullName} has already been recorded as '${input.eventType}' on this trip at ${existingSameEvent.timestamp}.`,
      };
    }

    // Sequence integrity check: if dropped_off, verify student was boarded
    let isFlagged = false;
    let extraNotes = input.notes || '';
    if (input.eventType === 'dropped_off') {
      const priorBoarded = existingEvents.find(
        e => e.tripId === input.tripId && e.studentId === input.studentId && e.eventType === 'boarded'
      );
      if (!priorBoarded) {
        isFlagged = true;
        extraNotes = `[EXCEPTION: Dropped off without prior boarding record] ${extraNotes}`.trim();
      }
    }

    const now = new Date();
    const formattedTimestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newEvent: TransportSafetyEvent = {
      id: `tse-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId: student.id,
      studentName: student.fullName,
      admissionNo: student.admissionNo,
      classId: student.classId,
      className: student.className,
      section: student.section,
      tripId: input.tripId,
      routeId: input.routeId,
      eventType: input.eventType,
      stopId: input.stopId,
      stopName: input.stopName || student.busStop || 'Designated Campus Stop',
      timestamp: formattedTimestamp,
      recordedByStaffId: recordedByUser.id,
      recordedByStaffName: recordedByUser.name,
      recordedByName: recordedByUser.name,
      recordedRole:
        recordedByUser.role === 'school_admin' || recordedByUser.role === 'super_admin'
          ? 'school_admin'
          : 'attendant',
      verificationMethod: input.verificationMethod || 'manual_attendant',
      notes: extraNotes,
      isFlagged,
      isExceptionFlagged: isFlagged,
    };

    store.transportSafetyEvents = [newEvent, ...existingEvents];
    ERPStorage.set(store);

    return { success: true, event: newEvent };
  },

  /**
   * Corrects a previously recorded safety event with mandatory audit trail
   */
  auditCorrectEvent: (
    eventId: string,
    correctedType: 'boarded' | 'dropped_off' | 'not_boarded' | 'exception',
    reason: string,
    authorizedUser: User
  ): { success: boolean; event?: TransportSafetyEvent; error?: string } => {
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'A justification of at least 5 characters is required for audit corrections.' };
    }

    const store = ERPStorage.get();
    const events = store.transportSafetyEvents || [];
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) {
      return { success: false, error: 'Safety event record not found.' };
    }

    const previousType = targetEvent.eventType;
    targetEvent.eventType = correctedType;
    targetEvent.auditCorrection = {
      previousType,
      correctedBy: authorizedUser.name,
      timestamp: new Date().toISOString(),
      reason: reason.trim(),
    };
    targetEvent.correctionHistory = [
      {
        previousEventType: previousType,
        correctedByName: authorizedUser.name,
        timestamp: new Date().toISOString(),
        reason: reason.trim(),
      },
      ...(targetEvent.correctionHistory || []),
    ];

    ERPStorage.set(store);
    return { success: true, event: targetEvent };
  },

  /**
   * Alias for auditCorrectEvent
   */
  correctSafetyEvent: (
    eventId: string,
    correctedType: 'boarded' | 'dropped_off' | 'not_boarded' | 'exception',
    reason: string,
    authorizedUser: User
  ): { success: boolean; event?: TransportSafetyEvent; error?: string } => {
    return safetyEventService.auditCorrectEvent(eventId, correctedType, reason, authorizedUser);
  },
};
