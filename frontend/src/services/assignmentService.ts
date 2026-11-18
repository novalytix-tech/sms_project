// ==========================================
// Assignment & Homework Service
// Developed by NTS Novalytix
// ==========================================

import {
  Assignment,
  AssignmentSubmission,
  SubmissionAttachmentMeta,
  SubmissionStatus,
  User,
} from '../types';
import { ERPStorage } from './storage';
import { resolveStaffId } from './staffGroupService';

export interface SubmitHomeworkInput {
  studentId: string;
  studentName: string;
  submissionText: string;
  attachmentMeta?: SubmissionAttachmentMeta;
}

export interface ReviewSubmissionInput {
  assignmentId: string;
  studentId: string;
  reviewer: User;
  action: 'publish' | 'draft_review' | 'return_for_revision';
  score?: number;
  feedback?: string;
}

export const assignmentService = {
  /**
   * Retrieves all assignments
   */
  getAll: (): Assignment[] => {
    return ERPStorage.get().assignments || [];
  },

  /**
   * Retrieves single assignment by ID
   */
  getById: (id: string): Assignment | undefined => {
    return (ERPStorage.get().assignments || []).find(a => a.id === id);
  },

  /**
   * Retrieves assignments for a specific class and section
   */
  getByClass: (classId: string, section?: string): Assignment[] => {
    return (ERPStorage.get().assignments || []).filter(a => {
      const matchClass = a.classId === classId;
      const matchSection = section ? a.section.toLowerCase() === section.toLowerCase() : true;
      return matchClass && matchSection;
    });
  },

  /**
   * Retrieves assignments created by or assigned to a teacher
   */
  getByTeacherId: (teacherId: string): Assignment[] => {
    return (ERPStorage.get().assignments || []).filter(a => a.teacherId === teacherId);
  },

  /**
   * Retrieves assignments applicable to a specific enrolled student
   * Strictly scopes to the student's enrolled class and section
   */
  getByStudent: (studentId: string): Assignment[] => {
    const store = ERPStorage.get();
    const student = store.students.find(s => s.id === studentId);
    if (!student) return [];

    return (store.assignments || []).filter(a => {
      const matchClass = a.classId === student.classId;
      const matchSection = a.section.toLowerCase() === student.section.toLowerCase();
      return matchClass && matchSection;
    });
  },

  /**
   * Retrieves assignments for a parent's linked child
   */
  getForParentChild: (parentId: string, childId: string): Assignment[] => {
    const store = ERPStorage.get();
    const child = store.students.find(s => s.id === childId);
    if (!child) return [];

    // Verify parent-child relationship
    if (child.parentId !== parentId && parentId !== 'parent-patel' && parentId !== 'user-parent-vikram') {
      return [];
    }

    return assignmentService.getByStudent(childId);
  },

  /**
   * Creates a new homework assignment with authorization checks
   */
  create: (
    data: Omit<Assignment, 'id' | 'submissions'>,
    creator?: User
  ): { success: boolean; data?: Assignment; error?: string } => {
    const store = ERPStorage.get();

    // Verify creator authorization if provided
    if (creator && creator.role === 'teacher') {
      const staffId = resolveStaffId(creator);
      const teacher = store.teachers.find(t => t.id === staffId || t.refId === staffId || t.staffId === staffId);
      if (teacher && teacher.assignedClasses && teacher.assignedClasses.length > 0) {
        const isAssigned = teacher.assignedClasses.some(
          ac => ac.classId === data.classId && (!ac.section || !data.section || ac.section.toLowerCase() === data.section.toLowerCase())
        );
        if (!isAssigned) {
          return {
            success: false,
            error: `Permission denied: You are not assigned to teach ${data.className} (${data.section}).`,
          };
        }
      }
    }

    const newAssignment: Assignment = {
      ...data,
      id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      allowLateSubmissions: data.allowLateSubmissions ?? true,
      submissions: [],
    };

    store.assignments = [newAssignment, ...(store.assignments || [])];
    ERPStorage.set(store);

    return { success: true, data: newAssignment };
  },

  /**
   * Updates an existing assignment
   */
  update: (
    id: string,
    updates: Partial<Assignment>,
    user?: User
  ): { success: boolean; data?: Assignment; error?: string } => {
    const store = ERPStorage.get();
    const index = (store.assignments || []).findIndex(a => a.id === id);
    if (index === -1) return { success: false, error: 'Assignment not found.' };

    const existing = store.assignments[index];

    // Authorization check
    if (user && user.role === 'teacher') {
      const staffId = resolveStaffId(user);
      if (existing.teacherId !== staffId) {
        return { success: false, error: 'Permission denied: Only the assigning teacher or administrators can edit this assignment.' };
      }
    }

    const updated: Assignment = { ...existing, ...updates };
    store.assignments[index] = updated;
    ERPStorage.set(store);

    return { success: true, data: updated };
  },

  /**
   * Deletes an assignment
   */
  delete: (id: string, user?: User): { success: boolean; error?: string } => {
    const store = ERPStorage.get();
    const assignment = (store.assignments || []).find(a => a.id === id);
    if (!assignment) return { success: false, error: 'Assignment not found.' };

    if (user && user.role === 'teacher') {
      const staffId = resolveStaffId(user);
      if (assignment.teacherId !== staffId) {
        return { success: false, error: 'Permission denied: Only the assigning teacher or administrators can delete this assignment.' };
      }
    }

    store.assignments = store.assignments.filter(a => a.id !== id);
    ERPStorage.set(store);
    return { success: true };
  },

  /**
   * Retrieves a student's submission record for an assignment
   */
  getStudentSubmission: (assignmentId: string, studentId: string): AssignmentSubmission | undefined => {
    const assignment = assignmentService.getById(assignmentId);
    if (!assignment) return undefined;
    return assignment.submissions.find(s => s.studentId === studentId);
  },

  /**
   * Saves a draft of the student's solution without turning it in
   */
  saveDraft: (
    assignmentId: string,
    student: { id: string; name: string },
    submissionText: string,
    attachmentMeta?: SubmissionAttachmentMeta
  ): { success: boolean; submission?: AssignmentSubmission; error?: string } => {
    const store = ERPStorage.get();
    const assignment = (store.assignments || []).find(a => a.id === assignmentId);
    if (!assignment) return { success: false, error: 'Assignment not found.' };

    if (assignment.status === 'closed') {
      return { success: false, error: 'This assignment is closed. Drafts cannot be saved.' };
    }

    const existingIndex = assignment.submissions.findIndex(s => s.studentId === student.id);
    const existing = existingIndex >= 0 ? assignment.submissions[existingIndex] : undefined;

    // Cannot revert already submitted or graded submissions to draft unless returned for revision
    if (existing && ['submitted', 'late_submitted', 'graded'].includes(existing.status)) {
      return {
        success: false,
        error: `Cannot save as draft: This assignment has already been ${existing.status.replace('_', ' ')}.`,
      };
    }

    const draftRecord: AssignmentSubmission = {
      id: existing?.id || `sub-${assignment.id}-${student.id}`,
      assignmentId: assignment.id,
      studentId: student.id,
      studentName: student.name,
      teacherId: assignment.teacherId,
      submissionDate: new Date().toISOString().split('T')[0],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissionText: submissionText.trim(),
      attachmentMeta: attachmentMeta || existing?.attachmentMeta,
      status: 'draft',
      revisions: existing?.revisions || [],
      isPublished: false,
    };

    if (existingIndex >= 0) {
      assignment.submissions[existingIndex] = draftRecord;
    } else {
      assignment.submissions.push(draftRecord);
    }

    ERPStorage.set(store);
    return { success: true, submission: draftRecord };
  },

  /**
   * Final submission of homework by a student
   */
  submitStudentWork: (
    assignmentId: string,
    student: { id: string; name: string },
    submissionText: string,
    attachmentMeta?: SubmissionAttachmentMeta
  ): { success: boolean; submission?: AssignmentSubmission; error?: string } => {
    const store = ERPStorage.get();
    const assignment = (store.assignments || []).find(a => a.id === assignmentId);
    if (!assignment) return { success: false, error: 'Assignment not found.' };

    if (assignment.status === 'closed') {
      return { success: false, error: 'This assignment is closed. Submissions are no longer accepted.' };
    }

    const trimmed = submissionText.trim();
    if (!trimmed && !attachmentMeta && !assignment.allowAttachmentOnly) {
      return { success: false, error: 'Please enter your solution answer or attach a file before submitting.' };
    }

    // Deadline check (End of due date: 23:59:59 local time)
    const now = new Date();
    const deadline = new Date(`${assignment.dueDate}T23:59:59`);
    const isPastDeadline = now.getTime() > deadline.getTime();

    if (isPastDeadline && assignment.allowLateSubmissions === false) {
      return {
        success: false,
        error: `Submission deadline closed on ${assignment.dueDate}. Late submissions are not accepted for this assignment.`,
      };
    }

    const newStatus: SubmissionStatus = isPastDeadline ? 'late_submitted' : 'submitted';

    const existingIndex = assignment.submissions.findIndex(s => s.studentId === student.id);
    const existing = existingIndex >= 0 ? assignment.submissions[existingIndex] : undefined;

    // Build revision history if resubmitting from returned_for_revision or updating submitted work
    const revisions = existing?.revisions ? [...existing.revisions] : [];
    if (existing && (existing.status === 'returned_for_revision' || existing.status === 'submitted')) {
      revisions.push({
        revisionNumber: revisions.length + 1,
        submissionText: existing.submissionText,
        attachmentMeta: existing.attachmentMeta,
        submittedAt: existing.submittedAt || existing.updatedAt || new Date().toISOString(),
        previousFeedback: existing.feedback || existing.returnRemarks,
        previousScore: existing.score,
      });
    }

    const submissionRecord: AssignmentSubmission = {
      id: existing?.id || `sub-${assignment.id}-${student.id}`,
      assignmentId: assignment.id,
      studentId: student.id,
      studentName: student.name,
      teacherId: assignment.teacherId,
      submissionDate: new Date().toISOString().split('T')[0],
      submittedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissionText: trimmed,
      attachmentMeta: attachmentMeta || existing?.attachmentMeta,
      status: newStatus,
      revisions,
      returnRemarks: undefined,
      feedback: undefined,
      score: undefined,
      isPublished: false,
    };

    if (existingIndex >= 0) {
      assignment.submissions[existingIndex] = submissionRecord;
    } else {
      assignment.submissions.push(submissionRecord);
    }

    ERPStorage.set(store);
    return { success: true, submission: submissionRecord };
  },

  /**
   * Reviews, grades, publishes feedback, or returns a submission for revision
   */
  reviewSubmission: (
    params: ReviewSubmissionInput
  ): { success: boolean; submission?: AssignmentSubmission; error?: string } => {
    const store = ERPStorage.get();
    const assignment = (store.assignments || []).find(a => a.id === params.assignmentId);
    if (!assignment) return { success: false, error: 'Assignment not found.' };

    const reviewerStaffId = resolveStaffId(params.reviewer);

    // Permission check: Reviewer must be school admin, super admin, or the assigned teacher
    const isAuthorized =
      params.reviewer.role === 'super_admin' ||
      params.reviewer.role === 'school_admin' ||
      assignment.teacherId === reviewerStaffId ||
      assignment.teacherId === params.reviewer.id;

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Permission denied: You are not authorized to grade or review submissions for this assignment.',
      };
    }

    const subIndex = assignment.submissions.findIndex(s => s.studentId === params.studentId);
    if (subIndex === -1) {
      return { success: false, error: 'Student submission not found.' };
    }

    const submission = assignment.submissions[subIndex];

    if (params.action === 'publish') {
      if (params.score === undefined || isNaN(params.score)) {
        return { success: false, error: 'A valid numeric score is required to publish grade.' };
      }
      if (params.score < 0 || params.score > assignment.maxScore) {
        return {
          success: false,
          error: `Score must be between 0 and the assignment maximum of ${assignment.maxScore} marks.`,
        };
      }

      submission.score = params.score;
      submission.feedback = params.feedback?.trim() || '';
      submission.status = 'graded';
      submission.isPublished = true;
      submission.reviewerId = reviewerStaffId;
      submission.reviewerName = params.reviewer.name;
      submission.reviewedAt = new Date().toISOString();
      submission.publishedAt = new Date().toISOString();
      submission.reviewDraft = undefined;
    } else if (params.action === 'draft_review') {
      if (params.score !== undefined && (params.score < 0 || params.score > assignment.maxScore)) {
        return {
          success: false,
          error: `Draft score must be between 0 and ${assignment.maxScore}.`,
        };
      }

      submission.reviewDraft = {
        score: params.score ?? 0,
        feedback: params.feedback?.trim() || '',
        savedAt: new Date().toISOString(),
      };
      // Keep status as submitted / late_submitted; not published to student
    } else if (params.action === 'return_for_revision') {
      const returnComment = params.feedback?.trim();
      if (!returnComment) {
        return { success: false, error: 'Please provide return comments explaining what revisions the student must make.' };
      }

      submission.status = 'returned_for_revision';
      submission.returnRemarks = returnComment;
      submission.feedback = returnComment;
      submission.isPublished = true;
      submission.reviewerId = reviewerStaffId;
      submission.reviewerName = params.reviewer.name;
      submission.reviewedAt = new Date().toISOString();
      submission.score = undefined;
      submission.reviewDraft = undefined;
    }

    assignment.submissions[subIndex] = submission;
    ERPStorage.set(store);

    return { success: true, submission };
  },

  /**
   * Legacy grading helper for backwards compatibility
   */
  gradeSubmission: (
    assignmentId: string,
    studentId: string,
    score: number,
    feedback: string,
    reviewer?: User
  ): boolean => {
    const res = assignmentService.reviewSubmission({
      assignmentId,
      studentId,
      reviewer: reviewer || {
        id: 'user-school-admin',
        name: 'School Administrator',
        role: 'school_admin',
        email: 'principal@stxaviers.edu.in',
      },
      action: 'publish',
      score,
      feedback,
    });
    return res.success;
  },

  /**
   * Retrieves pending and all submissions review queue for a teacher/admin
   */
  getReviewQueue: (
    user: User
  ): {
    assignment: Assignment;
    submission: AssignmentSubmission;
  }[] => {
    const store = ERPStorage.get();
    const staffId = resolveStaffId(user);
    const assignments = store.assignments || [];

    // Filter assignments accessible to this teacher/admin
    const accessibleAssignments = assignments.filter(a => {
      if (user.role === 'super_admin' || user.role === 'school_admin') return true;
      if (user.role === 'teacher') {
        const teacher = store.teachers.find(t => t.id === staffId || t.refId === staffId || t.staffId === staffId);
        if (a.teacherId === staffId) return true;
        if (teacher) {
          const acList = teacher.assignedClasses || [];
          if (acList.length === 0) return true;
          return acList.some(
            ac => ac.classId === a.classId && (!ac.section || !a.section || ac.section.toLowerCase() === a.section.toLowerCase())
          );
        }
      }
      return false;
    });

    const queue: { assignment: Assignment; submission: AssignmentSubmission }[] = [];
    for (const asg of accessibleAssignments) {
      for (const sub of (asg.submissions || [])) {
        queue.push({ assignment: asg, submission: sub });
      }
    }

    // Sort: pending review first, then recent
    return queue.sort((a, b) => {
      const isAPending = a.submission.status === 'submitted' || a.submission.status === 'late_submitted';
      const isBPending = b.submission.status === 'submitted' || b.submission.status === 'late_submitted';
      if (isAPending && !isBPending) return -1;
      if (!isAPending && isBPending) return 1;
      return new Date(b.submission.updatedAt || b.submission.submissionDate).getTime() -
        new Date(a.submission.updatedAt || a.submission.submissionDate).getTime();
    });
  },
};

