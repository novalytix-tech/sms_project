// ==========================================
// School Service Entitlements & Subscription Management - Types
// Developed by NTS Novalytix
// Centralized Super Admin Entitlement Engine
// ==========================================

export type ServiceIdentifier =
  | 'core_erp'
  | 'digital_marketing'
  | 'admissions'
  | 'attendance'
  | 'fees'
  | 'examinations'
  | 'assignments'
  | 'transport'
  | 'staff_groups'
  | 'reports'
  | 'question_papers'
  | 'library'
  | 'timetable'
  | 'calendar';

export type ServicePackageTemplate =
  | 'erp_only'
  | 'marketing_only'
  | 'erp_marketing'
  | 'custom';

export type ServiceSubscriptionStatus =
  | 'active'
  | 'trial'
  | 'suspended'
  | 'expired';

export interface ServiceDefinition {
  id: ServiceIdentifier;
  name: string;
  category: 'core' | 'academic' | 'operations' | 'marketing' | 'finance' | 'admin';
  description: string;
  isCore: boolean;
  defaultInERP: boolean;
  associatedRoutes: string[];
  consequentialImpact: string;
}

export interface SchoolServiceEntitlement {
  serviceId: ServiceIdentifier;
  enabled: boolean;
  status: ServiceSubscriptionStatus;
  activationDate: string;
  expiryDate?: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  reason?: string;
}

export interface SchoolServiceConfiguration {
  schoolId: string; // Stable ID e.g. "inst-1"
  schoolName: string;
  package: ServicePackageTemplate;
  accountStatus: 'active' | 'suspended' | 'inactive';
  entitlements: Record<ServiceIdentifier, SchoolServiceEntitlement>;
  assignedMarketingManager?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEntitlementAuditLog {
  id: string;
  schoolId: string;
  schoolName: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action:
    | 'enable_service'
    | 'disable_service'
    | 'switch_package'
    | 'suspend_account'
    | 'activate_account';
  serviceId?: ServiceIdentifier;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
}

// Digital Marketing Models
export type MarketingChannel = 'google_search' | 'meta_ads' | 'instagram' | 'local_awareness';

export type MarketingLeadStatus =
  | 'new'
  | 'contacted'
  | 'campus_tour_scheduled'
  | 'application_submitted'
  | 'enrolled'
  | 'dropped';

export interface MarketingCampaign {
  id: string;
  schoolId: string;
  name: string;
  channel: MarketingChannel;
  monthlyBudget: number;
  spendToDate: number;
  leadsGenerated: number;
  clicks: number;
  impressions: number;
  status: 'active' | 'paused' | 'draft' | 'completed';
  startDate: string;
  endDate: string;
  principalApprovalStatus: 'pending' | 'approved' | 'revision_needed';
  targetAudience: string;
  campaignGoal: string;
  creativeUrl?: string;
  notes?: string;
  ownerName?: string;
  conversionsCount?: number;
  isPlatformSynced?: boolean;
  updatedAt: string;
}

export interface MarketingLead {
  id: string;
  schoolId: string;
  studentName: string;
  parentName: string;
  email: string;
  phone: string;
  gradeApplying: string;
  sourceChannel: MarketingChannel;
  campaignId?: string;
  status: MarketingLeadStatus;
  inquiryNotes: string;
  receivedAt: string;
  followUpDate?: string;
  assignedStaffName?: string;
  convertedApplicationNo?: string;
  convertedApplicationId?: string;
}

export interface MarketingChannelIntegration {
  channelId: MarketingChannel;
  name: string;
  status: 'connected' | 'action_required' | 'not_configured';
  accountOrPixelId?: string;
  lastSyncedAt?: string;
}

// Content Calendar Models
export type MarketingContentType =
  | 'social_post'
  | 'website_article'
  | 'admission_announcement'
  | 'event_coverage'
  | 'campaign_creative'
  | 'seo_update';

export type MarketingContentStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected';

export interface MarketingContentItem {
  id: string;
  schoolId: string;
  title: string;
  contentType: MarketingContentType;
  channel: MarketingChannel | 'website' | 'newsletter' | 'all_social';
  plannedDate: string;
  publishTime?: string;
  assignedStaffName: string;
  assignedStaffId?: string;
  captionOrCopy: string;
  mediaUrlOrDesc?: string;
  targetAudience?: string;
  status: MarketingContentStatus;
  principalApprovalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  isExternallyPublished: boolean;
  publishedUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingReportData {
  schoolId: string;
  schoolName: string;
  periodLabel: string;
  generatedAt: string;
  generatedBy: string;
  totalBudget: number;
  totalSpend: number;
  budgetUtilizationPct: number;
  totalLeads: number;
  totalEnrolled: number;
  costPerLead: number;
  costPerEnrollment: number;
  conversionRate: string;
  campaignsSummary: Array<{
    name: string;
    channel: MarketingChannel;
    budget: number;
    spend: number;
    leads: number;
    conversions: number;
    status: string;
  }>;
  channelsSummary: Array<{
    channel: MarketingChannel;
    name: string;
    spend: number;
    leads: number;
    cpl: number;
  }>;
  operationalNotes: string[];
}

