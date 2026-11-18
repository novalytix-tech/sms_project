// ==========================================
// Centralized Safe LocalStorage Store
// Developed by NTS Novalytix
// ==========================================

import { ERPDataStore, Institution } from '../types';
import { INITIAL_ERP_DATA } from '../data/seedData';
import { PERIOD_SLOTS } from '../utils/timetableConstants';
import { schoolMigrationService } from './schoolMigrationService';
import { httpClient } from './api/httpClient';

const STORAGE_KEY = 'nts_novalytix_school_erp_store_v1';

export class ERPStorage {
  private static cachedData: ERPDataStore | null = null;

  public static get(): ERPDataStore {
    if (this.cachedData) {
      return this.cachedData;
    }

    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        const freshClone = JSON.parse(JSON.stringify(INITIAL_ERP_DATA));
        schoolMigrationService.auditAndMigrateStore(freshClone);
        this.set(freshClone);
        return freshClone;
      }
      const parsed = JSON.parse(serialized) as ERPDataStore;
      // Basic integrity check
      if (!parsed.institutions || !parsed.students || !parsed.teachers) {
        console.warn('Corrupted ERP store detected in localStorage, resetting to initial seed data');
        schoolMigrationService.auditAndMigrateStore(INITIAL_ERP_DATA);
        this.set(INITIAL_ERP_DATA);
        return INITIAL_ERP_DATA;
      }

      // Backfill any top-level collection missing from an older or partial store,
      // so a stale browser store can never crash the app.
      (Object.keys(INITIAL_ERP_DATA) as (keyof ERPDataStore)[]).forEach(k => {
        if ((parsed as any)[k] === undefined) {
          (parsed as any)[k] = JSON.parse(JSON.stringify((INITIAL_ERP_DATA as any)[k] ?? null));
        }
      });

      // Re-seed ONLY when the data version changes — never based on record count,
      // so real imported data (even < 30 students) is never wiped on reload.
      if (!parsed.students || parsed.version !== INITIAL_ERP_DATA.version) {
        parsed.students = INITIAL_ERP_DATA.students;
        parsed.classes = INITIAL_ERP_DATA.classes;
        parsed.studentEnrollments = INITIAL_ERP_DATA.studentEnrollments;
        parsed.version = INITIAL_ERP_DATA.version;
      }

      // Backfill newly added fee collections if missing from older store
      if (!parsed.paymentTransactions) {
        parsed.paymentTransactions = INITIAL_ERP_DATA.paymentTransactions || [];
      }
      if (!parsed.feeStructures) {
        parsed.feeStructures = INITIAL_ERP_DATA.feeStructures || [];
      }
      if (!parsed.feePolicy) {
        parsed.feePolicy = INITIAL_ERP_DATA.feePolicy;
      }
      if (!parsed.staffAttendance) {
        parsed.staffAttendance = INITIAL_ERP_DATA.staffAttendance || [];
      }
      if (!parsed.admissions) {
        parsed.admissions = INITIAL_ERP_DATA.admissions || [];
      }
      if (!parsed.gradingSchemes) {
        parsed.gradingSchemes = INITIAL_ERP_DATA.gradingSchemes || [];
      }
      if (!parsed.staffGroups) {
        parsed.staffGroups = INITIAL_ERP_DATA.staffGroups || [];
      }
      if (!parsed.staffGroupMessages) {
        parsed.staffGroupMessages = INITIAL_ERP_DATA.staffGroupMessages || [];
      }
      if (!parsed.academicSessions || parsed.academicSessions.length === 0) {
        parsed.academicSessions = INITIAL_ERP_DATA.academicSessions || [];
      }
      if (!parsed.studentEnrollments || parsed.studentEnrollments.length === 0) {
        parsed.studentEnrollments = INITIAL_ERP_DATA.studentEnrollments || [];
      }
      if (!parsed.promotionBatches) {
        parsed.promotionBatches = INITIAL_ERP_DATA.promotionBatches || [];
      }
      if (!parsed.importBatches) {
        parsed.importBatches = INITIAL_ERP_DATA.importBatches || [];
      }
      if (!parsed.classGroups) {
        parsed.classGroups = INITIAL_ERP_DATA.classGroups || [];
      }
      if (!parsed.classGroupMessages) {
        parsed.classGroupMessages = INITIAL_ERP_DATA.classGroupMessages || [];
      }
      if (!parsed.transportTrips || parsed.transportTrips.length === 0) {
        parsed.transportTrips = INITIAL_ERP_DATA.transportTrips || [];
      }
      if (!parsed.transportSafetyEvents) {
        parsed.transportSafetyEvents = INITIAL_ERP_DATA.transportSafetyEvents || [];
      }
      if (!parsed.transportAlerts) {
        parsed.transportAlerts = INITIAL_ERP_DATA.transportAlerts || [];
      }
      if (!parsed.questionPapers) {
        parsed.questionPapers = INITIAL_ERP_DATA.questionPapers || [];
      }
      if (!parsed.institutions || parsed.institutions.length === 0) {
        parsed.institutions = INITIAL_ERP_DATA.institutions;
      } else {
        // Ensure all baseline member schools exist alongside any custom schools
        const instIdSet = new Set(parsed.institutions.map(i => i.id));
        INITIAL_ERP_DATA.institutions.forEach(initI => {
          if (!instIdSet.has(initI.id)) {
            parsed.institutions.push(initI);
            instIdSet.add(initI.id);
          }
        });
      }

      if (!parsed.schoolServiceConfigs) {
        parsed.schoolServiceConfigs = INITIAL_ERP_DATA.schoolServiceConfigs || [];
      }
      if (!parsed.serviceEntitlementAuditLogs) {
        parsed.serviceEntitlementAuditLogs = INITIAL_ERP_DATA.serviceEntitlementAuditLogs || [];
      }
      if (!parsed.marketingCampaigns) {
        parsed.marketingCampaigns = INITIAL_ERP_DATA.marketingCampaigns || [];
      }
      if (!parsed.marketingLeads) {
        parsed.marketingLeads = INITIAL_ERP_DATA.marketingLeads || [];
      }
      if (!parsed.marketingContentItems) {
        parsed.marketingContentItems = (INITIAL_ERP_DATA as any).marketingContentItems || [];
      }
      if (!parsed.admissionEnquiries) {
        parsed.admissionEnquiries = (INITIAL_ERP_DATA as any).admissionEnquiries || [];
      }
      if (!parsed.admissionFollowUps) {
        parsed.admissionFollowUps = (INITIAL_ERP_DATA as any).admissionFollowUps || [];
      }
      if (!parsed.admissionAssessments) {
        parsed.admissionAssessments = (INITIAL_ERP_DATA as any).admissionAssessments || [];
      }
      if (!parsed.admissionOffers) {
        parsed.admissionOffers = (INITIAL_ERP_DATA as any).admissionOffers || [];
      }
      if (!parsed.admissionCapacitySettings) {
        parsed.admissionCapacitySettings = (INITIAL_ERP_DATA as any).admissionCapacitySettings || [];
      }
      if (!parsed.admissionAuditLogs) {
        parsed.admissionAuditLogs = (INITIAL_ERP_DATA as any).admissionAuditLogs || [];
      }
      if (!parsed.academicAwards) {
        parsed.academicAwards = (INITIAL_ERP_DATA as any).academicAwards || [];
      }
      if (!parsed.staffRecognitions) {
        parsed.staffRecognitions = (INITIAL_ERP_DATA as any).staffRecognitions || [];
      }
      if (!parsed.awardCategories) {
        parsed.awardCategories = (INITIAL_ERP_DATA as any).awardCategories || [];
      }
      if (!parsed.competitionEvents) {
        parsed.competitionEvents = (INITIAL_ERP_DATA as any).competitionEvents || [];
      }
      if (!parsed.awardCertificates) {
        parsed.awardCertificates = (INITIAL_ERP_DATA as any).awardCertificates || [];
      }
      if (!parsed.notifications) {
        parsed.notifications = (INITIAL_ERP_DATA as any).notifications || [];
      }
      if (!parsed.libraryCopies || parsed.libraryCopies.length === 0) {
        parsed.libraryCopies = (INITIAL_ERP_DATA as any).libraryCopies || [];
      }
      if (!parsed.libraryMembers || parsed.libraryMembers.length === 0) {
        parsed.libraryMembers = (INITIAL_ERP_DATA as any).libraryMembers || [];
      }
      if (!parsed.libraryLoans || parsed.libraryLoans.length === 0) {
        parsed.libraryLoans = (INITIAL_ERP_DATA as any).libraryLoans || [];
      }
      if (!parsed.libraryReservations || parsed.libraryReservations.length === 0) {
        parsed.libraryReservations = (INITIAL_ERP_DATA as any).libraryReservations || [];
      }
      if (!parsed.libraryFines || parsed.libraryFines.length === 0) {
        parsed.libraryFines = (INITIAL_ERP_DATA as any).libraryFines || [];
      }
      if (!parsed.libraryInventoryAudits || parsed.libraryInventoryAudits.length === 0) {
        parsed.libraryInventoryAudits = (INITIAL_ERP_DATA as any).libraryInventoryAudits || [];
      }
      if (!parsed.libraryStaffAssignments || parsed.libraryStaffAssignments.length === 0) {
        parsed.libraryStaffAssignments = (INITIAL_ERP_DATA as any).libraryStaffAssignments || [];
      }
      if (!parsed.librarySettings) {
        parsed.librarySettings = (INITIAL_ERP_DATA as any).librarySettings;
      }


      // Safe migration: Backfill coordinates and attendants on existing transport routes
      if (parsed.transportRoutes) {
        parsed.transportRoutes.forEach(r => {
          const initR = INITIAL_ERP_DATA.transportRoutes.find(ir => ir.id === r.id);
          if (initR) {
            if (!r.schoolLatitude) r.schoolLatitude = initR.schoolLatitude;
            if (!r.schoolLongitude) r.schoolLongitude = initR.schoolLongitude;
            if (!r.attendantName) r.attendantName = initR.attendantName;
            if (!r.attendantPhone) r.attendantPhone = initR.attendantPhone;
            if (!r.currentTripId) r.currentTripId = initR.currentTripId;
            r.stops.forEach((s, sIdx) => {
              const initS = initR.stops[sIdx];
              if (initS) {
                if (!s.id) s.id = initS.id;
                if (!s.latitude) s.latitude = initS.latitude;
                if (!s.longitude) s.longitude = initS.longitude;
                if (!s.radiusMeters) s.radiusMeters = initS.radiusMeters;
                if (!s.sequenceOrder) s.sequenceOrder = initS.sequenceOrder;
              }
            });
          }
        });
      }

      // Safe migration: Backfill 8-period school timetable if older store has partial timetable
      if (parsed.timetable) {
        const existingIds = new Set(parsed.timetable.map(p => p.id));
        INITIAL_ERP_DATA.timetable.forEach(initP => {
          if (!existingIds.has(initP.id)) {
            parsed.timetable.push(initP);
          }
        });
        parsed.timetable.forEach(p => {
          const slot = PERIOD_SLOTS.find(s => s.no === p.periodNo);
          if (slot) {
            p.startTime = slot.start;
            p.endTime = slot.end;
          }
        });
      }

      // Safe migration: Ensure classes have sessionId and status
      if (parsed.classes) {
        parsed.classes.forEach(c => {
          if (!c.sessionId) {
            c.sessionId = 'sess-2026-27';
          }
          if (!c.status) {
            c.status = 'active';
          }
        });
      }

      // Safe migration: Ensure students have explicit parentId backfilled if missing
      parsed.students.forEach(stud => {
        if (!stud.parentId) {
          const seed = INITIAL_ERP_DATA.students.find(s => s.id === stud.id);
          if (seed?.parentId) {
            stud.parentId = seed.parentId;
          }
        }
        // Safe migration: Align private commute non-transport students
        if (['stud-3', 'stud-5', 'stud-7'].includes(stud.id)) {
          stud.transportRouteId = '';
          stud.busStop = '';
        }
      });

      // Strict, Idempotent Multi-School Data Isolation & Relational Migration
      // No silent fallbacks to 'inst-1' - ambiguous records are quarantined safely
      schoolMigrationService.auditAndMigrateStore(parsed);

      // Safe migration: Ensure assignments and submissions have consistent schema fields
      if (parsed.assignments) {
        parsed.assignments.forEach(asg => {
          if (asg.allowLateSubmissions === undefined) {
            asg.allowLateSubmissions = true;
          }
          if (asg.submissions) {
            asg.submissions.forEach(sub => {
              if (!sub.id) {
                sub.id = `sub-${asg.id}-${sub.studentId}`;
              }
              if (!sub.assignmentId) {
                sub.assignmentId = asg.id;
              }
              if (sub.isPublished === undefined) {
                sub.isPublished = sub.status === 'graded';
              }
              if (!sub.revisions) {
                sub.revisions = [];
              }
              if (!sub.teacherId && asg.teacherId) {
                sub.teacherId = asg.teacherId;
              }
            });
          }
        });
      }

      this.cachedData = parsed;
      return parsed;
    } catch (err) {
      console.error('Failed to read from localStorage, using seed data:', err);
      schoolMigrationService.auditAndMigrateStore(INITIAL_ERP_DATA);
      this.set(INITIAL_ERP_DATA);
      return INITIAL_ERP_DATA;
    }
  }

  public static set(data: ERPDataStore): void {
    try {
      this.cachedData = data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('nts_erp_storage_updated', { detail: data }));
    } catch (err) {
      console.error('Failed to save ERP store to localStorage:', err);
    }
  }

  public static async syncFromBackend(): Promise<boolean> {
    try {
      const res = await httpClient.get('/sync/store');
      if (res.success && res.data) {
        const current = this.get();
        // Hydrate backend entities directly from PostgreSQL 18
        if (res.data.students && res.data.students.length > 0) {
          current.students = res.data.students.map((st: any) => ({
            ...st,
            className: st.className || st.grade || 'Class 10',
            academicYear: st.academicYear || '2026-2027',
            transportRouteId: st.transportRouteId || 'route-north-1',
            busStop: st.busStop || 'Civil Lines Metro',
          }));
        }
        if (res.data.classes && res.data.classes.length > 0) {
          current.classes = res.data.classes.map((c: any) => ({
            ...c,
            classTeacherName: c.classTeacherName || c.classTeacher || 'Assigned Faculty',
            subjects: c.subjects && c.subjects.length > 0 ? c.subjects : ['Mathematics', 'Science', 'English', 'Social Studies'],
          }));
        }
        if (res.data.teachers && res.data.teachers.length > 0) {
          current.teachers = res.data.teachers.map((t: any) => ({
            ...t,
            staffId: t.staffId || t.employeeId || 'STAFF-101',
            specialization: t.specialization || t.department || 'Academics',
            assignedClasses: (t.assignedClasses && t.assignedClasses.length > 0)
              ? t.assignedClasses
              : [
                  { classId: current.classes[0]?.id || 'cls-10a', className: 'Class 10', section: 'A', subject: 'Mathematics' },
                ],
          }));
        }
        if (res.data.institutions && res.data.institutions.length > 0) {
          const backendInsts = res.data.institutions.map((inst: any) => ({
            ...inst,
            id: inst.id === 'ef673796-e678-5d31-9609-d7340362466f' ? 'inst-1' : (inst.id || 'inst-1'),
            principal: inst.principal || 'Dr. Arvind Swaminathan',
            studentCount: Number(inst.studentCount) || 1250,
            teacherCount: Number(inst.teacherCount) || 78,
          }));

          // Non-destructive merge: retain all existing institutions, user-added schools, and user-toggled statuses
          const institutionMap = new Map<string, Institution>();
          INITIAL_ERP_DATA.institutions.forEach(initI => {
            institutionMap.set(initI.id, initI);
          });
          (current.institutions || []).forEach(localI => {
            institutionMap.set(localI.id, localI);
          });
          backendInsts.forEach((bi: any) => {
            const existing = institutionMap.get(bi.id);
            if (existing) {
              institutionMap.set(bi.id, {
                ...bi,
                status: existing.status, // preserve deactivated/active status!
                studentCount: existing.studentCount || bi.studentCount,
                teacherCount: existing.teacherCount || bi.teacherCount,
              });
            } else {
              institutionMap.set(bi.id, bi);
            }
          });
          current.institutions = Array.from(institutionMap.values());
        }
        this.set(current);
        return true;
      }
    } catch (err) {
      console.debug('Backend store hydration skipped (running offline/local mode):', err);
    }
    return false;
  }

  public static reset(): ERPDataStore {
    const freshClone = JSON.parse(JSON.stringify(INITIAL_ERP_DATA));
    schoolMigrationService.auditAndMigrateStore(freshClone);
    this.set(freshClone);
    return freshClone;
  }

  public static restore(importedData: ERPDataStore): boolean {
    try {
      if (
        !importedData.institutions ||
        !importedData.students ||
        !importedData.teachers ||
        !importedData.settings
      ) {
        throw new Error('Invalid backup file schema: Missing critical collections');
      }
      this.set(importedData);
      return true;
    } catch (err) {
      console.error('Restore failed:', err);
      return false;
    }
  }
}

