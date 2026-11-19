// ==========================================
// Examinations, Marks Entry & Report Cards
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { attendanceService } from '../../services/attendanceService';
import { gradingService } from '../../services/gradingService';
import { GradingSchemeManager } from '../../components/examinations/GradingSchemeManager';
import { ReportCardView } from '../../components/examinations/ReportCardView';
import { Examination, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { Award, Plus, Edit, Trash2, Calendar, CheckCircle, Printer, GraduationCap, Sliders } from 'lucide-react';
import { todayISO } from '../../utils/date';

export const ExaminationsPage: React.FC = () => {
  const { currentRole, currentUser, linkedStudents, schoolSettings, addToast } = useERP();
  const [exams, setExams] = useState<Examination[]>(() => examService.getAll());
  // Exams and marks come from the backend (scoped per role by the server).
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    const onUpdate = () => {
      setExams([...examService.getAll()]);
      setDataVersion(v => v + 1);
    };
    window.addEventListener('nts_erp_storage_updated', onUpdate);
    examService.load();
    return () => window.removeEventListener('nts_erp_storage_updated', onUpdate);
  }, []);
  const classes = useMemo(() => classService.getAll(), []);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'exams' | 'marks_entry' | 'report_cards' | 'grading_schemes' | null;

  // Student persona resolution
  const studentUser = useMemo(() => {
    return currentRole === 'student' ? linkedStudents[0] || null : null;
  }, [currentRole, linkedStudents]);

  // Teacher persona resolution
  const teacherUser = useMemo(() => {
    if (currentRole === 'teacher') {
      return (
        (currentUser.referenceId ? teacherService.getById(currentUser.referenceId) : null) ||
        teacherService.getAll().find(t => t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        null
      );
    }
    return null;
  }, [currentRole, currentUser]);

  const marksEntryAllowedExams = useMemo(() => {
    if (currentRole === 'teacher' && teacherUser) {
      const acList = teacherUser.assignedClasses || [];
      if (acList.length === 0) return exams;
      return exams.filter(e =>
        acList.some(ac => ac.classId === e.classId && (!ac.section || !e.section || ac.section.toLowerCase() === e.section.toLowerCase()))
      );
    }
    return exams;
  }, [exams, currentRole, teacherUser]);

  const [activeTab, setActiveTab] = useState<'exams' | 'marks_entry' | 'report_cards' | 'grading_schemes'>(() => {
    if (tabParam) {
      if (['marks_entry'].includes(tabParam) && !['teacher', 'school_admin', 'super_admin'].includes(currentRole)) {
        return 'report_cards';
      }
      if (['grading_schemes'].includes(tabParam) && !['school_admin', 'super_admin'].includes(currentRole)) {
        return 'report_cards';
      }
      return tabParam;
    }
    return currentRole === 'student' || currentRole === 'parent' ? 'report_cards' : 'exams';
  });

  useEffect(() => {
    if (tabParam) {
      if (['marks_entry'].includes(tabParam) && !['teacher', 'school_admin', 'super_admin'].includes(currentRole)) {
        setActiveTab('report_cards');
        return;
      }
      if (['grading_schemes'].includes(tabParam) && !['school_admin', 'super_admin'].includes(currentRole)) {
        setActiveTab('report_cards');
        return;
      }
      setActiveTab(tabParam);
    }
  }, [tabParam, currentRole]);

  const handleTabChange = (tab: 'exams' | 'marks_entry' | 'report_cards' | 'grading_schemes') => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // Examination Creation / Edit Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Examination | null>(null);

  // Schedule Item Modal
  const [scheduleModalTarget, setScheduleModalTarget] = useState<Examination | null>(null);
  const [newScheduleData, setNewScheduleData] = useState({
    subject: 'Mathematics',
    date: todayISO(),
    startTime: '09:00',
    endTime: '12:00',
    maxMarks: 80,
    passMarks: 28,
    roomNo: 'Exam Hall 1',
  });

  // Marks Entry State
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || 'exam-1');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [marksGrid, setMarksGrid] = useState<Record<string, { marks: number; isAbsent: boolean; remarks: string }>>({});

  // Report Card State
  const [reportCardExamId, setReportCardExamId] = useState<string>(exams[0]?.id || '');
  const [reportCardStudent, setReportCardStudent] = useState<Student | null>(() => {
    if (currentRole === 'student') return studentUser;
    if (currentRole === 'parent') return linkedStudents[0] || null;
    return null;
  });

  // Sync active report card student when persona changes
  useEffect(() => {
    if (currentRole === 'student') {
      setReportCardStudent(studentUser);
    } else if (currentRole === 'parent') {
      setReportCardStudent(prev => linkedStudents.find(c => c.id === prev?.id) || linkedStudents[0] || null);
    }
  }, [currentRole, studentUser, linkedStudents]);

  // Exam Form
  const [examForm, setExamForm] = useState({
    title: '',
    examType: 'Mid-Term' as any,
    classId: classes[0]?.id || 'cls-10a',
    section: 'A',
    academicYear: '2026-2027',
    startDate: todayISO(),
    endDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed',
  });

  const refreshList = () => {
    setExams([...examService.getAll()]);
  };

  const currentExam = marksEntryAllowedExams.find(e => e.id === selectedExamId) || marksEntryAllowedExams[0];
  const allSchedules = currentExam ? currentExam.schedules : [];
  const schedules = useMemo(() => {
    if (!currentExam) return [];
    if (currentRole === 'teacher' && teacherUser) {
      const acList = teacherUser.assignedClasses || [];
      if (acList.length === 0) return allSchedules;
      const filtered = allSchedules.filter(s =>
        acList.some(
          ac =>
            ac.classId === currentExam.classId &&
            (!ac.section || !currentExam.section || ac.section.toLowerCase() === currentExam.section.toLowerCase()) &&
            (!ac.subject || !s.subject || ac.subject.toLowerCase() === s.subject.toLowerCase())
        )
      );
      return filtered;
    }
    return allSchedules;
  }, [currentExam, allSchedules, currentRole, teacherUser]);
  const currentSchedule = schedules.find(s => s.id === selectedScheduleId) || schedules[0];

  // Load students for current exam class
  const examStudents = useMemo(() => {
    if (!currentExam) return [];
    return studentService.getByClassAndSection(currentExam.classId, currentExam.section);
  }, [currentExam]);

  // Resolve grading scheme dynamically for Marks Entry
  const activeExamScheme = useMemo(() => {
    if (!currentExam) return gradingService.getDefaultScheme();
    return gradingService.getSchemeForClassAndExam(
      currentExam.classId,
      currentExam.examType,
      currentExam.academicYear
    );
  }, [currentExam]);

  // Report Card derivations
  const reportExam = exams.find(e => e.id === reportCardExamId) || exams[0];
  const reportClassStudents = useMemo(() => {
    if (currentRole === 'student' && studentUser) {
      return [studentUser];
    }
    if (currentRole === 'parent') {
      return linkedStudents;
    }
    if (!reportExam) return [];
    return studentService.getByClassAndSection(reportExam.classId, reportExam.section);
  }, [currentRole, studentUser, linkedStudents, reportExam]);

  // Staff: default the report card to the first student of the selected exam's class
  useEffect(() => {
    if (currentRole === 'student' || currentRole === 'parent') return;
    setReportCardStudent(prev => reportClassStudents.find(st => st.id === prev?.id) || reportClassStudents[0] || null);
  }, [currentRole, reportClassStudents]);

  const reportExamScheme = useMemo(() => {
    if (!reportExam) return gradingService.getDefaultScheme();
    return gradingService.getSchemeForClassAndExam(
      reportExam.classId,
      reportExam.examType,
      reportExam.academicYear
    );
  }, [reportExam]);

  const studentMarks = useMemo(() => {
    if (!reportCardStudent || !reportExam) return [];
    return examService.getMarksForExam(reportExam.id).filter(m => m.studentId === reportCardStudent.id);
  }, [reportCardStudent, reportExam, dataVersion]);

  const reportCardData = useMemo(() => {
    if (!reportExam || !reportExam.schedules || reportExam.schedules.length === 0) return null;
    return gradingService.calculateStudentReportCard(
      studentMarks,
      reportExam.schedules,
      reportExamScheme
    );
  }, [studentMarks, reportExam, reportExamScheme]);

  const reportClassTeacherName = useMemo(() => {
    if (!reportExam) return undefined;
    const cls = classes.find(c => c.id === reportExam.classId);
    return cls?.classTeacherName;
  }, [classes, reportExam]);

  const reportStudentAttendance = useMemo(() => {
    if (!reportCardStudent) return undefined;
    return attendanceService.calculateStudentPercentage(reportCardStudent.id);
  }, [reportCardStudent]);

  // Sync marks when schedule changes
  React.useEffect(() => {
    if (!currentExam || !currentSchedule) return;

    const existingMarks = examService.getMarksForExam(currentExam.id).filter(
      m => m.scheduleId === currentSchedule.id
    );

    const map: Record<string, { marks: number; isAbsent: boolean; remarks: string }> = {};
    examStudents.forEach(stud => {
      const rec = existingMarks.find(m => m.studentId === stud.id);
      map[stud.id] = {
        marks: rec ? rec.marksObtained : 0,
        isAbsent: rec ? rec.isAbsent : false,
        remarks: rec?.remarks || '',
      };
    });

    setMarksGrid(map);
  }, [currentExam, currentSchedule, examStudents, dataVersion]);

  const handleOpenAddExam = () => {
    setEditingExam(null);
    setExamForm({
      title: 'Annual Final Examination 2027',
      examType: 'Final Exam',
      classId: classes[0]?.id || 'cls-10a',
      section: 'A',
      academicYear: schoolSettings.academicYear,
      startDate: todayISO(),
      endDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      status: 'upcoming',
    });
    setIsExamModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.title.trim()) return;
    const res = editingExam ? await examService.update(editingExam.id, examForm) : await examService.create(examForm);
    if (!res.success) {
      addToast('error', editingExam ? 'Exam Not Updated' : 'Exam Not Created', res.error);
      return;
    }
    addToast('success', editingExam ? 'Exam Updated' : 'Exam Created', `${examForm.title} saved.`);
    setIsExamModalOpen(false);
    refreshList();
  };

  const handleDeleteExam = async () => {
    if (!deleteTarget) return;
    const res = await examService.delete(deleteTarget.id);
    if (!res.success) {
      addToast('error', 'Exam Not Deleted', res.error);
    } else {
      addToast('warning', 'Exam Deleted', `${deleteTarget.title} was removed.`);
    }
    setDeleteTarget(null);
    refreshList();
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalTarget) return;
    const res = await examService.addScheduleItem(scheduleModalTarget.id, newScheduleData);
    if (!res.success) {
      addToast('error', 'Paper Not Scheduled', res.error);
      return;
    }
    addToast('success', 'Paper Scheduled', `${newScheduleData.subject} scheduled for ${formatDate(newScheduleData.date)}.`);
    setScheduleModalTarget(null);
    refreshList();
  };

  const handleSaveMarksBatch = async () => {
    if (!currentExam || !currentSchedule) return;

    // Guard: teachers can only enter marks for assigned class, section, and subject
    if (currentRole === 'teacher' && teacherUser) {
      const acList = teacherUser.assignedClasses || [];
      if (acList.length > 0) {
        const isAssigned = acList.some(
          ac =>
            ac.classId === currentExam.classId &&
            (!ac.section || !currentExam.section || ac.section.toLowerCase() === currentExam.section.toLowerCase()) &&
            (!ac.subject || !currentSchedule.subject || ac.subject.toLowerCase() === currentSchedule.subject.toLowerCase())
        );
        if (!isAssigned) {
          addToast(
            'error',
            'Access Denied',
            `You are not authorized to enter marks for ${currentSchedule.subject} in ${currentExam.className}-${currentExam.section}.`
          );
          return;
        }
      }
    }

    const payload = examStudents.map(stud => ({
      studentId: stud.id,
      marksObtained: Number(marksGrid[stud.id]?.marks || 0),
      isAbsent: Boolean(marksGrid[stud.id]?.isAbsent),
      remarks: marksGrid[stud.id]?.remarks,
    }));

    const res = await examService.saveMarksBatch(currentExam.id, currentSchedule.id, payload);
    if (!res.success) {
      addToast('error', 'Marks Validation Failed', res.error);
      return;
    }

    addToast('success', 'Marks Saved', `Recorded ${res.count} scores for ${currentSchedule.subject}.`);
    refreshList();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Examinations</h1>
          <p className="page-subtitle">
            Exam schedules and student report cards
          </p>
        </div>

        <div className="page-actions">
          {['school_admin', 'super_admin'].includes(currentRole) && (
            <button className="btn btn-primary" onClick={handleOpenAddExam}>
              <Plus size={16} />
              <span>Add Exam</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => handleTabChange('exams')}
        >
          <Calendar size={16} />
          <span>Exam Schedules</span>
        </button>

        {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && (
          <button
            className={`tab-btn ${activeTab === 'marks_entry' ? 'active' : ''}`}
            onClick={() => handleTabChange('marks_entry')}
          >
            <Award size={16} />
            <span>Marks Entry</span>
          </button>
        )}

        <button
          className={`tab-btn ${activeTab === 'report_cards' ? 'active' : ''}`}
          onClick={() => handleTabChange('report_cards')}
        >
          <Printer size={16} />
          <span>Report Cards</span>
        </button>

        {['school_admin', 'super_admin'].includes(currentRole) && (
          <button
            className={`tab-btn ${activeTab === 'grading_schemes' ? 'active' : ''}`}
            onClick={() => handleTabChange('grading_schemes')}
          >
            <Sliders size={16} />
            <span>Grading Schemes & Engine</span>
          </button>
        )}
      </div>

      {/* TAB 1: EXAMINATIONS & SCHEDULES */}
      {activeTab === 'exams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {exams.map(exam => (
            <div key={exam.id} className="card">
              <div className="card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="card-title">{exam.title}</h3>
                    <Badge status={exam.status} />
                    <span className="badge badge-purple">{exam.examType}</span>
                  </div>
                  <span className="card-subtitle">
                    {exam.className} ({exam.section}) • {formatDate(exam.startDate)} to {formatDate(exam.endDate)} • Academic Year: {exam.academicYear}
                  </span>
                </div>

                {['school_admin', 'super_admin'].includes(currentRole) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setScheduleModalTarget(exam)}
                    >
                      <Plus size={14} />
                      <span>Add Paper</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-icon-only"
                      onClick={() => {
                        setEditingExam(exam);
                        setExamForm({
                          title: exam.title,
                          examType: exam.examType,
                          classId: exam.classId,
                          section: exam.section,
                          academicYear: exam.academicYear,
                          startDate: exam.startDate,
                          endDate: exam.endDate,
                          status: exam.status,
                        });
                        setIsExamModalOpen(true);
                      }}
                      title="Edit Exam"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      className="btn btn-secondary btn-icon-only"
                      onClick={() => setDeleteTarget(exam)}
                      title="Delete Exam"
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </button>
                  </div>
                )}
              </div>

              <div className="card-body" style={{ padding: '0' }}>
                {exam.schedules.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No subject examination papers scheduled yet. Click "Add Paper" to timetable subjects.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Exam Date</th>
                          <th>Timing</th>
                          <th>Max Marks</th>
                          <th>Pass Marks</th>
                          <th>Exam Hall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.schedules.map(sch => (
                          <tr key={sch.id}>
                            <td style={{ fontWeight: 700, color: '#0F172A' }}>{sch.subject}</td>
                            <td>{formatDate(sch.date)}</td>
                            <td>{sch.startTime} - {sch.endTime}</td>
                            <td style={{ fontWeight: 600 }}>{sch.maxMarks}</td>
                            <td style={{ color: '#D97706', fontWeight: 600 }}>{sch.passMarks}</td>
                            <td>{sch.roomNo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: MARKS ENTRY */}
      {activeTab === 'marks_entry' &&
        (currentRole === 'teacher' && marksEntryAllowedExams.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              icon={<Award size={32} />}
              title="No Assigned Exams"
              description="There are currently no active examinations scheduled for your assigned teaching classes."
            />
          </div>
        ) : (
          <div>
            {/* Selector Toolbar */}
            <div className="filter-toolbar">
              <div className="filter-group-left">
                <div className="filter-item">
                  <label className="filter-label">Exam:</label>
                  <select
                    className="form-select filter-select filter-select-lg"
                    value={selectedExamId}
                    onChange={e => {
                      setSelectedExamId(e.target.value);
                      const ex = marksEntryAllowedExams.find(x => x.id === e.target.value);
                      if (ex && ex.schedules.length > 0) {
                        setSelectedScheduleId(ex.schedules[0].id);
                      }
                    }}
                    aria-label="Select Examination"
                  >
                    {marksEntryAllowedExams.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.className} {e.section})
                      </option>
                    ))}
                  </select>
                </div>

              {schedules.length > 0 && (
                <div className="filter-item">
                  <label className="filter-label">Subject:</label>
                  <select
                    className="form-select filter-select filter-select-md"
                    value={selectedScheduleId || (schedules[0]?.id || '')}
                    onChange={e => setSelectedScheduleId(e.target.value)}
                    aria-label="Select Subject"
                  >
                    {schedules.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subject} (Max: {s.maxMarks})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="filter-group-right">
              <button className="btn btn-primary" onClick={handleSaveMarksBatch}>
                <CheckCircle size={15} />
                <span>Save Entered Marks</span>
              </button>
            </div>
          </div>

          {/* Marks Grid Table */}
          {currentSchedule ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 className="card-title">
                      Marks Entry Roster — {currentSchedule.subject}
                    </h3>
                    <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                      Scheme: {activeExamScheme.name}
                    </span>
                  </div>
                  <p className="card-subtitle">
                    Paper Max Marks: <strong>{currentSchedule.maxMarks}</strong> • Passing Threshold: {currentSchedule.passMarks} Marks • Board Scale: {activeExamScheme.rules.length} Points
                  </p>
                </div>
              </div>

              <div className="card-body" style={{ padding: '0' }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll #</th>
                        <th>Student Name</th>
                        <th>Admission No</th>
                        <th>Marks Obtained (Max: {currentSchedule.maxMarks})</th>
                        <th>Absent?</th>
                        <th>Graded Level</th>
                        <th>Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examStudents.map(stud => {
                        const current = marksGrid[stud.id] || { marks: 0, isAbsent: false, remarks: '' };
                        const gradeCalc = gradingService.calculateSubjectGrade(
                          current.isAbsent ? undefined : current.marks,
                          currentSchedule.maxMarks,
                          current.isAbsent,
                          activeExamScheme
                        );

                        return (
                          <tr key={stud.id}>
                            <td style={{ fontWeight: 700 }}>{stud.rollNo}</td>
                            <td style={{ fontWeight: 600 }}>{stud.fullName}</td>
                            <td style={{ color: '#0f172a', fontWeight: 700 }}>{stud.admissionNo}</td>
                            <td>
                              <input
                                type="number"
                                className="form-input"
                                min="0"
                                max={currentSchedule.maxMarks}
                                step="0.5"
                                style={{ width: '100px', fontWeight: 700 }}
                                value={current.isAbsent ? '' : current.marks}
                                disabled={current.isAbsent}
                                placeholder={current.isAbsent ? 'ABSENT' : '0'}
                                onChange={e => {
                                  let val = parseFloat(e.target.value);
                                  if (isNaN(val)) val = 0;
                                  if (val > currentSchedule.maxMarks) val = currentSchedule.maxMarks;
                                  if (val < 0) val = 0;
                                  setMarksGrid(prev => ({
                                    ...prev,
                                    [stud.id]: {
                                      ...prev[stud.id],
                                      marks: val,
                                    },
                                  }));
                                }}
                              />
                            </td>
                            <td>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={current.isAbsent}
                                  onChange={e => {
                                    setMarksGrid(prev => ({
                                      ...prev,
                                      [stud.id]: {
                                        ...prev[stud.id],
                                        isAbsent: e.target.checked,
                                      },
                                    }));
                                  }}
                                />
                                <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: current.isAbsent ? 700 : 400 }}>Absent</span>
                              </label>
                            </td>
                            <td>
                              {current.isAbsent ? (
                                <span className="badge badge-danger">ABSENT</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className={`badge ${gradeCalc.resultStatus === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                                    {gradeCalc.grade}
                                  </span>
                                  {gradeCalc.gradePoint !== undefined && (
                                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                      {gradeCalc.gradePoint} GP
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{ height: '32px', fontSize: '12px' }}
                                placeholder="Remarks..."
                                value={current.remarks}
                                onChange={e => {
                                  const text = e.target.value;
                                  setMarksGrid(prev => ({
                                    ...prev,
                                    [stud.id]: {
                                      ...prev[stud.id],
                                      remarks: text,
                                    },
                                  }));
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                Please select or create an examination paper schedule first.
              </div>
            </div>
          )}
        </div>
      ))}

      {/* TAB 3: REPORT CARDS */}
      {activeTab === 'report_cards' && !reportExam && (
        <EmptyState
          icon={<Award size={32} />}
          title={examService.isLoaded() ? 'No Examinations Yet' : 'Loading examinations…'}
          description={examService.getLoadError() || 'Report cards appear once an exam is scheduled for this class.'}
        />
      )}

      {activeTab === 'report_cards' && reportExam && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Student Report Card Generator</h3>
                <p className="card-subtitle">
                  Select examination and student to generate official academic progress report card
                </p>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="filter-item" style={{ flexWrap: 'wrap' }}>
                  <label className="filter-label">Examination:</label>
                  <select
                    className="form-select filter-select filter-select-lg"
                    value={reportCardExamId}
                    onChange={e => {
                      setReportCardExamId(e.target.value);
                      const ex = exams.find(x => x.id === e.target.value);
                      if (ex) {
                        const studList = studentService.getByClassAndSection(ex.classId, ex.section);
                        if (studList.length > 0) setReportCardStudent(studList[0]);
                      }
                    }}
                    aria-label="Select Examination"
                  >
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.className} {e.section})
                      </option>
                    ))}
                  </select>

                  <span className="badge badge-purple" style={{ fontSize: '12px' }}>
                    Active Scheme: {reportExamScheme.name}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
                    {currentRole === 'student' ? 'My Progress Card:' : currentRole === 'parent' ? 'Select Linked Ward:' : `Select Student (${reportExam.className} - ${reportExam.section}):`}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {reportClassStudents.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className={`btn ${reportCardStudent?.id === s.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setReportCardStudent(s)}
                      >
                        <GraduationCap size={13} />
                        <span>{s.fullName} ({s.rollNo})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Official Human-Designed Report Card Preview Sheet */}
          {reportCardStudent && reportExam && (
            <ReportCardView
              student={reportCardStudent}
              exam={reportExam}
              scheme={reportExamScheme}
              reportData={reportCardData}
              schoolSettings={schoolSettings}
              classTeacherName={reportClassTeacherName}
              attendanceStats={reportStudentAttendance}
            />
          )}
        </div>
      )}

      {/* TAB 4: GRADING SCHEMES & ENGINE */}
      {activeTab === 'grading_schemes' && (
        <GradingSchemeManager />
      )}

      {/* Create / Edit Exam Modal */}
      {isExamModalOpen && (
        <Modal
          isOpen={isExamModalOpen}
          onClose={() => setIsExamModalOpen(false)}
          title={editingExam ? 'Edit Exam' : 'Add Exam'}
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsExamModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveExam}>
                Save Exam
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveExam}>
            <div className="form-group">
              <label className="form-label required">Examination Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Periodic Assessment II"
                value={examForm.title}
                onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Exam Type</label>
                <select
                  className="form-select"
                  value={examForm.examType}
                  onChange={e => setExamForm({ ...examForm, examType: e.target.value as any })}
                >
                  <option value="Unit Test">Unit Test</option>
                  <option value="Mid-Term">Mid-Term</option>
                  <option value="Final Exam">Final Exam</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Practical">Practical</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Target Class</label>
                <select
                  className="form-select"
                  value={examForm.classId}
                  onChange={e => {
                    const c = classes.find(item => item.id === e.target.value);
                    setExamForm({
                      ...examForm,
                      classId: e.target.value,
                      section: c ? c.section : 'A',
                    });
                  }}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={examForm.startDate}
                  onChange={e => setExamForm({ ...examForm, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={examForm.endDate}
                  onChange={e => setExamForm({ ...examForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Paper Schedule Modal */}
      {scheduleModalTarget && (
        <Modal
          isOpen={Boolean(scheduleModalTarget)}
          onClose={() => setScheduleModalTarget(null)}
          title={`Add Paper Schedule: ${scheduleModalTarget.title}`}
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setScheduleModalTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddSchedule}>
                Add Paper Schedule
              </button>
            </>
          }
        >
          <form onSubmit={handleAddSchedule}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={newScheduleData.subject}
                  onChange={e => setNewScheduleData({ ...newScheduleData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Date of Exam</label>
                <input
                  type="date"
                  className="form-input"
                  value={newScheduleData.date}
                  onChange={e => setNewScheduleData({ ...newScheduleData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={newScheduleData.startTime}
                  onChange={e => setNewScheduleData({ ...newScheduleData, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={newScheduleData.endTime}
                  onChange={e => setNewScheduleData({ ...newScheduleData, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Maximum Marks</label>
                <input
                  type="number"
                  className="form-input"
                  value={newScheduleData.maxMarks}
                  onChange={e => setNewScheduleData({ ...newScheduleData, maxMarks: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Pass Marks</label>
                <input
                  type="number"
                  className="form-input"
                  value={newScheduleData.passMarks}
                  onChange={e => setNewScheduleData({ ...newScheduleData, passMarks: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Exam Hall / Room</label>
              <input
                type="text"
                className="form-input"
                value={newScheduleData.roomNo}
                onChange={e => setNewScheduleData({ ...newScheduleData, roomNo: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Exam Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteExam}
          title="Delete Examination"
          message={`Are you sure you want to delete ${deleteTarget.title}? All associated schedules and marks will be removed.`}
          isDestructive
          confirmLabel="Delete Examination"
        />
      )}
    </div>
  );
};

