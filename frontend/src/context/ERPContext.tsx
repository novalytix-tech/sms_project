// ==========================================
// Central ERP Context & State Management
// Developed by NTS Novalytix
// ==========================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { User, UserRole, SchoolSettings, Student, AppNotification } from '../types';
import { LEGACY_REFERENCE_IDS } from '../data/legacyReferenceIds';
import { httpClient } from '../services/api/httpClient';
import { ERPStorage } from '../services/storage';
import { settingsService } from '../services/settingsService';
import { noticeService } from '../services/noticeService';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import { leaveService } from '../services/leaveService';
import { feeService } from '../services/feeService';
import { attendanceService } from '../services/attendanceService';
import { examService } from '../services/examService';
import { staffAttendanceService } from '../services/staffAttendanceService';
import { studentService } from '../services/studentService';
import { todayISO, daysAgoISO } from '../utils/date';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ERPContextType {
  currentUser: User;
  currentRole: UserRole;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  logout: () => void;
  schoolSettings: SchoolSettings;
  updateSchoolSettings: (updates: Partial<SchoolSettings>) => void;
  refreshStore: () => void;

  activeWorkspace: 'academic' | 'library';
  setActiveWorkspace: (ws: 'academic' | 'library') => void;

  // Counts & indicators
  unreadNoticesCount: number;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  pendingLeaveCount: number;
  overdueInvoicesCount: number;

  // Students verified by the backend for this parent/student account
  linkedStudents: Student[];

  // Parent Multi-Child Selector
  selectedChild: Student | undefined;
  parentChildren: Student[];
  setSelectedChildId: (studentId: string) => void;

  // Toast System
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

type AuthStatus = 'loading' | 'signed_out' | 'ready' | 'error';

interface BackendProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  roles: UserRole[];
  institution_id: string | null;
  references?: {
    student_id?: string;
    admission_number?: string;
    linked_children?: { student_id: string; admission_number: string; first_name: string; last_name: string }[];
  };
}

/** Students this account may see, as verified by the backend (parent's children or the student). */
function linkedStudentsOf(p: BackendProfile | null): Student[] {
  if (!p) return [];
  const refs = p.references || {};
  if (p.roles.includes('parent')) {
    return (refs.linked_children || []).map(c => ({
      id: c.student_id,
      firstName: c.first_name,
      lastName: c.last_name,
      fullName: `${c.first_name} ${c.last_name}`.trim(),
      admissionNo: c.admission_number,
    }) as Student);
  }
  if (p.roles.includes('student') && refs.student_id) {
    const [firstName, ...rest] = p.full_name.split(' ');
    return [{ id: refs.student_id, firstName, lastName: rest.join(' '), fullName: p.full_name, admissionNo: refs.admission_number || '' } as Student];
  }
  return [];
}

const ROLE_PRIORITY: UserRole[] = ['super_admin', 'school_admin', 'teacher', 'parent', 'student', 'supplier'];

const SIGNED_OUT_USER: User = { id: '', name: '', email: '', role: 'student' };

function toUser(p: BackendProfile): User {
  const role = ROLE_PRIORITY.find(r => p.roles.includes(r)) || 'student';
  return {
    id: p.id,
    name: p.full_name,
    email: p.email,
    role,
    phone: p.phone || undefined,
    photoUrl: p.avatar_url || undefined,
    avatar: p.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    // Modules that still run on the browser-side demo store use the local school id.
    institutionId: role === 'super_admin' ? undefined : 'inst-1',
    referenceId: LEGACY_REFERENCE_IDS[role],
  };
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Every API call asks Clerk for a fresh short-lived session token.
  useEffect(() => {
    httpClient.setTokenGetter(() => getToken());
  }, [getToken]);

  // Load the school profile (roles, institution) for the signed-in Clerk user.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setProfile(null);
      setAuthError(null);
      return;
    }
    let cancelled = false;
    httpClient.get<BackendProfile>('/auth/me').then(res => {
      if (cancelled) return;
      if (res.success && res.data) {
        setProfile(res.data);
        setAuthError(null);
      } else {
        setProfile(null);
        setAuthError(res.error?.message || 'Could not load your school account.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const authStatus: AuthStatus = !isLoaded
    ? 'loading'
    : !isSignedIn
      ? 'signed_out'
      : profile
        ? 'ready'
        : authError
          ? 'error'
          : 'loading';
  const isAuthenticated = authStatus === 'ready';
  const currentUser = useMemo(() => (profile ? toUser(profile) : SIGNED_OUT_USER), [profile]);
  const currentRole = currentUser.role;
  const linkedStudents = useMemo(() => linkedStudentsOf(profile), [profile]);

  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => settingsService.get());
  const [storeVersion, setStoreVersion] = useState(0);

  // Parent child selector
  const [selectedChildId, setSelectedChildIdState] = useState<string>('stud-1');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const refreshStore = useCallback(() => {
    setStoreVersion(v => v + 1);
    setSchoolSettings(settingsService.get());
  }, []);

  // Fees come from the backend finance API for admins, parents and students.
  useEffect(() => {
    if (isAuthenticated && ['super_admin', 'school_admin', 'parent', 'student'].includes(currentRole)) {
      feeService.load();
    }
    if (!isAuthenticated) feeService.reset();
  }, [isAuthenticated, currentRole]);

  // Attendance from the backend: staff get today's classes (server limits teachers to their own),
  // parents/students get their own history; teachers also get their own staff attendance.
  useEffect(() => {
    if (!isAuthenticated) {
      attendanceService.reset();
      staffAttendanceService.reset();
      examService.reset();
      return;
    }
    if (['super_admin', 'school_admin', 'teacher', 'parent', 'student'].includes(currentRole)) {
      examService.load();
    }
    const today = todayISO();
    if (['super_admin', 'school_admin', 'teacher'].includes(currentRole)) {
      attendanceService.load({ date: today });
      const from = daysAgoISO(90);
      staffAttendanceService.load(currentRole === 'teacher' ? { from } : { date: today });
    } else if (['parent', 'student'].includes(currentRole)) {
      attendanceService.load();
    }
  }, [isAuthenticated, currentRole]);

  // Hydrate shared records from the backend for staff accounts.
  useEffect(() => {
    if (isAuthenticated && ['super_admin', 'school_admin', 'teacher'].includes(currentRole)) {
      ERPStorage.syncFromBackend();
    }
  }, [isAuthenticated, currentRole]);

  // Listen to cross-service or custom storage updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      refreshStore();
    };
    window.addEventListener('nts_erp_storage_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('nts_erp_storage_updated', handleStorageUpdate);
    };
  }, [refreshStore]);

  const logout = useCallback(() => {
    setProfile(null);
    signOut({ redirectUrl: '/login' });
  }, [signOut]);

  useEffect(() => {
    const onExpired = () => {
      if (isSignedIn) setAuthError('Your session has expired. Please sign in again.');
    };
    window.addEventListener('nts_erp_auth_expired', onExpired);
    return () => window.removeEventListener('nts_erp_auth_expired', onExpired);
  }, [isSignedIn]);

  const [activeWorkspace, setActiveWorkspaceState] = useState<'academic' | 'library'>(() => {
    return (localStorage.getItem('nts_erp_active_workspace') as 'academic' | 'library') || 'academic';
  });

  const setActiveWorkspace = useCallback((ws: 'academic' | 'library') => {
    setActiveWorkspaceState(ws);
    localStorage.setItem('nts_erp_active_workspace', ws);
  }, []);

  const updateSchoolSettings = useCallback((updates: Partial<SchoolSettings>) => {
    const updated = settingsService.update(updates);
    setSchoolSettings({ ...updated });
    refreshStore();
  }, [refreshStore]);

  // Derived indicator counts
  const allNotices = noticeService.getAll();
  const unreadNoticesCount = allNotices.filter(n => !n.isRead).length;

  const userMessages = messageService.getForUser(currentUser.id, currentRole);
  const unreadMessagesCount = userMessages.filter(m => !m.isRead && m.recipientId === currentUser.id).length;

  // Centralized Notifications for Current User
  const notifications = useMemo(() => {
    return notificationService.getForUser(currentUser.id, currentRole);
  }, [currentUser.id, currentRole, storeVersion]);

  const unreadNotificationsCount = useMemo(() => {
    return notificationService.getUnreadCount(currentUser.id, currentRole);
  }, [currentUser.id, currentRole, storeVersion]);

  const markNotificationAsRead = useCallback(
    (id: string) => {
      notificationService.markAsRead(id, currentUser.id);
      refreshStore();
    },
    [currentUser.id, refreshStore]
  );

  const markAllNotificationsAsRead = useCallback(() => {
    notificationService.markAllAsRead(currentUser.id, currentRole);
    refreshStore();
  }, [currentUser.id, currentRole, refreshStore]);

  const deleteNotification = useCallback(
    (id: string) => {
      notificationService.deleteNotification(id, currentUser.id);
      refreshStore();
    },
    [currentUser.id, refreshStore]
  );

  const allLeaves = leaveService.getAll();
  const pendingLeaveCount = allLeaves.filter(l => l.status === 'pending').length;

  const allInvoices = feeService.getAllInvoices();
  const overdueInvoicesCount = allInvoices.filter(i => i.status === 'overdue').length;

  // Children for parent, dynamically linked by explicit, validated parent-child relationship ID or email
  const parentChildren = useMemo(() => {
    if (currentRole !== 'parent') return [];
    const all = studentService.getAll();
    const matched = all.filter(s =>
      (currentUser.referenceId && s.parentId === currentUser.referenceId) ||
      (currentUser.id && s.parentId === currentUser.id) ||
      (currentUser.email && s.parentEmail && s.parentEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
    return matched;
  }, [currentRole, currentUser.referenceId, currentUser.id, currentUser.email, storeVersion]);

  // Selected child validated strictly against parent's authorized linked children
  const selectedChild = useMemo(() => {
    return parentChildren.find((c: Student) => c.id === selectedChildId) || parentChildren[0] || undefined;
  }, [parentChildren, selectedChildId]);

  const setSelectedChildId = useCallback((id: string) => {
    // Security check: Only permit switching if the student ID belongs to the authenticated parent's linked children
    if (parentChildren.some((c: Student) => c.id === id)) {
      setSelectedChildIdState(id);
    }
  }, [parentChildren]);

  // Toast Helpers
  const addToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ERPContext.Provider
      value={{
        currentUser,
        currentRole,
        activeWorkspace,
        setActiveWorkspace,
        isAuthenticated,
        authStatus,
        authError,
        logout,
        schoolSettings,
        updateSchoolSettings,
        refreshStore,
        unreadNoticesCount,
        unreadMessagesCount,
        unreadNotificationsCount,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        pendingLeaveCount,
        overdueInvoicesCount,
        linkedStudents,
        selectedChild,
        parentChildren,
        setSelectedChildId,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = (): ERPContextType => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};

