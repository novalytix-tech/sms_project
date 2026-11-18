// ==========================================
// Academic Session Management Service
// Developed by NTS Novalytix
// ==========================================

import { AcademicSession, User } from '../types';
import { ERPStorage } from './storage';

export const academicSessionService = {
  /**
   * Retrieves all configured academic sessions
   */
  getAll: (): AcademicSession[] => {
    return ERPStorage.get().academicSessions || [];
  },

  /**
   * Retrieves an academic session by its unique ID
   */
  getById: (id: string): AcademicSession | undefined => {
    return (ERPStorage.get().academicSessions || []).find(s => s.id === id);
  },

  /**
   * Retrieves the currently active academic session
   */
  getCurrentSession: (): AcademicSession => {
    const sessions = academicSessionService.getAll();
    const current = sessions.find(s => s.isCurrent && s.status === 'active') ||
      sessions.find(s => s.isCurrent) ||
      sessions.find(s => s.status === 'active') ||
      sessions[0];

    if (!current) {
      // Fallback default session if store was somehow uninitialized
      return {
        id: 'sess-2026-27',
        name: '2026–2027',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isCurrent: true,
        status: 'active',
      };
    }

    return current;
  },

  /**
   * Creates a new academic session with strict administrator authorization & validation
   */
  create: (
    data: Omit<AcademicSession, 'id'>,
    operator?: User
  ): { success: boolean; data?: AcademicSession; error?: string } => {
    if (operator && !['super_admin', 'school_admin'].includes(operator.role)) {
      return { success: false, error: 'Permission denied: Only School Administrators can manage academic sessions.' };
    }

    const cleanName = data.name.trim();
    if (!cleanName) {
      return { success: false, error: 'Academic session name is required (e.g., 2027–2028).' };
    }

    if (!data.startDate || !data.endDate) {
      return { success: false, error: 'Start date and end date are both required.' };
    }

    if (new Date(data.startDate) >= new Date(data.endDate)) {
      return { success: false, error: 'Invalid session dates: End date must be after start date (start date must precede end date).' };
    }

    const store = ERPStorage.get();
    if (!store.academicSessions) store.academicSessions = [];

    // Check duplicate session name
    const exists = store.academicSessions.some(
      s => s.name.toLowerCase().replace(/[\s–-]/g, '') === cleanName.toLowerCase().replace(/[\s–-]/g, '')
    );
    if (exists) {
      return { success: false, error: `Academic session "${cleanName}" already exists.` };
    }

    const newId = `sess-${cleanName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now().toString().slice(-4)}`;

    // If marked current, unset other current flags
    if (data.isCurrent) {
      store.academicSessions.forEach(s => {
        s.isCurrent = false;
      });
      if (store.settings) {
        store.settings.academicYear = cleanName;
      }
    }

    const newSession: AcademicSession = {
      ...data,
      id: newId,
      name: cleanName,
      status: data.status || 'planned',
      createdAt: new Date().toISOString(),
    };

    store.academicSessions.push(newSession);
    ERPStorage.set(store);

    return { success: true, data: newSession };
  },

  /**
   * Updates an existing academic session
   */
  update: (
    id: string,
    updates: Partial<AcademicSession>,
    operator?: User
  ): { success: boolean; data?: AcademicSession; error?: string } => {
    if (operator && !['super_admin', 'school_admin'].includes(operator.role)) {
      return { success: false, error: 'Permission denied: Only School Administrators can modify academic sessions.' };
    }

    const store = ERPStorage.get();
    if (!store.academicSessions) store.academicSessions = [];

    const index = store.academicSessions.findIndex(s => s.id === id);
    if (index === -1) {
      return { success: false, error: 'Academic session not found.' };
    }

    const existing = store.academicSessions[index];

    if (updates.name) {
      const cleanName = updates.name.trim();
      const duplicate = store.academicSessions.some(
        s => s.id !== id && s.name.toLowerCase().replace(/[\s–-]/g, '') === cleanName.toLowerCase().replace(/[\s–-]/g, '')
      );
      if (duplicate) {
        return { success: false, error: `An academic session named "${cleanName}" already exists.` };
      }
    }

    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return { success: false, error: 'Session start date must precede the end date.' };
      }
    }

    // If making this current
    if (updates.isCurrent) {
      store.academicSessions.forEach(s => {
        if (s.id !== id) s.isCurrent = false;
      });
      if (store.settings) {
        store.settings.academicYear = updates.name || existing.name;
      }
    }

    const updated: AcademicSession = {
      ...existing,
      ...updates,
    };

    store.academicSessions[index] = updated;
    ERPStorage.set(store);

    return { success: true, data: updated };
  },

  /**
   * Sets a session as the active school-wide academic session
   */
  setCurrentSession: (
    id: string,
    operator?: User
  ): { success: boolean; session?: AcademicSession; error?: string } => {
    return academicSessionService.update(id, { isCurrent: true, status: 'active' }, operator);
  },

  /**
   * Closes an academic session
   */
  closeSession: (
    id: string,
    operator?: User
  ): { success: boolean; session?: AcademicSession; error?: string } => {
    return academicSessionService.update(id, { status: 'closed', isCurrent: false }, operator);
  },
};
