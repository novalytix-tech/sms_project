// ==========================================
// Student Learning Hub Dashboard (Simplified & Clean)
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { assignmentService } from '../../services/assignmentService';
import { timetableService } from '../../services/timetableService';
import { libraryService } from '../../services/libraryService';
import { formatDate } from '../../utils/formatters';
import { DashboardWelcomeSection } from '../../components/dashboard/DashboardWelcomeSection';
import { QuickActions, QuickAction } from '../../components/dashboard/QuickActions';
import { DayOfWeek } from '../../types';
import { examService } from '../../services/examService';
import { classGroupService } from '../../services/classGroupService';
import { transportService } from '../../services/transportService';
import {
  CalendarCheck,
  Award,
  FileText,
  Clock,
  BookMarked,
  CheckSquare,
  ArrowRight,
  MessageSquare,
  Bus,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, schoolSettings } = useERP();

  // Load student profile dynamically for logged-in user
  const student =
    (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
    studentService.getAll().find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
    studentService.getAll()[0];

  // Attendance metrics
  const attStats = student
    ? attendanceService.calculateStudentPercentage(student.id)
    : { percentage: 100, present: 0, late: 0, excused: 0, absent: 0, total: 0, isMarked: false };

  // Timetable dynamically filtered by current day of week (Mon-Sat school week)
  const SCHOOL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = new Date().getDay(); // 0 is Sunday
  const isSunday = dayIndex === 0;
  const todayDayName: DayOfWeek = isSunday ? 'Monday' : SCHOOL_DAYS[dayIndex - 1];
  const timetable = student ? timetableService.getByClass(student.classId, student.section) : [];
  const todaySchedule = isSunday ? [] : timetable.filter(p => p.day === todayDayName);

  // Homework
  const assignments = student ? assignmentService.getByClass(student.classId, student.section).slice(0, 4) : [];

  // Class Group & Messages
  const myClassGroups = student ? classGroupService.getGroupsForUser(currentUser) : [];
  const primaryClassGroup = myClassGroups[0] || null;
  const classMessages = primaryClassGroup
    ? classGroupService.getMessages(primaryClassGroup.id, currentUser).slice(0, 3)
    : [];

  // Library Loans
  const libraryLoans = student ? libraryService.getLoansForStudent(student.id) : [];
  const activeLoans = libraryLoans.filter(l => l.status === 'borrowed');

  // Examination Grades calculated from actual recorded marks
  const studentMarks = student ? examService.getMarksForStudent(student.id) : [];
  const allExams = examService.getAll();
  let totalMarksObtained = 0;
  let totalMaxMarks = 0;
  studentMarks.forEach(m => {
    if (!m.isAbsent) {
      totalMarksObtained += m.marksObtained;
    }
    const exam = allExams.find(e => e.id === m.examId);
    const schedule = exam?.schedules.find(s => s.id === m.scheduleId);
    totalMaxMarks += schedule?.maxMarks || 80;
  });
  const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;
  const gradeLetter =
    studentMarks.length === 0
      ? '—'
      : overallPercentage >= 90
      ? 'A1'
      : overallPercentage >= 80
      ? 'A2'
      : overallPercentage >= 70
      ? 'B1'
      : overallPercentage >= 60
      ? 'B2'
      : overallPercentage >= 50
      ? 'C1'
      : overallPercentage >= 40
      ? 'D'
      : 'E';

  // Transport Commute (Opted students only)
  const hasOptedTransport = student ? transportService.hasStudentOpted(student) : false;

  const quickActions: QuickAction[] = [
    { label: 'Homework', icon: FileText, to: '/assignments' },
    { label: 'My Attendance', icon: CalendarCheck, to: '/attendance' },
    { label: 'Exams & Results', icon: Award, to: '/examinations' },
    { label: 'Timetable', icon: Clock, to: '/timetable' },
    { label: 'Library', icon: BookMarked, to: '/library' },
    { label: 'Apply Leave', icon: CheckSquare, to: '/leave' },
    ...(hasOptedTransport ? [{ label: 'My Bus', icon: Bus, to: '/transport' }] : []),
  ];

  return (
    <div>
      {/* Notice Ticker & Welcome Banner */}
      <DashboardWelcomeSection
        eyebrow="STUDENT DASHBOARD"
        subtitle="Your class timetable, homework tasks, and grades."
        student={student}
      />

      {/* Quick Action Shortcuts */}
      <QuickActions actions={quickActions} />

      {/* Four Essential Summary KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Academic Attendance</span>
            <span className="stat-value">{attStats.isMarked ? `${attStats.percentage}%` : '—'}</span>
            <span className={`stat-subtext ${attStats.isMarked ? 'positive' : ''}`}>
              {attStats.isMarked ? `${attStats.present} of ${attStats.total} Sessions Marked` : 'No sessions marked yet'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/examinations')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Academic Grade</span>
            <span className="stat-value">{gradeLetter}</span>
            <span className={`stat-subtext ${studentMarks.length > 0 ? 'positive' : ''}`}>
              {studentMarks.length > 0
                ? `Cumulative: ${totalMarksObtained} / ${totalMaxMarks} (${overallPercentage}%)`
                : 'No exam marks recorded yet'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Award size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/assignments')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Active Homework</span>
            <span className="stat-value">{assignments.length}</span>
            <span className="stat-subtext">Tasks currently assigned</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <FileText size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/library')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Library Books</span>
            <span className="stat-value">{activeLoans.length}</span>
            <span className="stat-subtext">
              {activeLoans.length > 0 ? activeLoans[0].bookTitle : 'No active loans'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <BookMarked size={22} />
          </div>
        </div>
      </div>

      {/* Two Essential Sections: Today's Schedule & Homework Submissions */}
      <div className="dashboard-two-col">
        {/* Section 1: Today's Schedule */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Clock size={17} color="#3B82F6" />
                Today's Class Schedule ({todayDayName})
              </h2>
              <p className="card-subtitle">
                Class {student ? `${student.className} (${student.section})` : ''} lecture periods
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/timetable')}>
              <span>Timetable</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {todaySchedule.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                No periods scheduled for {todayDayName}.
              </div>
            ) : (
              todaySchedule.map(period => (
              <div
                key={period.id}
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      padding: '5px 10px',
                      background: '#DBEAFE',
                      color: '#3B82F6',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '11px',
                      textAlign: 'center',
                      minWidth: '55px',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    P-{period.periodNo}
                    <div style={{ fontSize: '10px', fontWeight: 500 }}>{period.startTime}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>
                      {period.subject}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>
                      Teacher: {period.teacherName} • {period.roomNo}
                    </div>
                  </div>
                </div>

                <span className="badge badge-neutral">Classroom</span>
              </div>
            ))
            )}
          </div>
        </div>

        {/* Section 2: Homework & Assignment Submissions */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <FileText size={17} color="#3B82F6" />
                Assigned Homework & Deadlines
              </h2>
              <p className="card-subtitle">Active subject tasks, deadlines, and grades</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/assignments')}>
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {assignments.map(asg => {
              const mySub = asg.submissions.find(s => s.studentId === student.id);
              return (
                <div
                  key={asg.id}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>{asg.title}</div>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>
                      Subject: {asg.subject} • Due {formatDate(asg.dueDate)}
                    </div>
                  </div>

                  <div>
                    {mySub ? (
                      <span className="badge badge-success">
                        Graded ({mySub.score}/{asg.maxScore})
                      </span>
                    ) : (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate('/assignments')}
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Class Group Messages Section */}
      {primaryClassGroup && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <MessageSquare size={17} color="#3B82F6" />
                Class Announcements ({primaryClassGroup.name})
              </h2>
              <p className="card-subtitle">
                Official notices posted by Class Teacher {primaryClassGroup.classTeacherName}
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/class-groups')}>
              <span>Open Class Group</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {classMessages.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                No announcements posted yet.
              </div>
            ) : (
              classMessages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: '#DBEAFE',
                        color: '#3B82F6',
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>
                        {msg.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                        {msg.senderName} • {msg.timestamp}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: msg.priority === 'urgent' ? '#fee2e2' : '#f1f5f9',
                        color: msg.priority === 'urgent' ? '#991b1b' : '#475569',
                      }}
                    >
                      {msg.category.replace('_', ' ')}
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('/class-groups')}
                    >
                      Read Notice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
