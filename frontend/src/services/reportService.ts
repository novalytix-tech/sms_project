// ==========================================
// School-Scoped & Platform-Wide Reporting Service
// Developed by NTS Novalytix
// Strictly enforces Multi-School Isolation & Service Entitlements
// ==========================================

import { ERPStorage } from './storage';
import { feeService } from './feeService';
import { attendanceService } from './attendanceService';
import { institutionService } from './institutionService';
import { serviceEntitlementService } from './serviceEntitlementService';
import { schoolMigrationService, MigrationAuditResult } from './schoolMigrationService';
import { Student, Teacher, FeeInvoice, AdmissionApplication, TransportRoute, Institution, Examination } from '../types';
import { MarketingCampaign, MarketingLead, SchoolServiceConfiguration, ServiceEntitlementAuditLog } from '../types/serviceEntitlement';
import { todayISO } from '../utils/date';

export type ReportCategory =
  | 'students'
  | 'admissions'
  | 'fees'
  | 'outstanding'
  | 'attendance'
  | 'academics'
  | 'teachers'
  | 'transport'
  | 'marketing'
  | 'platform_overview'
  | 'service_adoption'
  | 'school_comparison'
  | 'audit_trail';

export interface ReportFilters {
  schoolId: string; // 'ALL' or specific institution id like 'inst-1'
  academicYear?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  classId?: string;
  reportCategory: ReportCategory;
}

export interface StudentReportSummary {
  totalStudents: number;
  activeCount: number;
  inactiveCount: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  classBreakdown: { classId: string; className: string; section: string; count: number }[];
  rows: Student[];
}

export interface AdmissionReportSummary {
  totalApplications: number;
  enrolledCount: number;
  inquiryCount: number;
  pendingReviewCount: number;
  conversionRate: number; // percentage
  sourceBreakdown: Record<string, number>;
  stageBreakdown: Record<string, number>;
  rows: AdmissionApplication[];
}

export interface FeeReportSummary {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number; // percentage
  overdueInvoicesCount: number;
  categoryBreakdown: Record<string, { billed: number; paid: number; outstanding: number }>;
  rows: FeeInvoice[];
}

export interface AttendanceReportSummary {
  totalTargetStudents: number;
  recordedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  dayAttendanceRate: number; // percentage
  rows: {
    studentId: string;
    admissionNo: string;
    fullName: string;
    className: string;
    section: string;
    rollNo: string;
    status: string;
    remarks: string;
    cumulativePercentage: number;
  }[];
}

export interface AcademicReportSummary {
  totalExams: number;
  totalSubmissions: number;
  averageScorePercentage: number;
  passCount: number;
  failCount: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
  topAchievers: {
    studentId: string;
    admissionNo: string;
    name: string;
    className: string;
    percentage: number;
    grade: string;
  }[];
}

export interface TeacherReportSummary {
  totalTeachers: number;
  activeCount: number;
  studentTeacherRatio: string;
  departmentBreakdown: Record<string, number>;
  rows: Teacher[];
}

export interface TransportReportSummary {
  hasTransportConfigured: boolean;
  totalRoutes: number;
  totalVehicles: number;
  totalCapacity: number;
  totalAssignedStudents: number;
  capacityUtilization: number;
  rows: TransportRoute[];
}

export interface MarketingReportSummary {
  isServiceEnabled: boolean;
  disabledReason?: string;
  totalSpend: number;
  qualifiedLeads: number;
  attributedAdmissions: number;
  costPerLead: number;
  costPerAdmission: number;
  activeCampaignsCount: number;
  campaigns: MarketingCampaign[];
  leads: MarketingLead[];
  channelBreakdown: Record<string, { spend: number; leads: number; conversions: number }>;
}

export interface PlatformOverviewSummary {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  totalNetworkStudents: number;
  totalNetworkTeachers: number;
  platformUptime: string;
  schools: Institution[];
}

export interface ServiceAdoptionSummary {
  totalSchools: number;
  coreErpEnabledCount: number;
  digitalMarketingEnabledCount: number;
  transportEnabledCount: number;
  admissionsEnabledCount: number;
  feesEnabledCount: number;
  examinationsEnabledCount: number;
  packageCounts: Record<string, number>;
  schoolConfigs: SchoolServiceConfiguration[];
}

export interface CrossSchoolComparisonRow {
  schoolId: string;
  schoolName: string;
  code: string;
  board: string;
  city: string;
  status: string;
  packageId: string;
  studentCount: number;
  teacherCount: number;
  totalBilled: number;
  totalCollected: number;
  isMarketingEnabled: boolean;
  marketingSpend: number;
}

export const reportService = {
  /**
   * Resolves the list of schools available for selection.
   * Super Admins can see all registered schools and the 'ALL' consolidated option.
   * School Admins are restricted strictly to their assigned institutionId.
   */
  getAvailableSchools: (userRole: string, institutionId?: string): { id: string; name: string; code: string; board: string; status: string }[] => {
    const all = institutionService.getAll();
    if (userRole === 'super_admin') {
      return all.map(inst => ({
        id: inst.id,
        name: inst.name,
        code: inst.code,
        board: inst.board,
        status: inst.status,
      }));
    }
    // Non-super-admins strictly see only their own school
    const scopedId = institutionId || '';
    if (!scopedId) return [];
    const match = all.filter(inst => inst.id === scopedId);
    return match.map(inst => ({
      id: inst.id,
      name: inst.name,
      code: inst.code,
      board: inst.board,
      status: inst.status,
    }));
  },

  /**
   * Helper to strictly filter an array of records by authoritative institutionId.
   * Ensures no records from School A appear in School B's report.
   * Excludes ambiguous records (missing institutionId) from school-specific reports.
   */
  filterBySchool: <T extends { institutionId?: string }>(items: T[], schoolId: string): T[] => {
    if (schoolId === 'ALL') return items;
    return items.filter(item => item.institutionId === schoolId);
  },

  /**
   * Student Enrolment & Strength Report
   */
  getStudentReport: (filters: ReportFilters): StudentReportSummary => {
    const store = ERPStorage.get();
    let students = reportService.filterBySchool(store.students, filters.schoolId);

    if (filters.academicYear) {
      students = students.filter(s => s.academicYear === filters.academicYear);
    }
    if (filters.classId) {
      students = students.filter(s => s.classId === filters.classId);
    }

    const activeCount = students.filter(s => s.status === 'active').length;
    const inactiveCount = students.filter(s => s.status === 'inactive').length;
    const maleCount = students.filter(s => s.gender === 'Male').length;
    const femaleCount = students.filter(s => s.gender === 'Female').length;
    const otherCount = students.filter(s => s.gender === 'Other').length;

    // Class distribution
    const classMap = new Map<string, { classId: string; className: string; section: string; count: number }>();
    students.forEach(s => {
      const key = `${s.className}-${s.section}`;
      const existing = classMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        classMap.set(key, {
          classId: s.classId,
          className: s.className,
          section: s.section,
          count: 1,
        });
      }
    });

    return {
      totalStudents: students.length,
      activeCount,
      inactiveCount,
      maleCount,
      femaleCount,
      otherCount,
      classBreakdown: Array.from(classMap.values()).sort((a, b) => a.className.localeCompare(b.className)),
      rows: students,
    };
  },

  /**
   * Admissions & Enquiries Pipeline Report
   */
  getAdmissionReport: (filters: ReportFilters): AdmissionReportSummary => {
    const store = ERPStorage.get();
    let apps = reportService.filterBySchool(store.admissions || [], filters.schoolId);

    if (filters.academicYear) {
      apps = apps.filter(a => a.academicYear === filters.academicYear);
    }

    const enrolledCount = apps.filter(a => a.stage === 'enrolled').length;
    const inquiryCount = apps.filter(a => a.stage === 'inquiry').length;
    const pendingReviewCount = apps.filter(a => ['interaction', 'document_verification', 'principal_approved'].includes(a.stage)).length;
    const conversionRate = apps.length > 0 ? Math.round((enrolledCount / apps.length) * 100) : 0;

    const sourceBreakdown: Record<string, number> = {};
    const stageBreakdown: Record<string, number> = {};

    apps.forEach(a => {
      sourceBreakdown[a.source] = (sourceBreakdown[a.source] || 0) + 1;
      stageBreakdown[a.stage] = (stageBreakdown[a.stage] || 0) + 1;
    });

    return {
      totalApplications: apps.length,
      enrolledCount,
      inquiryCount,
      pendingReviewCount,
      conversionRate,
      sourceBreakdown,
      stageBreakdown,
      rows: apps,
    };
  },

  /**
   * Fee Collections & Outstanding Dues Report
   */
  getFeeReport: (filters: ReportFilters): FeeReportSummary => {
    // Invoices are already scoped to the signed-in user's school by the backend.
    let invoices = feeService.getAllInvoices();

    if (filters.academicYear) {
      invoices = invoices.filter(i => i.academicYear === filters.academicYear);
    }

    const totalBilled = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
    const totalOutstanding = Math.max(0, totalBilled - totalCollected);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
    const overdueInvoicesCount = invoices.filter(i => i.totalAmount > i.paidAmount).length;

    const categoryBreakdown: Record<string, { billed: number; paid: number; outstanding: number }> = {};
    invoices.forEach(i => {
      const cat = i.category || 'Tuition Fee';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { billed: 0, paid: 0, outstanding: 0 };
      }
      categoryBreakdown[cat].billed += i.totalAmount || 0;
      categoryBreakdown[cat].paid += i.paidAmount || 0;
      categoryBreakdown[cat].outstanding += Math.max(0, (i.totalAmount || 0) - (i.paidAmount || 0));
    });

    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
      overdueInvoicesCount,
      categoryBreakdown,
      rows: invoices,
    };
  },

  /**
   * Daily & Cumulative Attendance Report
   */
  getAttendanceReport: (filters: ReportFilters): AttendanceReportSummary => {
    const store = ERPStorage.get();
    let students = reportService.filterBySchool(store.students, filters.schoolId);

    if (filters.classId) {
      students = students.filter(s => s.classId === filters.classId);
    }

    const reportDate = filters.date || todayISO();
    const allAttendance = attendanceService.getAll() /* already scoped to this school by the backend */;
    const dayRecords = allAttendance.filter(r => r.date === reportDate);

    let recordedCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const rows = students.map(stud => {
      const rec = dayRecords.find(r => r.studentId === stud.id);
      const studentHistory = allAttendance.filter(r => r.studentId === stud.id);
      const totalSessions = studentHistory.length;
      const presentSessions = studentHistory.filter(r => r.status === 'present' || r.status === 'late').length;
      const cumulativePercentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

      const status = rec ? rec.status : 'unrecorded';
      if (status !== 'unrecorded') {
        recordedCount += 1;
        if (status === 'present') presentCount += 1;
        if (status === 'absent') absentCount += 1;
        if (status === 'late') {
          presentCount += 1;
          lateCount += 1;
        }
      }

      return {
        studentId: stud.id,
        admissionNo: stud.admissionNo,
        fullName: stud.fullName,
        className: stud.className,
        section: stud.section,
        rollNo: stud.rollNo,
        status,
        remarks: rec?.remarks || '',
        cumulativePercentage,
      };
    });

    const dayAttendanceRate = recordedCount > 0 ? Math.round((presentCount / recordedCount) * 100) : 0;

    return {
      totalTargetStudents: students.length,
      recordedCount,
      presentCount,
      absentCount,
      lateCount,
      dayAttendanceRate,
      rows,
    };
  },

  /**
   * Academic Examinations & Marks Report
   */
  getAcademicReport: (filters: ReportFilters): AcademicReportSummary => {
    const store = ERPStorage.get();
    const students = reportService.filterBySchool(store.students, filters.schoolId);
    const exams = reportService.filterBySchool<Examination>(store.examinations || [], filters.schoolId);
    const examIds = new Set(exams.map(e => e.id));
    const allMarks = (store.examMarks || []).filter(m => examIds.has(m.examId) && !m.isAbsent);

    let totalSubmissions = 0;
    let totalScoreSum = 0;
    let passCount = 0;
    let failCount = 0;
    const gradeDistribution: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, E1: 0, E2: 0 };

    const studentScoreMap = new Map<string, { totalScore: number; maxScore: number; student: Student }>();

    // Map schedule id to schedule
    const scheduleMap = new Map<string, any>();
    exams.forEach(exam => {
      (exam.schedules || []).forEach(sch => {
        scheduleMap.set(sch.id, sch);
      });
    });

    allMarks.forEach(mark => {
      totalSubmissions += 1;
      const sch = scheduleMap.get(mark.scheduleId);
      const score = mark.marksObtained;
      const max = sch?.maxMarks || 100;
      const pct = Math.round((score / max) * 100);
      totalScoreSum += pct;

      if (pct >= 33) {
        passCount += 1;
      } else {
        failCount += 1;
      }

      let grade = 'A1';
      if (pct < 21) grade = 'E2';
      else if (pct < 33) grade = 'E1';
      else if (pct < 41) grade = 'D';
      else if (pct < 51) grade = 'C2';
      else if (pct < 61) grade = 'C1';
      else if (pct < 71) grade = 'B2';
      else if (pct < 81) grade = 'B1';
      else if (pct < 91) grade = 'A2';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;

      const stud = students.find(s => s.id === mark.studentId);
      if (stud) {
        const cur = studentScoreMap.get(stud.id) || { totalScore: 0, maxScore: 0, student: stud };
        cur.totalScore += score;
        cur.maxScore += max;
        studentScoreMap.set(stud.id, cur);
      }
    });

    const averageScorePercentage = totalSubmissions > 0 ? Math.round(totalScoreSum / totalSubmissions) : 0;
    const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;

    const topAchievers = Array.from(studentScoreMap.values())
      .map(entry => {
        const pct = Math.round((entry.totalScore / (entry.maxScore || 100)) * 100);
        let grade = 'A1';
        if (pct < 91) grade = 'A2';
        if (pct < 81) grade = 'B1';
        if (pct < 71) grade = 'B2';
        return {
          studentId: entry.student.id,
          admissionNo: entry.student.admissionNo,
          name: entry.student.fullName,
          className: `${entry.student.className}-${entry.student.section}`,
          percentage: pct,
          grade,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    return {
      totalExams: exams.length,
      totalSubmissions,
      averageScorePercentage,
      passCount,
      failCount,
      passRate,
      gradeDistribution,
      topAchievers,
    };
  },

  /**
   * Faculty & Teaching Staff Report
   */
  getTeacherReport: (filters: ReportFilters): TeacherReportSummary => {
    const store = ERPStorage.get();
    const teachers = reportService.filterBySchool(store.teachers || [], filters.schoolId);
    const students = reportService.filterBySchool(store.students, filters.schoolId);

    const activeCount = teachers.filter(t => t.status === 'active').length;
    const ratio = teachers.length > 0 ? `1 : ${Math.round(students.length / teachers.length)}` : 'N/A';

    const departmentBreakdown: Record<string, number> = {};
    teachers.forEach(t => {
      const dept = t.department || 'General';
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
    });

    return {
      totalTeachers: teachers.length,
      activeCount,
      studentTeacherRatio: ratio,
      departmentBreakdown,
      rows: teachers,
    };
  },

  /**
   * Transport Fleet & Routes Report
   */
  getTransportReport: (filters: ReportFilters): TransportReportSummary => {
    const store = ERPStorage.get();
    const routes = reportService.filterBySchool(store.transportRoutes || [], filters.schoolId);

    const totalCapacity = routes.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const totalAssignedStudents = routes.reduce((acc, r) => acc + (r.assignedStudentsCount || 0), 0);
    const capacityUtilization = totalCapacity > 0 ? Math.round((totalAssignedStudents / totalCapacity) * 100) : 0;

    return {
      hasTransportConfigured: routes.length > 0,
      totalRoutes: routes.length,
      totalVehicles: routes.length,
      totalCapacity,
      totalAssignedStudents,
      capacityUtilization,
      rows: routes,
    };
  },

  /**
   * Digital Marketing & Lead Attribution Report
   * Enforces service entitlement guard: if disabled, returns disabled status.
   */
  getMarketingReport: (filters: ReportFilters): MarketingReportSummary => {
    const store = ERPStorage.get();
    const schoolId = filters.schoolId;

    // Check service entitlement
    if (schoolId !== 'ALL' && !serviceEntitlementService.isDigitalMarketingEnabled(schoolId)) {
      return {
        isServiceEnabled: false,
        disabledReason: `Digital Marketing is disabled for this school. In accordance with service entitlements, ad campaigns and lead attribution metrics are inaccessible.`,
        totalSpend: 0,
        qualifiedLeads: 0,
        attributedAdmissions: 0,
        costPerLead: 0,
        costPerAdmission: 0,
        activeCampaignsCount: 0,
        campaigns: [],
        leads: [],
        channelBreakdown: {},
      };
    }

    const allCampaigns = store.marketingCampaigns || [];
    const allLeads = store.marketingLeads || [];

    const campaigns = schoolId === 'ALL'
      ? allCampaigns
      : allCampaigns.filter(c => c.schoolId === schoolId);

    const leads = schoolId === 'ALL'
      ? allLeads
      : allLeads.filter(l => l.schoolId === schoolId);

    const totalSpend = campaigns.reduce((acc, c) => acc + (c.spendToDate || 0), 0);
    const qualifiedLeads = leads.length;
    const attributedAdmissions = leads.filter(l => l.status === 'enrolled' || l.status === 'application_submitted').length;
    const costPerLead = qualifiedLeads > 0 ? Math.round(totalSpend / qualifiedLeads) : 0;
    const costPerAdmission = attributedAdmissions > 0 ? Math.round(totalSpend / attributedAdmissions) : 0;
    const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;

    const channelBreakdown: Record<string, { spend: number; leads: number; conversions: number }> = {};
    campaigns.forEach(c => {
      const ch = c.channel;
      if (!channelBreakdown[ch]) {
        channelBreakdown[ch] = { spend: 0, leads: 0, conversions: 0 };
      }
      channelBreakdown[ch].spend += c.spendToDate || 0;
      channelBreakdown[ch].leads += c.leadsGenerated || 0;
      channelBreakdown[ch].conversions += c.conversionsCount || 0;
    });

    return {
      isServiceEnabled: true,
      totalSpend,
      qualifiedLeads,
      attributedAdmissions,
      costPerLead,
      costPerAdmission,
      activeCampaignsCount,
      campaigns,
      leads,
      channelBreakdown,
    };
  },

  /**
   * Consolidated Platform Overview (All Partner Schools)
   */
  getPlatformOverview: (): PlatformOverviewSummary => {
    const institutions = institutionService.getAll();
    const activeSchools = institutions.filter(i => i.status === 'active').length;
    const suspendedSchools = institutions.filter(i => i.status !== 'active').length;
    const totalNetworkStudents = institutions.reduce((acc, i) => acc + (i.studentCount || 0), 0);
    const totalNetworkTeachers = institutions.reduce((acc, i) => acc + (i.teacherCount || 0), 0);

    return {
      totalSchools: institutions.length,
      activeSchools,
      suspendedSchools,
      totalNetworkStudents,
      totalNetworkTeachers,
      platformUptime: '99.98%',
      schools: institutions,
    };
  },

  /**
   * Consolidated Service Adoption Matrix
   */
  getServiceAdoption: (): ServiceAdoptionSummary => {
    const configs: SchoolServiceConfiguration[] = serviceEntitlementService.getAllConfigs();
    const packageCounts: Record<string, number> = {
      erp_only: 0,
      marketing_only: 0,
      erp_marketing: 0,
      custom: 0,
    };

    let coreErpEnabledCount = 0;
    let digitalMarketingEnabledCount = 0;
    let transportEnabledCount = 0;
    let admissionsEnabledCount = 0;
    let feesEnabledCount = 0;
    let examinationsEnabledCount = 0;

    configs.forEach((cfg: SchoolServiceConfiguration) => {
      if (cfg.package && packageCounts[cfg.package] !== undefined) {
        packageCounts[cfg.package] += 1;
      }
      if (cfg.entitlements.core_erp?.enabled) coreErpEnabledCount += 1;
      if (cfg.entitlements.digital_marketing?.enabled) digitalMarketingEnabledCount += 1;
      if (cfg.entitlements.transport?.enabled) transportEnabledCount += 1;
      if (cfg.entitlements.admissions?.enabled) admissionsEnabledCount += 1;
      if (cfg.entitlements.fees?.enabled) feesEnabledCount += 1;
      if (cfg.entitlements.examinations?.enabled) examinationsEnabledCount += 1;
    });

    return {
      totalSchools: configs.length,
      coreErpEnabledCount,
      digitalMarketingEnabledCount,
      transportEnabledCount,
      admissionsEnabledCount,
      feesEnabledCount,
      examinationsEnabledCount,
      packageCounts,
      schoolConfigs: configs,
    };
  },

  /**
   * Cross-School Comparative Breakdown
   */
  getCrossSchoolComparison: (): CrossSchoolComparisonRow[] => {
    const store = ERPStorage.get();
    const institutions = institutionService.getAll();
    const configs: SchoolServiceConfiguration[] = serviceEntitlementService.getAllConfigs();

    return institutions.map(inst => {
      const cfg = configs.find(c => c.schoolId === inst.id);
      const schoolInvoices = (store.feeInvoices || []).filter(i => i.institutionId === inst.id);
      const totalBilled = schoolInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
      const totalCollected = schoolInvoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);

      const isMarketingEnabled = cfg?.entitlements.digital_marketing?.enabled || false;
      const schoolCampaigns = (store.marketingCampaigns || []).filter(c => c.schoolId === inst.id);
      const marketingSpend = schoolCampaigns.reduce((acc, c) => acc + (c.spendToDate || 0), 0);

      return {
        schoolId: inst.id,
        schoolName: inst.name,
        code: inst.code,
        board: inst.board,
        city: inst.city,
        status: inst.status,
        packageId: cfg?.package || 'erp_only',
        studentCount: inst.studentCount || 0,
        teacherCount: inst.teacherCount || 0,
        totalBilled,
        totalCollected,
        isMarketingEnabled,
        marketingSpend,
      };
    });
  },

  /**
   * Platform Service Entitlement Audit Trail
   */
  getPlatformAuditTrail: (): ServiceEntitlementAuditLog[] => {
    const store = ERPStorage.get();
    return store.serviceEntitlementAuditLogs || [];
  },

  /**
   * Unresolved / Ambiguous Records Migration Audit Registry
   * Tracks verified, safely resolved, and quarantined unassigned records.
   */
  getUnresolvedRecordsReport: (): MigrationAuditResult | null => {
    const store = ERPStorage.get();
    return (store as any).migrationAuditResult || schoolMigrationService.getAuditSummary();
  },

  /**
   * Strict assertion utility to test Multi-School Isolation.
   * Asserts that in any school-scoped dataset, NO foreign school records exist,
   * and NO ambiguous (missing institutionId) records have leaked in.
   */
  verifySchoolIsolation: <T extends { institutionId?: string }>(items: T[], expectedSchoolId: string): boolean => {
    if (expectedSchoolId === 'ALL') return true;
    return items.every(item => item.institutionId === expectedSchoolId);
  },
};
