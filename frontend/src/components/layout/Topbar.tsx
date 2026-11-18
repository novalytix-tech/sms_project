// ==========================================
// Topbar Component
// Developed by NTS Novalytix
// Clean, Professional, and Responsive Across All Devices
// Consistent Topbar Navigation for All 6 Roles
// ==========================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { resolveUserAvatar } from '../../utils/avatar';
import { reminderService } from '../../services/reminderService';
import {
  Menu,
  Search,
  Calendar,
  Bell,
  ChevronDown,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  LogOut,
  Settings,
  Sun,
  X,
  Users,
  MessageSquare,
  Award,
  FileText,
  CreditCard,
  GraduationCap,
  CheckCheck,
  Check,
  BookMarked,
} from 'lucide-react';
import { libraryService } from '../../services/libraryService';
import { getTeacherLibraryAssignment } from '../../utils/permissions';
import { todayISO } from '../../utils/date';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  school_admin: 'School Admin',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
  super_admin: 'Super Admin',
  supplier: 'Supplier',
};

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileSidebar }) => {
  const {
    currentUser,
    currentRole,
    schoolSettings,
    unreadNoticesCount,
    unreadMessagesCount,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    selectedChild,
    parentChildren,
    setSelectedChildId,
    activeWorkspace,
    setActiveWorkspace,
    logout,
    addToast,
  } = useERP();

  const navigate = useNavigate();

  const teacherLibraryAssignment = useMemo(() => {
    if (currentRole !== 'teacher') return null;
    return getTeacherLibraryAssignment(currentUser, libraryService.getAllStaffAssignments());
  }, [currentRole, currentUser]);

  // Dropdown states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown container refs for outside-click detection
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const weatherMenuRef = useRef<HTMLDivElement>(null);

  // Reminders State
  const [reminders, setReminders] = useState(() => reminderService.getByUser(currentUser.id));

  // Dynamic Current Date Display beside Academic Year (e.g. "30 Oct 2026")
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.toLocaleDateString('en-US', { month: 'short' });
  const currentYear = today.getFullYear();
  const formattedCurrentDate = `${currentDay} ${currentMonth} ${currentYear}`;
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState(() => todayISO());

  // Weather State (Kanpur default)
  const [weatherData] = useState<{
    temp: number;
    desc: string;
    forecast: Array<{ day: string; max: number; min: number; desc: string }>;
  }>({
    temp: 29,
    desc: 'Clear sky',
    forecast: [
      { day: 'Today', max: 32, min: 21, desc: 'Clear sky' },
      { day: 'Tomorrow', max: 31, min: 20, desc: 'Partly cloudy' },
      { day: 'Thu', max: 30, min: 19, desc: 'Sunny' },
    ],
  });

  useEffect(() => {
    setReminders(reminderService.getByUser(currentUser.id));
  }, [currentUser.id]);

  // Close popovers on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (weatherMenuRef.current && !weatherMenuRef.current.contains(e.target as Node)) {
        setWeatherOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false);
        setNotifDropdownOpen(false);
        setWeatherOpen(false);
        setShowRemindersModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const dueRemindersCount = reminders.filter(r => !r.isCompleted).length;
  const totalAlerts = unreadNotificationsCount;

  const filteredNotifications = notifications.filter(item => {
    if (notifFilter === 'unread') return !item.isRead;
    return true;
  });

  // Global search form handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    if (q.includes('fee') || q.includes('pay') || q.includes('invoice')) {
      navigate('/fees');
    } else if (q.includes('teach') || q.includes('staff')) {
      navigate('/teachers');
    } else if (q.includes('stud') || q.includes('admiss')) {
      navigate('/students');
    } else if (q.includes('exam') || q.includes('mark') || q.includes('grade')) {
      navigate('/examinations');
    } else if (q.includes('att') || q.includes('present')) {
      navigate('/attendance');
    } else if (q.includes('notic') || q.includes('circ')) {
      navigate('/notices');
    } else if (q.includes('time') || q.includes('sched')) {
      navigate('/timetable');
    } else if (q.includes('book') || q.includes('lib')) {
      navigate('/library');
    } else if (q.includes('bus') || q.includes('route') || q.includes('trans')) {
      navigate('/transport');
    } else {
      navigate(`/students?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleToggleReminder = (id: string) => {
    reminderService.toggleComplete(id);
    setReminders(reminderService.getByUser(currentUser.id));
  };

  const handleDeleteReminder = (id: string) => {
    reminderService.delete(id);
    setReminders(reminderService.getByUser(currentUser.id));
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;

    reminderService.create({
      userId: currentUser.id,
      title: newReminderTitle.trim(),
      dueDate: newReminderDate,
      priority: 'medium',
    });
    setNewReminderTitle('');
    setReminders(reminderService.getByUser(currentUser.id));
    addToast('success', 'Reminder Added', 'Personal reminder has been saved');
  };

  return (
    <header className="app-topbar no-print">
      {/* 1. Topbar Left: School Name, Meta, and Local Workspace Pill */}
      <div className="topbar-left">
        <button
          className="mobile-menu-toggle"
          onClick={onOpenMobileSidebar}
          aria-label="Open mobile navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-school-brand">
          <div className="topbar-school-name" title={schoolSettings.schoolName}>
            {schoolSettings.schoolName.toUpperCase()}
          </div>
          <div className="topbar-school-meta">
            <span>{schoolSettings.schoolBoard}</span>
            <span className="meta-sep no-mobile">•</span>
            <span className="no-mobile">Academic year {schoolSettings.academicYear}</span>
            <span className="meta-sep no-mobile">•</span>
            <span className="no-mobile">India</span>
          </div>
        </div>

        <span className="topbar-pill-badge no-mobile">
          Local workspace
        </span>
      </div>

      {/* 2. Topbar Center: Clean Global Search Input */}
      <div className="topbar-center no-mobile">
        <form className="global-search-box" onSubmit={handleSearch}>
          <Search size={15} />
          <input
            type="text"
            className="global-search-input"
            placeholder="Search students, teachers, fees, exams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* 3. Topbar Right: Controls & User Profile Dropdown */}
      <div className="topbar-right">
        {/* Multi-Child Selector for Parent Role */}
        {currentRole === 'parent' && parentChildren.length > 0 && (
          <div className="ward-pill-selector no-mobile">
            <Users size={13} color="#3B82F6" />
            <span className="ward-label">Ward:</span>
            <select
              value={selectedChild?.id || ''}
              onChange={e => setSelectedChildId(e.target.value)}
              className="ward-select"
              title="Select active student ward"
            >
              {parentChildren.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} ({c.className})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dual-Role Teacher Workspace Switcher (Scenario C & B) */}
        {teacherLibraryAssignment && (
          <div
            className="no-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveWorkspace('academic');
                navigate('/');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '16px',
                border: 'none',
                background: activeWorkspace === 'academic' ? '#3B82F6' : 'transparent',
                color: activeWorkspace === 'academic' ? '#ffffff' : '#475569',
                fontSize: '11px',
                fontWeight: activeWorkspace === 'academic' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Classroom Teaching Workspace"
            >
              <GraduationCap size={13} />
              <span>Teaching</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveWorkspace('library');
                navigate('/library');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '16px',
                border: 'none',
                background: activeWorkspace === 'library' ? '#3B82F6' : 'transparent',
                color: activeWorkspace === 'library' ? '#ffffff' : '#475569',
                fontSize: '11px',
                fontWeight: activeWorkspace === 'library' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Library Operations Workspace"
            >
              <BookMarked size={13} />
              <span>{teacherLibraryAssignment.roleTitle}</span>
            </button>
          </div>
        )}

        {/* Today's Date & Academic Session Pill */}
        <div
          className="topbar-badge-pill topbar-date-session-pill no-mobile"
          title={`Today: ${formattedCurrentDate} • Academic Session: ${schoolSettings.academicYear}`}
        >
          <Calendar size={13} />
          <span className="topbar-current-date">{formattedCurrentDate}</span>
          <span className="topbar-date-sep" aria-hidden="true">|</span>
          <span className="topbar-academic-year">{schoolSettings.academicYear}</span>
        </div>

        {/* Campus Weather Widget */}
        <div style={{ position: 'relative' }} ref={weatherMenuRef}>
          <button
            type="button"
            className="topbar-weather-widget no-mobile"
            onClick={() => {
              setWeatherOpen(!weatherOpen);
              setProfileDropdownOpen(false);
              setNotifDropdownOpen(false);
            }}
            title="Campus Weather • Kanpur"
          >
            <Sun size={15} color="#e67e22" />
            <div className="weather-meta">
              <span className="weather-temp">Kanpur • {weatherData.temp}°C</span>
              <span className="weather-desc">{weatherData.desc}</span>
            </div>
            <ChevronDown size={12} color="#71717a" />
          </button>

          {weatherOpen && (
            <div className="topbar-weather-dropdown">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  borderBottom: '1px solid #E2E8F0',
                  paddingBottom: '8px',
                }}
              >
                <strong style={{ fontSize: '13px', color: '#1E293B' }}>Weather • Kanpur Campus</strong>
                <span style={{ fontSize: '10px', color: '#64748B' }}>Live Feed</span>
              </div>
              {weatherData.forecast.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: i < weatherData.forecast.length - 1 ? '1px solid #f2e4e1' : 'none',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{f.day}</span>
                  <span style={{ color: '#64748B' }}>{f.desc}</span>
                  <strong>{f.max}° / {f.min}°</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell Button */}
        <div style={{ position: 'relative' }} ref={notifMenuRef}>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              setNotifDropdownOpen(!notifDropdownOpen);
              setProfileDropdownOpen(false);
              setWeatherOpen(false);
            }}
            title="Notifications & Alerts"
            aria-label="View notifications"
          >
            <Bell size={17} />
            {totalAlerts > 0 && (
              <span className="icon-badge-count">{totalAlerts > 99 ? '99+' : totalAlerts}</span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="topbar-notif-dropdown">
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #E2E8F0',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#19191f' }}>
                    Notifications & Alerts
                  </span>
                  {unreadNotificationsCount > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        background: '#fef2f2',
                        color: '#3B82F6',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        border: '1px solid #fee2e2',
                      }}
                    >
                      {unreadNotificationsCount} new
                    </span>
                  )}
                </div>

                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginBottom: '10px',
                  borderBottom: '1px solid #f5e4e0',
                  paddingBottom: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setNotifFilter('all')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: notifFilter === 'all' ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    background: notifFilter === 'all' ? '#fdf2f2' : 'transparent',
                    color: notifFilter === 'all' ? '#3B82F6' : '#71717a',
                    cursor: 'pointer',
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('unread')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: notifFilter === 'unread' ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    background: notifFilter === 'unread' ? '#fdf2f2' : 'transparent',
                    color: notifFilter === 'unread' ? '#3B82F6' : '#71717a',
                    cursor: 'pointer',
                  }}
                >
                  Unread ({unreadNotificationsCount})
                </button>
              </div>

              {/* Notifications List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {filteredNotifications.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '28px 16px',
                      color: '#71717a',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#f4f4f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px auto',
                      }}
                    >
                      <Bell size={18} color="#a1a1aa" />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#27272a' }}>
                      {notifFilter === 'unread' ? 'No unread alerts' : 'No notifications yet'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>
                      {notifFilter === 'unread'
                        ? 'You are all caught up.'
                        : 'New announcements and messages will appear here.'}
                    </div>
                  </div>
                ) : (
                  filteredNotifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!item.isRead) {
                          markNotificationAsRead(item.id);
                        }
                        setNotifDropdownOpen(false);
                        if (item.actionUrl) {
                          navigate(item.actionUrl);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 11px',
                        borderRadius: '10px',
                        background: item.isRead ? '#ffffff' : '#F6F8FC',
                        border: item.isRead ? '1px solid #f4f4f5' : '1px solid #f5d5cf',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={e =>
                        (e.currentTarget.style.background = item.isRead ? '#ffffff' : '#F6F8FC')
                      }
                    >
                      {/* Category Icon */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background:
                            item.category === 'class_group'
                              ? '#fdf2f2'
                              : item.category === 'staff_group'
                              ? '#eff6ff'
                              : item.category === 'fee'
                              ? '#ecfdf5'
                              : item.category === 'award'
                              ? '#fef9c3'
                              : item.category === 'assignment'
                              ? '#fffbeb'
                              : item.category === 'exam'
                              ? '#f5f3ff'
                              : '#f4f4f5',
                        }}
                      >
                        {item.category === 'class_group' ? (
                          <MessageSquare size={16} color="#3B82F6" />
                        ) : item.category === 'staff_group' ? (
                          <Users size={16} color="#2563eb" />
                        ) : item.category === 'fee' ? (
                          <CreditCard size={16} color="#059669" />
                        ) : item.category === 'award' ? (
                          <Award size={16} color="#ca8a04" />
                        ) : item.category === 'assignment' ? (
                          <FileText size={16} color="#d97706" />
                        ) : item.category === 'exam' ? (
                          <GraduationCap size={16} color="#7c3aed" />
                        ) : (
                          <Bell size={16} color="#3B82F6" />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: '6px',
                            marginBottom: '2px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: item.isRead ? 600 : 700,
                              color: item.isRead ? '#27272a' : '#19191f',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </span>
                          {!item.isRead && (
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#3B82F6',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color: '#52525b',
                            lineHeight: 1.35,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.message}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '4px',
                          }}
                        >
                          <span style={{ fontSize: '10px', color: '#a1a1aa' }}>{item.createdAt}</span>
                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                markNotificationAsRead(item.id);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: 'transparent',
                                border: 'none',
                                color: '#3B82F6',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '1px 4px',
                              }}
                              title="Mark read"
                            >
                              <Check size={11} /> Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Navigation Footer */}
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                }}
              >
                <Link
                  to="/class-groups"
                  onClick={() => setNotifDropdownOpen(false)}
                  style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}
                >
                  Class Groups
                </Link>
                {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && (
                  <Link
                    to="/staff-groups"
                    onClick={() => setNotifDropdownOpen(false)}
                    style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Staff Groups
                  </Link>
                )}
                <Link
                  to="/notices"
                  onClick={() => setNotifDropdownOpen(false)}
                  style={{ color: '#71717a', textDecoration: 'none' }}
                >
                  Notices ({unreadNoticesCount})
                </Link>
                <Link
                  to="/messages"
                  onClick={() => setNotifDropdownOpen(false)}
                  style={{ color: '#71717a', textDecoration: 'none' }}
                >
                  Inbox ({unreadMessagesCount})
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown (Clean, Professional, for All Roles) */}
        <div style={{ position: 'relative' }} ref={profileMenuRef}>
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setNotifDropdownOpen(false);
              setWeatherOpen(false);
            }}
            title="User Profile & Role Menu"
            aria-expanded={profileDropdownOpen}
          >
            <div className="user-avatar">
              <img
                src={resolveUserAvatar(currentRole, currentUser)}
                alt={currentUser.name}
                className="user-avatar-img"
              />
            </div>
            <div className="user-info no-mobile">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role-badge">{ROLE_LABELS[currentRole] || currentRole}</span>
            </div>
            <ChevronDown size={13} color="#71717a" />
          </button>

          {profileDropdownOpen && (
            <div className="topbar-profile-dropdown">
              {/* Profile Header */}
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar">
                  <img
                    src={resolveUserAvatar(currentRole, currentUser)}
                    alt={currentUser.name}
                    className="user-avatar-img"
                  />
                </div>
                <div className="profile-dropdown-details">
                  <div className="profile-dropdown-name">{currentUser.name}</div>
                  <div className="profile-dropdown-email">{currentUser.email}</div>
                  <span className="profile-dropdown-role-tag">
                    {ROLE_LABELS[currentRole] || currentRole}
                  </span>
                </div>
              </div>

              {/* Reminders Modal Action */}
              <button
                type="button"
                className="profile-dropdown-action-btn"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setShowRemindersModal(true);
                }}
              >
                <CheckSquare size={15} color="#3B82F6" />
                <span>My Personal Reminders</span>
                {dueRemindersCount > 0 && (
                  <span className="profile-dropdown-counter">{dueRemindersCount}</span>
                )}
              </button>

              {/* Settings (Admins only) */}
              {['school_admin', 'super_admin'].includes(currentRole) && (
                <Link
                  to="/settings"
                  className="profile-dropdown-action-btn"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <Settings size={15} />
                  <span>{currentRole === 'super_admin' ? 'Platform Settings' : 'School Settings'}</span>
                </Link>
              )}

              <div className="profile-dropdown-divider" />

              {/* Sign Out */}
              <button
                type="button"
                className="profile-dropdown-action-btn danger"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  logout();
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Reminders Modal Dialog */}
      {showRemindersModal && (
        <div className="role-modal-overlay" onClick={() => setShowRemindersModal(false)}>
          <div className="role-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button
              type="button"
              className="role-modal-close"
              onClick={() => setShowRemindersModal(false)}
              title="Close modal"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="role-modal-header" style={{ marginBottom: '16px' }}>
              <div className="role-modal-tile">
                <CheckSquare size={24} color="#3B82F6" />
              </div>
              <div>
                <h2 className="role-modal-title">My Personal Reminders</h2>
                <div className="role-modal-subtitle">
                  Saved for {currentUser.name} ({ROLE_LABELS[currentRole] || currentRole})
                </div>
              </div>
            </div>

            {/* List of active reminders */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reminders.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#71717a', textAlign: 'center', margin: '14px 0' }}>
                  No reminders set yet. Add one below.
                </p>
              ) : (
                reminders.map(rem => (
                  <div
                    key={rem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: rem.isCompleted ? '#f5f5f7' : '#fff7f5',
                      border: '1px solid #E2E8F0',
                      textDecoration: rem.isCompleted ? 'line-through' : 'none',
                      opacity: rem.isCompleted ? 0.6 : 1,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                      onClick={() => handleToggleReminder(rem.id)}
                    >
                      {rem.isCompleted ? <CheckSquare size={16} color="#17623e" /> : <Square size={16} color="#3B82F6" />}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#19191f' }}>{rem.title}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Due: {rem.dueDate}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(rem.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', padding: '4px' }}
                      title="Delete reminder"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form to add a new reminder */}
            <form onSubmit={handleAddReminder} style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="New reminder task..."
                  value={newReminderTitle}
                  onChange={e => setNewReminderTitle(e.target.value)}
                  style={{ flex: '1 1 180px', padding: '7px 10px', fontSize: '12px' }}
                  required
                />
                <input
                  type="date"
                  className="form-input"
                  value={newReminderDate}
                  onChange={e => setNewReminderDate(e.target.value)}
                  style={{ flex: '1 1 120px', padding: '7px 8px', fontSize: '12px' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRemindersModal(false)}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={14} />
                  <span>Add Reminder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
