// ==========================================
// Comprehensive School Admission Management Types
// Developed by NTS Novalytix
// ==========================================

import { AdmissionDocument, PaymentMethodType } from './index';

export type EnquirySource =
  | 'Website'
  | 'Walk-in'
  | 'Phone Call'
  | 'WhatsApp'
  | 'Google Ads'
  | 'Facebook'
  | 'Instagram'
  | 'Referral'
  | 'Education Fair'
  | 'Other';

export type EnquiryStatus =
  | 'New'
  | 'Contacted'
  | 'Follow-up Required'
  | 'Visit Scheduled'
  | 'Visit Completed'
  | 'Application Started'
  | 'Converted'
  | 'Lost';

export type LostReason =
  | 'Fee too high'
  | 'Distance / Location far'
  | 'Chose another school'
  | 'Transport unavailable'
  | 'Ineligible age / Grade requirement'
  | 'Curriculum / Board preference'
  | 'Parent relocated'
  | 'No response after multiple attempts'
  | 'Other';

export type PreferredContactMethod = 'Phone Call' | 'WhatsApp' | 'Email' | 'In-Person';

export interface AdmissionEnquiry {
  id: string; // e.g. enq-101
  enquiryNo: string; // e.g. ENQ-2026-0101
  studentName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  interestedClassId: string;
  interestedClassName: string;
  academicSession: string; // e.g. 2026-2027
  previousSchool?: string;
  parentName: string;
  relationship: 'Father' | 'Mother' | 'Guardian';
  mobileNumber: string;
  alternateMobile?: string;
  email: string;
  residentialAddress: string;
  enquiryDate: string;
  source: EnquirySource | string;
  preferredContactMethod: PreferredContactMethod;
  assignedCounsellor: string;
  nextFollowUpDate?: string;
  remarks?: string;
  status: EnquiryStatus;
  lostReason?: LostReason | string;
  convertedApplicationId?: string;
  convertedApplicationNo?: string;
  institutionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type FollowUpStatus = 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled';

export type CallOutcome =
  | 'Interested'
  | 'Call Not Received'
  | 'Busy / Callback Requested'
  | 'Campus Visit Planned'
  | 'Fee / Scholarship Inquiry'
  | 'Documents Awaited'
  | 'Not Interested';

export interface AdmissionFollowUp {
  id: string; // fup-xxx
  enquiryId?: string;
  applicationId?: string;
  candidateName: string;
  parentName: string;
  contactNumber: string;
  assignedStaff: string;
  followUpDate: string;
  followUpTime: string;
  communicationMethod: 'Phone Call' | 'WhatsApp' | 'Email' | 'Campus Visit';
  interactionNotes: string;
  nextAction: string;
  status: FollowUpStatus;
  callOutcome?: CallOutcome;
  institutionId?: string;
  createdAt: string;
}

export type ApplicationWorkflowStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Documents Pending'
  | 'Documents Verified'
  | 'Assessment Pending'
  | 'Assessment Completed'
  | 'Admission Offered'
  | 'Fee Pending'
  | 'Confirmed / Enrolled'
  | 'Waitlisted'
  | 'Rejected'
  | 'Withdrawn';

export type DocumentVerificationStatus =
  | 'Not Uploaded'
  | 'Uploaded'
  | 'Under Verification'
  | 'Verified'
  | 'Rejected'
  | 'Re-upload Required'
  | 'Not Applicable';

export type AdmissionPaymentStatus =
  | 'Not Generated'
  | 'Pending'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Refunded'
  | 'Waived';

export interface AdmissionDocumentRecord extends AdmissionDocument {
  category?: 'Identity' | 'Academic' | 'Transfer' | 'Address' | 'Category' | 'Medical' | 'Other';
  status?: DocumentVerificationStatus;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  uploadedDate?: string;
  rejectionReason?: string;
  verifiedBy?: string;
}

export interface AdmissionPaymentRecord {
  id: string;
  receiptNo: string;
  amount: number;
  paymentMethod: PaymentMethodType | string;
  transactionRef: string;
  paymentDate: string;
  notes?: string;
  recordedBy: string;
}

export interface AdmissionAssessment {
  id: string; // asm-xxx
  applicationId: string;
  candidateName: string;
  targetClass: string;
  assessmentRequired: boolean;
  assessmentDate?: string;
  assessmentType: 'Written Test' | 'Oral Interview' | 'Interaction / Observation' | 'Parent Interview' | 'Exempted';
  subjectOrCategory?: string;
  marksObtained?: number;
  maxMarks?: number;
  result: 'Passed' | 'Shortlisted' | 'Needs Further Review' | 'Exempted' | 'Failed';
  evaluatorTeacher: string;
  interactionRemarks?: string;
  status: 'Scheduled' | 'Completed' | 'Waived';
}

export interface AdmissionOffer {
  id: string; // off-xxx
  applicationId: string;
  decision: 'Offered' | 'Waitlisted' | 'Rejected' | 'Withdrawn';
  decisionDate: string;
  approvedClassId: string;
  approvedClassName: string;
  offeredSection: string;
  offerDate: string;
  expiryDate: string;
  admissionFeeAmount: number;
  admissionInstructions: string;
  remarks?: string;
  authorizedApprover: string;
  status: 'Draft' | 'Issued' | 'Accepted' | 'Declined' | 'Expired';
}

export interface ClassAdmissionCapacity {
  classId: string;
  className: string;
  academicSession: string;
  totalApprovedSeats: number;
  reservedSeats: number;
  confirmedAdmissions: number;
  availableSeats: number;
  waitlistedApplicants: number;
}

export interface AdmissionAuditLog {
  id: string;
  entityType: 'Enquiry' | 'Application' | 'Document' | 'Assessment' | 'Offer' | 'Fee' | 'Enrollment';
  entityId: string;
  action: string;
  performedBy: string;
  userRole: string;
  timestamp: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface AdmissionCounsellorStaff {
  id: string;
  name: string;
  role: string;
  activeEnquiries: number;
  conversions: number;
}

