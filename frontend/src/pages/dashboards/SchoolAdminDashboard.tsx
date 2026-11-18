// ==========================================
// School Administrator Dashboard (Simplified & Clean)
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { feeService } from '../../services/feeService';
import { attendanceService } from '../../services/attendanceService';
import { calendarService } from '../../services/calendarService';
import { noticeService } from '../../services/noticeService';
import { formatCurrencyINR, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { DashboardWelcomeSection } from '../../components/dashboard/DashboardWelcomeSection';
import { QuickActions, QuickAction } from '../../components/dashboard/QuickActions';
import {
  Users,
  Briefcase,
  CalendarCheck,
  IndianRupee,
  UserPlus,
  Bell,
  Calendar,
  ArrowRight,
  ClipboardList,
  FileText,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { todayISO } from '../../utils/date';

export const SchoolAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { schoolSettings } = useERP();

  // Load essential summary counts
  const students = studentService.getAll();
  const teachers = teacherService.getAll();
  const financial = feeService.getFinancialSummary();
  const events = calendarService.getAll();
  const notices = noticeService.getAll().slice(0, 4);

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const totalTeachers = teachers.length;

  // Today's campus-wide attendance rate from actual records
  const todayDate = todayISO();
  const todayAtt = attendanceService.calculateOverallTodayPercentage(todayDate);

  // Quick-action shortcuts (reference layout)
  const quickActions: QuickAction[] = [
    { label: 'Add Student', icon: UserPlus, to: '/students?action=new' },
    { label: 'New Admission', icon: ClipboardList, to: '/admissions' },
    { label: 'Mark Attendance', icon: CalendarCheck, to: '/attendance' },
    { label: 'Collect Fee', icon: IndianRupee, to: '/fees' },
    { label: 'Create Exam', icon: FileText, to: '/examinations' },
    { label: 'Assign Homework', icon: BookOpen, to: '/assignments' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
  ];

  return (
    <div>
      {/* Notice Ticker & Welcome Banner */}
      <DashboardWelcomeSection
        eyebrow="ADMIN DASHBOARD"
        subtitle="Your campus operations and academic day, in one place."
      />

      {/* Quick Action Shortcuts */}
      <QuickActions actions={quickActions} />

      {/* Four Essential Summary KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => navigate('/students')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Total Students</span>
            <span className="stat-value">{totalStudents}</span>
            <span className="stat-subtext positive">{activeStudents} Active Profiles</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Users size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/teachers')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Teaching Staff</span>
            <span className="stat-value">{totalTeachers}</span>
            <span className="stat-subtext">All faculty active</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <Briefcase size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Today's Attendance</span>
            <span className="stat-value">{todayAtt.isMarked ? `${todayAtt.percentage}%` : '—'}</span>
            <span className={`stat-subtext ${todayAtt.isMarked ? 'positive' : ''}`}>
              {todayAtt.isMarked
                ? `${todayAtt.present} of ${todayAtt.total} marked present`
                : 'Not recorded yet today'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/fees')} style={{ cursor: 'pointer' }}>
          <div className="stat-content">
            <span className="stat-label">Fee Collection</span>
            <span className="stat-value">{formatCurrencyINR(financial.totalCollected)}</span>
            <span className="stat-subtext" style={{ color: '#3B82F6' }}>
              Due: {formatCurrencyINR(financial.totalOutstanding)}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <IndianRupee size={22} />
          </div>
        </div>
      </div>

      {/* Two Essential Sections: Recent Notices & Upcoming Events */}
      <div className="dashboard-two-col">
        {/* Section 1: Recent School Notices & Circulars */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Bell size={17} color="#3B82F6" />
                School Notices & Announcements
              </h2>
              <p className="card-subtitle">Latest campus notices published to staff, parents, and students</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/notices')}>
              <span>All Notices</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {notices.map(n => (
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
                  Published: {formatDate(n.publishedDate)} • Target: {n.targetAudience}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Upcoming Academic Calendar Events */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Calendar size={17} color="#3B82F6" />
                Upcoming Calendar Events
              </h2>
              <p className="card-subtitle">Scheduled examinations, holidays, and school celebrations</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/calendar')}>
              <span>Calendar</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {events.slice(0, 4).map(e => (
              <div
                key={e.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: '10px',
                    background: '#DBEAFE',
                    color: '#3B82F6',
                    fontWeight: 700,
                    fontSize: '11px',
                    textAlign: 'center',
                    minWidth: '55px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  {formatDate(e.startDate).split(' ')[0]} <br />
                  <span style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                    {formatDate(e.startDate).split(' ')[1]}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>{e.title}</span>
                    <Badge status={e.category} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#71717a', marginTop: '2px', lineHeight: 1.4 }}>{e.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
