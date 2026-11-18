import { describe, it, expect, beforeEach } from 'vitest';
import { gradingService } from './gradingService';
import { ERPStorage } from './storage';

describe('gradingService Examination Grading Calculations', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves default CBSE 9-point grading scheme', () => {
    const scheme = gradingService.getDefaultScheme();
    expect(scheme).toBeDefined();
    expect(scheme.rules.length).toBeGreaterThanOrEqual(9);
    expect(scheme.passPercentage).toBe(33);
  });

  it('evaluates accurate CBSE grades for marks percentages', () => {
    const gradeA1 = gradingService.calculateSubjectGrade(95, 100, false);
    expect(gradeA1.grade).toBe('A1');
    expect(gradeA1.gradePoint).toBe(10.0);
    expect(gradeA1.resultStatus).toBe('Pass');

    const gradeB2 = gradingService.calculateSubjectGrade(65, 100, false);
    expect(gradeB2.grade).toBe('B2');
    expect(gradeB2.gradePoint).toBe(7.0);
    expect(gradeB2.resultStatus).toBe('Pass');

    const gradeD = gradingService.calculateSubjectGrade(35, 100, false);
    expect(gradeD.grade).toBe('D');
    expect(gradeD.resultStatus).toBe('Pass');

    const gradeE1 = gradingService.calculateSubjectGrade(25, 100, false);
    expect(gradeE1.grade).toBe('E1');
    expect(gradeE1.resultStatus).toBe('Fail');
  });

  it('validates grade rules continuity without overlap or gaps', () => {
    const defaultScheme = gradingService.getDefaultScheme();
    const validation = gradingService.validateRules(defaultScheme.rules);
    expect(validation.isValid).toBe(true);

    // Invalid overlapping rules
    const invalidRules = [
      { grade: 'A', minPercentage: 80, maxPercentage: 100, gradePoint: 10, isPassing: true },
      { grade: 'B', minPercentage: 70, maxPercentage: 85, gradePoint: 8, isPassing: true }, // Overlaps 80-85
    ];
    const invalidValidation = gradingService.validateRules(invalidRules as any);
    expect(invalidValidation.isValid).toBe(false);
    expect(invalidValidation.error).toContain('Overlap');
  });
});
