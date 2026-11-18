// ==========================================
// School Settings & Profile Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { SchoolSettings } from '../types';
import { ERPStorage } from './storage';

export const settingsService = {
  get: (): SchoolSettings => {
    return ERPStorage.get().settings;
  },

  update: (updates: Partial<SchoolSettings>): SchoolSettings => {
    const store = ERPStorage.get();
    store.settings = {
      ...store.settings,
      ...updates,
    };
    ERPStorage.set(store);
    return store.settings;
  },
};

