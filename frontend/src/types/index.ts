// ==========================================
// School Management System (SMS / School ERP)
// Developed by NTS Novalytix
// Comprehensive TypeScript Definitions
// ==========================================

import { QuestionPaper } from './questionPaper';
import {
  SchoolServiceConfiguration,
  ServiceEntitlementAuditLog,
  MarketingCampaign,
  MarketingLead,
  MarketingContentItem,
} from './serviceEntitlement';

export type UserRole =
  | 'super_admin'
  | 'school_admin'
  | 'teacher'
  | 'parent'
  | 'student'
  | 'supplier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  photoUrl?: string;
  institutionId?: string;
  phone?: string;
  referenceId?: string; // teacherId, studentId, parentId, supplierId
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  board: string; // CBSE, ICSE, State Board, IB
  city: string;
  state: string;
  address: string;
  contactEmail: string;
  phone: string;
  principal: string;
  studentCount: number;
  teacherCount: number;
  plan: 'Basic' | 'Standard' | 'Enterprise' | 'Premium';
  planExpiry: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  bloodGroup?: string;
  classId: string;
  className: string;
  grade?: string;
  section: string;
  rollNo: string;
  academicYear: string;
  admissionDate: string;
  parentId?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  transportRouteId?: string;
  busStop?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  photoUrl?: string;
  institutionId?: string;
}

export interface TeacherAssignment {
  classId: string;
  className: string;
  grade?: string;
  section: string;
  subject: string;
}

export interface Teacher {
  id: string;
  staffId: string;
  refId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  designation: string;
  department: string;
  specialization: string;
  qualification: string;
  joiningDate: string;
  status: 'active' | 'inactive';
  assignedClasses: TeacherAssignment[];
  avatar?: string;
  photoUrl?: string;
  institutionId?: string;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g., "Class 10"
  grade: number;
  section: string; // e.g., "A"
  classTeacherId: string;
  classTeacherName: string;
  classTeacher?: string;
  roomNo: string;
  studentCount: number;
  capacity: number;
  academicYear: string;
  sessionId?: string; // Reference to AcademicSession.id
  status?: 'active' | 'inactive';
  subjects: string[];
  institutionId?: string;
}

// ==========================================
// Academic Session & Promotion Models
// ==========================================

export type SessionStatus = 'planned' | 'active' | 'closed';

export interface AcademicSession {
  id: string; // e.g., 'sess-2025-26', 'sess-2026-27', 'sess-2027-28'
  name: string; // e.g., '2026–2027'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
  status: SessionStatus;
  previousSessionId?: string;
  nextSessionId?: string;
  description?: string;
  createdAt?: string;
}

export type EnrollmentStatus =
  | 'active'
  | 'promoted'
  | 'retained'
  | 'graduated'
  | 'transferred'
  | 'withdrawn'
  | 'compartment';

export interface StudentEnrollment {
  id: string;
  studentId: string; // Reference to Student.id (Permanent student identity)
  admissionNo: string;
  sessionId: string; // Reference to AcademicSession.id
  academicYear: string; // e.g., '2026-2027'
  classId: string; // Reference to ClassRoom.id
  className: string;
  section: string;
  rollNo: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  previousEnrollmentId?: string;
  promotionBatchId?: string;
  remarks?: string;
  updatedAt?: string;
}

export type PromotionDecisionType =
  | 'promote'
  | 'retain'
  | 'graduate'
  | 'manual_review'
  | 'withdrawn';

export interface StudentAcademicSummary {
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  percentage: number;
  overallGrade: string;
  compartmentSubjects: string[];
  attendanceRate?: number;
}

export interface PromotionDecision {
  studentId: string;
  admissionNo: string;
  studentName: string;
  sourceEnrollmentId: string;
  decision: PromotionDecisionType;
  destinationClassId: string;
  destinationClassName: string;
  destinationSection: string;
  destinationSessionId: string;
  destinationRollNo?: string;
  academicSummary: StudentAcademicSummary;
  eligibilityStatus: 'eligible' | 'compartment' | 'retained' | 'graduating' | 'review_required';
  overrideReason?: string;
  isOverridden?: boolean;
  status: 'pending' | 'confirmed' | 'excluded';
  enrolledId?: string;
}

export interface PromotionBatch {
  id: string;
  sourceSessionId: string;
  sourceSessionName: string;
  destinationSessionId: string;
  destinationSessionName: string;
  sourceClassId: string;
  sourceClassName: string;
  sourceSection: string;
  destinationClassId: string;
  destinationClassName: string;
  destinationSection: string;
  executedBy: string;
  executedAt: string;
  totalStudents: number;
  promotedCount: number;
  retainedCount: number;
  graduatedCount: number;
  withdrawnCount: number;
  decisions: PromotionDecision[];
  notes?: string;
}

export interface ImportRowError {
  row: number;
  field?: string;
  value?: string;
  message: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  sessionId: string;
  sessionName: string;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  validRows: number;
  createdStudents: number;
  createdEnrollments: number;
  skippedDuplicates: number;
  failedRows: number;
  errors: ImportRowError[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  classId: string;
  section: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
  institutionId?: string;
}

export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

export interface StaffAttendanceRecord {
  id: string;
  teacherId: string;
  staffId: string;
  staffName: string;
  department: string;
  date: string; // YYYY-MM-DD
  status: StaffAttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  leaveRequestId?: string;
  isCorrected?: boolean;
  previousStatus?: StaffAttendanceStatus;
  institutionId?: string;
  correctedBy?: string;
  correctedAt?: string;
  correctionReason?: string;
  updatedAt?: string;
}

export type AdmissionStage =
  | 'inquiry'
  | 'application_started'
  | 'application_submitted'
  | 'documents_pending'
  | 'under_review'
  | 'approved'
  | 'fee_pending'
  | 'enrolled'
  | 'rejected'
  | 'withdrawn';

export interface AdmissionDocument {
  id: string;
  title: string;
  required: boolean;
  submitted: boolean;
  verified: boolean;
  verificationDate?: string;
  notes?: string;
}

export interface AdmissionStatusLog {
  stage: AdmissionStage;
  timestamp: string;
  changedBy: string;
  notes?: string;
}

export interface AdmissionChecklist {
  contactVerified: boolean;
  documentsVerified: boolean;
  interactionCompleted: boolean;
  principalApproved: boolean;
  feeCleared: boolean;
}

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  academicYear: string;
  targetClassId: string;
  targetClassName: string;
  targetSection?: string;
  source: 'Website' | 'Walk-in' | 'Referral' | 'Social Media' | 'Education Fair' | 'Other' | string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  bloodGroup?: string;
  previousSchool?: string;
  previousClass?: string;
  parentName: string;
  parentRelation: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  stage: AdmissionStage;
  statusHistory: AdmissionStatusLog[];
  documents: AdmissionDocument[];
  checklist: AdmissionChecklist;
  reviewRemarks?: string;
  rejectionReason?: string;
  admissionFeeAmount: number;
  feeInvoiceId?: string;
  isFeePaid: boolean;
  enrolledStudentId?: string;
  assignedAdmissionNo?: string;
  enrolledDate?: string;
  createdAt: string;
  updatedAt: string;
  institutionId?: string;
  photoUrl?: string;

  // Enriched fields for complete admission system
  linkedEnquiryId?: string;
  linkedEnquiryNo?: string;
  assignedCounsellor?: string;
  applicationDate?: string;
  applicationStatus?: string;
  documentStatus?: string;
  paymentStatus?: string;
  feeAmountPaid?: number;
  feeOutstanding?: number;
  feePaymentHistory?: any[];
  assessment?: any;
  offer?: any;
  motherName?: string;
  motherPhone?: string;
  motherOccupation?: string;
  fatherOccupation?: string;
  emergencyContact?: string;
  transportRequired?: boolean;
  busRouteId?: string;
}

export interface GradeRule {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
  description: string;
  isPassing: boolean;
}

export interface GradingScheme {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  classScope: 'all' | string[];
  examTypeScope: 'all' | ExamType[];
  passPercentage: number;
  rules: GradeRule[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SubmissionStatus =
  | 'not_submitted'
  | 'draft'
  | 'submitted'
  | 'late_submitted'
  | 'returned_for_revision'
  | 'graded'
  | 'closed'
  | 'pending';

export interface SubmissionAttachmentMeta {
  name: string;
  size: number;
  type: string;
  selectedAt: string;
}

export interface SubmissionRevision {
  revisionNumber: number;
  submissionText: string;
  attachmentMeta?: SubmissionAttachmentMeta;
  submittedAt: string;
  previousFeedback?: string;
  previousScore?: number;
}

export interface AssignmentSubmission {
  id?: string;
  assignmentId?: string;
  studentId: string;
  studentName: string;
  submissionDate: string;
  submissionText: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  isPublished?: boolean;
  teacherId?: string;
  reviewerId?: string;
  reviewerName?: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
  returnRemarks?: string;
  attachmentMeta?: SubmissionAttachmentMeta;
  revisions?: SubmissionRevision[];
  reviewDraft?: {
    score: number;
    feedback: string;
    savedAt: string;
  };
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  grade?: string;
  section: string;
  subject: string;
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  teacherId: string;
  teacherName: string;
  status: 'active' | 'closed';
  allowLateSubmissions?: boolean;
  allowAttachmentOnly?: boolean;
  submissions: AssignmentSubmission[];
}

export type ExamType = 'Unit Test' | 'Mid-Term' | 'Final Exam' | 'Quarterly' | 'Practical';

export interface ExamSchedule {
  id: string;
  examId: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passMarks: number;
  roomNo: string;
}

export interface ExamMark {
  id: string;
  examId: string;
  scheduleId: string;
  studentId: string;
  marksObtained: number;
  isAbsent: boolean;
  remarks?: string;
}

export interface Examination {
  id: string;
  title: string;
  examType: ExamType;
  classId: string;
  className: string;
  grade?: string;
  section: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  schedules: ExamSchedule[];
  institutionId?: string;
}

export type FeeCategory =
  | 'Tuition'
  | 'Admission'
  | 'Transport'
  | 'Examination'
  | 'Library'
  | 'Activity'
  | 'Annual Charges'
  | 'Other';

export type PaymentMethodType =
  | 'UPI'
  | 'Debit Card'
  | 'Credit Card'
  | 'Net Banking'
  | 'Cash'
  | 'Cheque'
  | 'Bank Transfer'
  | 'Online Demand Draft';

export type TransactionStatus = 'success' | 'failed' | 'cancelled';

export interface FeeInvoiceItem {
  id: string;
  title: string;
  category: FeeCategory;
  amount: number;
}

export interface FeePayment {
  id: string;
  receiptNo: string;
  date: string;
  time?: string;
  amount: number;
  method: PaymentMethodType;
  recordedBy: string;
  transactionRef?: string;
  remarks?: string;
  status?: TransactionStatus;
  studentId?: string;
  studentName?: string;
  parentId?: string;
  invoiceId?: string;
  invoiceNo?: string;
  isDemo?: boolean;
  payerName?: string;
  channel?: 'online_demo' | 'manual_office';
  upiVpa?: string;
  bankName?: string;
  cardLast4?: string;
  failureReason?: string;
}

export interface FeeInvoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  className: string;
  section: string;
  category: FeeCategory;
  academicYear: string;
  invoiceDate?: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'partial' | 'overdue';
  items?: FeeInvoiceItem[];
  discountAmount?: number;
  discountReason?: string;
  lateFeeAmount?: number;
  lateFeeDays?: number;
  notes?: string;
  allowPartial?: boolean;
  payments: FeePayment[];
  institutionId?: string;
}

export interface PaymentTransaction {
  id: string;
  transactionRef: string;
  receiptNo?: string;
  invoiceId: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  parentId?: string;
  amount: number;
  method: PaymentMethodType;
  status: TransactionStatus;
  date: string;
  time: string;
  isDemo: boolean;
  channel: 'online_demo' | 'manual_office';
  payerName: string;
  upiVpa?: string;
  bankName?: string;
  cardLast4?: string;
  failureReason?: string;
  notes?: string;
}

export interface PaymentReceipt {
  receiptNo: string;
  transactionRef: string;
  invoiceNo: string;
  invoiceId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  section: string;
  academicYear: string;
  category: FeeCategory;
  amountPaid: number;
  previousBalance: number;
  remainingBalance: number;
  paymentDate: string;
  paymentTime: string;
  paymentMethod: PaymentMethodType;
  status: TransactionStatus;
  isDemo: boolean;
  recordedBy: string;
  schoolName: string;
  schoolAddress: string;
  schoolAffiliation: string;
  upiVpa?: string;
  bankName?: string;
  cardLast4?: string;
}

export interface FeeStructure {
  id: string;
  title: string;
  className: string;
  academicYear: string;
  category: FeeCategory;
  term: 'Term 1' | 'Term 2' | 'Annual' | 'Monthly' | 'One-Time';
  totalAmount: number;
  items: FeeInvoiceItem[];
  dueDate: string;
  allowPartial: boolean;
}

export interface FeePolicy {
  academicYear: string;
  currency: string;
  allowPartialPayments: boolean;
  minPartialAmount: number;
  gracePeriodDays: number;
  lateFeePerDay: number;
  maxLateFee: number;
  discountPercentageSibling: number;
  convenienceFeePercentage: number;
  upiId: string;
  paymentInstructions: string;
  bankAccountDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    branch: string;
  };
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimetablePeriod {
  id: string;
  classId: string;
  className: string;
  grade?: string;
  section: string;
  day: DayOfWeek;
  periodNo: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  roomNo: string;
}

export type EventCategory = 'holiday' | 'exam' | 'ptm' | 'sports' | 'cultural' | 'academic' | 'other';

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  startDate: string;
  endDate: string;
  targetAudience: 'all' | 'teachers' | 'students' | 'parents';
  location?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  publishedDate: string;
  authorName: string;
  authorRole: string;
  priority: 'normal' | 'high' | 'urgent';
  targetAudience: 'all' | 'teachers' | 'students' | 'parents' | 'suppliers';
  isRead?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  recipientRole: UserRole;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
}

export type StaffGroupType =
  | 'all_staff'
  | 'role_based'
  | 'department'
  | 'class_based'
  | 'custom';

export interface StaffGroup {
  id: string;
  name: string;
  description: string;
  type: StaffGroupType;
  institutionId?: string;
  creatorId: string;
  createdBy?: string;
  creatorName: string;
  creatorRole: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  memberIds: string[];
  isDynamicAllStaff?: boolean;
  department?: string;
  classId?: string;
  className?: string;
  section?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSenderName?: string;
}

export interface StaffGroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderDesignation?: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isAnnouncement?: boolean;
  readBy: string[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// ==========================================
// Student-Teacher Class Groups & Communications
// ==========================================
export type ClassMessageCategory = 'announcement' | 'homework' | 'exam_notice' | 'event' | 'general';
export type ClassMessagePriority = 'normal' | 'important' | 'urgent';

export interface ClassGroup {
  id: string;
  classId: string;
  className: string;
  grade?: string;
  section: string;
  name: string;
  description: string;
  classTeacherId: string;
  classTeacherName: string;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSenderName?: string;
}

export interface ClassGroupMessage {
  id: string;
  groupId: string;
  classId: string;
  section: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'school_admin' | 'super_admin';
  senderTitle?: string;
  title: string;
  content: string;
  category: ClassMessageCategory;
  priority: ClassMessagePriority;
  attachmentName?: string;
  timestamp: string;
  createdAt: string;
  readBy: string[];
}

export interface StaffMember {
  id: string;
  userId?: string;
  staffId: string;
  fullName: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'school_admin' | 'teacher';
  roleTitle?: string;
  department: string;
  designation: string;
  isClassTeacher: boolean;
  assignedClass?: string;
  assignedSection?: string;
  classTeacherClassNames?: string[];
  assignedClassNames?: string[];
  status: 'active' | 'inactive';
}

export type LeaveType = 'Medical' | 'Casual' | 'Emergency' | 'Maternity' | 'Vacation';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantRole: 'teacher' | 'student' | 'staff';
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  reviewedBy?: string;
  reviewRemarks?: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  isbn: string;
  category: string;
  subject?: string;
  publisher?: string;
  edition?: string;
  publicationYear?: number;
  language?: string;
  description?: string;
  totalCopies: number;
  availableCopies: number;
  issuedCopies?: number;
  damagedCopies?: number;
  lostCopies?: number;
  reservedCopies?: number;
  shelfLocation: string;
  rackNumber?: string;
  rowNumber?: string;
  coverUrl?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  vendor?: string;
  acquisitionSource?: string;
  status?: 'available' | 'low_stock' | 'out_of_stock' | 'archived';
  issuedRecords?: LibraryLoan[]; // Preserved for legacy components
  institutionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryCopy {
  id: string;
  bookId: string;
  bookTitle: string;
  isbn: string;
  accessionNumber: string; // e.g. "LIB-2026-0001"
  barcode: string;
  copyNumber: number;
  condition: 'excellent' | 'good' | 'fair' | 'damaged';
  status: 'available' | 'issued' | 'reserved' | 'damaged' | 'lost' | 'under_repair' | 'archived';
  shelfLocation?: string;
  acquisitionDate: string;
  purchasePrice?: number;
  currentLoanId?: string;
  institutionId?: string;
}

export interface LibraryMember {
  id: string;
  memberType: 'student' | 'teacher' | 'staff';
  referenceId: string; // studentId, teacherId, or staffId
  name: string;
  code: string; // admissionNo or staffId
  classOrDepartment: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  status: 'active' | 'suspended' | 'blocked' | 'expired';
  maxBorrowLimit: number;
  currentIssuedCount: number;
  membershipStartDate: string;
  membershipExpiryDate: string;
  totalBorrowedCount: number;
  outstandingFine: number;
  institutionId?: string;
}

export interface LibraryLoan {
  id: string;
  loanNumber?: string; // e.g. "LN-2026-0001"
  copyId?: string;
  accessionNumber?: string;
  bookId?: string;
  bookTitle?: string;
  isbn?: string;
  memberId?: string;
  studentId?: string; // Legacy support
  studentName?: string; // Legacy support
  borrowerType?: 'student' | 'teacher' | 'staff';
  borrowerId?: string;
  borrowerName?: string;
  borrowerCode?: string;
  borrowerAdmissionOrStaffId?: string;
  borrowerClassOrDept?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  renewalCount?: number;
  status: 'borrowed' | 'returned' | 'overdue' | 'issued' | 'lost' | 'damaged';
  returnCondition?: 'excellent' | 'good' | 'fair' | 'damaged';
  fineAmount?: number;
  fineStatus?: 'none' | 'pending' | 'paid' | 'waived';
  fineReason?: string;
  issuedBy?: string;
  receivedBy?: string;
  notes?: string;
  institutionId?: string;
}

export interface LibraryReservation {
  id: string;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberType: 'student' | 'teacher' | 'staff';
  memberCode: string;
  requestDate: string;
  queuePosition: number;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  allocatedCopyId?: string;
  allocatedAccessionNo?: string;
  expiryDate?: string;
  notes?: string;
  institutionId?: string;
}

export interface LibraryFine {
  id: string;
  fineNumber: string;
  loanId?: string;
  memberId: string;
  memberName: string;
  memberType: 'student' | 'teacher' | 'staff';
  memberCode: string;
  bookTitle: string;
  accessionNumber?: string;
  reason: 'overdue' | 'damage' | 'lost_book' | 'manual_adjustment';
  amount: number;
  paidAmount: number;
  waiverAmount: number;
  balance: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'waived';
  paymentDate?: string;
  paymentMethod?: 'Cash' | 'UPI' | 'Online' | 'Net Banking';
  receiptNumber?: string;
  waivedBy?: string;
  waiverReason?: string;
  notes?: string;
  institutionId?: string;
}

export interface LibraryInventoryAudit {
  id: string;
  sessionName: string;
  startDate: string;
  completedDate?: string;
  status: 'in_progress' | 'completed';
  totalRegisteredCopies: number;
  verifiedCopiesCount: number;
  missingCopiesCount: number;
  damagedCopiesCount: number;
  unverifiedCopiesCount: number;
  verifiedBy: string;
  remarks?: string;
  verifiedAccessions: string[];
  institutionId?: string;
}

export interface LibraryStaffAssignment {
  id: string;
  institutionId: string;
  teacherId: string;
  teacherName: string;
  staffId: string;
  department: string;
  roleTitle: 'Head Librarian' | 'Library In-charge' | 'Assistant Librarian' | 'Stock Auditor';
  permissions: string[];
  assignedBy: string;
  assignedDate: string;
  status: 'active' | 'revoked';
  revokedDate?: string;
  revokedBy?: string;
  notes?: string;
}

export interface LibrarySettings {
  institutionId: string;
  libraryName: string;
  branchName: string;
  studentBorrowDurationDays: number;
  teacherBorrowDurationDays: number;
  staffBorrowDurationDays: number;
  studentMaxBooks: number;
  teacherMaxBooks: number;
  staffMaxBooks: number;
  maxRenewals: number;
  finePerDayOverdue: number;
  gracePeriodDays: number;
  lostBookPenaltyMultiplier: number;
  reservationHoldHours: number;
  accessionPrefix: string;
  allowTeacherSelfCheckout: boolean;
  notificationUpcomingDueDays: number;
}

export interface BusStop {
  id?: string;
  stopName: string;
  pickupTime: string;
  dropTime: string;
  feePerTerm: number;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  sequenceOrder?: number;
}

export interface TransportRoute {
  id: string;
  routeNumber: string;
  routeName: string;
  vehicleNo: string;
  vehicleType: 'Bus' | 'Mini-Bus' | 'Van';
  driverName: string;
  driverPhone: string;
  attendantName?: string;
  attendantPhone?: string;
  capacity: number;
  assignedStudentsCount: number;
  stops: BusStop[];
  status: 'active' | 'maintenance';
  schoolLatitude?: number;
  schoolLongitude?: number;
  currentTripId?: string;
  institutionId?: string;
}

export interface BusLocationUpdate {
  busId: string;
  tripId?: string;
  routeId?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speedKmH?: number;
  headingDegrees?: number;
  accuracyMeters?: number;
  sourceDeviceId?: string;
  freshnessStatus: 'live' | 'stale' | 'offline';
  isSimulated?: boolean;
}

export interface TransportTrip {
  id: string;
  routeId: string;
  routeNumber: string;
  busNumber?: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  attendantName?: string;
  attendantPhone?: string;
  tripType: 'morning_pickup' | 'afternoon_drop';
  tripDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: 'not_started' | 'scheduled' | 'in_transit' | 'arrived_at_school' | 'completed' | 'offline';
  currentStopName?: string;
  nextStopName?: string;
  etaNextStopMinutes?: number;
  lastLocationUpdate?: BusLocationUpdate;
  hasDeviationAlert?: boolean;
  isSimulatedDemo?: boolean;
}

export interface TransportSafetyEvent {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  classId: string;
  className: string;
  grade?: string;
  section: string;
  tripId: string;
  routeId: string;
  eventType: 'boarded' | 'dropped_off' | 'not_boarded' | 'exception';
  stopId?: string;
  stopName: string;
  timestamp: string;
  recordedByStaffId: string;
  recordedByStaffName: string;
  recordedByName?: string;
  recordedRole: 'driver' | 'attendant' | 'transport_manager' | 'school_admin';
  verificationMethod: 'manual_attendant' | 'qr_code' | 'rfid_card' | 'emergency_override';
  notes?: string;
  isFlagged?: boolean;
  isExceptionFlagged?: boolean;
  auditCorrection?: {
    previousType: string;
    correctedBy: string;
    timestamp: string;
    reason: string;
  };
  correctionHistory?: {
    previousEventType: string;
    correctedByName: string;
    timestamp: string;
    reason: string;
  }[];
}

export interface TransportAlert {
  id: string;
  tripId: string;
  routeId: string;
  busNumber: string;
  studentId?: string;
  alertType:
    | 'approaching_stop'
    | 'arrived_at_school'
    | 'student_boarded'
    | 'student_dropped'
    | 'trip_delayed'
    | 'route_deviation'
    | 'gps_offline'
    | 'safety_incident';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  isSimulated?: boolean;
  acknowledgedBy?: string | string[];
}

export interface OrderItem {
  itemDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  category: 'Textbooks' | 'Stationery' | 'Uniforms' | 'Lab Equipment' | 'IT & Electronics' | 'Furniture';
  orderDate: string;
  expectedDeliveryDate: string;
  deliveryStatus: 'pending' | 'partially_delivered' | 'delivered' | 'cancelled';
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
}

export interface PersonalReminder {
  id: string;
  userId: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
}

export interface SchoolSettings {
  schoolName: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  schoolBoard: string;
  affiliationNo: string;
  academicYear: string;
  principalName: string;
  currencyCode: string;
  currencySymbol: string;
  dateFormat: string;
  timeZone: string;
}

export interface ERPDataStore {
  version: string;
  institutions: Institution[];
  students: Student[];
  teachers: Teacher[];
  classes: ClassRoom[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  examinations: Examination[];
  examMarks: ExamMark[];
  feeInvoices: FeeInvoice[];
  timetable: TimetablePeriod[];
  events: SchoolEvent[];
  notices: Notice[];
  messages: Message[];
  leaveRequests: LeaveRequest[];
  books: LibraryBook[];
  libraryCopies?: LibraryCopy[];
  libraryMembers?: LibraryMember[];
  libraryLoans?: LibraryLoan[];
  libraryReservations?: LibraryReservation[];
  libraryFines?: LibraryFine[];
  libraryInventoryAudits?: LibraryInventoryAudit[];
  libraryStaffAssignments?: LibraryStaffAssignment[];
  librarySettings?: LibrarySettings;
  transportRoutes: TransportRoute[];
  purchaseOrders: PurchaseOrder[];
  reminders: PersonalReminder[];
  settings: SchoolSettings;
  paymentTransactions?: PaymentTransaction[];
  feeStructures?: FeeStructure[];
  feePolicy?: FeePolicy;
  staffAttendance?: StaffAttendanceRecord[];
  admissions?: AdmissionApplication[];
  gradingSchemes?: GradingScheme[];
  staffGroups?: StaffGroup[];
  staffGroupMessages?: StaffGroupMessage[];
  academicSessions?: AcademicSession[];
  studentEnrollments?: StudentEnrollment[];
  promotionBatches?: PromotionBatch[];
  importBatches?: ImportBatch[];
  classGroups?: ClassGroup[];
  classGroupMessages?: ClassGroupMessage[];
  transportTrips?: TransportTrip[];
  transportLocations?: BusLocationUpdate[];
  transportSafetyEvents?: TransportSafetyEvent[];
  transportAlerts?: TransportAlert[];
  questionPapers?: QuestionPaper[];
  schoolServiceConfigs?: SchoolServiceConfiguration[];
  serviceEntitlementAuditLogs?: ServiceEntitlementAuditLog[];
  marketingCampaigns?: MarketingCampaign[];
  marketingLeads?: MarketingLead[];
  marketingContentItems?: MarketingContentItem[];
  migrationAuditResult?: any;
  admissionEnquiries?: any[];
  admissionFollowUps?: any[];
  admissionAssessments?: any[];
  admissionOffers?: any[];
  admissionCapacitySettings?: any[];
  admissionAuditLogs?: any[];
  academicAwards?: import('./academicAwards').AcademicAward[];
  staffRecognitions?: import('./academicAwards').StaffRecognition[];
  awardCategories?: import('./academicAwards').AwardCategory[];
  competitionEvents?: import('./academicAwards').CompetitionEvent[];
  awardCertificates?: import('./academicAwards').AwardCertificate[];
  notifications?: AppNotification[];
}

export type NotificationCategory =
  | 'class_group'
  | 'staff_group'
  | 'notice'
  | 'assignment'
  | 'fee'
  | 'attendance'
  | 'exam'
  | 'award'
  | 'transport'
  | 'admission'
  | 'leave'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  institutionId: string;
  recipientUserId: string;
  recipientRole?: UserRole;
  senderUserId?: string;
  senderName?: string;
  senderRole?: UserRole;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedModule?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiryDate?: string;
}

export * from './questionPaper';
export * from './serviceEntitlement';
export * from './admission';
export * from './academicAwards';

