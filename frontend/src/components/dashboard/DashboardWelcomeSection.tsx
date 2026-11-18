// ==========================================
// Reusable Dashboard Welcome Section & Notice Ticker
// Role-Accurate Profile Photo & Header Date Standard
// ==========================================

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { noticeService } from '../../services/noticeService';
import { calendarService } from '../../services/calendarService';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { Student, AdmissionApplication, Teacher } from '../../types';
import { Pause, Play } from 'lucide-react';

export interface DashboardWelcomeSectionProps {
  eyebrow?: string;
  heading?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  student?: Student | null;
  candidate?: AdmissionApplication | null;
  teacher?: Teacher | null;
  profilePhoto?: string;
  profileName?: string;
  profileSubtitle?: string;
  badgeLabel?: string;
}

export const DashboardWelcomeSection: React.FC<DashboardWelcomeSectionProps> = ({
  eyebrow,
  heading,
  subtitle,
  actions,
  student,
  candidate,
  teacher,
  profilePhoto,
  profileName,
  profileSubtitle,
  badgeLabel,
}) => {
  const { currentUser, currentRole, schoolSettings, selectedChild } = useERP();
  const [isPaused, setIsPaused] = useState(false);

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'User';

  // Notices and Calendar events for ticker marquee
  const notices = noticeService.getAll().slice(0, 3);
  const events = calendarService.getAll().slice(0, 2);

  const tickerItems =
    currentRole === 'super_admin'
      ? [
          'Platform Status: All partner school networks operational',
          'Platform SLA Uptime: 99.98% Healthy',
          'Enterprise multi-tenant audit logging active',
          'Service entitlements synchronization verified',
        ]
      : [
          'No holiday scheduled today',
          `Welcome back, ${currentUser?.name || 'User'}`,
          'Plan your day with the school calendar',
          ...notices.map(n => n.title),
          ...events.map(e => `${e.title} (${e.startDate})`),
        ];

  const defaultRoleEyebrow =
    currentRole === 'super_admin'
      ? 'SUPER ADMIN DASHBOARD'
      : currentRole === 'school_admin'
      ? 'ADMIN DASHBOARD'
      : currentRole === 'supplier'
      ? 'SUPPLIER PORTAL'
      : `${currentRole.toUpperCase()} DASHBOARD`;

  const defaultSubtitle =
    currentRole === 'parent'
      ? "Your children's school day, in one place."
      : currentRole === 'teacher'
      ? 'Your classes, roll calls, and assignments for today.'
      : currentRole === 'student'
      ? 'Your class timetable, homework tasks, and grades.'
      : currentRole === 'super_admin'
      ? 'Multi-school network operations and enterprise metrics.'
      : currentRole === 'supplier'
      ? 'Institutional purchase orders and consignment deliveries.'
      : 'Your campus operations and academic day, in one place.';

  // Resolve Profile Photo, Name, Badge, and Subtitle strictly based on Role and Context
  let resolvedPhoto = profilePhoto || currentUser.photoUrl || '';
  let resolvedName = profileName || '';
  let resolvedMeta = profileSubtitle || '';
  let resolvedBadge = badgeLabel || '';

  // 1. Explicit Student passed (e.g. Student Dashboard or Parent Ward View)
  if (student) {
    resolvedName = resolvedName || student.fullName;
    resolvedMeta =
      resolvedMeta ||
      `Class ${student.className || ''}${student.section ? ` (${student.section})` : ''} • Roll #${student.rollNo || student.admissionNo}`;
    resolvedPhoto = resolvedPhoto || studentService.getStudentPhoto(student);
    resolvedBadge = resolvedBadge || 'Enrolled Student';
  }
  // 2. Explicit Candidate passed (e.g. Admissions applicant review)
  else if (candidate) {
    resolvedName = resolvedName || `${candidate.firstName} ${candidate.lastName}`;
    resolvedMeta = resolvedMeta || `Target: ${candidate.targetClassName} • App #${candidate.applicationNo}`;
    resolvedPhoto =
      resolvedPhoto ||
      candidate.photoUrl ||
      (candidate.gender === 'Female' ? '/student-female.svg' : '/student-male.svg');
    resolvedBadge = resolvedBadge || 'Candidate Profile';
  }
  // 3. Explicit Teacher passed
  else if (teacher) {
    resolvedName = resolvedName || teacher.fullName;
    resolvedMeta = resolvedMeta || `${teacher.designation || 'Faculty'} • Staff #${teacher.staffId}`;
    resolvedPhoto = resolvedPhoto || teacherService.getTeacherPhoto(teacher);
    resolvedBadge = resolvedBadge || 'Faculty Profile';
  }
  // 4. Role: STUDENT
  else if (currentRole === 'student') {
    const studentUser =
      (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
      studentService.getAll().find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
      studentService.getAll()[0];

    if (studentUser) {
      resolvedName = resolvedName || studentUser.fullName;
      resolvedMeta =
        resolvedMeta ||
        `Class ${studentUser.className || ''}${studentUser.section ? ` (${studentUser.section})` : ''} • Roll #${studentUser.rollNo || studentUser.admissionNo}`;
      resolvedPhoto = resolvedPhoto || studentService.getStudentPhoto(studentUser);
      resolvedBadge = resolvedBadge || 'Enrolled Student';
    }
  }
  // 5. Role: PARENT (Shows active Ward profile if available, else Parent profile)
  else if (currentRole === 'parent') {
    if (selectedChild) {
      resolvedName = resolvedName || selectedChild.fullName;
      resolvedMeta =
        resolvedMeta ||
        `Class ${selectedChild.className || ''}${selectedChild.section ? ` (${selectedChild.section})` : ''} • Roll #${selectedChild.rollNo || selectedChild.admissionNo}`;
      resolvedPhoto = resolvedPhoto || studentService.getStudentPhoto(selectedChild);
      resolvedBadge = resolvedBadge || 'Student Ward';
    } else {
      resolvedName = resolvedName || currentUser.name;
      resolvedMeta = resolvedMeta || 'Guardian Profile';
      resolvedPhoto = resolvedPhoto || '/parent-profile.svg';
      resolvedBadge = resolvedBadge || 'Parent Account';
    }
  }
  // 6. Role: TEACHER (Shows logged-in Teacher's own profile, NOT a student)
  else if (currentRole === 'teacher') {
    const teacherUser =
      (currentUser.referenceId ? teacherService.getById(currentUser.referenceId) : null) ||
      teacherService.getAll().find(
        t => t.email.toLowerCase() === currentUser.email.toLowerCase() ||
             t.fullName.toLowerCase() === currentUser.name.toLowerCase()
      ) ||
      teacherService.getAll()[0];

    if (teacherUser) {
      resolvedName = resolvedName || teacherUser.fullName;
      resolvedMeta = resolvedMeta || `${teacherUser.designation || 'Faculty'} • Staff #${teacherUser.staffId}`;
      resolvedPhoto = resolvedPhoto || teacherService.getTeacherPhoto(teacherUser);
      resolvedBadge = resolvedBadge || 'Faculty Profile';
    } else {
      resolvedName = resolvedName || currentUser.name;
      resolvedMeta = resolvedMeta || 'Teaching Faculty';
      resolvedPhoto = resolvedPhoto || '/teacher-female.svg';
      resolvedBadge = resolvedBadge || 'Faculty Profile';
    }
  }
  // 7. Role: SCHOOL ADMIN / PRINCIPAL
  else if (currentRole === 'school_admin') {
    resolvedName = resolvedName || currentUser.name;
    resolvedMeta = resolvedMeta || `Head of School • ${schoolSettings.schoolName}`;
    resolvedPhoto = resolvedPhoto || '/admin-profile.svg';
    resolvedBadge = resolvedBadge || 'Principal & Admin';
  }
  // 8. Role: SUPER ADMIN
  else if (currentRole === 'super_admin') {
    resolvedName = resolvedName || currentUser.name;
    resolvedMeta = resolvedMeta || 'Platform Director • Multi-School Network';
    resolvedPhoto = resolvedPhoto || '/super-admin-profile.svg';
    resolvedBadge = resolvedBadge || 'Super Administrator';
  }
  // 9. Role: SUPPLIER / VENDOR
  else if (currentRole === 'supplier') {
    resolvedName = resolvedName || currentUser.name;
    resolvedMeta = resolvedMeta || 'Logistics & Procurement Partner';
    resolvedPhoto = resolvedPhoto || '/supplier-profile.svg';
    resolvedBadge = resolvedBadge || 'Authorized Vendor';
  }

  // Safe fallback if anything remains unresolved
  if (!resolvedPhoto) {
    resolvedPhoto = '/default-student-avatar.svg';
    resolvedName = resolvedName || currentUser.name || 'User Profile';
    resolvedMeta = resolvedMeta || 'Verified Account';
    resolvedBadge = resolvedBadge || 'Active User';
  }

  return (
    <div className="dashboard-welcome-container">
      {/* 1. Scrolling Notice / Event Ticker Bar */}
      <div className={`opening-school-notice dashboard-ticker ${isPaused ? 'paused' : ''}`}>
        <div className="ticker-label">TODAY</div>
        <div className="ticker-window">
          <div className="ticker-track">
            {tickerItems.map((item, idx) => (
              <span key={`item-1-${idx}`}>{item}</span>
            ))}
            {tickerItems.map((item, idx) => (
              <span key={`item-2-${idx}`}>{item}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? 'Play notice ticker' : 'Pause notice ticker'}
          title={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
        </button>
      </div>

      {/* 2. Rich Crimson Gradient Welcome Card with Role-Accurate Profile Photo */}
      <div className="welcome-panel">
        <div className="welcome-info">
          <span className="eyebrow">{eyebrow || defaultRoleEyebrow}</span>
          <h1>{heading || `Welcome back, ${firstName}.`}</h1>
          <p>{subtitle || defaultSubtitle}</p>
          <small>
            {schoolSettings.schoolName} • Session {schoolSettings.academicYear}
          </small>
        </div>

        {/* Role-Specific Profile Photo & Identity Box */}
        <div className="welcome-profile-card" aria-label={`${resolvedBadge}: ${resolvedName}`}>
          <div className="welcome-photo-wrapper" title={`${resolvedBadge}: ${resolvedName}`}>
            <img
              src={resolvedPhoto}
              alt={resolvedName}
              className="welcome-profile-photo"
              onError={(e) => {
                const fallback =
                  currentRole === 'teacher'
                    ? '/teacher-female.svg'
                    : currentRole === 'school_admin'
                    ? '/admin-profile.svg'
                    : currentRole === 'super_admin'
                    ? '/super-admin-profile.svg'
                    : currentRole === 'supplier'
                    ? '/supplier-profile.svg'
                    : currentRole === 'parent'
                    ? '/parent-profile.svg'
                    : '/student-male.svg';
                (e.target as HTMLImageElement).src = fallback;
              }}
            />
            <span className="welcome-photo-glow" aria-hidden="true" />
          </div>

          <div className="welcome-photo-meta-box">
            <span className="welcome-photo-badge">{resolvedBadge}</span>
            <strong className="welcome-photo-name" title={resolvedName}>
              {resolvedName}
            </strong>
            <span className="welcome-photo-subtext" title={resolvedMeta}>
              {resolvedMeta}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Optional Actions Row (e.g. Quick Actions / Ward Selector) */}
      {actions && (
        <div
          className="dashboard-welcome-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
};
