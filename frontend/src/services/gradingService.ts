// ==========================================
// Configurable Examination Grading Engine Service
// Developed by NTS Novalytix
// ==========================================

import { GradingScheme, GradeRule, ExamType, ExamMark, ExamSchedule } from '../types';
import { ERPStorage } from './storage';
import { todayISO } from '../utils/date';

export const GRADING_SCHEME_TEMPLATES: Array<Omit<GradingScheme, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'CBSE Secondary 9-Point Scale',
    description: 'Standard CBSE Board 9-point grading system for Secondary & Higher Secondary classes.',
    academicYear: '2026-2027',
    classScope: 'all',
    examTypeScope: 'all',
    passPercentage: 33,
    isDefault: true,
    rules: [
      { grade: 'A1', minPercentage: 91, maxPercentage: 100, gradePoint: 10.0, isPassing: true, description: 'Outstanding performance' },
      { grade: 'A2', minPercentage: 81, maxPercentage: 90, gradePoint: 9.0, isPassing: true, description: 'Excellent command' },
      { grade: 'B1', minPercentage: 71, maxPercentage: 80, gradePoint: 8.0, isPassing: true, description: 'Very good comprehension' },
      { grade: 'B2', minPercentage: 61, maxPercentage: 70, gradePoint: 7.0, isPassing: true, description: 'Good understanding' },
      { grade: 'C1', minPercentage: 51, maxPercentage: 60, gradePoint: 6.0, isPassing: true, description: 'Satisfactory mastery' },
      { grade: 'C2', minPercentage: 41, maxPercentage: 50, gradePoint: 5.0, isPassing: true, description: 'Average / Fair pass' },
      { grade: 'D', minPercentage: 33, maxPercentage: 40, gradePoint: 4.0, isPassing: true, description: 'Marginal Pass' },
      { grade: 'E1', minPercentage: 21, maxPercentage: 32, gradePoint: 0.0, isPassing: false, description: 'Needs Remedial Support (Fail / Essential Repeat)' },
      { grade: 'E2', minPercentage: 0, maxPercentage: 20, gradePoint: 0.0, isPassing: false, description: 'Needs Remedial Support (Fail / Essential Repeat)' },
    ],
  },
  {
    name: 'Senior Secondary 5-Point Scale',
    description: 'Traditional Division-based scale for Senior Secondary Classes (11 & 12).',
    academicYear: '2026-2027',
    classScope: 'all',
    examTypeScope: 'all',
    passPercentage: 35,
    isDefault: false,
    rules: [
      { grade: 'A', minPercentage: 85, maxPercentage: 100, gradePoint: 10.0, isPassing: true, description: 'First Class with Distinction' },
      { grade: 'B', minPercentage: 70, maxPercentage: 84, gradePoint: 8.0, isPassing: true, description: 'First Class' },
      { grade: 'C', minPercentage: 50, maxPercentage: 69, gradePoint: 6.0, isPassing: true, description: 'Second Class' },
      { grade: 'D', minPercentage: 35, maxPercentage: 49, gradePoint: 4.0, isPassing: true, description: 'Third Class / Pass' },
      { grade: 'F', minPercentage: 0, maxPercentage: 34, gradePoint: 0.0, isPassing: false, description: 'Failed / Re-exam required' },
    ],
  },
  {
    name: 'Primary Descriptive 5-Point System',
    description: 'Developmental grade scale for foundational and middle classes (Class 1 to 8).',
    academicYear: '2026-2027',
    classScope: 'all',
    examTypeScope: 'all',
    passPercentage: 40,
    isDefault: false,
    rules: [
      { grade: 'O', minPercentage: 90, maxPercentage: 100, gradePoint: 10.0, isPassing: true, description: 'Outstanding achievement' },
      { grade: 'E', minPercentage: 75, maxPercentage: 89, gradePoint: 8.5, isPassing: true, description: 'Excellent progress' },
      { grade: 'G', minPercentage: 60, maxPercentage: 74, gradePoint: 7.0, isPassing: true, description: 'Good standard' },
      { grade: 'S', minPercentage: 40, maxPercentage: 59, gradePoint: 5.0, isPassing: true, description: 'Satisfactory' },
      { grade: 'N', minPercentage: 0, maxPercentage: 39, gradePoint: 0.0, isPassing: false, description: 'Needs continuous mentoring' },
    ],
  },
];

export interface SubjectGradingResult {
  grade: string;
  gradePoint?: number;
  percentage: number | null;
  resultStatus: 'Pass' | 'Fail' | 'Absent' | 'Pending';
  remarks: string;
}

export interface StudentReportCardResult {
  subjects: Array<{
    subject: string;
    maxMarks: number;
    passMarks: number;
    marksObtained?: number;
    isAbsent: boolean;
    grade: string;
    gradePoint?: number;
    percentage: number | null;
    status: 'Pass' | 'Fail' | 'Absent' | 'Pending';
    remarks: string;
  }>;
  totalObtained: number;
  totalMax: number;
  aggregatePercentage: number;
  overallGrade: string;
  overallGradePoint?: number;
  overallStatus: 'Pass' | 'Fail' | 'Incomplete';
  remarks: string;
}

export const gradingService = {
  getAll: (): GradingScheme[] => {
    return ERPStorage.get().gradingSchemes || [];
  },

  getById: (id: string): GradingScheme | undefined => {
    return (ERPStorage.get().gradingSchemes || []).find(s => s.id === id);
  },

  getDefaultScheme: (): GradingScheme => {
    const schemes = gradingService.getAll();
    const def = schemes.find(s => s.isDefault);
    if (def) return def;
    if (schemes.length > 0) return schemes[0];

    // Fallback if none exist
    return {
      id: 'scheme-default-fallback',
      ...GRADING_SCHEME_TEMPLATES[0],
      createdAt: todayISO(),
      updatedAt: todayISO(),
    };
  },

  /**
   * Resolves the applicable grading scheme for a given class and exam type.
   */
  getSchemeForClassAndExam: (
    classId: string,
    examType?: ExamType,
    academicYear?: string
  ): GradingScheme => {
    const schemes = gradingService.getAll();
    if (!schemes.length) return gradingService.getDefaultScheme();

    // Match priority:
    // 1. Exact class match + examType match
    // 2. Exact class match + all examTypes
    // 3. 'all' classes + examType match
    // 4. Default scheme

    const classSpecific = schemes.find(s => {
      const matchYear = academicYear ? s.academicYear === academicYear : true;
      const matchClass = Array.isArray(s.classScope) && s.classScope.includes(classId);
      const matchExam = examType && Array.isArray(s.examTypeScope) ? s.examTypeScope.includes(examType) : true;
      return matchYear && matchClass && matchExam;
    });
    if (classSpecific) return classSpecific;

    const classOnly = schemes.find(s => {
      const matchYear = academicYear ? s.academicYear === academicYear : true;
      const matchClass = Array.isArray(s.classScope) && s.classScope.includes(classId);
      return matchYear && matchClass;
    });
    if (classOnly) return classOnly;

    const examSpecific = schemes.find(s => {
      const matchYear = academicYear ? s.academicYear === academicYear : true;
      const matchClass = s.classScope === 'all';
      const matchExam = examType && Array.isArray(s.examTypeScope) ? s.examTypeScope.includes(examType) : false;
      return matchYear && matchClass && matchExam;
    });
    if (examSpecific) return examSpecific;

    return gradingService.getDefaultScheme();
  },

  /**
   * Validate grading threshold rules for overlaps or invalid ranges.
   */
  validateRules: (rules: GradeRule[]): { isValid: boolean; error?: string } => {
    if (!rules || rules.length === 0) {
      return { isValid: false, error: 'At least one grade rule must be defined.' };
    }

    const labels = new Set<string>();

    for (const r of rules) {
      const label = r.grade.trim().toUpperCase();
      if (!label) {
        return { isValid: false, error: 'Grade label cannot be empty.' };
      }
      if (labels.has(label)) {
        return { isValid: false, error: `Duplicate grade label "${r.grade}" detected. Each grade rule must have a unique identifier.` };
      }
      labels.add(label);

      if (r.minPercentage < 0 || r.maxPercentage > 100) {
        return { isValid: false, error: `Percentages must be between 0% and 100% (Rule "${r.grade}").` };
      }
      if (r.minPercentage > r.maxPercentage) {
        return {
          isValid: false,
          error: `Minimum percentage (${r.minPercentage}%) cannot exceed maximum (${r.maxPercentage}%) for Grade "${r.grade}".`,
        };
      }
      if (r.gradePoint !== undefined && (r.gradePoint < 0 || r.gradePoint > 10)) {
        return {
          isValid: false,
          error: `Grade point for "${r.grade}" must be between 0.0 and 10.0 (received ${r.gradePoint}).`,
        };
      }
    }

    // Check for overlapping intervals
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const a = rules[i];
        const b = rules[j];

        // Two ranges [minA, maxA] and [minB, maxB] overlap if max(minA, minB) < min(maxA, maxB)
        const overlap = Math.max(a.minPercentage, b.minPercentage) < Math.min(a.maxPercentage, b.maxPercentage);
        if (overlap) {
          return {
            isValid: false,
            error: `Overlapping threshold detected between Grade "${a.grade}" (${a.minPercentage}%-${a.maxPercentage}%) and Grade "${b.grade}" (${b.minPercentage}%-${b.maxPercentage}%).`,
          };
        }
      }
    }

    // Check for gap intervals between sorted rules
    const sortedForGaps = [...rules].sort((a, b) => b.minPercentage - a.minPercentage);
    for (let i = 0; i < sortedForGaps.length - 1; i++) {
      const higher = sortedForGaps[i];
      const lower = sortedForGaps[i + 1];
      if (higher.minPercentage > lower.maxPercentage + 1) {
        return {
          isValid: false,
          error: `Unassigned percentage gap detected between Grade "${lower.grade}" (Max: ${lower.maxPercentage}%) and Grade "${higher.grade}" (Min: ${higher.minPercentage}%). Intervals must be contiguous.`,
        };
      }
    }

    return { isValid: true };
  },

  /**
   * Save (Create or Update) Grading Scheme
   */
  saveScheme: (
    scheme: Omit<GradingScheme, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): { success: boolean; data?: GradingScheme; error?: string } => {
    const store = ERPStorage.get();
    if (!store.gradingSchemes) store.gradingSchemes = [];

    const val = gradingService.validateRules(scheme.rules);
    if (!val.isValid) {
      return { success: false, error: val.error };
    }

    const now = todayISO();

    // If marked default, unset default on other schemes
    if (scheme.isDefault) {
      store.gradingSchemes.forEach(s => {
        s.isDefault = false;
      });
    }

    if (scheme.id) {
      const idx = store.gradingSchemes.findIndex(s => s.id === scheme.id);
      if (idx === -1) return { success: false, error: 'Scheme not found.' };

      const updated: GradingScheme = {
        ...store.gradingSchemes[idx],
        ...scheme,
        updatedAt: now,
      };
      store.gradingSchemes[idx] = updated;
      ERPStorage.set(store);
      return { success: true, data: updated };
    } else {
      const newScheme: GradingScheme = {
        ...scheme,
        id: `scheme-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      store.gradingSchemes.push(newScheme);
      ERPStorage.set(store);
      return { success: true, data: newScheme };
    }
  },

  /**
   * Delete Scheme
   */
  deleteScheme: (id: string): { success: boolean; error?: string } => {
    const store = ERPStorage.get();
    if (!store.gradingSchemes) return { success: false, error: 'No schemes available.' };

    const scheme = store.gradingSchemes.find(s => s.id === id);
    if (!scheme) return { success: false, error: 'Scheme not found.' };

    if (scheme.isDefault && store.gradingSchemes.length > 1) {
      return { success: false, error: 'Cannot delete the default grading scheme. Please assign another scheme as default first.' };
    }

    store.gradingSchemes = store.gradingSchemes.filter(s => s.id !== id);
    ERPStorage.set(store);
    return { success: true };
  },

  /**
   * Calculate grade for an individual subject mark according to the active scheme.
   * Distinctly handles absent students, missing marks, and entered decimal scores.
   */
  calculateSubjectGrade: (
    marksObtained: number | undefined,
    maxMarks: number,
    isAbsent: boolean,
    scheme?: GradingScheme
  ): SubjectGradingResult => {
    if (isAbsent) {
      return {
        grade: 'AB',
        gradePoint: 0,
        percentage: null,
        resultStatus: 'Absent',
        remarks: 'Absent for examination',
      };
    }

    if (marksObtained === undefined || isNaN(marksObtained)) {
      return {
        grade: '—',
        gradePoint: undefined,
        percentage: null,
        resultStatus: 'Pending',
        remarks: 'Marks not recorded yet',
      };
    }

    if (maxMarks <= 0) {
      return {
        grade: 'N/A',
        gradePoint: 0,
        percentage: 0,
        resultStatus: 'Pending',
        remarks: 'Invalid maximum marks',
      };
    }

    if (marksObtained < 0 || marksObtained > maxMarks) {
      return {
        grade: 'ERR',
        gradePoint: 0,
        percentage: Math.round((marksObtained / maxMarks) * 1000) / 10,
        resultStatus: 'Fail',
        remarks: `Invalid score: Marks obtained (${marksObtained}) must be between 0 and maximum paper marks (${maxMarks}).`,
      };
    }

    // Percentage rounded to 1 decimal place
    const percentage = Math.round((marksObtained / maxMarks) * 1000) / 10;
    const roundedPct = Math.round(percentage);
    const activeScheme = scheme || gradingService.getDefaultScheme();

    // Find matching rule (rules sorted descending by minPercentage)
    const sortedRules = [...activeScheme.rules].sort((a, b) => b.minPercentage - a.minPercentage);
    let matchedRule = sortedRules.find(
      r => percentage >= r.minPercentage && percentage <= r.maxPercentage
    );

    if (!matchedRule) {
      // Bridge whole-number interval gaps for decimal percentages (e.g. 90.6% -> 91% -> A1)
      matchedRule = sortedRules.find(
        r => roundedPct >= r.minPercentage && roundedPct <= r.maxPercentage
      );
    }

    if (!matchedRule && sortedRules.length > 0) {
      if (percentage >= sortedRules[0].minPercentage) {
        matchedRule = sortedRules[0];
      }
    }

    if (matchedRule) {
      return {
        grade: matchedRule.grade,
        gradePoint: matchedRule.gradePoint,
        percentage,
        resultStatus: matchedRule.isPassing ? 'Pass' : 'Fail',
        remarks: matchedRule.description,
      };
    }

    // If below lowest rule, use fail status
    const lowestRule = sortedRules[sortedRules.length - 1];
    return {
      grade: lowestRule ? lowestRule.grade : 'F',
      gradePoint: lowestRule?.gradePoint || 0,
      percentage,
      resultStatus: 'Fail',
      remarks: lowestRule ? lowestRule.description : 'Failed to meet minimum standard',
    };
  },

  /**
   * Calculate full student report card result across all subjects.
   */
  calculateStudentReportCard: (
    marks: ExamMark[],
    schedules: ExamSchedule[],
    scheme?: GradingScheme
  ): StudentReportCardResult => {
    const activeScheme = scheme || gradingService.getDefaultScheme();
    let totalObtained = 0;
    let totalMax = 0;
    let hasAbsent = false;
    let hasFail = false;
    let hasPending = false;
    let totalGradePoints = 0;
    let gradePointCount = 0;

    const subjects = schedules.map(sch => {
      const rec = marks.find(m => m.scheduleId === sch.id);
      const isAbsent = rec ? rec.isAbsent : false;
      const marksObtained = rec && !isAbsent ? rec.marksObtained : undefined;

      const res = gradingService.calculateSubjectGrade(marksObtained, sch.maxMarks, isAbsent, activeScheme);

      totalMax += sch.maxMarks;
      if (marksObtained !== undefined) {
        totalObtained += marksObtained;
      }
      if (isAbsent) hasAbsent = true;
      if (res.resultStatus === 'Fail') hasFail = true;
      if (res.resultStatus === 'Pending') hasPending = true;
      if (res.gradePoint !== undefined) {
        totalGradePoints += res.gradePoint;
        gradePointCount++;
      }

      return {
        subject: sch.subject,
        maxMarks: sch.maxMarks,
        passMarks: sch.passMarks,
        marksObtained,
        isAbsent,
        grade: res.grade,
        gradePoint: res.gradePoint,
        percentage: res.percentage,
        status: res.resultStatus,
        remarks: res.remarks,
      };
    });

    const aggregatePercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
    const overallGradeRes = gradingService.calculateSubjectGrade(totalObtained, totalMax, false, activeScheme);
    const overallGradePoint = gradePointCount > 0 ? Math.round((totalGradePoints / gradePointCount) * 10) / 10 : 0;

    let overallStatus: 'Pass' | 'Fail' | 'Incomplete' = 'Pass';
    if (hasPending) {
      overallStatus = 'Incomplete';
    } else if (hasFail || hasAbsent || aggregatePercentage < activeScheme.passPercentage) {
      overallStatus = 'Fail';
    }

    let remarks = overallGradeRes.remarks;
    if (overallStatus === 'Fail') {
      remarks = 'Needs remedial attention and subject re-evaluation.';
    } else if (overallStatus === 'Incomplete') {
      remarks = 'Examination marks incomplete or pending.';
    }

    return {
      subjects,
      totalObtained,
      totalMax,
      aggregatePercentage,
      overallGrade: overallGradeRes.grade,
      overallGradePoint,
      overallStatus,
      remarks,
    };
  },
};
