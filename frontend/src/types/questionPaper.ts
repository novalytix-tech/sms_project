// ==========================================
// Question Paper Management Module - Types
// Developed by NTS Novalytix
// Strict Confidentiality, Versioning & Review Cycle
// ==========================================

export type QuestionPaperPreparationMethod = 'erp_editor' | 'pdf_upload' | 'image_upload';

export type QuestionPaperStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'changes_requested'
  | 'resubmitted'
  | 'approved'
  | 'rejected'
  | 'finalized';

export type QuestionType =
  | 'mcq'
  | 'short_answer'
  | 'long_answer'
  | 'numerical'
  | 'case_based';

export interface MCQOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface SubQuestionItem {
  id: string;
  subNumber: string; // e.g. "i", "ii", "iii" or "a", "b", "c"
  text: string;
  marks: number;
}

export interface QuestionPaperItem {
  id: string;
  questionNumber: number;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  options?: MCQOption[]; // For MCQ questions
  correctAnswer?: string; // Optional answer key / guidance for Principal
  hasInternalChoice?: boolean;
  orQuestionText?: string;
  orOptions?: MCQOption[];
  orMarks?: number;
  subQuestions?: SubQuestionItem[]; // For Case-Based or multi-part questions
  imageUrl?: string;
  explanation?: string;
}

export interface QuestionPaperSection {
  id: string;
  sectionTitle: string; // e.g. "SECTION A - Objective Type Questions"
  instructions?: string; // e.g. "Questions 1 to 10 carry 1 mark each."
  questions: QuestionPaperItem[];
}

export interface ERPQuestionPaperContent {
  generalInstructions: string[];
  syllabusTopics: string;
  sections: QuestionPaperSection[];
}

export interface QuestionPaperFileAttachment {
  fileName: string;
  fileSize: number; // In bytes
  fileType: string; // e.g. "application/pdf"
  uploadedAt: string;
  dataUrl?: string; // Data URL or secure local reference
  pageCount?: number;
}

export interface QuestionPaperImagePage {
  id: string;
  pageNumber: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  dataUrl: string; // Base64 data URL
}

export interface QuestionPaperVersionSnapshot {
  versionNumber: number;
  statusAtSnapshot: QuestionPaperStatus;
  preparationMethod: QuestionPaperPreparationMethod;
  title: string;
  maxMarks: number;
  durationMinutes: number;
  generalInstructions: string[];
  syllabusTopics: string;
  erpContent?: ERPQuestionPaperContent;
  pdfAttachment?: QuestionPaperFileAttachment;
  imagePages?: QuestionPaperImagePage[];
  savedAt: string;
  savedByUserId: string;
  savedByUserName: string;
  changeSummary?: string;
}

export interface QuestionPaperReviewRecord {
  id: string;
  paperId: string;
  versionNumber: number;
  reviewerId: string;
  reviewerName: string;
  action: 'changes_requested' | 'approved' | 'rejected' | 'finalized' | 'amended';
  generalComments: string;
  questionComments?: Record<string, string>; // questionId -> comment string
  createdAt: string;
}

export interface QuestionPaperAuditEvent {
  id: string;
  paperId: string;
  paperCode: string;
  action:
    | 'created'
    | 'draft_saved'
    | 'submitted'
    | 'changes_requested'
    | 'resubmitted'
    | 'edited_by_principal'
    | 'approved'
    | 'rejected'
    | 'finalized'
    | 'amended_post_finalization'
    | 'pdf_replaced'
    | 'images_reordered';
  actorId: string;
  actorName: string;
  actorRole: string;
  versionNumber: number;
  timestamp: string;
  details: string;
  reason?: string;
}

export interface QuestionPaper {
  id: string;
  paperCode: string; // e.g. "QP-2026-X-MATH-01"
  academicYear: string;
  examId: string;
  examTitle: string;
  examType: string; // e.g. "Mid-Term", "Final Exam", "Unit Test"
  classId: string;
  className: string;
  section: string;
  subject: string;
  teacherId: string; // Assigned Subject Teacher ID
  teacherName: string;
  teacherEmail: string;
  preparationMethod: QuestionPaperPreparationMethod;
  title: string;
  examDate: string;
  durationMinutes: number;
  maxMarks: number;
  currentVersion: number;
  status: QuestionPaperStatus;

  // Content for ERP In-App Editor
  erpContent?: ERPQuestionPaperContent;

  // Content for PDF Upload
  pdfAttachment?: QuestionPaperFileAttachment;

  // Content for Scanned Images Upload
  imagePages?: QuestionPaperImagePage[];

  // Review & Principal Actions
  reviewerId?: string;
  reviewerName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  finalizedAt?: string;
  reviewComments?: string;
  rejectionReason?: string;
  questionComments?: Record<string, string>;

  // Amendment tracking post-finalization
  amendmentReason?: string;
  amendedAt?: string;
  amendedById?: string;
  amendedByName?: string;

  // Immutable historical snapshots and logs
  versionHistory: QuestionPaperVersionSnapshot[];
  reviewHistory: QuestionPaperReviewRecord[];
  auditTrail: QuestionPaperAuditEvent[];

  createdAt: string;
  updatedAt: string;
}

