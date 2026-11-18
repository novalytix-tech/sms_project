// ==========================================
// Academic Awards & Achievements Types
// Developed by NTS Novalytix
// ==========================================

export type AwardAchievementLevel =
  | 'School'
  | 'Zonal'
  | 'District'
  | 'State'
  | 'National'
  | 'International';

export type AwardPosition =
  | '1st Place / Gold'
  | '2nd Place / Silver'
  | '3rd Place / Bronze'
  | 'Special Mention'
  | 'Participant'
  | 'Winner'
  | 'Runner Up';

export type AwardStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'published';

export type CertificateTemplateType =
  | 'academic_excellence'
  | 'sports_achievement'
  | 'cultural_arts'
  | 'stem_olympiad'
  | 'leadership'
  | 'staff_appreciation'
  | 'general_merit';

export interface AwardHistoryEntry {
  status: AwardStatus;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  remarks?: string;
}

export interface TeamMember {
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  section: string;
  rollNo?: string;
  photoUrl?: string;
}

export interface AwardCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  isCustom?: boolean;
  institutionId?: string;
  createdAt?: string;
}

export interface CompetitionEvent {
  id: string;
  name: string;
  category: string;
  organizer: string;
  level: AwardAchievementLevel;
  venue: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  description?: string;
  institutionId?: string;
  createdAt?: string;
}

export interface AcademicAward {
  id: string;
  awardTitle: string;
  awardType: 'individual' | 'team';
  studentId: string;
  studentName: string;
  admissionNo: string;
  classId: string;
  className: string;
  section: string;
  rollNo?: string;
  photoUrl?: string;
  categoryId: string;
  categoryName: string;
  achievementLevel: AwardAchievementLevel;
  position: AwardPosition;
  competitionId?: string;
  competitionName?: string;
  organizer?: string;
  awardDate: string;
  academicYear: string;
  awardedBy: string;
  description?: string;
  remarks?: string;
  teamMembers?: TeamMember[];
  status: AwardStatus;
  rejectionReason?: string;
  certificateId?: string;
  history?: AwardHistoryEntry[];
  institutionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffRecognition {
  id: string;
  teacherId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  awardTitle: string;
  category: string;
  description?: string;
  recognitionDate: string;
  academicYear: string;
  awardedBy: string;
  photoUrl?: string;
  certificateId?: string;
  institutionId?: string;
  createdAt?: string;
}

export interface AwardCertificate {
  id: string;
  awardId?: string;
  recognitionId?: string;
  recipientType: 'student' | 'staff';
  recipientId: string;
  recipientName: string;
  admissionOrEmployeeNo: string;
  classNameOrDept: string;
  awardTitle: string;
  categoryName: string;
  achievementLevel?: string;
  position?: string;
  certificateNo: string;
  template: CertificateTemplateType;
  issuedDate: string;
  principalName: string;
  verificationCode: string;
  qrCodeUrl?: string;
  institutionId?: string;
  createdAt?: string;
}

export interface AwardsAnalyticsSummary {
  totalAwards: number;
  pendingApprovals: number;
  approvedAwards: number;
  publishedWall: number;
  totalStaffRecognitions: number;
  categoryDistribution: { category: string; count: number }[];
  levelDistribution: { level: string; count: number }[];
  recentAchievements: AcademicAward[];
}

