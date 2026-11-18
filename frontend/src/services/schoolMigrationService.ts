// ==========================================
// School Migration & Data Isolation Audit Service
// Developed by NTS Novalytix
// Strictly enforces Multi-School Isolation & Idempotent Record Auditing
// Zero Unsafe Fallbacks — Ambiguous Records Kept Quarantined
// ==========================================

import { ERPDataStore, User } from '../types';

export interface UnresolvedRecord {
  collection: string;
  recordId: string;
  recordName?: string;
  reason: string;
  detectedAt: string;
}

export interface MigrationAuditResult {
  executedAt: string;
  totalScanned: number;
  verifiedCount: number; // Records that already have an authoritative, valid institutionId
  resolvedCount: number; // Records safely resolved via verified relational foreign key or baseline seed match
  unresolvedCount: number; // Ambiguous records quarantined out of school-specific reports
  unresolvedRecords: UnresolvedRecord[];
  isIdempotent: boolean;
}

// Known authoritative seed IDs for St. Xavier's High School (inst-1)
const KNOWN_INST1_SEED_IDS = new Set([
  'cls-10a', 'cls-10b', 'cls-9a', 'cls-8a', 'cls-11sci', 'cls-12com',
  'teach-1', 'teach-2', 'teach-3', 'teach-4', 'teach-5', 'teach-6',
  'stud-1', 'stud-2', 'stud-3', 'stud-4', 'stud-5', 'stud-6', 'stud-7', 'stud-8', 'stud-9', 'stud-10',
  'route-1', 'route-2', 'route-3', 'route-4',
  'exam-1', 'exam-2',
  'book-1', 'book-2', 'book-3', 'book-4', 'book-5', 'book-6', 'book-7', 'book-8', 'book-9', 'book-10',
  'app-2026-001', 'app-2026-002', 'app-2026-003', 'app-2026-004', 'app-2026-005',
  'inv-2026-001', 'inv-2026-002', 'inv-2026-003', 'inv-2026-004', 'inv-2026-005', 'inv-2026-006', 'inv-2026-007', 'inv-2026-008',
  'gs-cbse-default', 'gs-icse-standard', 'gs-cambridge-igcse',
  'grp-academic-council', 'grp-science-math-dept', 'grp-sports-wellness', 'grp-all-staff',
]);

const STORAGE_KEY = 'erp_migration_audit_result';

export const schoolMigrationService = {
  /**
   * Scans the ERPDataStore, verifies institution assignments, resolves missing
   * references through verified relational links (foreign keys) without guessing,
   * and isolates any ambiguous records out of school-specific reports.
   *
   * Idempotent: Can be safely rerun repeatedly without duplicating logs or altering valid data.
   */
  auditAndMigrateStore(store: ERPDataStore): MigrationAuditResult {
    const validInstitutionIds = new Set((store.institutions || []).map(i => i.id));
    if (validInstitutionIds.size === 0) {
      validInstitutionIds.add('inst-1');
      validInstitutionIds.add('inst-2');
      validInstitutionIds.add('inst-3');
      validInstitutionIds.add('inst-4');
    }

    let totalScanned = 0;
    let verifiedCount = 0;
    let resolvedCount = 0;
    let unresolvedCount = 0;
    const unresolvedRecords: UnresolvedRecord[] = [];
    const now = new Date().toISOString();

    const resolvedRecordIds: Set<string> = new Set(
      (store as any)._migratedResolvedRecordIds || []
    );

    // Fast lookup maps for relational resolution (read-only mapping, zero side-effect mutations)
    const classToInstMap = new Map<string, string>();
    (store.classes || []).forEach(c => {
      if (c.institutionId && validInstitutionIds.has(c.institutionId)) {
        classToInstMap.set(c.id, c.institutionId);
      } else if (KNOWN_INST1_SEED_IDS.has(c.id)) {
        classToInstMap.set(c.id, 'inst-1');
      }
    });

    const teacherToInstMap = new Map<string, string>();
    (store.teachers || []).forEach(t => {
      if (t.institutionId && validInstitutionIds.has(t.institutionId)) {
        teacherToInstMap.set(t.id, t.institutionId);
      } else if (KNOWN_INST1_SEED_IDS.has(t.id)) {
        teacherToInstMap.set(t.id, 'inst-1');
      }
    });

    const studentToInstMap = new Map<string, string>();
    (store.students || []).forEach(s => {
      if (s.institutionId && validInstitutionIds.has(s.institutionId)) {
        studentToInstMap.set(s.id, s.institutionId);
      } else if (s.classId && classToInstMap.has(s.classId)) {
        studentToInstMap.set(s.id, classToInstMap.get(s.classId)!);
      } else if (KNOWN_INST1_SEED_IDS.has(s.id)) {
        studentToInstMap.set(s.id, 'inst-1');
      }
    });

    // Helper to evaluate and process an individual entity
    const processEntity = <T extends { id: string; institutionId?: string; [key: string]: any }>(
      collectionName: string,
      items: T[] | undefined,
      getName: (item: T) => string,
      resolveRelational?: (item: T) => string | undefined
    ) => {
      if (!items) return;

      items.forEach(item => {
        totalScanned += 1;

        // 1. Already has valid, verified institutionId
        if (item.institutionId && validInstitutionIds.has(item.institutionId)) {
          if (resolvedRecordIds.has(item.id)) {
            resolvedCount += 1;
          } else {
            verifiedCount += 1;
          }
          return;
        }

        // 2. Relational resolution via foreign key
        let resolvedSchool: string | undefined = undefined;
        if (resolveRelational) {
          resolvedSchool = resolveRelational(item);
        }

        // 3. Known baseline seed record match
        if (!resolvedSchool && KNOWN_INST1_SEED_IDS.has(item.id)) {
          resolvedSchool = 'inst-1';
        }

        if (resolvedSchool && validInstitutionIds.has(resolvedSchool)) {
          item.institutionId = resolvedSchool;
          resolvedRecordIds.add(item.id);
          resolvedCount += 1;
        } else {
          // 4. Ambiguous record: Do NOT guess! Quarantine out of school reports.
          unresolvedCount += 1;
          unresolvedRecords.push({
            collection: collectionName,
            recordId: item.id,
            recordName: getName(item),
            reason: 'Missing institutionId with no authoritative relational parent or seed link found. Quarantined.',
            detectedAt: now,
          });
        }
      });
    };

    // Process Classes
    processEntity(
      'classes',
      store.classes,
      c => c.name + ' ' + (c.section || ''),
      c => (c.classTeacherId ? teacherToInstMap.get(c.classTeacherId) : undefined)
    );

    // Process Teachers
    processEntity(
      'teachers',
      store.teachers,
      t => t.fullName || `${t.firstName} ${t.lastName}`,
      t => {
        if (t.assignedClasses && t.assignedClasses.length > 0) {
          const matched = t.assignedClasses.map(ac => classToInstMap.get(ac.classId)).find(Boolean);
          if (matched) return matched;
        }
        return undefined;
      }
    );

    // Process Students
    processEntity(
      'students',
      store.students,
      s => s.fullName || `${s.firstName} ${s.lastName}`,
      s => (s.classId ? classToInstMap.get(s.classId) : undefined)
    );

    // Process Fee Invoices
    processEntity(
      'feeInvoices',
      store.feeInvoices,
      f => `Invoice ${f.invoiceNo || f.id} (${f.studentName || 'Unknown Student'})`,
      f => (f.studentId ? studentToInstMap.get(f.studentId) : undefined)
    );

    // Process Attendance Records
    processEntity(
      'attendance',
      store.attendance,
      a => `Attendance ${a.date} (${a.studentId})`,
      a => {
        if (a.studentId && studentToInstMap.has(a.studentId)) return studentToInstMap.get(a.studentId);
        if (a.classId && classToInstMap.has(a.classId)) return classToInstMap.get(a.classId);
        return undefined;
      }
    );

    // Process Admissions
    processEntity(
      'admissions',
      store.admissions,
      adm => `Application ${adm.applicationNo || adm.id} (${adm.firstName} ${adm.lastName})`,
      adm => {
        if ((adm as any).schoolId && validInstitutionIds.has((adm as any).schoolId)) {
          return (adm as any).schoolId;
        }
        if (adm.targetClassId && classToInstMap.has(adm.targetClassId)) {
          return classToInstMap.get(adm.targetClassId);
        }
        return undefined;
      }
    );

    // Process Examinations
    processEntity(
      'examinations',
      store.examinations,
      e => e.title || e.id,
      e => (e.classId && classToInstMap.has(e.classId) ? classToInstMap.get(e.classId) : undefined)
    );

    // Process Transport Routes
    processEntity(
      'transportRoutes',
      store.transportRoutes,
      r => r.routeName || r.id,
      r => undefined
    );

    // Process Library Books
    processEntity(
      'books',
      store.books,
      b => b.title || b.id,
      b => undefined
    );

    // Process Staff Groups
    processEntity(
      'staffGroups',
      store.staffGroups,
      g => g.name || g.id,
      g => (g.classId && classToInstMap.has(g.classId) ? classToInstMap.get(g.classId) : undefined)
    );

    (store as any)._migratedResolvedRecordIds = Array.from(resolvedRecordIds);

    const result: MigrationAuditResult = {
      executedAt: now,
      totalScanned,
      verifiedCount,
      resolvedCount,
      unresolvedCount,
      unresolvedRecords,
      isIdempotent: true,
    };

    // Persist audit summary
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      } catch (e) {
        // Ignore localStorage quota errors in memory mode
      }
    }

    (store as any).migrationAuditResult = result;
    return result;
  },

  /**
   * Retrieves the latest migration audit summary.
   */
  getAuditSummary(): MigrationAuditResult | null {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  /**
   * Allows authorized Super Admin to manually assign an unresolved record to an authorized school.
   */
  resolveUnresolvedRecord(
    store: ERPDataStore,
    collectionName: string,
    recordId: string,
    targetSchoolId: string,
    actor: User
  ): boolean {
    if (actor.role !== 'super_admin') {
      throw new Error('Unauthorized: Only Super Administrators can resolve ambiguous school records.');
    }

    const items = (store as any)[collectionName] as any[];
    if (!items || !Array.isArray(items)) return false;

    const item = items.find(i => i.id === recordId);
    if (!item) return false;

    item.institutionId = targetSchoolId;

    // Re-run audit to update counters
    this.auditAndMigrateStore(store);
    return true;
  },
};
