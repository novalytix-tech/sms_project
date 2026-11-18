// ==========================================
// Institution Service (Super Admin) - Dynamic Multi-School Management
// Developed by NTS Novalytix
// ==========================================

import { Institution } from '../types';
import { SchoolServiceConfiguration, ServiceIdentifier } from '../types/serviceEntitlement';
import { ERPStorage } from './storage';
import { todayISO } from '../utils/date';

export const institutionService = {
  getAll: (): Institution[] => {
    return ERPStorage.get().institutions || [];
  },

  getById: (id: string): Institution | undefined => {
    return ERPStorage.get().institutions.find(inst => inst.id === id || inst.code === id);
  },

  create: (data: Omit<Institution, 'id' | 'createdAt'>): { success: boolean; data?: Institution; error?: string } => {
    const store = ERPStorage.get();

    const exists = store.institutions.some(i => i.code.toLowerCase() === data.code.toLowerCase().trim());
    if (exists) {
      return { success: false, error: `Institution code "${data.code}" already exists.` };
    }

    const newInst: Institution = {
      ...data,
      id: `inst-${Date.now()}`,
      createdAt: todayISO(),
      status: data.status || 'active',
      studentCount: Number(data.studentCount) || 0,
      teacherCount: Number(data.teacherCount) || 0,
    };

    store.institutions = [newInst, ...store.institutions];

    // Automatically provision full service entitlements for the newly created institution
    const now = new Date().toISOString();
    const newConfig: SchoolServiceConfiguration = {
      schoolId: newInst.id,
      schoolName: newInst.name,
      package: 'erp_marketing',
      accountStatus: newInst.status === 'active' ? 'active' : 'inactive',
      assignedMarketingManager: 'Unassigned',
      createdAt: now.split('T')[0],
      updatedAt: now.split('T')[0],
      entitlements: {
        core_erp: { serviceId: 'core_erp', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        digital_marketing: { serviceId: 'digital_marketing', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        admissions: { serviceId: 'admissions', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        attendance: { serviceId: 'attendance', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        fees: { serviceId: 'fees', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        examinations: { serviceId: 'examinations', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        assignments: { serviceId: 'assignments', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        transport: { serviceId: 'transport', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        staff_groups: { serviceId: 'staff_groups', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        reports: { serviceId: 'reports', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        question_papers: { serviceId: 'question_papers', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        library: { serviceId: 'library', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        timetable: { serviceId: 'timetable', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
        calendar: { serviceId: 'calendar', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
      },
    };

    store.schoolServiceConfigs = [newConfig, ...(store.schoolServiceConfigs || [])];

    ERPStorage.set(store);
    return { success: true, data: newInst };
  },

  update: (id: string, updates: Partial<Institution>): Institution | undefined => {
    const store = ERPStorage.get();
    const index = store.institutions.findIndex(i => i.id === id);
    if (index === -1) return undefined;

    const updated = { ...store.institutions[index], ...updates };
    store.institutions[index] = updated;

    // Sync service configuration
    if (store.schoolServiceConfigs) {
      const cfg = store.schoolServiceConfigs.find(
        c => c.schoolId === id || c.schoolId === updated.code || (id === 'inst-1' && c.schoolId === 'inst-1')
      );
      if (cfg) {
        if (updates.name) cfg.schoolName = updates.name;
        if (updates.status) cfg.accountStatus = updates.status === 'active' ? 'active' : 'inactive';
        cfg.updatedAt = new Date().toISOString();
      }
    }

    ERPStorage.set(store);
    return updated;
  },

  toggleStatus: (id: string): Institution | undefined => {
    const store = ERPStorage.get();
    const inst = store.institutions.find(i => i.id === id);
    if (!inst) return undefined;

    const newStatus: 'active' | 'inactive' = inst.status === 'active' ? 'inactive' : 'active';
    inst.status = newStatus;

    // Synchronize school service configurations & entitlements
    if (store.schoolServiceConfigs) {
      const cfg = store.schoolServiceConfigs.find(
        c => c.schoolId === id || c.schoolId === inst.code || (id === 'inst-1' && c.schoolId === 'inst-1')
      );
      if (cfg) {
        cfg.accountStatus = newStatus === 'active' ? 'active' : 'inactive';
        cfg.updatedAt = new Date().toISOString();
        Object.keys(cfg.entitlements).forEach(k => {
          const key = k as ServiceIdentifier;
          if (cfg.entitlements[key]) {
            cfg.entitlements[key].status = newStatus === 'active' ? 'active' : 'suspended';
          }
        });
      }
    }

    ERPStorage.set(store);
    return inst;
  },
};

