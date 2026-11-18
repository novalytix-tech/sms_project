// ==========================================
// Teacher Academic Workspace Dashboard
// Developed by NTS Novalytix
// ==========================================

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { teacherService } from '../../services/teacherService';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { assignmentService } from '../../services/assignmentService';
import { timetableService } from '../../services/timetableService';
import { noticeService } from '../../services/noticeService';
import { staffAttendanceService } from '../../services/staffAttendanceService';
import { leaveService } from '../../services/leaveService';
import { examService } from '../../services/examService';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { DashboardWelcomeSection } from '../../components/dashboard/DashboardWelcomeSection';
import { QuickActions, QuickAction } from '../../components/dashboard/QuickActions';
import { DayOfWeek } from '../../types';
import {
  BookOpen,
  CalendarCheck,
  FileText,
  Clock,
  Plus,
  Award,
  Bell,
  ArrowRight,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  UserCheck,
  CheckSquare,
  Users,
} from 'lucide-react';
import { todayISO } from '../../utils/date';

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, schoolSettings } = useERP();

  // Load teacher record dynamically corresponding to logged-in user
  // Strictly resolve via referenceId or verified email. No fallback to getAll()[0]!
  const teacher = useMemo(() => {
    if (currentUser.referenceId) {
      const byId = teacherService.getById(currentUser.referenceId);
      if (byId) return byId;
    }
    if (currentUser.id) {
      const byId = teacherService.getById(currentUser.id);
      if (byId) return byId;
    }
    if (currentUser.email) {
      const byEmail = teacherService.getAll().find(
        t => t.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (byEmail) return byEmail;
    }
    return null;
  }, [currentUser]);

  // If teacher identity cannot be resolved, render a clear empty state rather than leaking another teacher's profile
  if (!teacher) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <EmptyState
          icon={<GraduationCap size={32} />}
          title="Teacher Profile Not Found"
          description="No faculty record is linked to your current authenticated account. Please contact the school administrator to link your staff profile."
        />
      </div>
    );
  }

  const assignedClasses = teacher.assignedClasses || [];

  // Determine Class Teacher designations dynamically
  const allClasses = classService.getAll();
  const classTeacherOf = allClasses.filter(c => c.classTeacherId === teacher.id);
  // Dynamic date and academic year
  const todayDate = todayISO();
  const academicYear = schoolSettings?.academicYear || '2025-2026';

  // Dynamic day of week and today's periods (Mon-Sat school week)
  const SCHOOL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = new Date().getDay(); // 0 is Sunday
  const isSunday = dayIndex === 0;
  const todayDayName: DayOfWeek = isSunday ? 'Monday' : SCHOOL_DAYS[dayIndex - 1];
  const allPeriods = timetableService.getByTeacher(teacher.id);
  const todayPeriods = isSunday ? [] : allPeriods.filter(p => p.day === todayDayName);

  // Dynamic assigned class roster stats & Roll call status across ALL assigned classes
  const assignedClassStats = assignedClasses.map(c => {
    const enrolledStudents = studentService.getByClassAndSection(c.classId, c.section);
    const todayRecords = attendanceService.getByClassAndDate(c.classId, c.section, todayDate);
    const isMarked = todayRecords.length > 0;
    return {
      ...c,
      enrolledCount: enrolledStudents.length,
      isMarked,
      markedCount: todayRecords.length,
      presentCount: todayRecords.filter(r => r.status === 'present' || r.status === 'late').length,
    };
  });

  const totalEnrolledStudents = assignedClassStats.reduce((sum, c) => sum + c.enrolledCount, 0);
  const completedRollCalls = assignedClassStats.filter(c => c.isMarked).length;
  const allRollCallsDone = assignedClasses.length > 0 && completedRollCalls === assignedClasses.length;

  // Assignments created by this teacher
  const myAssignments = assignmentService.getByTeacherId(teacher.id);
  const pendingSubmissionsCount = myAssignments.reduce(
    (acc, a) => acc + (a.submissions || []).filter(s => s.status === 'submitted').length,
    0
  );

  // Teacher's own staff attendance & check-in status for today
  const myTodayStaffAtt = staffAttendanceService.getByDate(todayDate).find(r => r.teacherId === teacher.id);
  const myIndividualStats = staffAttendanceService.calculateIndividualStats(teacher.id);

  // Teacher's own leave balance & pending requests
  const myLeaves = leaveService.getByApplicantId(teacher.id);
  const myPendingLeaves = myLeaves.filter(l => l.status === 'pending');

  // Upcoming exams for teacher's assigned classes
  const allExams = examService.getAll();
  const upcomingExams = allExams
    .filter(e => assignedClasses.length === 0 || assignedClasses.some(ac => ac.classId === e.classId && (!ac.section || !e.section || ac.section === e.section)))
    .slice(0, 3);

  // Staff Notices targeted to teachers or all
  const recentNotices = noticeService.getByAudience('teacher').slice(0, 4);

  const quickActions: QuickAction[] = [
    { label: 'My Classes', icon: Users, to: '/classes' },
    { label: 'Mark Attendance', icon: CalendarCheck, to: '/attendance' },
    { label: 'Assign Homework', icon: Plus, to: '/assignments?action=new' },
    { label: 'Enter Marks', icon: Award, to: '/examinations?tab=marks_entry' },
    { label: 'Timetable', icon: Clock, to: '/timetable' },
    { label: 'Question Papers', icon: FileText, to: '/question-papers' },
  ];

  return (
    <div>
      {/* Notice Ticker & Welcome Banner */}
      <DashboardWelcomeSection
        eyebrow="TEACHER ACADEMIC WORKSPACE"
        subtitle={`Session ${academicYear} • Today is ${formatDate(todayDate)}`}
        teacher={teacher}
      />

      {/* Quick Action Shortcuts */}
      <QuickActions actions={quickActions} />

      {/* Four Summary KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => navigate('/classes')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Assigned Classes</span>
            <span className="stat-value">{assignedClasses.length}</span>
            <span className="stat-subtext">
              {assignedClasses.length > 0
                ? `${totalEnrolledStudents} total students enrolled`
                : 'No classes assigned'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <BookOpen size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/timetable')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Today's Lectures</span>
            <span className="stat-value">{todayPeriods.length}</span>
            <span className={`stat-subtext ${todayPeriods.length > 0 ? 'positive' : ''}`}>
              {todayPeriods.length > 0
                ? `Next: ${todayPeriods[0].subject} (${todayPeriods[0].className})`
                : `No periods scheduled for ${todayDayName}`}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Today's Roll Call</span>
            <span className="stat-value" style={{ color: allRollCallsDone ? '#17623e' : '#3B82F6' }}>
              {assignedClasses.length === 0
                ? 'N/A'
                : allRollCallsDone
                ? 'Completed'
                : `${completedRollCalls}/${assignedClasses.length}`}
            </span>
            <span className={`stat-subtext ${allRollCallsDone ? 'positive' : ''}`}>
              {assignedClasses.length === 0
                ? 'No classes to mark'
                : allRollCallsDone
                ? 'All assigned classes marked'
                : `${assignedClasses.length - completedRollCalls} class roll call pending`}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/assignments')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Pending Reviews</span>
            <span className="stat-value" style={{ color: pendingSubmissionsCount > 0 ? '#3B82F6' : '#17623e' }}>
              {pendingSubmissionsCount}
            </span>
            <span className="stat-subtext">
              {pendingSubmissionsCount > 0
                ? 'Submissions awaiting grading'
                : 'All submissions reviewed'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* Faculty Self-Service Banner */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #BFDBFE',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#DBEAFE',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>
              Faculty Self-Service & Check-In
            </div>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Today's Status:{' '}
              {myTodayStaffAtt ? (
                <strong style={{ color: myTodayStaffAtt.status === 'present' ? '#17623e' : '#3B82F6' }}>
                  {myTodayStaffAtt.status.toUpperCase()}
                  {myTodayStaffAtt.checkInTime ? ` (Checked in at ${myTodayStaffAtt.checkInTime})` : ''}
                </strong>
              ) : (
                <span style={{ color: '#2563EB' }}>Present (Auto-Roster)</span>
              )}
              {' • '}
              Annual Attendance Rate: <strong>{myIndividualStats.rate}%</strong>
              {myPendingLeaves.length > 0 && (
                <span style={{ color: '#b45309', marginLeft: '6px' }}>
                  • {myPendingLeaves.length} leave application pending review
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/attendance?category=staff')}>
            <UserCheck size={14} />
            <span>My Attendance</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leave')}>
            <CheckSquare size={14} />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Two-Column Grid: Assigned Classes & Today's Schedule */}
      <div className="dashboard-two-col" style={{ marginBottom: '24px' }}>
        {/* Section 1: Assigned Classes & Roll Call Status */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <BookOpen size={17} color="#3B82F6" />
                Assigned Teaching Classes
              </h2>
              <p className="card-subtitle">Enrolled students and daily roll call progress</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/attendance')}>
              <span>Roll Call</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {assignedClassStats.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                No teaching classes are currently assigned to your profile.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {assignedClassStats.map(c => (
                  <div
                    key={`${c.classId}-${c.section}`}
                    style={{
                      padding: '12px 18px',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>
                        {c.className} — Section {c.section}
                      </div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>
                        Subject: <strong>{c.subject}</strong> • {c.enrolledCount} Students Enrolled
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {c.isMarked ? (
                        <span
                          className="badge"
                          style={{
                            background: '#e6f4ea',
                            color: '#137333',
                            border: '1px solid #ceead6',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle size={11} />
                          <span>Marked ({c.presentCount}/{c.enrolledCount})</span>
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <AlertCircle size={11} />
                          <span>Pending</span>
                        </span>
                      )}

                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => navigate(`/attendance`)}
                      >
                        {c.isMarked ? 'View Roster' : 'Take Roll Call'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Today's Period Schedule */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Clock size={17} color="#3B82F6" />
                Today's Schedule ({todayDayName})
              </h2>
              <p className="card-subtitle">Scheduled lecture hours, subjects & assigned classrooms</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/timetable')}>
              <span>Full Week</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {todayPeriods.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                No periods or lectures scheduled for {todayDayName}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {todayPeriods.map(p => (
                  <div
                    key={p.id}
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
                          border: '1px solid #BFDBFE',
                          minWidth: '55px',
                        }}
                      >
                        P-{p.periodNo}
                        <div style={{ fontSize: '10px', fontWeight: 500 }}>{p.startTime}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>
                          {p.subject}
                        </div>
                        <div style={{ fontSize: '11px', color: '#71717a' }}>
                          {p.className} ({p.section}) • {p.roomNo}
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('/attendance')}
                    >
                      Attendance
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Upcoming Exams & Announcements */}
      <div className="dashboard-two-col">
        {/* Section 3: Upcoming Assigned Examinations */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Award size={17} color="#3B82F6" />
                Upcoming Examinations
              </h2>
              <p className="card-subtitle">Exams scheduled for your assigned teaching classes</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/examinations?tab=marks_entry')}>
              <span>Marks Entry</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {upcomingExams.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                No active or upcoming examinations for your assigned classes.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {upcomingExams.map(ex => (
                  <div
                    key={ex.id}
                    style={{
                      padding: '12px 18px',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>
                        {ex.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>
                        {ex.className} ({ex.section}) • Starts {formatDate(ex.startDate)}
                      </div>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('/examinations?tab=marks_entry')}
                    >
                      Enter Marks
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Staff Announcements */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Bell size={17} color="#3B82F6" />
                Staff Announcements & Circulars
              </h2>
              <p className="card-subtitle">Official communication from administrative office</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/notices')}>
              <span>All Notices</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {recentNotices.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                No staff circulars or announcements at this time.
              </div>
            ) : (
              recentNotices.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>{n.title}</span>
                    <Badge status={n.priority} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0', lineHeight: 1.45 }}>{n.content}</p>
                  <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 500 }}>
                    Published: {formatDate(n.publishedDate)} • {n.authorName}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
