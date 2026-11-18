// ==========================================
// Personal Reminders Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { PersonalReminder } from '../types';
import { ERPStorage } from './storage';

export const reminderService = {
  getByUser: (userId: string): PersonalReminder[] => {
    return ERPStorage.get().reminders.filter(r => r.userId === userId);
  },

  create: (data: Omit<PersonalReminder, 'id' | 'isCompleted'>): PersonalReminder => {
    const store = ERPStorage.get();
    const newRem: PersonalReminder = {
      ...data,
      id: `rem-${Date.now()}`,
      isCompleted: false,
    };
    store.reminders = [newRem, ...store.reminders];
    ERPStorage.set(store);
    return newRem;
  },

  toggleComplete: (id: string): PersonalReminder | undefined => {
    const store = ERPStorage.get();
    const reminder = store.reminders.find(r => r.id === id);
    if (!reminder) return undefined;

    reminder.isCompleted = !reminder.isCompleted;
    ERPStorage.set(store);
    return reminder;
  },

  delete: (id: string): boolean => {
    const store = ERPStorage.get();
    const len = store.reminders.length;
    store.reminders = store.reminders.filter(r => r.id !== id);
    if (store.reminders.length !== len) {
      ERPStorage.set(store);
      return true;
    }
    return false;
  },
};

