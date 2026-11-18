// ==========================================
// Question Paper Management Service
// Developed by NTS Novalytix
// Strict Confidentiality, Unified Review Workflow & Auditing
// ==========================================

import { ERPStorage } from './storage';
import { User } from '../types';
import { QuestionPaper, QuestionPaperPreparationMethod, QuestionPaperStatus, ERPQuestionPaperContent, QuestionPaperImagePage, QuestionPaperVersionSnapshot, QuestionPaperReviewRecord } from '../types/questionPaper';
import { todayISO } from '../utils/date';

/**
 * Validates if the user is the authorized School Principal.
 * Only the designated Principal has administrative authority over confidential question papers.
 */
export function isAuthorizedPrincipal(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Principal check: Must have school_admin or super_admin role AND match principal ID or email
  const isSchoolOrSuperAdmin = user.role === 'school_admin' || user.role === 'super_admin';
  if (!isSchoolOrSuperAdmin) return false;

  const isExplicitPrincipalId = user.id === 'user-school-admin';
  const hasPrincipalEmail = (user.email || '').toLowerCase().includes('principal');
  const hasPrincipalName = (user.name || '').toLowerCase().includes('swaminathan') || (user.name || '').toLowerCase().includes('principal');

  return isExplicitPrincipalId || hasPrincipalEmail || hasPrincipalName;
}

/**
 * Checks whether a given teacher can access a specific question paper.
 * Rules:
 * - Authorized Principal has oversight access.
 * - Author teacher can access their own papers.
 * - Students, Parents, Suppliers, and unrelated teachers have ZERO access.
 */
export function canTeacherAccessPaper(paper: QuestionPaper, user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAuthorizedPrincipal(user)) return true;

  if (user.role === 'teacher') {
    const teacherId = user.referenceId || user.id;
    return (
      paper.teacherId === teacherId ||
      paper.teacherEmail.toLowerCase() === (user.email || '').toLowerCase()
    );
  }

  return false;
}

/**
 * Confidentiality guard: throws error if user cannot view/access the paper.
 */
export function assertPaperAccess(paper: QuestionPaper, user: User | null | undefined): void {
  if (!user) {
    throw new Error('Confidentiality violation: Authentication required to view question papers.');
  }
  if (!canTeacherAccessPaper(paper, user)) {
    throw new Error('Confidentiality violation: You are not authorized to view or edit this question paper.');
  }
}

/**
 * Principal guard: throws error if user is not the authorized School Principal.
 */
export function assertAuthorizedPrincipal(user: User | null | undefined): void {
  if (!user || !isAuthorizedPrincipal(user)) {
    throw new Error('Unauthorized: This action is strictly restricted to the authorized School Principal.');
  }
}

/**
 * Helper to calculate total marks across all questions in an ERP paper.
 */
export function calculateErpTotalMarks(erpContent?: ERPQuestionPaperContent): number {
  if (!erpContent || !erpContent.sections) return 0;
  return erpContent.sections.reduce((sectionTotal, section) => {
    const qTotal = (section.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    return sectionTotal + qTotal;
  }, 0);
}

/**
 * Validates a question paper before submission for Principal review.
 */
export function validatePaperForSubmission(paper: QuestionPaper): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!paper.title || paper.title.trim().length === 0) {
    errors.push('Question paper title is required.');
  }
  if (!paper.paperCode || paper.paperCode.trim().length === 0) {
    errors.push('Paper code is required.');
  }
  if (!paper.subject || paper.subject.trim().length === 0) {
    errors.push('Subject must be specified.');
  }
  if (!paper.className || paper.className.trim().length === 0) {
    errors.push('Target class must be specified.');
  }
  if (!paper.maxMarks || paper.maxMarks <= 0) {
    errors.push('Maximum marks must be greater than zero.');
  }
  if (!paper.durationMinutes || paper.durationMinutes <= 0) {
    errors.push('Exam duration must be greater than zero minutes.');
  }

  // Method-specific checks
  if (paper.preparationMethod === 'erp_editor') {
    if (!paper.erpContent || !paper.erpContent.sections || paper.erpContent.sections.length === 0) {
      errors.push('At least one examination section is required.');
    } else {
      const totalQuestions = paper.erpContent.sections.reduce(
        (sum, s) => sum + (s.questions ? s.questions.length : 0),
        0
      );
      if (totalQuestions === 0) {
        errors.push('At least one examination question must be added.');
      }
      const calculatedMarks = calculateErpTotalMarks(paper.erpContent);
      if (calculatedMarks !== paper.maxMarks) {
        errors.push(
          `Sum of question marks (${calculatedMarks}) does not match paper maximum marks (${paper.maxMarks}).`
        );
      }
    }
  } else if (paper.preparationMethod === 'pdf_upload') {
    if (!paper.pdfAttachment || !paper.pdfAttachment.fileName) {
      errors.push('A valid PDF document must be uploaded before submission.');
    }
    if (paper.pdfAttachment && paper.pdfAttachment.fileSize > 15 * 1024 * 1024) {
      errors.push('PDF file size exceeds maximum permitted limit of 15 MB.');
    }
  } else if (paper.preparationMethod === 'image_upload') {
    if (!paper.imagePages || paper.imagePages.length === 0) {
      errors.push('At least one scanned question paper image page must be uploaded.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates an immutable snapshot of the current paper state.
 */
function createSnapshot(paper: QuestionPaper, savedByUser: User, summary?: string): QuestionPaperVersionSnapshot {
  return {
    versionNumber: paper.currentVersion,
    statusAtSnapshot: paper.status,
    preparationMethod: paper.preparationMethod,
    title: paper.title,
    maxMarks: paper.maxMarks,
    durationMinutes: paper.durationMinutes,
    generalInstructions: paper.erpContent ? [...paper.erpContent.generalInstructions] : [],
    syllabusTopics: paper.erpContent ? paper.erpContent.syllabusTopics : '',
    erpContent: paper.erpContent ? JSON.parse(JSON.stringify(paper.erpContent)) : undefined,
    pdfAttachment: paper.pdfAttachment ? { ...paper.pdfAttachment } : undefined,
    imagePages: paper.imagePages ? JSON.parse(JSON.stringify(paper.imagePages)) : undefined,
    savedAt: new Date().toISOString(),
    savedByUserId: savedByUser.id,
    savedByUserName: savedByUser.name,
    changeSummary: summary || `Snapshot of Version ${paper.currentVersion} (${paper.status})`,
  };
}

/**
 * Strips confidential Principal comments, review logs, and audit trails
 * for formal student-facing examination printing.
 */
export function getPrintablePaperData(paperId: string, user: User): Partial<QuestionPaper> {
  const paper = QuestionPaperService.getPaperById(paperId, user);
  if (!paper) {
    throw new Error('Question paper not found.');
  }

  // Deep clone to prevent mutating original data
  const sanitized: Partial<QuestionPaper> = {
    id: paper.id,
    paperCode: paper.paperCode,
    academicYear: paper.academicYear,
    examTitle: paper.examTitle,
    examType: paper.examType,
    className: paper.className,
    section: paper.section,
    subject: paper.subject,
    title: paper.title,
    examDate: paper.examDate,
    durationMinutes: paper.durationMinutes,
    maxMarks: paper.maxMarks,
    currentVersion: paper.currentVersion,
    preparationMethod: paper.preparationMethod,
    erpContent: paper.erpContent
      ? {
          generalInstructions: [...(paper.erpContent.generalInstructions || [])],
          syllabusTopics: paper.erpContent.syllabusTopics,
          sections: paper.erpContent.sections.map((sec) => ({
            id: sec.id,
            sectionTitle: sec.sectionTitle,
            instructions: sec.instructions,
            questions: sec.questions.map((q) => ({
              id: q.id,
              questionNumber: q.questionNumber,
              questionType: q.questionType,
              questionText: q.questionText,
              marks: q.marks,
              options: q.options ? q.options.map((opt) => ({ ...opt })) : undefined,
              hasInternalChoice: q.hasInternalChoice,
              orQuestionText: q.orQuestionText,
              orOptions: q.orOptions ? q.orOptions.map((opt) => ({ ...opt })) : undefined,
              orMarks: q.orMarks,
              subQuestions: q.subQuestions ? q.subQuestions.map((sq) => ({ ...sq })) : undefined,
              imageUrl: q.imageUrl,
              // Strictly omit correctAnswer and explanation from printable student paper
            })),
          })),
        }
      : undefined,
    pdfAttachment: paper.pdfAttachment ? { ...paper.pdfAttachment } : undefined,
    imagePages: paper.imagePages ? JSON.parse(JSON.stringify(paper.imagePages)) : undefined,
  };

  return sanitized;
}

export const QuestionPaperService = {
  /**
   * Retrieves all question papers from storage.
   */
  getAllPapers(): QuestionPaper[] {
    const store = ERPStorage.get();
    return store.questionPapers || [];
  },

  /**
   * Retrieves question papers belonging to a specific teacher.
   * Access check: only the teacher or the authorized Principal can call this.
   */
  getPapersForTeacher(teacherRefOrId: string, user: User): QuestionPaper[] {
    if (!user) throw new Error('Authentication required.');

    const isPrincipal = isAuthorizedPrincipal(user);
    const userTeacherId = user.referenceId || user.id;

    if (!isPrincipal && userTeacherId !== teacherRefOrId) {
      throw new Error('Confidentiality violation: Teachers can only access their own assigned question papers.');
    }

    const all = this.getAllPapers();
    return all.filter(
      (p) =>
        p.teacherId === teacherRefOrId ||
        p.teacherEmail.toLowerCase() === (user.email || '').toLowerCase()
    );
  },

  /**
   * Retrieves the Principal review queue with strict authorization enforcement.
   * Unauthorized users (students, parents, suppliers, other teachers, non-principal admins)
   * are completely blocked.
   */
  getPrincipalReviewQueue(
    user: User,
    filters?: {
      status?: QuestionPaperStatus | 'all';
      method?: QuestionPaperPreparationMethod | 'all';
      classId?: string;
      subject?: string;
      search?: string;
    }
  ): QuestionPaper[] {
    assertAuthorizedPrincipal(user);

    let papers = this.getAllPapers();

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        papers = papers.filter((p) => p.status === filters.status);
      }
      if (filters.method && filters.method !== 'all') {
        papers = papers.filter((p) => p.preparationMethod === filters.method);
      }
      if (filters.classId && filters.classId !== 'all') {
        papers = papers.filter((p) => p.classId === filters.classId);
      }
      if (filters.subject && filters.subject !== 'all') {
        papers = papers.filter((p) => p.subject.toLowerCase() === filters.subject?.toLowerCase());
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        papers = papers.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.paperCode.toLowerCase().includes(q) ||
            p.subject.toLowerCase().includes(q) ||
            p.teacherName.toLowerCase().includes(q) ||
            p.className.toLowerCase().includes(q)
        );
      }
    }

    // Sort order: Actionable review items first ('submitted_for_review', 'resubmitted'), then recent
    const priorityMap: Record<string, number> = {
      submitted_for_review: 1,
      resubmitted: 2,
      changes_requested: 3,
      draft: 4,
      approved: 5,
      finalized: 6,
      rejected: 7,
    };

    return papers.sort((a, b) => {
      const pA = priorityMap[a.status] || 99;
      const pB = priorityMap[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  },

  /**
   * Retrieves a single paper by ID, enforcing confidentiality check.
   */
  getPaperById(paperId: string, user: User): QuestionPaper {
    const store = ERPStorage.get();
    const paper = (store.questionPapers || []).find((p) => p.id === paperId);
    if (!paper) {
      throw new Error(`Question paper with ID "${paperId}" not found.`);
    }

    assertPaperAccess(paper, user);
    return paper;
  },

  /**
   * Saves or updates a question paper draft by a teacher.
   */
  saveDraft(paperData: Partial<QuestionPaper>, user: User): QuestionPaper {
    if (!user) throw new Error('Authentication required.');

    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const isPrincipal = isAuthorizedPrincipal(user);

    let paperToSave: QuestionPaper;

    if (paperData.id) {
      const existing = papers.find((p) => p.id === paperData.id);
      if (!existing) {
        throw new Error(`Question paper ${paperData.id} does not exist.`);
      }

      assertPaperAccess(existing, user);

      // Only drafts and changes_requested can be edited by teacher
      if (!isPrincipal && existing.status !== 'draft' && existing.status !== 'changes_requested') {
        throw new Error(`Cannot edit question paper while in status "${existing.status}".`);
      }

      const now = new Date().toISOString();
      paperToSave = {
        ...existing,
        ...paperData,
        currentVersion: existing.currentVersion,
        status: existing.status, // preserve status unless explicitly transitioning
        updatedAt: now,
        auditTrail: [
          ...existing.auditTrail,
          {
            id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            paperId: existing.id,
            paperCode: existing.paperCode,
            action: 'draft_saved',
            actorId: user.id,
            actorName: user.name,
            actorRole: user.role,
            versionNumber: existing.currentVersion,
            timestamp: now,
            details: 'Draft saved with updated content.',
          },
        ],
      };

      const index = papers.findIndex((p) => p.id === existing.id);
      papers[index] = paperToSave;
    } else {
      // New paper draft creation
      const teacherId = user.referenceId || user.id;
      const now = new Date().toISOString();
      const newId = `qp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      paperToSave = {
        id: newId,
        paperCode: paperData.paperCode || `QP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        academicYear: paperData.academicYear || '2026-2027',
        examId: paperData.examId || 'exam-1',
        examTitle: paperData.examTitle || 'Mid-Term Summative Assessment 2026',
        examType: paperData.examType || 'Mid-Term',
        classId: paperData.classId || 'cls-10a',
        className: paperData.className || 'Class 10',
        section: paperData.section || 'A',
        subject: paperData.subject || 'Mathematics',
        teacherId: paperData.teacherId || teacherId,
        teacherName: paperData.teacherName || user.name,
        teacherEmail: paperData.teacherEmail || user.email,
        preparationMethod: paperData.preparationMethod || 'erp_editor',
        title: paperData.title || 'Untitled Question Paper',
        examDate: paperData.examDate || todayISO(),
        durationMinutes: paperData.durationMinutes || 180,
        maxMarks: paperData.maxMarks || 80,
        currentVersion: 1,
        status: 'draft',
        erpContent: paperData.erpContent,
        pdfAttachment: paperData.pdfAttachment,
        imagePages: paperData.imagePages,
        versionHistory: [],
        reviewHistory: [],
        auditTrail: [
          {
            id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            paperId: newId,
            paperCode: paperData.paperCode || 'NEW-QP',
            action: 'created',
            actorId: user.id,
            actorName: user.name,
            actorRole: user.role,
            versionNumber: 1,
            timestamp: now,
            details: `Created new draft question paper (${paperData.preparationMethod || 'erp_editor'}).`,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      papers.push(paperToSave);
    }

    ERPStorage.set({ ...store, questionPapers: papers });
    return paperToSave;
  },

  /**
   * Submits a draft or resubmits a revised paper for Principal review.
   */
  submitForReview(paperId: string, user: User, submissionSummary?: string): QuestionPaper {
    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');
    assertPaperAccess(paper, user);

    if (paper.status !== 'draft' && paper.status !== 'changes_requested') {
      throw new Error(
        `Cannot submit question paper in "${paper.status}" state. Paper must be in "draft" or "changes_requested".`
      );
    }

    // Validate completeness before submission
    const validation = validatePaperForSubmission(paper);
    if (!validation.valid) {
      throw new Error(`Submission blocked due to validation errors:\n- ${validation.errors.join('\n- ')}`);
    }

    const now = new Date().toISOString();
    const isResubmission = paper.status === 'changes_requested';
    const newStatus: QuestionPaperStatus = isResubmission ? 'resubmitted' : 'submitted_for_review';
    const nextVersion = isResubmission ? paper.currentVersion + 1 : paper.currentVersion;

    // Snapshot the submitted version
    const snapshot = createSnapshot(
      { ...paper, currentVersion: nextVersion, status: newStatus },
      user,
      submissionSummary || (isResubmission ? 'Resubmitted after addressing Principal review comments' : 'Initial submission for Principal review')
    );

    const updatedPaper: QuestionPaper = {
      ...paper,
      currentVersion: nextVersion,
      status: newStatus,
      submittedAt: now,
      updatedAt: now,
      versionHistory: [...paper.versionHistory, snapshot],
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: isResubmission ? 'resubmitted' : 'submitted',
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          versionNumber: nextVersion,
          timestamp: now,
          details: submissionSummary || (isResubmission ? 'Resubmitted for review.' : 'Submitted for review.'),
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },

  /**
   * Principal action: Requests revisions with mandatory comments.
   */
  requestChanges(
    paperId: string,
    principalUser: User,
    generalComments: string,
    questionComments?: Record<string, string>
  ): QuestionPaper {
    assertAuthorizedPrincipal(principalUser);

    if (!generalComments || generalComments.trim().length === 0) {
      throw new Error('Mandatory comment required when requesting changes to a question paper.');
    }

    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');

    if (paper.status !== 'submitted_for_review' && paper.status !== 'resubmitted') {
      throw new Error(`Cannot request changes on a paper with status "${paper.status}".`);
    }

    const now = new Date().toISOString();
    const reviewRecord: QuestionPaperReviewRecord = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paperId: paper.id,
      versionNumber: paper.currentVersion,
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      action: 'changes_requested',
      generalComments: generalComments.trim(),
      questionComments: questionComments || {},
      createdAt: now,
    };

    const updatedPaper: QuestionPaper = {
      ...paper,
      status: 'changes_requested',
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      reviewedAt: now,
      reviewComments: generalComments.trim(),
      questionComments: questionComments || {},
      updatedAt: now,
      reviewHistory: [...paper.reviewHistory, reviewRecord],
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: 'changes_requested',
          actorId: principalUser.id,
          actorName: principalUser.name,
          actorRole: principalUser.role,
          versionNumber: paper.currentVersion,
          timestamp: now,
          details: `Principal requested changes: "${generalComments.trim()}"`,
          reason: generalComments.trim(),
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },

  /**
   * Principal action: Directly edits a submitted paper (corrections, question adjustments, marks).
   * Automatically increments version, logs audit entry with reason, and preserves prior snapshot.
   */
  editSubmittedPaper(
    paperId: string,
    principalUser: User,
    updatedContent: Partial<QuestionPaper>,
    editReason: string
  ): QuestionPaper {
    assertAuthorizedPrincipal(principalUser);

    if (!editReason || editReason.trim().length === 0) {
      throw new Error('Mandatory reason required when the Principal directly modifies a question paper.');
    }

    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');

    if (
      paper.status !== 'submitted_for_review' &&
      paper.status !== 'resubmitted' &&
      paper.status !== 'changes_requested'
    ) {
      throw new Error(`Cannot edit paper in status "${paper.status}". Must be under active review.`);
    }

    const now = new Date().toISOString();
    // Snapshot state BEFORE principal edit
    const snapshotBeforeEdit = createSnapshot(
      paper,
      principalUser,
      `Pre-edit snapshot prior to Principal modification: ${editReason.trim()}`
    );

    const nextVersion = paper.currentVersion + 1;

    const updatedPaper: QuestionPaper = {
      ...paper,
      ...updatedContent,
      id: paper.id, // prevent changing ID
      paperCode: paper.paperCode, // prevent changing paper code
      teacherId: paper.teacherId, // preserve original author teacher
      teacherName: paper.teacherName,
      teacherEmail: paper.teacherEmail,
      currentVersion: nextVersion,
      updatedAt: now,
      versionHistory: [...paper.versionHistory, snapshotBeforeEdit],
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: 'edited_by_principal',
          actorId: principalUser.id,
          actorName: principalUser.name,
          actorRole: principalUser.role,
          versionNumber: nextVersion,
          timestamp: now,
          details: `Direct edits made by Principal. Reason: "${editReason.trim()}"`,
          reason: editReason.trim(),
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },

  /**
   * Principal action: Approves the question paper.
   */
  approvePaper(paperId: string, principalUser: User, comments?: string): QuestionPaper {
    assertAuthorizedPrincipal(principalUser);

    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');

    if (paper.status !== 'submitted_for_review' && paper.status !== 'resubmitted' && paper.status !== 'draft') {
      throw new Error(`Cannot approve question paper with current status "${paper.status}".`);
    }

    const now = new Date().toISOString();
    const reviewRecord: QuestionPaperReviewRecord = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paperId: paper.id,
      versionNumber: paper.currentVersion,
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      action: 'approved',
      generalComments: comments || 'Approved by Principal.',
      createdAt: now,
    };

    const updatedPaper: QuestionPaper = {
      ...paper,
      status: 'approved',
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      reviewedAt: now,
      approvedAt: now,
      reviewComments: comments || paper.reviewComments,
      updatedAt: now,
      reviewHistory: [...paper.reviewHistory, reviewRecord],
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: 'approved',
          actorId: principalUser.id,
          actorName: principalUser.name,
          actorRole: principalUser.role,
          versionNumber: paper.currentVersion,
          timestamp: now,
          details: comments ? `Approved with comments: "${comments}"` : 'Approved by Principal.',
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },

  /**
   * Principal action: Finalizes the official question paper. Locks against ordinary edits.
   */
  finalizePaper(paperId: string, principalUser: User): QuestionPaper {
    assertAuthorizedPrincipal(principalUser);

    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');

    if (paper.status !== 'approved' && paper.status !== 'submitted_for_review' && paper.status !== 'resubmitted') {
      throw new Error(`Cannot finalize paper in "${paper.status}" status. Paper should be approved first.`);
    }

    const now = new Date().toISOString();
    const finalizedSnapshot = createSnapshot(
      { ...paper, status: 'finalized' },
      principalUser,
      'Finalized official version locked for confidential examination printing.'
    );

    const reviewRecord: QuestionPaperReviewRecord = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paperId: paper.id,
      versionNumber: paper.currentVersion,
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      action: 'finalized',
      generalComments: 'Finalized official examination paper.',
      createdAt: now,
    };

    const updatedPaper: QuestionPaper = {
      ...paper,
      status: 'finalized',
      finalizedAt: now,
      updatedAt: now,
      versionHistory: [...paper.versionHistory, finalizedSnapshot],
      reviewHistory: [...paper.reviewHistory, reviewRecord],
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: 'finalized',
          actorId: principalUser.id,
          actorName: principalUser.name,
          actorRole: principalUser.role,
          versionNumber: paper.currentVersion,
          timestamp: now,
          details: 'Official question paper finalized and locked for printing.',
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },

  /**
   * Principal action: Rejects a question paper with a mandatory recorded reason.
   */
  rejectPaper(paperId: string, principalUser: User, mandatoryReason: string): QuestionPaper {
    assertAuthorizedPrincipal(principalUser);

    if (!mandatoryReason || mandatoryReason.trim().length === 0) {
      throw new Error('A mandatory reason is required when rejecting a question paper.');
    }

    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');

    if (paper.status !== 'submitted_for_review' && paper.status !== 'resubmitted') {
      throw new Error(`Cannot reject paper with current status "${paper.status}".`);
    }

    const now = new Date().toISOString();
    const reviewRecord: QuestionPaperReviewRecord = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paperId: paper.id,
      versionNumber: paper.currentVersion,
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      action: 'rejected',
      generalComments: mandatoryReason.trim(),
      createdAt: now,
    };

    const updatedPaper: QuestionPaper = {
      ...paper,
      status: 'rejected',
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      reviewedAt: now,
      rejectionReason: mandatoryReason.trim(),
      updatedAt: now,
      reviewHistory: [...paper.reviewHistory, reviewRecord],
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: 'rejected',
          actorId: principalUser.id,
          actorName: principalUser.name,
          actorRole: principalUser.role,
          versionNumber: paper.currentVersion,
          timestamp: now,
          details: `Question paper rejected. Reason: "${mandatoryReason.trim()}"`,
          reason: mandatoryReason.trim(),
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },

  /**
   * Principal action: Authorized amendment to an already-finalized paper.
   * Creates a new version with mandatory recorded reason, preserving full audit history.
   */
  createAuthorizedAmendment(
    paperId: string,
    principalUser: User,
    updatedContent: Partial<QuestionPaper>,
    amendmentReason: string
  ): QuestionPaper {
    assertAuthorizedPrincipal(principalUser);

    if (!amendmentReason || amendmentReason.trim().length === 0) {
      throw new Error('Mandatory justification is required to amend a finalized question paper.');
    }

    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');

    if (paper.status !== 'finalized') {
      throw new Error(`Only finalized papers require authorized amendments. Current status: "${paper.status}".`);
    }

    const now = new Date().toISOString();
    const nextVersion = paper.currentVersion + 1;

    // Snapshot pre-amendment finalized state
    const preAmendmentSnapshot = createSnapshot(
      paper,
      principalUser,
      `Snapshot of Finalized Version ${paper.currentVersion} prior to authorized amendment: ${amendmentReason.trim()}`
    );

    const reviewRecord: QuestionPaperReviewRecord = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paperId: paper.id,
      versionNumber: nextVersion,
      reviewerId: principalUser.id,
      reviewerName: principalUser.name,
      action: 'amended',
      generalComments: `Authorized Amendment (v${nextVersion}): ${amendmentReason.trim()}`,
      createdAt: now,
    };

    const updatedPaper: QuestionPaper = {
      ...paper,
      ...updatedContent,
      id: paper.id,
      paperCode: paper.paperCode,
      currentVersion: nextVersion,
      status: 'finalized', // remains finalized
      amendmentReason: amendmentReason.trim(),
      amendedAt: now,
      amendedById: principalUser.id,
      amendedByName: principalUser.name,
      updatedAt: now,
      versionHistory: [...paper.versionHistory, preAmendmentSnapshot],
      reviewHistory: [...paper.reviewHistory, reviewRecord],
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: 'amended_post_finalization',
          actorId: principalUser.id,
          actorName: principalUser.name,
          actorRole: principalUser.role,
          versionNumber: nextVersion,
          timestamp: now,
          details: `Authorized amendment v${nextVersion}. Reason: "${amendmentReason.trim()}"`,
          reason: amendmentReason.trim(),
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },

  /**
   * Deletes a draft question paper. Only draft status can be deleted.
   */
  deleteDraft(paperId: string, user: User): boolean {
    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');
    assertPaperAccess(paper, user);

    if (paper.status !== 'draft') {
      throw new Error(`Cannot delete question paper in status "${paper.status}". Only drafts can be deleted.`);
    }

    const filtered = papers.filter((p) => p.id !== paperId);
    ERPStorage.set({ ...store, questionPapers: filtered });
    return true;
  },

  /**
   * Reorders scanned image pages for image upload method.
   */
  reorderImagePages(paperId: string, user: User, pages: QuestionPaperImagePage[]): QuestionPaper {
    const store = ERPStorage.get();
    const papers = store.questionPapers || [];
    const paper = papers.find((p) => p.id === paperId);

    if (!paper) throw new Error('Question paper not found.');
    assertPaperAccess(paper, user);

    if (paper.status === 'finalized' && !isAuthorizedPrincipal(user)) {
      throw new Error('Cannot reorder pages of a finalized question paper.');
    }

    const renumbered = pages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));

    const now = new Date().toISOString();
    const updatedPaper: QuestionPaper = {
      ...paper,
      imagePages: renumbered,
      updatedAt: now,
      auditTrail: [
        ...paper.auditTrail,
        {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paperId: paper.id,
          paperCode: paper.paperCode,
          action: 'images_reordered',
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          versionNumber: paper.currentVersion,
          timestamp: now,
          details: `Reordered ${pages.length} scanned image pages.`,
        },
      ],
    };

    const index = papers.findIndex((p) => p.id === paperId);
    papers[index] = updatedPaper;
    ERPStorage.set({ ...store, questionPapers: papers });
    return updatedPaper;
  },
};
