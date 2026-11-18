// ==========================================
// School Service Entitlements & Subscription Engine
// Developed by NTS Novalytix
// Centralized Super Admin Entitlement & Service Guard
// ==========================================

import { ERPStorage } from './storage';
import { User } from '../types';
import { ServiceIdentifier, ServicePackageTemplate, ServiceDefinition, SchoolServiceEntitlement, SchoolServiceConfiguration, ServiceEntitlementAuditLog } from '../types/serviceEntitlement';

export const SERVICE_DEFINITIONS: Record<ServiceIdentifier, ServiceDefinition> = {
  core_erp: {
    id: 'core_erp',
    name: 'Core School ERP',
    category: 'core',
    description: 'Core school workspace, dashboard, student and teacher master registers.',
    isCore: true,
    defaultInERP: true,
    associatedRoutes: ['/'],
    consequentialImpact:
      'Suspending Core ERP blocks standard academic workflows, student/teacher directory access, and role workspaces.',
  },
  digital_marketing: {
    id: 'digital_marketing',
    name: 'Digital Marketing Management',
    category: 'marketing',
    description: 'Ad campaign management, Meta & Google ads tracking, lead capture funnel, and analytics.',
    isCore: false,
    defaultInERP: false,
    associatedRoutes: ['/digital-marketing'],
    consequentialImpact:
      'Disabling Digital Marketing revokes access to the marketing workspace, inquiry pipeline, and campaign analytics. (Note: Does not pause live ads on Google/Meta automatically; use the checklist).',
  },
  admissions: {
    id: 'admissions',
    name: 'Admissions & Enrollment',
    category: 'academic',
    description: 'Inquiry tracking, document verification, sibling discounts, and student enrollment.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/admissions'],
    consequentialImpact: 'Disabling Admissions stops inquiry handling and online student registration.',
  },
  attendance: {
    id: 'attendance',
    name: 'Daily Attendance Roster',
    category: 'operations',
    description: 'Daily student period attendance, staff biometric/manual check-in, and leave audits.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/attendance'],
    consequentialImpact: 'Disabling Attendance blocks teacher daily roll-call and staff attendance tracking.',
  },
  fees: {
    id: 'fees',
    name: 'Fees & Invoicing',
    category: 'finance',
    description: 'Fee structures, student billing, online gateway processing, and receipt generation.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/fees'],
    consequentialImpact: 'Disabling Fees prevents fee collection, online payments, and financial ledger updates.',
  },
  examinations: {
    id: 'examinations',
    name: 'Examinations & Gradebook',
    category: 'academic',
    description: 'Exam scheduling, marks entry, CBSE 9-point grading engine, and report card generation.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/examinations'],
    consequentialImpact: 'Disabling Examinations prevents marks entry and generation of student report cards.',
  },
  assignments: {
    id: 'assignments',
    name: 'Homework & Tasks',
    category: 'academic',
    description: 'Teacher homework distribution, file attachments, and student digital submissions.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/assignments'],
    consequentialImpact: 'Disabling Homework halts homework publishing and student submission tracking.',
  },
  transport: {
    id: 'transport',
    name: 'School Bus & GPS Tracking',
    category: 'operations',
    description: 'Interactive fleet map, live GPS telemetry, stop ETAs, parent alerts, and safety check-ins.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/transport'],
    consequentialImpact: 'Disabling Transport turns off map tracking, stop ETAs, and parent commute updates.',
  },
  question_papers: {
    id: 'question_papers',
    name: 'Confidential Question Papers',
    category: 'academic',
    description: 'In-app question authoring, PDF/image submissions, and Principal review/approval.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/question-papers', '/question-paper-review'],
    consequentialImpact: 'Disabling Question Papers blocks exam paper authoring and Principal review workflows.',
  },
  staff_groups: {
    id: 'staff_groups',
    name: 'Staff Groups & Messaging',
    category: 'admin',
    description: 'Department communication channels, staff group messaging, and circular distribution.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/staff-groups'],
    consequentialImpact: 'Disabling Staff Groups stops internal staff message channels and department threads.',
  },
  reports: {
    id: 'reports',
    name: 'Analytics & Exports',
    category: 'admin',
    description: 'School demographic reports, attendance summaries, academic performance charts, and Excel exports.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/reports'],
    consequentialImpact: 'Disabling Reports suspends executive analytics and bulk report exports.',
  },
  library: {
    id: 'library',
    name: 'Library Management',
    category: 'operations',
    description: 'Book cataloging, barcode tracking, student checkouts, and overdue fines.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/library'],
    consequentialImpact: 'Disabling Library shuts down book issue/return tracking and digital catalog access.',
  },
  timetable: {
    id: 'timetable',
    name: 'Class Timetables',
    category: 'academic',
    description: 'Uniform daily period timetable, teacher scheduling, and room allocations.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/timetable'],
    consequentialImpact: 'Disabling Timetable hides schedule grids from teachers, students, and parents.',
  },
  calendar: {
    id: 'calendar',
    name: 'School Calendar & Events',
    category: 'operations',
    description: 'Academic year events, examination schedules, school holidays, and annual sports days.',
    isCore: false,
    defaultInERP: true,
    associatedRoutes: ['/calendar'],
    consequentialImpact: 'Disabling Calendar removes school-wide event and holiday visibility.',
  },
};

export const PACKAGE_TEMPLATES: Record<
  ServicePackageTemplate,
  { name: string; description: string; defaultServices: Record<ServiceIdentifier, boolean> }
> = {
  erp_only: {
    name: 'ERP Only',
    description: 'Full Core School ERP with academic and operations modules. Digital Marketing disabled.',
    defaultServices: {
      core_erp: true,
      digital_marketing: false,
      admissions: true,
      attendance: true,
      fees: true,
      examinations: true,
      assignments: true,
      transport: true,
      staff_groups: true,
      reports: true,
      question_papers: true,
      library: true,
      timetable: true,
      calendar: true,
    },
  },
  marketing_only: {
    name: 'Digital Marketing Only',
    description: 'Digital Marketing workspace and lead funnel. Full ERP disabled with minimal school identity.',
    defaultServices: {
      core_erp: false,
      digital_marketing: true,
      admissions: false,
      attendance: false,
      fees: false,
      examinations: false,
      assignments: false,
      transport: false,
      staff_groups: false,
      reports: false,
      question_papers: false,
      library: false,
      timetable: false,
      calendar: true, // minimal calendar for school term dates
    },
  },
  erp_marketing: {
    name: 'ERP + Digital Marketing',
    description: 'Comprehensive dual solution: Core ERP modules plus active Digital Marketing suite.',
    defaultServices: {
      core_erp: true,
      digital_marketing: true,
      admissions: true,
      attendance: true,
      fees: true,
      examinations: true,
      assignments: true,
      transport: true,
      staff_groups: true,
      reports: true,
      question_papers: true,
      library: true,
      timetable: true,
      calendar: true,
    },
  },
  custom: {
    name: 'Custom Package',
    description: 'Customized entitlement selection tailored to the school agreement.',
    defaultServices: {
      core_erp: true,
      digital_marketing: false,
      admissions: true,
      attendance: true,
      fees: true,
      examinations: true,
      assignments: true,
      transport: false,
      staff_groups: true,
      reports: false,
      question_papers: false,
      library: false,
      timetable: true,
      calendar: true,
    },
  },
};

export const serviceEntitlementService = {
  /**
   * Retrieves all school service configurations from persistent storage.
   * Auto-synchronizes with dynamic institutions created by Super Admin.
   */
  getAllConfigs(): SchoolServiceConfiguration[] {
    const store = ERPStorage.get();
    let configs = store.schoolServiceConfigs ? [...store.schoolServiceConfigs] : [];
    const institutions = store.institutions || [];

    let modified = false;
    institutions.forEach((inst) => {
      let cfg = configs.find((c) => c.schoolId === inst.id || c.schoolId === inst.code);
      if (!cfg) {
        const now = new Date().toISOString();
        cfg = {
          schoolId: inst.id,
          schoolName: inst.name,
          package: 'erp_marketing',
          accountStatus: inst.status === 'active' ? 'active' : 'inactive',
          assignedMarketingManager: 'Unassigned',
          createdAt: now.split('T')[0],
          updatedAt: now.split('T')[0],
          entitlements: {
            core_erp: { serviceId: 'core_erp', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            digital_marketing: { serviceId: 'digital_marketing', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            admissions: { serviceId: 'admissions', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            attendance: { serviceId: 'attendance', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            fees: { serviceId: 'fees', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            examinations: { serviceId: 'examinations', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            assignments: { serviceId: 'assignments', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            transport: { serviceId: 'transport', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            staff_groups: { serviceId: 'staff_groups', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            reports: { serviceId: 'reports', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            question_papers: { serviceId: 'question_papers', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            library: { serviceId: 'library', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            timetable: { serviceId: 'timetable', enabled: true, status: inst.status === 'active' ? 'active' : 'suspended', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
            calendar: { serviceId: 'calendar', enabled: true, status: 'active', activationDate: now, lastModifiedBy: 'Super Admin', lastModifiedAt: now },
          },
        };
        configs.push(cfg);
        modified = true;
      } else {
        const expectedAccountStatus = inst.status === 'active' ? 'active' : 'inactive';
        if (cfg.accountStatus !== expectedAccountStatus) {
          cfg.accountStatus = expectedAccountStatus;
          modified = true;
        }
      }
    });

    if (modified) {
      ERPStorage.set({ ...store, schoolServiceConfigs: configs });
    }

    return configs;
  },

  /**
   * Retrieves configuration for a specific school ID.
   */
  getConfigBySchoolId(schoolId: string): SchoolServiceConfiguration | undefined {
    const configs = this.getAllConfigs();
    if (!schoolId) {
      return configs.find((c) => c.schoolId === 'inst-1') || configs[0];
    }
    let config = configs.find((c) => c.schoolId === schoolId);
    if (!config) {
      // Alias fallback for dev/demo institution identifiers
      if (
        schoolId === 'inst-1' ||
        schoolId === 'ef673796-e678-5d31-9609-d7340362466f' ||
        schoolId === 'STXAV-DEL' ||
        schoolId === 'STXAV-BLR' ||
        schoolId === 'DEV-LOCAL' ||
        schoolId === 'UNASSIGNED'
      ) {
        config = configs.find((c) => c.schoolId === 'inst-1') || configs[0];
      }
    }
    return config;
  },

  /**
   * Checks whether a specific service is enabled for a given school.
   * Fail-Closed: Unconfigured or unknown schools are strictly denied access.
   */
  isServiceEnabled(schoolId: string, serviceId: ServiceIdentifier): boolean {
    if (!schoolId) return false;
    const config = this.getConfigBySchoolId(schoolId);
    if (!config) return false; // Strict fail-closed: unconfigured or unknown schools have zero access

    // If school account is suspended or inactive, all services are blocked
    if (config.accountStatus !== 'active') return false;

    // Check specific service entitlement
    const entitlement = config.entitlements[serviceId];
    return entitlement ? entitlement.enabled && entitlement.status === 'active' : false;
  },

  /**
   * Retrieves fine-grained service access state, distinguishing between:
   * - active
   * - service_disabled
   * - subscription_expired
   * - account_suspended
   * - school_not_found
   */
  getServiceAccessState(
    schoolId: string,
    serviceId: ServiceIdentifier
  ): {
    allowed: boolean;
    reason?: 'account_suspended' | 'subscription_expired' | 'service_disabled' | 'school_not_found';
    message: string;
  } {
    if (!schoolId) {
      return { allowed: false, reason: 'school_not_found', message: 'No school identifier specified.' };
    }
    const config = this.getConfigBySchoolId(schoolId);
    if (!config) {
      return {
        allowed: false,
        reason: 'school_not_found',
        message: `School with ID "${schoolId}" was not found or has no active service agreement.`,
      };
    }
    if (config.accountStatus !== 'active') {
      return {
        allowed: false,
        reason: 'account_suspended',
        message: `The account for school "${config.schoolName}" (${schoolId}) is suspended or inactive.`,
      };
    }
    const entitlement = config.entitlements[serviceId];
    if (!entitlement || !entitlement.enabled) {
      const def = SERVICE_DEFINITIONS[serviceId];
      return {
        allowed: false,
        reason: 'service_disabled',
        message: `Service "${def?.name || serviceId}" is disabled for this school under package "${config.package}".`,
      };
    }
    if (entitlement.status !== 'active') {
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: `Subscription for "${SERVICE_DEFINITIONS[serviceId]?.name || serviceId}" has expired or is suspended.`,
      };
    }
    return { allowed: true, message: 'Service entitlement active and verified.' };
  },

  /**
   * Checks whether the Core ERP is enabled for a given school.
   */
  isCoreErpEnabled(schoolId: string): boolean {
    return this.isServiceEnabled(schoolId, 'core_erp');
  },

  /**
   * Checks whether Digital Marketing is enabled for a given school.
   */
  isDigitalMarketingEnabled(schoolId: string): boolean {
    return this.isServiceEnabled(schoolId, 'digital_marketing');
  },

  /**
   * Checks overall school account status.
   * Fail-Closed: Unknown schools return false.
   */
  isSchoolAccountActive(schoolId: string): boolean {
    if (!schoolId) return false;
    const store = ERPStorage.get();

    // 1. Direct model check on the Institution record
    const inst = (store.institutions || []).find(
      (i) => i.id === schoolId || i.code === schoolId || (schoolId === 'inst-1' && i.id === 'inst-1')
    );
    if (inst && inst.status !== 'active') {
      return false;
    }

    // 2. Direct check on the service configuration
    const config = this.getConfigBySchoolId(schoolId);
    if (!config) return false;
    return config.accountStatus === 'active';
  },

  /**
   * Strict entitlement guard. Throws an error if the service is not enabled.
   */
  assertServiceEnabled(schoolId: string, serviceId: ServiceIdentifier): void {
    if (!this.isServiceEnabled(schoolId, serviceId)) {
      const def = SERVICE_DEFINITIONS[serviceId];
      throw new Error(
        `Service Restricted: "${def?.name || serviceId}" is not enabled for your school under the current subscription plan.`
      );
    }
  },

  /**
   * Super Admin action: Toggle a single service on or off for an individual school.
   * Consequential changes are logged in the immutable audit trail.
   */
  toggleService(
    schoolId: string,
    serviceId: ServiceIdentifier,
    enabled: boolean,
    actor: User,
    reason?: string
  ): SchoolServiceConfiguration {
    if (actor.role !== 'super_admin') {
      throw new Error('Unauthorized: Only Super Administrators can modify school service entitlements.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('Mandatory justification note is required to modify school service entitlements.');
    }

    const store = ERPStorage.get();
    const configs = store.schoolServiceConfigs || [];
    const index = configs.findIndex((c) => c.schoolId === schoolId);

    if (index === -1) {
      throw new Error(`School with ID "${schoolId}" not found.`);
    }

    const config = configs[index];
    const prevEntitlement = config.entitlements[serviceId];
    const previousState = prevEntitlement?.enabled ? 'enabled' : 'disabled';
    const newState = enabled ? 'enabled' : 'disabled';

    const now = new Date().toISOString();
    const updatedEntitlement: SchoolServiceEntitlement = {
      serviceId,
      enabled,
      status: enabled ? 'active' : 'suspended',
      activationDate: prevEntitlement?.activationDate || now,
      lastModifiedBy: actor.name,
      lastModifiedAt: now,
      reason: reason || undefined,
    };

    const updatedConfig: SchoolServiceConfiguration = {
      ...config,
      package: 'custom', // Toggling an individual service converts to a custom package
      entitlements: {
        ...config.entitlements,
        [serviceId]: updatedEntitlement,
      },
      updatedAt: now,
    };

    configs[index] = updatedConfig;

    // Record audit event
    const auditLogs = store.serviceEntitlementAuditLogs || [];
    const auditEntry: ServiceEntitlementAuditLog = {
      id: `audit-ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: config.schoolId,
      schoolName: config.schoolName,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: enabled ? 'enable_service' : 'disable_service',
      serviceId,
      previousValue: previousState,
      newValue: newState,
      reason: reason?.trim() || undefined,
      timestamp: now,
    };

    ERPStorage.set({
      ...store,
      schoolServiceConfigs: configs,
      serviceEntitlementAuditLogs: [auditEntry, ...auditLogs],
    });

    return updatedConfig;
  },

  /**
   * Previews consequential changes before applying a package template.
   */
  previewPackageChange(
    schoolId: string,
    template: ServicePackageTemplate
  ): {
    enabledServices: ServiceIdentifier[];
    disabledServices: ServiceIdentifier[];
    unchangedServices: ServiceIdentifier[];
  } {
    const config = this.getConfigBySchoolId(schoolId);
    if (!config) {
      throw new Error(`School with ID "${schoolId}" not found.`);
    }

    const templateDefaults = PACKAGE_TEMPLATES[template].defaultServices;
    const enabledServices: ServiceIdentifier[] = [];
    const disabledServices: ServiceIdentifier[] = [];
    const unchangedServices: ServiceIdentifier[] = [];

    (Object.keys(templateDefaults) as ServiceIdentifier[]).forEach((sId) => {
      const willEnable = templateDefaults[sId];
      const currentlyEnabled = config.entitlements[sId]?.enabled ?? false;

      if (willEnable && !currentlyEnabled) {
        enabledServices.push(sId);
      } else if (!willEnable && currentlyEnabled) {
        disabledServices.push(sId);
      } else {
        unchangedServices.push(sId);
      }
    });

    return { enabledServices, disabledServices, unchangedServices };
  },

  /**
   * Super Admin action: Switch the entire service package for a school.
   */
  switchPackage(
    schoolId: string,
    template: ServicePackageTemplate,
    actor: User,
    reason?: string
  ): SchoolServiceConfiguration {
    if (actor.role !== 'super_admin') {
      throw new Error('Unauthorized: Only Super Administrators can change service packages.');
    }

    const store = ERPStorage.get();
    const configs = store.schoolServiceConfigs || [];
    const index = configs.findIndex((c) => c.schoolId === schoolId);

    if (index === -1) {
      throw new Error(`School with ID "${schoolId}" not found.`);
    }

    const config = configs[index];
    const prevPackage = config.package;
    const templateDefaults = PACKAGE_TEMPLATES[template].defaultServices;
    const now = new Date().toISOString();

    const updatedEntitlements: Record<ServiceIdentifier, SchoolServiceEntitlement> = {
      ...config.entitlements,
    };

    (Object.keys(templateDefaults) as ServiceIdentifier[]).forEach((sId) => {
      const willBeEnabled = templateDefaults[sId];
      const prev = config.entitlements[sId];

      updatedEntitlements[sId] = {
        serviceId: sId,
        enabled: willBeEnabled,
        status: willBeEnabled ? 'active' : 'suspended',
        activationDate: prev?.activationDate || now,
        lastModifiedBy: actor.name,
        lastModifiedAt: now,
        reason: reason || undefined,
      };
    });

    const updatedConfig: SchoolServiceConfiguration = {
      ...config,
      package: template,
      entitlements: updatedEntitlements,
      updatedAt: now,
    };

    configs[index] = updatedConfig;

    // Record audit event
    const auditLogs = store.serviceEntitlementAuditLogs || [];
    const auditEntry: ServiceEntitlementAuditLog = {
      id: `audit-pkg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: config.schoolId,
      schoolName: config.schoolName,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'switch_package',
      previousValue: prevPackage,
      newValue: template,
      reason: reason?.trim() || `Switched package to ${PACKAGE_TEMPLATES[template].name}`,
      timestamp: now,
    };

    ERPStorage.set({
      ...store,
      schoolServiceConfigs: configs,
      serviceEntitlementAuditLogs: [auditEntry, ...auditLogs],
    });

    return updatedConfig;
  },

  /**
   * Super Admin action: Suspend or activate a school account.
   */
  setAccountStatus(
    schoolId: string,
    status: 'active' | 'suspended' | 'inactive',
    actor: User,
    reason?: string
  ): SchoolServiceConfiguration {
    if (actor.role !== 'super_admin') {
      throw new Error('Unauthorized: Only Super Administrators can alter school account status.');
    }

    const store = ERPStorage.get();
    const configs = store.schoolServiceConfigs || [];
    const index = configs.findIndex((c) => c.schoolId === schoolId);

    if (index === -1) {
      throw new Error(`School with ID "${schoolId}" not found.`);
    }

    const config = configs[index];
    const prevStatus = config.accountStatus;
    const now = new Date().toISOString();

    const updatedConfig: SchoolServiceConfiguration = {
      ...config,
      accountStatus: status,
      updatedAt: now,
    };

    configs[index] = updatedConfig;

    // Synchronize matching Institution record in store.institutions
    const inst = (store.institutions || []).find(
      (i) => i.id === schoolId || i.code === schoolId || (schoolId === 'inst-1' && i.id === 'inst-1')
    );
    if (inst) {
      inst.status = status === 'active' ? 'active' : 'inactive';
    }

    const auditLogs = store.serviceEntitlementAuditLogs || [];
    const auditEntry: ServiceEntitlementAuditLog = {
      id: `audit-acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: config.schoolId,
      schoolName: config.schoolName,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: status === 'active' ? 'activate_account' : 'suspend_account',
      previousValue: prevStatus,
      newValue: status,
      reason: reason?.trim() || undefined,
      timestamp: now,
    };

    ERPStorage.set({
      ...store,
      schoolServiceConfigs: configs,
      serviceEntitlementAuditLogs: [auditEntry, ...auditLogs],
    });

    return updatedConfig;
  },

  /**
   * Retrieves audit logs for service entitlement changes.
   */
  getAuditLogs(schoolId?: string): ServiceEntitlementAuditLog[] {
    const store = ERPStorage.get();
    const logs = store.serviceEntitlementAuditLogs || [];
    if (schoolId) {
      return logs.filter((l) => l.schoolId === schoolId);
    }
    return logs;
  },
};

