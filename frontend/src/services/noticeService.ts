// ==========================================
// Notices & Announcements Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { Notice } from '../types';
import { ERPStorage } from './storage';
import { todayISO } from '../utils/date';

export const noticeService = {
  getAll: (): Notice[] => {
    return ERPStorage.get().notices;
  },

  getByAudience: (role: string): Notice[] => {
    return ERPStorage.get().notices.filter(
      n => n.targetAudience === 'all' || n.targetAudience === role || (role === 'teacher' && n.targetAudience === 'teachers')
    );
  },

  create: (data: Omit<Notice, 'id'>): Notice => {
    const store = ERPStorage.get();
    const newNotice: Notice = {
      ...data,
      id: `not-${Date.now()}`,
      publishedDate: data.publishedDate || todayISO(),
      isRead: false,
    };
    store.notices = [newNotice, ...store.notices];
    ERPStorage.set(store);
    return newNotice;
  },

  delete: (id: string): boolean => {
    const store = ERPStorage.get();
    const len = store.notices.length;
    store.notices = store.notices.filter(n => n.id !== id);
    if (store.notices.length !== len) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },

  markAsRead: (id: string): void => {
    const store = ERPStorage.get();
    const notice = store.notices.find(n => n.id === id);
    if (notice) {
      notice.isRead = true;
      ERPStorage.set(store);
    }
  },
};

