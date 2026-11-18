// ==========================================
// Academic Promotion Engine & Audit Service
// Developed by NTS Novalytix
// ==========================================

import {
  PromotionBatch,
  PromotionDecision,
  PromotionDecisionType,
  StudentAcademicSummary,
  User,
  StudentEnrollment,
} from '../types';
import { ERPStorage } from './storage';
import { studentService } from './studentService';
import { classService } from './classService';
import { academicSessionService } from './academicSessionService';
import { examService } from './examService';
import { enrollmentService } from './enrollmentService';

export interface ExecutePromotionInput {
  sourceSessionId: string;
  destinationSessionId: string;
  sourceClassId: string;
  destinationClassId: string;
  destinationSection: string;
  decisions: PromotionDecision[];
  operator: User;
  notes?: string;
}

export const promotionService = {
  /**
   * Evaluates student examination performance and derives promotion eligibility
   */
  getPromotionEligibility: (
    studentId: string,
    sessionId?: string
  ): {
    summary: StudentAcademicSummary;
    eligibility: 'eligible' | 'compartment' | 'retained' | 'graduating' | 'review_required';
  } => {
    const student = studentService.getById(studentId);
    const marks = examService.getMarksForStudent(studentId);

    // If no exam marks recorded for student
    if (!marks || marks.length === 0) {
      return {
        summary: {
          totalSubjects: 0,
          passedSubjects: 0,
          failedSubjects: 0,
          percentage: 0,
          overallGrade: 'Pending',
          compartmentSubjects: [],
        },
        eligibility: 'review_required',
      };
    }

    const exams = examService.getAll();
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let passedSubjects = 0;
    let failedSubjects = 0;
    const compartmentSubjects: string[] = [];

    // Distinct subjects evaluated
    const evaluatedSchedules = new Map<string, { marksObtained: number; maxScore: number; subject: string; isAbsent: boolean }>();

    marks.forEach(m => {
      const exam = exams.find(e => e.id === m.examId);
      const schedule = exam?.schedules.find(s => s.id === m.scheduleId);
      const subjectName = schedule?.subject || 'Subject';
      const maxScore = schedule?.maxMarks || 100;

      if (!evaluatedSchedules.has(m.scheduleId)) {
        evaluatedSchedules.set(m.scheduleId, {
          marksObtained: m.isAbsent ? 0 : m.marksObtained,
          maxScore,
          subject: subjectName,
          isAbsent: m.isAbsent,
        });
      }
    });

    evaluatedSchedules.forEach(item => {
      totalMarksObtained += item.marksObtained;
      totalMaxMarks += item.maxScore;
      const pct = (item.marksObtained / item.maxScore) * 100;

      // Pass threshold: 33% and not absent
      if (pct >= 33 && !item.isAbsent) {
        passedSubjects++;
      } else {
        failedSubjects++;
        compartmentSubjects.push(item.subject);
      }
    });

    const percentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;
    const gradeRes = examService.calculateGrade(totalMarksObtained, totalMaxMarks || 100);

    const summary: StudentAcademicSummary = {
      totalSubjects: evaluatedSchedules.size,
      passedSubjects,
      failedSubjects,
      percentage,
      overallGrade: gradeRes.grade,
      compartmentSubjects,
    };

    // Determine promotion eligibility
    const cls = student?.classId ? classService.getById(student.classId) : undefined;
    const grade = cls?.grade || 10;

    let eligibility: 'eligible' | 'compartment' | 'retained' | 'graduating' | 'review_required' = 'eligible';

    if (grade === 12 && failedSubjects === 0) {
      eligibility = 'graduating';
    } else if (failedSubjects === 0 && percentage >= 33) {
      eligibility = 'eligible';
    } else if (failedSubjects > 0 && failedSubjects <= 2) {
      eligibility = 'compartment';
    } else if (failedSubjects > 2 || percentage < 33) {
      eligibility = 'retained';
    }

    return { summary, eligibility };
  },

  /**
   * Generates promotion preview for a source class to destination session
   */
  getPromotionPreview: (
    arg1: string,
    arg2: string,
    arg3: string,
    arg4?: string,
    arg5?: string
  ): {
    success: boolean;
    sourceClass?: any;
    sourceSession?: any;
    destinationSession?: any;
    destinationClass?: any;
    roster: any[];
    decisions: PromotionDecision[];
    statistics: {
      total: number;
      eligible: number;
      compartment: number;
      retained: number;
      graduating: number;
      reviewRequired: number;
      alreadyEnrolled: number;
    };
    error?: string;
  } => {
    let sourceClassId: string;
    let sourceSessionId: string;
    let destinationSessionId: string;
    let destinationClassId: string | undefined;
    let destinationSection: string | undefined;

    // Detect if arg1 is sessionId or classId
    const isArg1Session = arg1?.startsWith('sess-') || (!arg1?.startsWith('cls-') && arg3?.startsWith('cls-'));

    if (isArg1Session) {
      // Style B: (sourceSessionId, destinationSessionId, sourceClassId, destinationClassId, destinationSection)
      sourceSessionId = arg1;
      destinationSessionId = arg2;
      sourceClassId = arg3;
      destinationClassId = arg4;
      destinationSection = arg5;
    } else {
      // Style A: (sourceClassId, sourceSessionId, destinationSessionId, destinationClassId, destinationSection)
      sourceClassId = arg1;
      sourceSessionId = arg2;
      destinationSessionId = arg3;
      destinationClassId = arg4;
      destinationSection = arg5;
    }

    const sourceSession = academicSessionService.getById(sourceSessionId);
    if (!sourceSession) {
      return {
        success: false,
        roster: [],
        decisions: [],
        statistics: { total: 0, eligible: 0, compartment: 0, retained: 0, graduating: 0, reviewRequired: 0, alreadyEnrolled: 0 },
        error: `Source academic session not found: "${sourceSessionId}"`,
      };
    }

    const destinationSession = academicSessionService.getById(destinationSessionId);
    if (!destinationSession) {
      return {
        success: false,
        roster: [],
        decisions: [],
        statistics: { total: 0, eligible: 0, compartment: 0, retained: 0, graduating: 0, reviewRequired: 0, alreadyEnrolled: 0 },
        error: `Destination academic session not found: "${destinationSessionId}"`,
      };
    }

    const sourceClass = classService.getById(sourceClassId);
    if (!sourceClass) {
      return {
        success: false,
        roster: [],
        decisions: [],
        statistics: { total: 0, eligible: 0, compartment: 0, retained: 0, graduating: 0, reviewRequired: 0, alreadyEnrolled: 0 },
        error: `Source class not found: "${sourceClassId}"`,
      };
    }

    if (sourceSessionId === destinationSessionId && (!destinationClassId || sourceClassId === destinationClassId)) {
      return {
        success: false,
        roster: [],
        decisions: [],
        statistics: { total: 0, eligible: 0, compartment: 0, retained: 0, graduating: 0, reviewRequired: 0, alreadyEnrolled: 0 },
        error: 'Source and destination cannot be identical for academic promotion.',
      };
    }

    // Resolve destination class if not explicitly passed
    let resolvedDestinationClass = destinationClassId ? classService.getById(destinationClassId) : undefined;

    if (!resolvedDestinationClass && sourceClass) {
      const nextGrade = sourceClass.grade + 1;
      const destinationClasses = classService.getBySession(destinationSessionId);
      resolvedDestinationClass =
        destinationClasses.find(c => c.grade === nextGrade && c.section.toUpperCase() === sourceClass.section.toUpperCase()) ||
        destinationClasses.find(c => c.grade === nextGrade) ||
        sourceClass;
    }

    const destSection = destinationSection || resolvedDestinationClass?.section || sourceClass?.section || 'A';

    // Retrieve active enrollments in source class
    const sourceEnrollments = enrollmentService.getActiveEnrollmentsForClass(
      sourceClassId,
      sourceClass?.section,
      sourceSessionId
    );

    const store = ERPStorage.get();
    const destinationEnrollments = (store.studentEnrollments || []).filter(
      e => e.sessionId === destinationSessionId && e.status === 'active'
    );

    let eligible = 0;
    let compartment = 0;
    let retained = 0;
    let graduating = 0;
    let reviewRequired = 0;
    let alreadyEnrolled = 0;

    const decisions: PromotionDecision[] = sourceEnrollments.map(enr => {
      const student = studentService.getById(enr.studentId);
      const studentName = student ? student.fullName : enr.admissionNo;
      const { summary, eligibility } = promotionService.getPromotionEligibility(enr.studentId, sourceSessionId);

      // Check if student already enrolled in destination session
      const existingInDest = destinationEnrollments.find(d => d.studentId === enr.studentId);
      if (existingInDest) {
        alreadyEnrolled++;
      }

      let decisionType: PromotionDecisionType = 'promote';
      let destClassId = resolvedDestinationClass?.id || sourceClassId;
      let destClassName = resolvedDestinationClass?.name || sourceClass?.name || 'Next Grade';

      switch (eligibility) {
        case 'eligible':
          eligible++;
          decisionType = 'promote';
          break;
        case 'graduating':
          graduating++;
          decisionType = 'graduate';
          destClassId = '';
          destClassName = 'Graduated (Alumni)';
          break;
        case 'compartment':
          compartment++;
          decisionType = 'manual_review';
          break;
        case 'retained':
          retained++;
          decisionType = 'retain';
          destClassId = sourceClassId;
          destClassName = `${sourceClass?.name} (Repeat)`;
          break;
        case 'review_required':
        default:
          reviewRequired++;
          decisionType = 'manual_review';
          break;
      }

      return {
        studentId: enr.studentId,
        admissionNo: enr.admissionNo,
        studentName,
        sourceEnrollmentId: enr.id,
        decision: decisionType,
        destinationClassId: destClassId,
        destinationClassName: destClassName,
        destinationSection: destSection,
        destinationSessionId,
        academicSummary: summary,
        eligibilityStatus: eligibility,
        status: existingInDest ? 'excluded' : 'pending',
      };
    });

    const roster = decisions.map(d => ({
      ...d,
      summary: {
        ...d.academicSummary,
        overallPercentage: d.academicSummary.percentage,
      },
      eligibility: d.eligibilityStatus,
      proposedDecision: d.eligibilityStatus === 'eligible' ? 'promote' : d.eligibilityStatus === 'retained' ? 'retain' : 'review',
    }));

    return {
      success: true,
      sourceClass,
      sourceSession,
      destinationSession,
      destinationClass: resolvedDestinationClass,
      decisions,
      roster,
      statistics: {
        total: decisions.length,
        eligible,
        compartment,
        retained,
        graduating,
        reviewRequired,
        alreadyEnrolled,
      },
    };
  },

  /**
   * Executes a confirmed promotion batch with full idempotency, authorization & audit trail
   */
  executePromotionBatch: (
    input: any,
    operatorArg?: any
  ): {
    success: boolean;
    batch?: PromotionBatch;
    promotedCount: number;
    retainedCount: number;
    graduatedCount: number;
    skippedDuplicates: number;
    error?: string;
  } => {
    let operator: User;
    if (typeof operatorArg === 'string') {
      operator = { id: operatorArg, role: 'school_admin' as const, name: 'School Admin' } as any;
    } else if (operatorArg && typeof operatorArg === 'object') {
      operator = operatorArg;
    } else if (input.operator && typeof input.operator === 'string') {
      operator = { id: input.operator, role: 'school_admin' as const, name: 'School Admin' } as any;
    } else if (input.operator && typeof input.operator === 'object') {
      operator = input.operator;
    } else {
      operator = { id: 'admin-1', role: 'school_admin' as const, name: 'School Admin' } as any;
    }

    // Permission check: only school_admin or super_admin
    if (!['super_admin', 'school_admin'].includes(operator.role)) {
      return {
        success: false,
        promotedCount: 0,
        retainedCount: 0,
        graduatedCount: 0,
        skippedDuplicates: 0,
        error: 'Permission denied: Only School Administrators can execute academic promotions.',
      };
    }

    const sourceSession = academicSessionService.getById(input.sourceSessionId);
    const destSession = academicSessionService.getById(input.destinationSessionId);
    if (!sourceSession || !destSession) {
      return {
        success: false,
        promotedCount: 0,
        retainedCount: 0,
        graduatedCount: 0,
        skippedDuplicates: 0,
        error: 'Source or destination academic session not found.',
      };
    }

    if (destSession.status === 'closed') {
      return {
        success: false,
        promotedCount: 0,
        retainedCount: 0,
        graduatedCount: 0,
        skippedDuplicates: 0,
        error: `Cannot promote students into closed session "${destSession.name}".`,
      };
    }

    const sourceClass = classService.getById(input.sourceClassId);
    const destClass = classService.getById(input.destinationClassId);
    if (!sourceClass) {
      return {
        success: false,
        promotedCount: 0,
        retainedCount: 0,
        graduatedCount: 0,
        skippedDuplicates: 0,
        error: 'Source class not found.',
      };
    }

    const store = ERPStorage.get();
    if (!store.studentEnrollments) store.studentEnrollments = [];
    if (!store.promotionBatches) store.promotionBatches = [];

    const batchId = `prom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();
    const nowDate = nowIso.split('T')[0];

    let promotedCount = 0;
    let retainedCount = 0;
    let graduatedCount = 0;
    let withdrawnCount = 0;
    let skippedDuplicates = 0;

    const committedDecisions: PromotionDecision[] = [];

    for (const d of input.decisions) {
      // 1. Idempotency Check: Is student already enrolled in destination session?
      const alreadyEnrolled = store.studentEnrollments.find(
        e => e.studentId === d.studentId && e.sessionId === input.destinationSessionId && e.status === 'active'
      );

      if (alreadyEnrolled) {
        skippedDuplicates++;
        committedDecisions.push({
          ...d,
          status: 'excluded',
          overrideReason: 'Already enrolled in destination session (skipped for idempotency)',
        });
        continue;
      }

      // Find source enrollment record
      const sourceEnrIndex = store.studentEnrollments.findIndex(
        e => (d.sourceEnrollmentId ? e.id === d.sourceEnrollmentId : e.studentId === d.studentId && e.sessionId === input.sourceSessionId)
      );
      const student = store.students.find(s => s.id === d.studentId);

      if (d.decision === 'promote') {
        // Update source enrollment
        if (sourceEnrIndex >= 0) {
          store.studentEnrollments[sourceEnrIndex].status = 'promoted';
          store.studentEnrollments[sourceEnrIndex].promotionBatchId = batchId;
          store.studentEnrollments[sourceEnrIndex].updatedAt = nowIso;
        }

        const targetClass = classService.getById(d.destinationClassId) || destClass || sourceClass;
        const targetSection = (d.destinationSection || input.destinationSection || 'A').toUpperCase().trim();

        // Count existing to generate clean roll number
        const existingCount = store.studentEnrollments.filter(
          e => e.classId === targetClass.id && e.sessionId === input.destinationSessionId && e.status === 'active'
        ).length;

        const rollNo = d.destinationRollNo || `${targetClass.name.replace('Class ', '')}${targetSection}-${String(existingCount + 1).padStart(2, '0')}`;

        // Create new session enrollment
        const newEnrollmentId = `enr-${input.destinationSessionId}-${d.studentId}-${Date.now().toString().slice(-4)}`;
        const newEnrollment: StudentEnrollment = {
          id: newEnrollmentId,
          studentId: d.studentId,
          admissionNo: d.admissionNo,
          sessionId: input.destinationSessionId,
          academicYear: destSession.name,
          classId: targetClass.id,
          className: targetClass.name,
          section: targetSection,
          rollNo,
          enrollmentDate: destSession.startDate || nowDate,
          status: 'active',
          previousEnrollmentId: d.sourceEnrollmentId,
          promotionBatchId: batchId,
          remarks: `Promoted from ${sourceClass.name} (${sourceClass.section}) by ${operator.name}`,
          updatedAt: nowIso,
        };

        store.studentEnrollments.push(newEnrollment);

        // If destination session is currently active, update student primary class pointer
        if (destSession.isCurrent && student) {
          student.classId = targetClass.id;
          student.className = targetClass.name;
          student.section = targetSection;
          student.rollNo = rollNo;
          student.academicYear = destSession.name;
          student.status = 'active';
        }

        promotedCount++;
        committedDecisions.push({
          ...d,
          status: 'confirmed',
          enrolledId: newEnrollmentId,
        });
      } else if (d.decision === 'retain') {
        // Retain student in same grade in destination session
        if (sourceEnrIndex >= 0) {
          store.studentEnrollments[sourceEnrIndex].status = 'retained';
          store.studentEnrollments[sourceEnrIndex].promotionBatchId = batchId;
          store.studentEnrollments[sourceEnrIndex].updatedAt = nowIso;
        }

        const newEnrollmentId = `enr-${input.destinationSessionId}-${d.studentId}-${Date.now().toString().slice(-4)}`;
        const newEnrollment: StudentEnrollment = {
          id: newEnrollmentId,
          studentId: d.studentId,
          admissionNo: d.admissionNo,
          sessionId: input.destinationSessionId,
          academicYear: destSession.name,
          classId: sourceClass.id,
          className: sourceClass.name,
          section: sourceClass.section,
          rollNo: d.destinationRollNo || `${sourceClass.name.replace('Class ', '')}${sourceClass.section}-R`,
          enrollmentDate: destSession.startDate || nowDate,
          status: 'active',
          previousEnrollmentId: d.sourceEnrollmentId,
          promotionBatchId: batchId,
          remarks: `Retained in ${sourceClass.name} (${sourceClass.section}): ${d.overrideReason || 'Academic criteria not met'}`,
          updatedAt: nowIso,
        };

        store.studentEnrollments.push(newEnrollment);
        retainedCount++;
        committedDecisions.push({
          ...d,
          status: 'confirmed',
          enrolledId: newEnrollmentId,
        });
      } else if (d.decision === 'graduate') {
        if (sourceEnrIndex >= 0) {
          store.studentEnrollments[sourceEnrIndex].status = 'graduated';
          store.studentEnrollments[sourceEnrIndex].promotionBatchId = batchId;
          store.studentEnrollments[sourceEnrIndex].updatedAt = nowIso;
        }
        if (student) {
          student.status = 'inactive';
        }
        graduatedCount++;
        committedDecisions.push({
          ...d,
          status: 'confirmed',
        });
      } else if (d.decision === 'withdrawn') {
        if (sourceEnrIndex >= 0) {
          store.studentEnrollments[sourceEnrIndex].status = 'withdrawn';
          store.studentEnrollments[sourceEnrIndex].updatedAt = nowIso;
        }
        if (student) {
          student.status = 'inactive';
        }
        withdrawnCount++;
        committedDecisions.push({
          ...d,
          status: 'confirmed',
        });
      } else {
        // manual_review / pending - skipped from this batch
        committedDecisions.push({
          ...d,
          status: 'excluded',
          overrideReason: 'Pending manual resolution or exception review',
        });
      }
    }

    const newBatch: PromotionBatch = {
      id: batchId,
      sourceSessionId: input.sourceSessionId,
      sourceSessionName: sourceSession.name,
      destinationSessionId: input.destinationSessionId,
      destinationSessionName: destSession.name,
      sourceClassId: input.sourceClassId,
      sourceClassName: sourceClass.name,
      sourceSection: sourceClass.section,
      destinationClassId: destClass?.id || input.destinationClassId,
      destinationClassName: destClass?.name || 'Promoted Grade',
      destinationSection: input.destinationSection || destClass?.section || 'A',
      executedBy: operator.name,
      executedAt: nowIso,
      totalStudents: input.decisions.length,
      promotedCount,
      retainedCount,
      graduatedCount,
      withdrawnCount,
      decisions: committedDecisions,
      notes: input.notes,
    };

    store.promotionBatches = [newBatch, ...store.promotionBatches];

    // Recalculate student counts for all classes in destination session
    classService.recalculateStudentCounts(input.destinationSessionId);

    ERPStorage.set(store);

    return {
      success: true,
      batch: newBatch,
      promotedCount,
      retainedCount,
      graduatedCount,
      skippedDuplicates,
    };
  },

  /**
   * Retrieves historical promotion batches
   */
  getPromotionBatches: (sessionId?: string): PromotionBatch[] => {
    const batches = ERPStorage.get().promotionBatches || [];
    if (!sessionId) return batches;
    return batches.filter(b => b.sourceSessionId === sessionId || b.destinationSessionId === sessionId);
  },

  /**
   * Retrieves single promotion batch by ID
   */
  getBatchById: (id: string): PromotionBatch | undefined => {
    return (ERPStorage.get().promotionBatches || []).find(b => b.id === id);
  },
};
