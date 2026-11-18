// ==========================================
// Parent Portal Dashboard (Simplified & Clean)
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { attendanceService } from '../../services/attendanceService';
import { assignmentService } from '../../services/assignmentService';
import { feeService } from '../../services/feeService';
import { transportService } from '../../services/transportService';
import { examService } from '../../services/examService';
import { noticeService } from '../../services/noticeService';
import { formatCurrencyINR, formatDate } from '../../utils/formatters';
import { DashboardWelcomeSection } from '../../components/dashboard/DashboardWelcomeSection';
import { QuickActions, QuickAction } from '../../components/dashboard/QuickActions';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { Users, CalendarCheck, Award, IndianRupee, FileText, Bus, MessageSquare, CheckSquare, ArrowRight, Bell } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedChild, parentChildren, setSelectedChildId, schoolSettings } = useERP();

  // If no child is linked to the parent account, show a clear empty state rather than another student's record
  if (!selectedChild) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <EmptyState
          icon={<Users size={32} />}
          title="No Student Wards Linked"
          description="There are currently no active student profiles associated with your parent account credentials. Please contact the admissions office."
        />
      </div>
    );
  }

  // Attendance metrics for selected child
  const attStats = attendanceService.calculateStudentPercentage(selectedChild.id);

  // Examination evaluation for selected child
  const childMarks = examService.getMarksForStudent(selectedChild.id);
  const allExams = examService.getAll();
  let totalMarksObtained = 0;
  let totalMaxMarks = 0;
  childMarks.forEach(m => {
    if (!m.isAbsent) totalMarksObtained += m.marksObtained;
    const exam = allExams.find(e => e.id === m.examId);
    const schedule = exam?.schedules.find(s => s.id === m.scheduleId);
    totalMaxMarks += schedule?.maxMarks || 80;
  });
  const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;
  const gradeLetter =
    childMarks.length === 0
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

  // Assignments for selected child's class
  const assignments = assignmentService.getByClass(selectedChild.classId, selectedChild.section).slice(0, 4);
  const homeworkSubjects = Array.from(new Set(assignments.map(a => a.subject))).join(', ');

  // Fee summary across this parent's linked children (server-scoped data)
  const feeSummary = feeService.getMySummary();
  const nextDue = feeSummary.upcomingDue;

  // Transport details
  const busRoute = transportService.getAllRoutes().find(r => r.id === selectedChild.transportRouteId);

  // School announcements targeted to parents or all
  const parentNotices = noticeService.getByAudience('parent').slice(0, 3);

  const quickActions: QuickAction[] = [
    { label: 'Fees & Payments', icon: IndianRupee, to: '/fees' },
    { label: 'Attendance', icon: CalendarCheck, to: '/attendance' },
    { label: 'Exams & Results', icon: Award, to: '/examinations' },
    { label: 'Homework', icon: FileText, to: '/assignments' },
    { label: 'Message Teacher', icon: MessageSquare, to: '/messages' },
    { label: 'Apply Leave', icon: CheckSquare, to: '/leave' },
  ];

  return (
    <div>
      {/* Notice Ticker & Welcome Banner */}
      <DashboardWelcomeSection
        eyebrow="PARENT DASHBOARD"
        subtitle={`Academic Session ${schoolSettings?.academicYear || '2025-2026'} • Monitoring ${selectedChild.fullName}`}
        student={selectedChild}
        actions={
          parentChildren.length > 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>Ward:</span>
              {parentChildren.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`btn ${selectedChild.id === child.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ padding: '5px 12px' }}
                >
                  <Users size={13} />
                  <span>{child.firstName}</span>
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {/* Quick Action Shortcuts */}
      <QuickActions actions={quickActions} />

      {/* Four Summary KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Attendance Record</span>
            <span className="stat-value">{attStats.isMarked ? `${attStats.percentage}%` : '—'}</span>
            <span className={`stat-subtext ${attStats.isMarked ? 'positive' : ''}`}>
              {attStats.isMarked
                ? `${attStats.present} of ${attStats.total} Sessions Present`
                : 'No attendance marked yet'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/fees')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Fee Balance Due</span>
            <span className="stat-value" style={{ color: feeSummary.outstandingBalance > 0 ? '#DC2626' : '#17623e' }}>
              {formatCurrencyINR(feeSummary.outstandingBalance)}
            </span>
            <span className="stat-subtext">
              {nextDue
                ? `Next Due: ${formatDate(nextDue.dueDate)} (${formatCurrencyINR(nextDue.amount)})`
                : 'All scheduled installments cleared'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <IndianRupee size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/examinations')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Term Examination</span>
            <span className="stat-value">{gradeLetter}</span>
            <span className={`stat-subtext ${childMarks.length > 0 ? 'positive' : ''}`}>
              {childMarks.length > 0
                ? `Academic Average: ${overallPercentage}% (${totalMarksObtained}/${totalMaxMarks})`
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
            <span className="stat-subtext">
              {assignments.length > 0 ? homeworkSubjects : 'No active homework'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* Essential Sections: Homework Tasks & Transport Details (Transport shown only if opted) */}
      <div style={{ display: 'grid', gridTemplateColumns: busRoute ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Section 1: Assigned Homework */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <FileText size={17} color="#3B82F6" />
                Active Class Homework
              </h2>
              <p className="card-subtitle">Upcoming homework tasks assigned to {selectedChild.firstName}</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/assignments')}>
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {assignments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                No active homework assignments for Class {selectedChild.className}.
              </div>
            ) : (
              assignments.map(asg => {
                const mySub = asg.submissions.find(s => s.studentId === selectedChild.id);
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
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 2: School Bus Route & Commute Details (Visible only if opted) */}
        {busRoute && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Bus size={17} color="#3B82F6" />
                  Transport & Commute Information
                </h2>
                <p className="card-subtitle">Daily commute timings and driver contact details</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/transport')}>
                <span>Routes</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                  <span style={{ color: '#71717a' }}>Bus Route:</span>
                  <strong style={{ color: '#19191f' }}>{busRoute.routeNumber} ({busRoute.routeName})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                  <span style={{ color: '#71717a' }}>Vehicle Number:</span>
                  <strong style={{ color: '#19191f' }}>{busRoute.vehicleNo} ({busRoute.vehicleType})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                  <span style={{ color: '#71717a' }}>Designated Stop:</span>
                  <strong style={{ color: '#3B82F6' }}>{selectedChild.busStop || 'Main Gate'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#71717a' }}>Driver Contact:</span>
                  <span style={{ fontWeight: 600, color: '#19191f' }}>{busRoute.driverName} ({busRoute.driverPhone})</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parent Announcements Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Bell size={17} color="#3B82F6" />
              Parent Announcements & Circulars
            </h2>
            <p className="card-subtitle">Official school notices and academic calendar reminders</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/notices')}>
            <span>All Circulars</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="card-body" style={{ padding: '0' }}>
          {parentNotices.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
              No current announcements for parents.
            </div>
          ) : (
            parentNotices.map(n => (
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
  );
};
