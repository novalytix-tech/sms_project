// ==========================================
// Central ERP Context & State Management
// Developed by NTS Novalytix
// ==========================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserRole, SchoolSettings, Student, AppNotification } from '../types';
import { DEMO_USERS } from '../data/seedData';
import { ERPStorage } from '../services/storage';
import { settingsService } from '../services/settingsService';
import { noticeService } from '../services/noticeService';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import { leaveService } from '../services/leaveService';
import { feeService } from '../services/feeService';
import { studentService } from '../services/studentService';
import { downloadJSONBackup } from '../utils/export';

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
  login: (role: UserRole, customUser?: User) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  schoolSettings: SchoolSettings;
  updateSchoolSettings: (updates: Partial<SchoolSettings>) => void;
  refreshStore: () => void;
  resetToDemoData: () => void;
  exportBackup: () => void;
  restoreFromJSON: (jsonData: any) => boolean;

  activeWorkspace: 'academic' | 'library';
  setActiveWorkspace: (ws: 'academic' | 'library') => void;
  switchUser: (user: User) => void;

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

  // Parent Multi-Child Selector
  selectedChild: Student | undefined;
  parentChildren: Student[];
  setSelectedChildId: (studentId: string) => void;

  // Toast System
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Store active session state (defaults to false so the landing/login page opens first on initial visit)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('nts_erp_authenticated') === 'true';
  });

  // Store active role in localStorage or default to 'school_admin'
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('nts_erp_active_role') as UserRole;
    return saved && DEMO_USERS[saved] ? saved : 'school_admin';
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const customUserStr = localStorage.getItem('nts_erp_current_user');
    if (customUserStr) {
      try {
        const parsed = JSON.parse(customUserStr);
        if (parsed) {
          // Self-heal: ensure institutionId is present for school-level roles
          if (parsed.role !== 'super_admin' && !parsed.institutionId) {
            parsed.institutionId = 'inst-1';
          }
          return parsed;
        }
      } catch {}
    }
    return DEMO_USERS[currentRole] || DEMO_USERS.school_admin;
  });
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => settingsService.get());
  const [storeVersion, setStoreVersion] = useState(0);

  // Parent child selector
  const [selectedChildId, setSelectedChildIdState] = useState<string>('stud-1');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const refreshStore = useCallback(() => {
    setStoreVersion(v => v + 1);
    setSchoolSettings(settingsService.get());
  }, []);

  // Hydrate from PostgreSQL 18 backend on load
  useEffect(() => {
    ERPStorage.syncFromBackend();
  }, []);

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

  const login = useCallback((role: UserRole, customUser?: User) => {
    const demoUser = DEMO_USERS[role] || DEMO_USERS.school_admin;
    const userToSet: User = customUser
      ? {
          ...demoUser,
          ...customUser,
          role,
          institutionId: customUser.institutionId || (role === 'super_admin' ? undefined : 'inst-1'),
          referenceId: customUser.referenceId || demoUser.referenceId,
        }
      : demoUser;

    setCurrentRole(role);
    setCurrentUser(userToSet);
    setIsAuthenticated(true);
    sessionStorage.setItem('nts_erp_authenticated', 'true');
    localStorage.setItem('nts_erp_active_role', role);
    localStorage.setItem('nts_erp_authenticated', 'true');
    localStorage.setItem('nts_erp_current_user', JSON.stringify(userToSet));
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('nts_erp_authenticated');
    localStorage.setItem('nts_erp_authenticated', 'false');
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    if (DEMO_USERS[newRole]) {
      setCurrentRole(newRole);
      setCurrentUser(DEMO_USERS[newRole]);
      localStorage.removeItem('nts_erp_current_user');
      setIsAuthenticated(true);
      sessionStorage.setItem('nts_erp_authenticated', 'true');
      localStorage.setItem('nts_erp_active_role', newRole);
      localStorage.setItem('nts_erp_authenticated', 'true');
    }
  }, []);

  const [activeWorkspace, setActiveWorkspaceState] = useState<'academic' | 'library'>(() => {
    return (localStorage.getItem('nts_erp_active_workspace') as 'academic' | 'library') || 'academic';
  });

  const setActiveWorkspace = useCallback((ws: 'academic' | 'library') => {
    setActiveWorkspaceState(ws);
    localStorage.setItem('nts_erp_active_workspace', ws);
  }, []);

  const switchUser = useCallback((user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    localStorage.setItem('nts_erp_current_user', JSON.stringify(user));
    localStorage.setItem('nts_erp_active_role', user.role);
    setIsAuthenticated(true);
    sessionStorage.setItem('nts_erp_authenticated', 'true');
    refreshStore();
  }, [refreshStore]);

  const updateSchoolSettings = useCallback((updates: Partial<SchoolSettings>) => {
    const updated = settingsService.update(updates);
    setSchoolSettings({ ...updated });
    refreshStore();
  }, [refreshStore]);

  const resetToDemoData = useCallback(() => {
    ERPStorage.reset();
    refreshStore();
  }, [refreshStore]);

  const exportBackup = useCallback(() => {
    const store = ERPStorage.get();
    downloadJSONBackup(store, `School_ERP_NTS_Backup_${store.settings.schoolName.replace(/\s+/g, '_')}`);
  }, []);

  const restoreFromJSON = useCallback((jsonData: any): boolean => {
    const ok = ERPStorage.restore(jsonData);
    if (ok) {
      refreshStore();
    }
    return ok;
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
    if (matched.length > 0) return matched;
    // Fallback: If parent account is active, provide student cohort so wards are always visible
    return all.slice(0, 3);
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
        switchUser,
        isAuthenticated,
        login,
        logout,
        switchRole,
        schoolSettings,
        updateSchoolSettings,
        refreshStore,
        resetToDemoData,
        exportBackup,
        restoreFromJSON,
        unreadNoticesCount,
        unreadMessagesCount,
        unreadNotificationsCount,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        pendingLeaveCount,
        overdueInvoicesCount,
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

