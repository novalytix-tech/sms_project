// ==========================================
// Academic Awards & Achievements Service
// Developed by NTS Novalytix
// ==========================================

import { ERPStorage } from './storage';
import {
  AcademicAward,
  StaffRecognition,
  AwardCategory,
  CompetitionEvent,
  AwardCertificate,
  AwardsAnalyticsSummary,
  AwardStatus,
  CertificateTemplateType,
} from '../types/academicAwards';
import { studentService } from './studentService';
import { teacherService } from './teacherService';

export const academicAwardsService = {
  // ==========================================
  // 1. Awards CRUD
  // ==========================================

  getAwards: (filters?: {
    status?: string;
    academicYear?: string;
    classId?: string;
    categoryId?: string;
    level?: string;
    search?: string;
    studentId?: string;
    institutionId?: string;
  }): AcademicAward[] => {
    const store = ERPStorage.get();
    let awards = [...(store.academicAwards || [])];

    if (filters?.institutionId) {
      awards = awards.filter(a => !a.institutionId || a.institutionId === filters.institutionId);
    }
    if (filters?.status && filters.status !== 'all') {
      awards = awards.filter(a => a.status === filters.status);
    }
    if (filters?.academicYear && filters.academicYear !== 'all') {
      awards = awards.filter(a => a.academicYear === filters.academicYear);
    }
    if (filters?.classId && filters.classId !== 'all') {
      awards = awards.filter(a => a.classId === filters.classId);
    }
    if (filters?.categoryId && filters.categoryId !== 'all') {
      awards = awards.filter(a => a.categoryId === filters.categoryId);
    }
    if (filters?.level && filters.level !== 'all') {
      awards = awards.filter(a => a.achievementLevel.toLowerCase() === filters.level?.toLowerCase());
    }
    if (filters?.studentId) {
      awards = awards.filter(
        a => a.studentId === filters.studentId || a.teamMembers?.some(m => m.studentId === filters.studentId)
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      awards = awards.filter(
        a =>
          a.awardTitle.toLowerCase().includes(q) ||
          a.studentName.toLowerCase().includes(q) ||
          a.admissionNo.toLowerCase().includes(q) ||
          a.categoryName.toLowerCase().includes(q) ||
          (a.competitionName && a.competitionName.toLowerCase().includes(q))
      );
    }

    awards.sort(
      (a, b) => new Date(b.awardDate || b.createdAt || 0).getTime() - new Date(a.awardDate || a.createdAt || 0).getTime()
    );
    return awards;
  },

  getAwardById: (id: string): AcademicAward | undefined => {
    const store = ERPStorage.get();
    return (store.academicAwards || []).find(a => a.id === id);
  },

  createAward: (
    data: Partial<AcademicAward>,
    creatorUser: { id: string; name: string }
  ): { success: boolean; data?: AcademicAward; error?: string } => {
    if (!data.awardTitle || !data.studentId || !data.categoryId) {
      return { success: false, error: 'Award title, student, and category are required' };
    }

    const store = ERPStorage.get();
    const student = studentService.getById(data.studentId);
    const category = (store.awardCategories || []).find(c => c.id === data.categoryId);

    const awardId = `award-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const status: AwardStatus = data.status || 'draft';

    const newAward: AcademicAward = {
      id: awardId,
      awardTitle: data.awardTitle.trim(),
      awardType: data.awardType || 'individual',
      studentId: data.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : data.studentName || 'Student',
      admissionNo: student ? student.admissionNo : data.admissionNo || 'N/A',
      classId: student ? student.classId : data.classId || '',
      className: student ? student.className : data.className || '',
      section: student ? student.section : data.section || '',
      rollNo: student ? student.rollNo : data.rollNo || '',
      photoUrl: student?.photoUrl || data.photoUrl || '/student-male.svg',
      categoryId: data.categoryId,
      categoryName: category ? category.name : data.categoryName || 'General',
      achievementLevel: data.achievementLevel || 'School',
      position: data.position || 'Winner',
      competitionId: data.competitionId,
      competitionName: data.competitionName,
      organizer: data.organizer,
      awardDate: data.awardDate || new Date().toISOString().split('T')[0],
      academicYear: data.academicYear || '2026-2027',
      awardedBy: data.awardedBy || 'Principal & School Management',
      description: data.description || '',
      remarks: data.remarks || '',
      teamMembers: data.teamMembers || [],
      status,
      history: [
        {
          status,
          changedBy: creatorUser.id,
          changedByName: creatorUser.name,
          changedAt: new Date().toISOString(),
          remarks: `Award created in '${status}' state by ${creatorUser.name}`,
        },
      ],
      institutionId: data.institutionId || 'inst-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.academicAwards = [newAward, ...(store.academicAwards || [])];
    ERPStorage.set(store);
    return { success: true, data: newAward };
  },

  updateAward: (
    id: string,
    updates: Partial<AcademicAward>,
    updaterUser: { id: string; name: string }
  ): { success: boolean; data?: AcademicAward; error?: string } => {
    const store = ERPStorage.get();
    const index = (store.academicAwards || []).findIndex(a => a.id === id);
    if (index === -1) {
      return { success: false, error: 'Award not found' };
    }

    const current = store.academicAwards![index];
    const history = current.history ? [...current.history] : [];

    if (updates.status && updates.status !== current.status) {
      history.push({
        status: updates.status,
        changedBy: updaterUser.id,
        changedByName: updaterUser.name,
        changedAt: new Date().toISOString(),
        remarks: updates.remarks || `Status updated to ${updates.status}`,
      });
    }

    let studentSnapshot: Partial<AcademicAward> = {};
    if (updates.studentId && updates.studentId !== current.studentId) {
      const student = studentService.getById(updates.studentId);
      if (student) {
        studentSnapshot = {
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo,
          classId: student.classId,
          className: student.className,
          section: student.section,
          rollNo: student.rollNo,
          photoUrl: student.photoUrl,
        };
      }
    }

    const updatedAward: AcademicAward = {
      ...current,
      ...updates,
      ...studentSnapshot,
      history,
      updatedAt: new Date().toISOString(),
    };

    store.academicAwards![index] = updatedAward;
    ERPStorage.set(store);
    return { success: true, data: updatedAward };
  },

  deleteAward: (id: string): { success: boolean; error?: string } => {
    const store = ERPStorage.get();
    const initialLen = (store.academicAwards || []).length;
    store.academicAwards = (store.academicAwards || []).filter(a => a.id !== id);
    if (store.academicAwards.length === initialLen) {
      return { success: false, error: 'Award not found' };
    }
    ERPStorage.set(store);
    return { success: true };
  },

  // ==========================================
  // 2. Approval Workflow Transitions
  // ==========================================

  submitAward: (
    id: string,
    user: { id: string; name: string },
    remarks?: string
  ): { success: boolean; data?: AcademicAward; error?: string } => {
    return academicAwardsService.updateAward(
      id,
      {
        status: 'submitted',
        remarks: remarks || 'Submitted for Principal review',
      },
      user
    );
  },

  reviewAward: (
    id: string,
    user: { id: string; name: string },
    remarks?: string
  ): { success: boolean; data?: AcademicAward; error?: string } => {
    return academicAwardsService.updateAward(
      id,
      {
        status: 'under_review',
        remarks: remarks || 'Award marked under review',
      },
      user
    );
  },

  approveAward: (
    id: string,
    user: { id: string; name: string },
    remarks?: string
  ): { success: boolean; data?: AcademicAward; error?: string } => {
    return academicAwardsService.updateAward(
      id,
      {
        status: 'approved',
        remarks: remarks || 'Approved by Principal',
        rejectionReason: undefined,
      },
      user
    );
  },

  rejectAward: (
    id: string,
    user: { id: string; name: string },
    reason: string
  ): { success: boolean; data?: AcademicAward; error?: string } => {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Rejection reason is required' };
    }
    return academicAwardsService.updateAward(
      id,
      {
        status: 'rejected',
        rejectionReason: reason.trim(),
        remarks: `Rejected: ${reason.trim()}`,
      },
      user
    );
  },

  publishAward: (
    id: string,
    user: { id: string; name: string },
    remarks?: string
  ): { success: boolean; data?: AcademicAward; error?: string } => {
    return academicAwardsService.updateAward(
      id,
      {
        status: 'published',
        remarks: remarks || 'Published to Achievement Wall & Parent Portal',
      },
      user
    );
  },

  // ==========================================
  // 3. Award Categories
  // ==========================================

  getCategories: (): AwardCategory[] => {
    const store = ERPStorage.get();
    return store.awardCategories || [];
  },

  createCategory: (
    payload: Partial<AwardCategory>
  ): { success: boolean; data?: AwardCategory; error?: string } => {
    if (!payload.name || !payload.code) {
      return { success: false, error: 'Name and Code are required' };
    }
    const store = ERPStorage.get();
    const id = `cat-${payload.code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
    const newCat: AwardCategory = {
      id,
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      description: payload.description || '',
      icon: payload.icon || 'Award',
      isCustom: true,
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
    };
    store.awardCategories = [...(store.awardCategories || []), newCat];
    ERPStorage.set(store);
    return { success: true, data: newCat };
  },

  updateCategory: (
    id: string,
    updates: Partial<AwardCategory>
  ): { success: boolean; data?: AwardCategory; error?: string } => {
    const store = ERPStorage.get();
    const index = (store.awardCategories || []).findIndex(c => c.id === id);
    if (index === -1) return { success: false, error: 'Category not found' };

    const updated = { ...store.awardCategories![index], ...updates };
    store.awardCategories![index] = updated;
    ERPStorage.set(store);
    return { success: true, data: updated };
  },

  deleteCategory: (id: string): { success: boolean; error?: string } => {
    const store = ERPStorage.get();
    store.awardCategories = (store.awardCategories || []).filter(c => c.id !== id);
    ERPStorage.set(store);
    return { success: true };
  },

  // ==========================================
  // 4. Competitions & Events
  // ==========================================

  getCompetitions: (filters?: { status?: string; category?: string; level?: string }): CompetitionEvent[] => {
    const store = ERPStorage.get();
    let list = [...(store.competitionEvents || [])];

    if (filters?.status && filters.status !== 'all') {
      list = list.filter(c => c.status === filters.status);
    }
    if (filters?.category && filters.category !== 'all') {
      list = list.filter(c => c.category === filters.category);
    }
    if (filters?.level && filters.level !== 'all') {
      list = list.filter(c => c.level.toLowerCase() === filters.level?.toLowerCase());
    }

    list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return list;
  },

  createCompetition: (
    payload: Partial<CompetitionEvent>
  ): { success: boolean; data?: CompetitionEvent; error?: string } => {
    if (!payload.name || !payload.category || !payload.startDate) {
      return { success: false, error: 'Name, Category, and Start Date are required' };
    }
    const store = ERPStorage.get();
    const id = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const comp: CompetitionEvent = {
      id,
      name: payload.name.trim(),
      category: payload.category,
      organizer: payload.organizer || 'Inter-School Sports & Arts Association',
      level: payload.level || 'School',
      venue: payload.venue || 'School Campus',
      startDate: payload.startDate,
      endDate: payload.endDate || payload.startDate,
      status: payload.status || 'upcoming',
      description: payload.description || '',
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
    };
    store.competitionEvents = [comp, ...(store.competitionEvents || [])];
    ERPStorage.set(store);
    return { success: true, data: comp };
  },

  updateCompetition: (
    id: string,
    updates: Partial<CompetitionEvent>
  ): { success: boolean; data?: CompetitionEvent; error?: string } => {
    const store = ERPStorage.get();
    const index = (store.competitionEvents || []).findIndex(c => c.id === id);
    if (index === -1) return { success: false, error: 'Competition not found' };

    const updated = { ...store.competitionEvents![index], ...updates };
    store.competitionEvents![index] = updated;
    ERPStorage.set(store);
    return { success: true, data: updated };
  },

  deleteCompetition: (id: string): { success: boolean; error?: string } => {
    const store = ERPStorage.get();
    store.competitionEvents = (store.competitionEvents || []).filter(c => c.id !== id);
    ERPStorage.set(store);
    return { success: true };
  },

  // ==========================================
  // 5. Staff Recognitions
  // ==========================================

  getStaffRecognitions: (filters?: { academicYear?: string; search?: string }): StaffRecognition[] => {
    const store = ERPStorage.get();
    let recognitions = [...(store.staffRecognitions || [])];

    if (filters?.academicYear && filters.academicYear !== 'all') {
      recognitions = recognitions.filter(r => r.academicYear === filters.academicYear);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      recognitions = recognitions.filter(
        r =>
          r.employeeName.toLowerCase().includes(q) ||
          r.awardTitle.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
      );
    }

    recognitions.sort((a, b) => new Date(b.recognitionDate).getTime() - new Date(a.recognitionDate).getTime());
    return recognitions;
  },

  createStaffRecognition: (
    payload: Partial<StaffRecognition>
  ): { success: boolean; data?: StaffRecognition; error?: string } => {
    if (!payload.teacherId || !payload.awardTitle) {
      return { success: false, error: 'Staff member and Award Title are required' };
    }
    const store = ERPStorage.get();
    const teacher = teacherService.getById(payload.teacherId);

    const id = `staff-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const rec: StaffRecognition = {
      id,
      teacherId: payload.teacherId,
      employeeId: teacher?.staffId || payload.employeeId || 'STAFF-100',
      employeeName: teacher?.fullName || payload.employeeName || 'Faculty Member',
      department: teacher?.department || payload.department || 'Academics',
      designation: teacher?.designation || payload.designation || 'Teacher',
      awardTitle: payload.awardTitle.trim(),
      category: payload.category || 'Academic Excellence',
      description: payload.description || '',
      recognitionDate: payload.recognitionDate || new Date().toISOString().split('T')[0],
      academicYear: payload.academicYear || '2026-2027',
      awardedBy: payload.awardedBy || 'Principal & School Board',
      photoUrl: teacher?.photoUrl || payload.photoUrl || '/teacher-female.svg',
      certificateId: payload.certificateId,
      institutionId: 'inst-1',
      createdAt: new Date().toISOString(),
    };

    store.staffRecognitions = [rec, ...(store.staffRecognitions || [])];
    ERPStorage.set(store);
    return { success: true, data: rec };
  },

  deleteStaffRecognition: (id: string): { success: boolean; error?: string } => {
    const store = ERPStorage.get();
    store.staffRecognitions = (store.staffRecognitions || []).filter(r => r.id !== id);
    ERPStorage.set(store);
    return { success: true };
  },

  // ==========================================
  // 6. Certificates & Public Verification
  // ==========================================

  getCertificates: (filters?: { recipientType?: string; recipientId?: string; search?: string }): AwardCertificate[] => {
    const store = ERPStorage.get();
    let certs = [...(store.awardCertificates || [])];

    if (filters?.recipientType && filters.recipientType !== 'all') {
      certs = certs.filter(c => c.recipientType === filters.recipientType);
    }
    if (filters?.recipientId) {
      certs = certs.filter(c => c.recipientId === filters.recipientId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      certs = certs.filter(
        c =>
          c.recipientName.toLowerCase().includes(q) ||
          c.certificateNo.toLowerCase().includes(q) ||
          c.verificationCode.toLowerCase().includes(q) ||
          c.awardTitle.toLowerCase().includes(q)
      );
    }

    certs.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
    return certs;
  },

  getCertificateById: (id: string): AwardCertificate | undefined => {
    const store = ERPStorage.get();
    return (store.awardCertificates || []).find(c => c.id === id);
  },

  issueCertificate: (payload: {
    awardId?: string;
    recognitionId?: string;
    template?: CertificateTemplateType;
    principalName?: string;
  }): { success: boolean; data?: AwardCertificate; error?: string } => {
    if (!payload.awardId && !payload.recognitionId) {
      return { success: false, error: 'Award or Recognition selection is required' };
    }

    const store = ERPStorage.get();
    const year = new Date().getFullYear();
    const certNumberSuffix = Math.floor(1000 + Math.random() * 9000);
    const certNo = `CERT-${year}-${certNumberSuffix}`;
    const codeSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const verificationCode = `CERT-${year}-${codeSuffix}`;
    const certId = `cert-${Date.now()}`;

    let certificateRecord: AwardCertificate;

    if (payload.awardId) {
      const award = (store.academicAwards || []).find(a => a.id === payload.awardId);
      if (!award) return { success: false, error: 'Award not found' };

      certificateRecord = {
        id: certId,
        awardId: award.id,
        recipientType: 'student',
        recipientId: award.studentId,
        recipientName: award.studentName,
        admissionOrEmployeeNo: award.admissionNo,
        classNameOrDept: `${award.className} - Section ${award.section}`,
        awardTitle: award.awardTitle,
        categoryName: award.categoryName,
        achievementLevel: award.achievementLevel,
        position: award.position,
        certificateNo: certNo,
        template: payload.template || 'academic_excellence',
        issuedDate: new Date().toISOString().split('T')[0],
        principalName: payload.principalName || 'Dr. Arvind Swaminathan',
        verificationCode,
        qrCodeUrl: `https://stxaviers.edu.in/verify/${verificationCode}`,
        institutionId: award.institutionId || 'inst-1',
        createdAt: new Date().toISOString(),
      };

      award.certificateId = certId;
    } else {
      const rec = (store.staffRecognitions || []).find(r => r.id === payload.recognitionId);
      if (!rec) return { success: false, error: 'Staff recognition not found' };

      certificateRecord = {
        id: certId,
        recognitionId: rec.id,
        recipientType: 'staff',
        recipientId: rec.teacherId,
        recipientName: rec.employeeName,
        admissionOrEmployeeNo: rec.employeeId,
        classNameOrDept: rec.department,
        awardTitle: rec.awardTitle,
        categoryName: rec.category,
        certificateNo: certNo,
        template: payload.template || 'staff_appreciation',
        issuedDate: new Date().toISOString().split('T')[0],
        principalName: payload.principalName || 'Dr. Arvind Swaminathan',
        verificationCode,
        qrCodeUrl: `https://stxaviers.edu.in/verify/${verificationCode}`,
        institutionId: rec.institutionId || 'inst-1',
        createdAt: new Date().toISOString(),
      };

      rec.certificateId = certId;
    }

    store.awardCertificates = [certificateRecord, ...(store.awardCertificates || [])];
    ERPStorage.set(store);
    return { success: true, data: certificateRecord };
  },

  verifyCertificate: (code: string): { verified: boolean; certificate?: AwardCertificate; institutionName?: string } => {
    const store = ERPStorage.get();
    const cert = (store.awardCertificates || []).find(
      c => c.verificationCode.toLowerCase() === code.trim().toLowerCase()
    );

    if (!cert) return { verified: false };
    return {
      verified: true,
      certificate: cert,
      institutionName: "St. Xavier's International Academy",
    };
  },

  // ==========================================
  // 7. Analytics & Reports
  // ==========================================

  getAnalyticsSummary: (academicYear: string = '2026-2027'): AwardsAnalyticsSummary => {
    const store = ERPStorage.get();
    const awards = store.academicAwards || [];
    const staffRecs = store.staffRecognitions || [];

    const yearAwards = awards.filter(a => !academicYear || a.academicYear === academicYear);

    const totalAwards = yearAwards.length;
    const pendingApprovals = yearAwards.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
    const approvedAwards = yearAwards.filter(a => a.status === 'approved').length;
    const publishedWall = yearAwards.filter(a => a.status === 'published').length;
    const totalStaffRecognitions = staffRecs.length;

    const catMap: Record<string, number> = {};
    yearAwards.forEach(a => {
      catMap[a.categoryName] = (catMap[a.categoryName] || 0) + 1;
    });
    const categoryDistribution = Object.entries(catMap).map(([category, count]) => ({ category, count }));

    const levelMap: Record<string, number> = {};
    yearAwards.forEach(a => {
      levelMap[a.achievementLevel] = (levelMap[a.achievementLevel] || 0) + 1;
    });
    const levelDistribution = Object.entries(levelMap).map(([level, count]) => ({ level, count }));

    const recentAchievements = [...yearAwards]
      .filter(a => a.status === 'published' || a.status === 'approved')
      .sort((a, b) => new Date(b.awardDate).getTime() - new Date(a.awardDate).getTime())
      .slice(0, 5);

    return {
      totalAwards,
      pendingApprovals,
      approvedAwards,
      publishedWall,
      totalStaffRecognitions,
      categoryDistribution,
      levelDistribution,
      recentAchievements,
    };
  },
};

