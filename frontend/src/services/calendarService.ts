// ==========================================
// School Calendar & Events Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { SchoolEvent } from '../types';
import { ERPStorage } from './storage';

export const calendarService = {
  getAll: (): SchoolEvent[] => {
    return ERPStorage.get().events;
  },

  create: (data: Omit<SchoolEvent, 'id'>): SchoolEvent => {
    const store = ERPStorage.get();
    const newEvent: SchoolEvent = {
      ...data,
      id: `ev-${Date.now()}`,
    };
    store.events = [...store.events, newEvent];
    ERPStorage.set(store);
    return newEvent;
  },

  update: (id: string, updates: Partial<SchoolEvent>): SchoolEvent | undefined => {
    const store = ERPStorage.get();
    const index = store.events.findIndex(e => e.id === id);
    if (index === -1) return undefined;

    const updated = { ...store.events[index], ...updates };
    store.events[index] = updated;
    ERPStorage.set(store);
    return updated;
  },

  delete: (id: string): boolean => {
    const store = ERPStorage.get();
    const len = store.events.length;
    store.events = store.events.filter(e => e.id !== id);
    if (store.events.length !== len) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },
};

