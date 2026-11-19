// Examinations & marks — backed by /api/v1/examinations.
//
// load() fills an in-memory cache; synchronous getters read it so screens keep
// rendering synchronously. Every change goes to the server first. The server
// limits what each role sees: teachers their sections, parents their children,
// students themselves. Grades are computed for display from the grading scheme.

import { Examination, ExamMark, ExamSchedule, GradingScheme } from '../types';
import { httpClient } from './api/httpClient';
import { gradingService } from './gradingService';

type Result<T> = { success: true; data: T } | { success: false; error: string };

const cache: { exams: Examination[]; marks: ExamMark[]; loaded: boolean; error: string | null } = {
  exams: [],
  marks: [],
  loaded: false,
  error: null,
};

let inFlight: Promise<void> | null = null;

function notify() {
  window.dispatchEvent(new CustomEvent('nts_erp_storage_updated'));
}

function errorOf(res: { error?: { message: string }; message?: string }, fallback: string) {
  return res.error?.message || res.message || fallback;
}

function putExam(exam: Examination) {
  const i = cache.exams.findIndex(e => e.id === exam.id);
  if (i >= 0) cache.exams[i] = exam;
  else cache.exams = [exam, ...cache.exams];
}

export const examService = {
  /** Load all exams and marks this user may see. Concurrent calls share one request. */
  load: (): Promise<void> => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const [exams, marks] = await Promise.all([
        httpClient.get<Examination[]>('/examinations/exams'),
        httpClient.get<ExamMark[]>('/examinations/marks'),
      ]);
      cache.exams = exams.success ? exams.data : [];
      cache.marks = marks.success ? marks.data : [];
      cache.error = exams.success ? null : errorOf(exams, 'Could not load examinations.');
      cache.loaded = true;
      notify();
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  },

  reset: () => {
    cache.exams = [];
    cache.marks = [];
    cache.loaded = false;
    cache.error = null;
  },

  isLoaded: () => cache.loaded,
  getLoadError: () => cache.error,

  getAll: (): Examination[] => cache.exams,
  getById: (id: string): Examination | undefined => cache.exams.find(e => e.id === id),
  getByClass: (classId: string): Examination[] => cache.exams.filter(e => e.classId === classId),

  create: async (data: Omit<Examination, 'id' | 'schedules' | 'className'> & { className?: string }): Promise<Result<Examination>> => {
    const res = await httpClient.post<Examination>('/examinations/exams', data);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not create the exam.') };
    putExam(res.data);
    notify();
    return { success: true, data: res.data };
  },

  update: async (id: string, updates: Partial<Examination>): Promise<Result<Examination>> => {
    const { schedules: _s, className: _c, id: _i, ...body } = updates;
    const res = await httpClient.put<Examination>(`/examinations/exams/${id}`, body);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not update the exam.') };
    putExam(res.data);
    notify();
    return { success: true, data: res.data };
  },

  delete: async (id: string): Promise<Result<null>> => {
    const res = await httpClient.delete(`/examinations/exams/${id}`);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not delete the exam.') };
    cache.exams = cache.exams.filter(e => e.id !== id);
    notify();
    return { success: true, data: null };
  },

  addScheduleItem: async (examId: string, item: Omit<ExamSchedule, 'id' | 'examId'>): Promise<Result<Examination>> => {
    const res = await httpClient.post<Examination>(`/examinations/exams/${examId}/schedules`, item);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not schedule the paper.') };
    putExam(res.data);
    notify();
    return { success: true, data: res.data };
  },

  getAllMarks: (): ExamMark[] => cache.marks,
  getMarksForExam: (examId: string): ExamMark[] => cache.marks.filter(m => m.examId === examId),
  getMarksForStudent: (studentId: string): ExamMark[] => cache.marks.filter(m => m.studentId === studentId),

  saveMarksBatch: async (
    examId: string,
    scheduleId: string,
    records: Array<{ studentId: string; marksObtained: number; isAbsent: boolean; remarks?: string }>,
  ): Promise<{ success: true; count: number } | { success: false; error: string }> => {
    if (records.some(r => r.marksObtained < 0)) {
      return { success: false, error: 'Marks obtained cannot be less than zero.' };
    }
    const res = await httpClient.post<{ count: number }>('/examinations/marks/batch', { examId, scheduleId, records });
    if (!res.success) return { success: false, error: errorOf(res, 'Could not save marks.') };
    const fresh = await httpClient.get<ExamMark[]>(`/examinations/marks?exam_id=${examId}`);
    if (fresh.success) {
      cache.marks = [...cache.marks.filter(m => m.examId !== examId), ...fresh.data];
      notify();
    }
    return { success: true, count: res.data.count };
  },

  calculateGrade: (score: number, maxScore: number, scheme?: GradingScheme): { grade: string; remarks: string } => {
    const res = gradingService.calculateSubjectGrade(score, maxScore, false, scheme);
    return { grade: res.grade, remarks: res.remarks };
  },
};
