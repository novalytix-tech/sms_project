// ==========================================
// Student Profile & Academic 360 View
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Student, DayOfWeek } from '../../types';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { assignmentService } from '../../services/assignmentService';
import { examService } from '../../services/examService';
import { feeService } from '../../services/feeService';
import { timetableService } from '../../services/timetableService';
import { classService } from '../../services/classService';
import { transportService } from '../../services/transportService';
import { libraryService } from '../../services/libraryService';
import { gradingService } from '../../services/gradingService';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { PaymentInstructionsModal } from '../fees/PaymentInstructionsModal';
import { formatDate, formatCurrencyINR } from '../../utils/formatters';
import { CalendarCheck, FileText, Award, Clock, IndianRupee, Phone, Mail, ShieldAlert, Users, ExternalLink, LayoutGrid, List, DoorOpen, User } from 'lucide-react';
import { DAYS, PERIOD_SLOTS, LUNCH_BREAK, getSubjectTheme } from '../../utils/timetableConstants';

interface StudentProfileViewProps {
  student: Student;
  isParentView?: boolean;
  linkedChildren?: Student[];
  onSelectChild?: (childId: string) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  isParentView = false,
  linkedChildren = [],
  onSelectChild,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'attendance' | 'assignments' | 'exams' | 'timetable' | 'fees' | 'services'
  >('overview');

  // Modal for online fee payment
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);

  // 1. Attendance Metrics
  const attStats = useMemo(() => {
    return attendanceService.calculateStudentPercentage(student?.id || '');
  }, [student?.id]);

  const studentAttendanceRecords = useMemo(() => {
    return attendanceService.getByStudentId(student?.id || '').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [student?.id]);

  // 2. Assignments
  const assignments = useMemo(() => {
    return assignmentService.getByClass(student?.classId || '', student?.section || 'A');
  }, [student?.classId, student?.section]);

  // 3. Exam Marks & Grading
  const marks = useMemo(() => {
    return examService.getMarksForStudent(student?.id || '');
  }, [student?.id]);

  const exams = useMemo(() => examService.getAll(), []);
  const activeScheme = useMemo(() => gradingService.getDefaultScheme(), []);

  const examSummary = useMemo(() => {
    let obtained = 0;
    let max = 0;
    marks.forEach(m => {
      if (!m.isAbsent) obtained += m.marksObtained;
      const ex = exams.find(e => e.id === m.examId);
      const sc = ex?.schedules.find(s => s.id === m.scheduleId);
      max += sc?.maxMarks || 80;
    });
    const percentage = max > 0 ? Math.round((obtained / max) * 100) : 0;
    const gradeCalc = marks.length > 0 ? gradingService.calculateSubjectGrade(obtained, max, false, activeScheme) : null;
    return { obtained, max, percentage, gradeLetter: gradeCalc?.grade || '—' };
  }, [marks, exams, activeScheme]);

  // 4. Fees
  const feeSummary = useMemo(() => {
    return feeService.getParentSummary(student?.id || '');
  }, [student?.id]);

  const invoices = useMemo(() => {
    return feeService.getInvoicesByStudentId(student?.id || '');
  }, [student?.id]);

  // 5. Timetable
  const timetable = useMemo(() => {
    return timetableService.getByClass(student?.classId || '', student?.section || 'A');
  }, [student?.classId, student?.section]);

  const studentClass = useMemo(() => {
    return classService.getById(student?.classId || '');
  }, [student?.classId]);

  const [ttViewMode, setTtViewMode] = useState<'grid' | 'list'>('grid');

  const formattedClassName = useMemo(() => {
    const raw = student?.className || student?.grade || 'Class 10';
    const clean = String(raw).startsWith('Class') ? String(raw) : `Class ${raw}`;
    return `${clean} (Section ${student?.section || 'A'})`;
  }, [student?.className, student?.grade, student?.section]);

  const todayDayName: DayOfWeek = useMemo(() => {
    const dayIndex = new Date().getDay(); // 0 is Sunday
    return dayIndex === 0 ? 'Monday' : DAYS[dayIndex - 1];
  }, []);

  // 6. Transport & Library
  const busRoute = useMemo(() => {
    return transportService.getAllRoutes().find(r => r.id === student?.transportRouteId);
  }, [student?.transportRouteId]);

  const libraryLoans = useMemo(() => {
    return libraryService.getLoansForStudent(student?.id || '');
  }, [student?.id]);

  if (!student) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <EmptyState
          icon={<Users size={32} />}
          title="Student Profile Not Found"
          description="The requested student profile could not be located. Please check the student roster."
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Linked Child Selector for Parents */}
      {isParentView && linkedChildren.length > 1 && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Ward:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {linkedChildren.map(child => (
                <button
                  key={child.id}
                  type="button"
                  className={`btn ${student.id === child.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => onSelectChild && onSelectChild(child.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Users size={14} />
                  <span>
                    {child.fullName} (Class {child.className || child.grade || '10'}-{child.section || 'A'})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leave')}>
              Apply Leave
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/fees')}>
              View Accounts
            </button>
          </div>
        </div>
      )}

      {/* Student Banner Card */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid #3B82F6',
          background: '#FFFFFF',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '12px',
                background: '#DBEAFE',
                color: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '22px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid #E2E8F0',
              }}
            >
              {studentService.getStudentPhoto(student) ? (
                <img
                  src={studentService.getStudentPhoto(student)}
                  alt={student.fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                student.avatar || (student.fullName ? student.fullName.slice(0, 2).toUpperCase() : 'ST')
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {student.fullName}
                </h1>
                <Badge status={student.status} />
                <span
                  style={{
                    background: '#FEF2F2',
                    color: '#991B1B',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #FEE2E2',
                  }}
                >
                  {String(student.className || student.grade || 'Class 10').toLowerCase().startsWith('class')
                    ? (student.className || student.grade || 'Class 10')
                    : `Class ${student.className || student.grade || '10'}`} • Sec {student.section || 'A'}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span><strong>Roll #:</strong> {student.rollNo}</span>
                <span><strong>Admission #:</strong> <span style={{ color: '#0f172a', fontWeight: 700 }}>{student.admissionNo}</span></span>
                <span><strong>Academic Year:</strong> {student.academicYear}</span>
                <span><strong>DOB:</strong> {formatDate(student.dob)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {feeSummary.outstandingBalance > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const pendingInv = invoices.find(i => i.status !== 'paid');
                  if (pendingInv) setPayingInvoice(pendingInv);
                  else navigate('/fees');
                }}
              >
                <IndianRupee size={14} />
                <span>Pay Fee Dues ({formatCurrencyINR(feeSummary.outstandingBalance)})</span>
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/timetable')}>
              <Clock size={14} />
              <span>Timetable</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Performance KPIs */}
      <div className="stat-grid">
        <div
          className="stat-card"
          onClick={() => setActiveTab('attendance')}
          style={{ cursor: 'pointer', border: activeTab === 'attendance' ? '2px solid #3B82F6' : undefined }}
        >
          <div className="stat-content">
            <span className="stat-label">Attendance Rate</span>
            <span className="stat-value">{attStats.isMarked ? `${attStats.percentage}%` : '—'}</span>
            <span className={`stat-subtext ${attStats.isMarked ? 'positive' : ''}`}>
              {attStats.isMarked
                ? `${attStats.present} Present of ${attStats.total} Marked Days`
                : 'No attendance marked yet'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('exams')}
          style={{ cursor: 'pointer', border: activeTab === 'exams' ? '2px solid #3B82F6' : undefined }}
        >
          <div className="stat-content">
            <span className="stat-label">Academic Evaluation</span>
            <span className="stat-value">{examSummary.gradeLetter}</span>
            <span className={`stat-subtext ${marks.length > 0 ? 'positive' : ''}`}>
              {marks.length > 0
                ? `${examSummary.obtained} / ${examSummary.max} Marks (${examSummary.percentage}%)`
                : 'No marks recorded'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Award size={22} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('assignments')}
          style={{ cursor: 'pointer', border: activeTab === 'assignments' ? '2px solid #3B82F6' : undefined }}
        >
          <div className="stat-content">
            <span className="stat-label">Homework & Tasks</span>
            <span className="stat-value">{assignments.length}</span>
            <span className="stat-subtext">Active assignments for Class {student.className || student.grade || '10'}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <FileText size={22} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('fees')}
          style={{ cursor: 'pointer', border: activeTab === 'fees' ? '2px solid #3B82F6' : undefined }}
        >
          <div className="stat-content">
            <span className="stat-label">Fee Account Status</span>
            <span className="stat-value" style={{ color: feeSummary.outstandingBalance > 0 ? '#DC2626' : '#16A34A' }}>
              {feeSummary.outstandingBalance > 0 ? formatCurrencyINR(feeSummary.outstandingBalance) : 'Fully Cleared'}
            </span>
            <span className="stat-subtext">Total Paid: {formatCurrencyINR(feeSummary.totalPaid)}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <IndianRupee size={22} />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '0' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Personal & Guardian Info
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance History ({studentAttendanceRecords.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Homework ({assignments.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          Report Card & Marks
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}
          onClick={() => setActiveTab('timetable')}
        >
          Weekly Timetable
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'fees' ? 'active' : ''}`}
          onClick={() => setActiveTab('fees')}
        >
          Fees & Invoices ({invoices.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          Transport & Library
        </button>
      </div>

      {/* TAB 1: OVERVIEW & GUARDIAN DETAILS */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Student Personal Information</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Full Name</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{student.fullName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Admission Number</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{student.admissionNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Class & Section</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{formattedClassName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Roll Number</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{student.rollNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Gender</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{student.gender}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Date of Birth</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatDate(student.dob)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Blood Group</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626' }}>{student.bloodGroup || 'O+'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Admission Date</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatDate(student.admissionDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Academic Enrollment Status</span>
                  <span className="badge badge-success">ACTIVE ENROLLED</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Guardian & Family Contact</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Guardian / Father</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{student.parentName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Primary Phone</span>
                  <a href={`tel:${student.parentPhone}`} style={{ fontSize: '13px', fontWeight: 600, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} />
                    {student.parentPhone}
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Primary Email</span>
                  <a href={`mailto:${student.parentEmail}`} style={{ fontSize: '13px', fontWeight: 600, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={13} />
                    {student.parentEmail}
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Residential Address</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, maxWidth: '240px', textAlign: 'right' }}>
                    {student.address}
                  </span>
                </div>

                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <ShieldAlert size={16} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                    <strong>Official School Record:</strong> Student admission, marks, roll number, and attendance are officially verified records. To request a change to residential address or contact numbers, please submit a formal request to the administrative office.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY (STRICTLY READ-ONLY) */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarCheck size={16} color="#16A34A" />
              <span style={{ fontSize: '13px', color: '#334155' }}>
                Attendance records are recorded each working morning by class teachers. Days without marked roll calls are not counted as absences.
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leave')}>
              Submit Medical / Leave Request
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Daily Attendance Log</h3>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              {studentAttendanceRecords.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  No attendance sessions have been recorded for this student yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day of Week</th>
                        <th>Attendance Status</th>
                        <th>Class & Section</th>
                        <th>Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAttendanceRecords.map(rec => {
                        const dateObj = new Date(rec.date);
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                        let badgeColor = 'badge-success';
                        let label = 'Present';

                        if (rec.status === 'absent') {
                          badgeColor = 'badge-danger';
                          label = 'Absent';
                        } else if (rec.status === 'late') {
                          badgeColor = 'badge-warning';
                          label = 'Late Commute';
                        } else if (rec.status === 'excused') {
                          badgeColor = 'badge-info';
                          label = 'Excused Leave';
                        }

                        return (
                          <tr key={rec.id}>
                            <td style={{ fontWeight: 600 }}>{formatDate(rec.date)}</td>
                            <td style={{ color: '#64748B' }}>{dayName}</td>
                            <td>
                              <span className={`badge ${badgeColor}`}>{label}</span>
                            </td>
                            <td>Class {rec.classId.toUpperCase()} ({rec.section})</td>
                            <td style={{ color: '#64748B', fontStyle: rec.remarks ? 'normal' : 'italic' }}>
                              {rec.remarks || 'Regular attendance'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HOMEWORK & ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Homework Tasks for Class {student.className || student.grade || '10'} ({student.section || 'A'})</h3>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {assignments.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                No active assignments for this class.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Assignment Title</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Submission Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => {
                      const submission = a.submissions?.find(s => s.studentId === student.id);
                      const isSubmitted = !!submission;

                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{a.subject}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.title}</div>
                            <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '300px' }}>
                              {a.description}
                            </div>
                          </td>
                          <td style={{ color: '#DC2626', fontWeight: 600 }}>{formatDate(a.dueDate)}</td>
                          <td>
                            <Badge status={a.status} />
                          </td>
                          <td>
                            {isSubmitted ? (
                              <span className="badge badge-success">
                                {submission.score !== undefined ? `Graded: ${submission.score}/${a.maxScore}` : 'Submitted (Under Review)'}
                              </span>
                            ) : (
                              <span className="badge badge-warning">Due for Submission</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => navigate('/assignments')}
                            >
                              <span>{isSubmitted ? 'View Submission' : 'Submit Homework'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EXAMINATIONS & REPORT CARD */}
      {activeTab === 'exams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 className="card-title">Official Term Progress & Marks Sheet</h3>
                  <p className="card-subtitle">
                    Evaluation based on {activeScheme.name} ({activeScheme.rules.length}-Point Grading Scale)
                  </p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/examinations')}>
                  <ExternalLink size={14} />
                  <span>Open Full Examination Hub</span>
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              {marks.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  No examination marks have been published for this student yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Exam Paper</th>
                        <th>Max Marks</th>
                        <th>Marks Scored</th>
                        <th>Percentage</th>
                        <th>Grade Level</th>
                        <th>Grade Points</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marks.map(m => {
                        const exam = exams.find(e => e.id === m.examId);
                        const schedule = exam?.schedules.find(s => s.id === m.scheduleId);
                        const maxMarks = schedule?.maxMarks || 80;
                        const subjectName = schedule?.subject || 'Subject Paper';
                        const gradeCalc = gradingService.calculateSubjectGrade(m.marksObtained, maxMarks, !!m.isAbsent, activeScheme);

                        return (
                          <tr key={m.id}>
                            <td style={{ fontWeight: 700 }}>{subjectName}</td>
                            <td style={{ color: '#64748B' }}>{exam?.title || 'Mid-Term Exam'}</td>
                            <td>{maxMarks}</td>
                            <td style={{ fontWeight: 700, color: m.isAbsent ? '#DC2626' : '#0F172A' }}>
                              {m.isAbsent ? 'ABSENT' : m.marksObtained}
                            </td>
                            <td>{m.isAbsent ? '0%' : `${gradeCalc.percentage}%`}</td>
                            <td>
                              <span className={`badge ${gradeCalc.resultStatus === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                                {gradeCalc.grade}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{gradeCalc.gradePoint ?? '—'}</td>
                            <td>
                              <span className={`badge ${gradeCalc.resultStatus === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                                {gradeCalc.resultStatus.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div
              className="card-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px 20px',
              }}
            >
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#3B82F6" />
                  <span>Weekly Class Timetable ({formattedClassName})</span>
                </h3>
                <p className="card-subtitle" style={{ marginTop: '4px' }}>
                  Room: <strong>{studentClass?.roomNo || 'Room 301'}</strong> • Class Teacher: <strong>{studentClass?.classTeacherName || 'Mrs. Ananya Sharma'}</strong> • {timetable.length} periods scheduled
                </p>
              </div>

              {/* View Switcher Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>View:</span>
                <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setTtViewMode('grid')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      background: ttViewMode === 'grid' ? '#3B82F6' : '#FFFFFF',
                      color: ttViewMode === 'grid' ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <LayoutGrid size={13} />
                    <span>Weekly Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTtViewMode('list')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      background: ttViewMode === 'list' ? '#3B82F6' : '#FFFFFF',
                      color: ttViewMode === 'list' ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <List size={13} />
                    <span>List View</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ padding: '0' }}>
              {timetable.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                  <Clock size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>No Timetable Periods Scheduled</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>There are currently no scheduled classes for {formattedClassName}.</div>
                </div>
              ) : ttViewMode === 'grid' ? (
                <div className="table-responsive">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '120px', background: '#F8FAFC', padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
                          Day of Week
                        </th>
                        {PERIOD_SLOTS.slice(0, 4).map(slot => (
                          <th
                            key={slot.no}
                            style={{
                              textAlign: 'center',
                              minWidth: '135px',
                              background: '#F8FAFC',
                              padding: '10px 6px',
                              borderBottom: '2px solid #E2E8F0',
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '12px', color: '#0F172A' }}>
                              Period {slot.no}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 500, color: '#64748B', marginTop: '2px' }}>
                              {slot.start} - {slot.end}
                            </div>
                          </th>
                        ))}
                        <th
                          key="recess-header"
                          style={{
                            textAlign: 'center',
                            width: '80px',
                            minWidth: '80px',
                            background: '#FFF5F4',
                            padding: '10px 4px',
                            borderBottom: '2px solid #FECACA',
                            borderLeft: '1px dashed #FECACA',
                            borderRight: '1px dashed #FECACA',
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '11px', color: '#991B1B', letterSpacing: '0.5px' }}>
                            RECESS
                          </div>
                          <div style={{ fontSize: '9px', fontWeight: 600, color: '#B91C1C', marginTop: '2px' }}>
                            {LUNCH_BREAK.start} - {LUNCH_BREAK.end}
                          </div>
                        </th>
                        {PERIOD_SLOTS.slice(4).map(slot => (
                          <th
                            key={slot.no}
                            style={{
                              textAlign: 'center',
                              minWidth: '135px',
                              background: '#F8FAFC',
                              padding: '10px 6px',
                              borderBottom: '2px solid #E2E8F0',
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '12px', color: '#0F172A' }}>
                              Period {slot.no}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 500, color: '#64748B', marginTop: '2px' }}>
                              {slot.start} - {slot.end}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map(day => {
                        const isToday = day === todayDayName;

                        const renderCell = (slot: (typeof PERIOD_SLOTS)[0]) => {
                          const period = timetable.find(p => p.day === day && p.periodNo === slot.no);

                          if (!period) {
                            const isSatAfternoon = day === 'Saturday' && slot.no > 4;
                            return (
                              <td key={slot.no} style={{ verticalAlign: 'top', padding: '6px', minWidth: '135px' }}>
                                <div
                                  style={{
                                    minHeight: '68px',
                                    border: '1px dashed #E2E8F0',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94A3B8',
                                    fontSize: '11px',
                                    background: isSatAfternoon ? '#F8FAFC' : '#FAFAFA',
                                    padding: '4px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {isSatAfternoon ? (
                                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>Half Day Dispersal</span>
                                  ) : (
                                    'Free Slot'
                                  )}
                                </div>
                              </td>
                            );
                          }

                          const theme = getSubjectTheme(period.subject);

                          return (
                            <td key={slot.no} style={{ verticalAlign: 'top', padding: '6px', minWidth: '135px' }}>
                              <div
                                style={{
                                  background: theme.bg,
                                  border: `1px solid ${theme.border}`,
                                  borderLeft: `4px solid ${theme.accent}`,
                                  borderRadius: '8px',
                                  padding: '8px 9px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    color: theme.text,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={period.subject}
                                >
                                  {period.subject}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={period.teacherName}
                                >
                                  <User size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                                  <span>{period.teacherName}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      background: theme.badge,
                                      color: theme.text,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <DoorOpen size={10} style={{ flexShrink: 0 }} />
                                    <span>{period.roomNo}</span>
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        };

                        return (
                          <tr
                            key={day}
                            style={{
                              background: isToday ? '#FFFBFB' : '#FFFFFF',
                              borderBottom: '1px solid #F1F5F9',
                            }}
                          >
                            <td
                              style={{
                                fontWeight: 700,
                                fontSize: '13px',
                                color: isToday ? '#3B82F6' : '#0F172A',
                                background: isToday ? '#DBEAFE' : '#F8FAFC',
                                padding: '12px 10px',
                                borderLeft: isToday ? '4px solid #3B82F6' : '4px solid transparent',
                                verticalAlign: 'middle',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>{day}</span>
                                {isToday && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      background: '#3B82F6',
                                      color: '#FFFFFF',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      letterSpacing: '0.5px',
                                      width: 'fit-content',
                                    }}
                                  >
                                    TODAY
                                  </span>
                                )}
                              </div>
                            </td>

                            {PERIOD_SLOTS.slice(0, 4).map(slot => renderCell(slot))}

                            <td
                              key="recess-cell"
                              style={{
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                padding: '6px 4px',
                                background: isToday ? '#FFF5F4' : '#FFFBFB',
                                borderLeft: '1px dashed #FECACA',
                                borderRight: '1px dashed #FECACA',
                                minWidth: '80px',
                                width: '80px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  color: '#991B1B',
                                }}
                              >
                                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>LUNCH</span>
                                <span style={{ fontSize: '9px', fontWeight: 600, color: '#B91C1C' }}>40 MINS</span>
                              </div>
                            </td>

                            {PERIOD_SLOTS.slice(4).map(slot => renderCell(slot))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {DAYS.map(day => {
                    const dayPeriods = timetable
                      .filter(p => p.day === day)
                      .sort((a, b) => a.periodNo - b.periodNo);
                    const isToday = day === todayDayName;

                    if (dayPeriods.length === 0) return null;

                    return (
                      <div
                        key={day}
                        style={{
                          border: isToday ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            background: isToday ? '#DBEAFE' : '#F8FAFC',
                            padding: '10px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #E2E8F0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: isToday ? '#3B82F6' : '#0F172A' }}>
                              {day}
                            </span>
                            {isToday && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  background: '#3B82F6',
                                  color: '#FFFFFF',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Today
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {dayPeriods.length} Periods Scheduled
                          </span>
                        </div>

                        <div style={{ padding: '8px 16px' }}>
                          <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '90px' }}>Period</th>
                                <th style={{ width: '120px' }}>Timing</th>
                                <th>Subject</th>
                                <th>Faculty</th>
                                <th style={{ width: '120px' }}>Location</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayPeriods.map(p => (
                                <tr key={p.id}>
                                  <td style={{ fontWeight: 600 }}>Period {p.periodNo}</td>
                                  <td style={{ color: '#64748B' }}>{p.startTime} - {p.endTime}</td>
                                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{p.subject}</td>
                                  <td>{p.teacherName}</td>
                                  <td>
                                    <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                                      {p.roomNo}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FEES & INVOICES */}
      {activeTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Fee Invoices & Outstanding Balance</h3>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              {invoices.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  No fee invoices generated for this student.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Invoice Ref</th>
                        <th>Category</th>
                        <th>Total Amount</th>
                        <th>Amount Paid</th>
                        <th>Due Balance</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => {
                        const balance = inv.totalAmount - inv.paidAmount;
                        return (
                          <tr key={inv.id}>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{inv.invoiceNo}</td>
                            <td>{inv.category.toUpperCase()}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrencyINR(inv.totalAmount)}</td>
                            <td style={{ color: '#16A34A', fontWeight: 600 }}>{formatCurrencyINR(inv.paidAmount)}</td>
                            <td style={{ color: balance > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                              {formatCurrencyINR(balance)}
                            </td>
                            <td style={{ color: '#64748B' }}>{formatDate(inv.dueDate)}</td>
                            <td>
                              <Badge status={inv.status} />
                            </td>
                            <td>
                              {balance > 0 ? (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setPayingInvoice(inv)}
                                >
                                  Pay Now
                                </button>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                                  ✓ Cleared
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SERVICES (TRANSPORT & LIBRARY) */}
      {activeTab === 'services' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Transport Bus & Commute Details</h3>
            </div>
            <div className="card-body">
              {busRoute ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Route Name</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{busRoute.routeName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Bus Vehicle Number</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{busRoute.vehicleNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Assigned Stop</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#3B82F6' }}>{student.busStop || 'Main Gate'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Driver Name & Contact</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{busRoute.driverName} ({busRoute.driverPhone})</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>
                    Private / Self Commute
                  </div>
                  <div>Student has not opted for school transport facilities.</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Library Books & Active Loans</h3>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              {libraryLoans.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                  No active library books borrowed.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Borrowed Date</th>
                        <th>Due Return</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {libraryLoans.map(loan => (
                        <tr key={loan.id}>
                          <td style={{ fontWeight: 600 }}>{loan.bookTitle}</td>
                          <td style={{ color: '#64748B' }}>{formatDate(loan.issueDate)}</td>
                          <td style={{ color: '#DC2626', fontWeight: 600 }}>{formatDate(loan.dueDate)}</td>
                          <td>
                            <Badge status={loan.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How to pay (no online gateway yet) */}
      {payingInvoice && (
        <PaymentInstructionsModal
          invoice={payingInvoice}
          schoolName="School"
          policy={feeService.getFeePolicy()}
          onClose={() => setPayingInvoice(null)}
        />
      )}
    </div>
  );
};
