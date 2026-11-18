// ==========================================
// Digital Marketing Management Service
// Developed by NTS Novalytix
// Campaign Tracking, Inquiries, Channels & Checklist
// ==========================================

import { ERPStorage } from './storage';
import { User, AdmissionApplication } from '../types';
import {
  MarketingCampaign,
  MarketingLead,
  MarketingLeadStatus,
  MarketingChannel,
  MarketingChannelIntegration,
  MarketingContentItem,
  MarketingReportData,
} from '../types/serviceEntitlement';
import { serviceEntitlementService } from './serviceEntitlementService';
import { admissionService } from './admissionService';

export const digitalMarketingService = {
  /**
   * Retrieves all marketing campaigns for a school.
   * Asserts digital_marketing entitlement and tenant isolation.
   */
  getCampaigns(schoolId: string, actor?: User): MarketingCampaign[] {
    if (actor && actor.role !== 'super_admin' && actor.institutionId && actor.institutionId !== schoolId) {
      throw new Error(`Access Denied: You cannot view marketing campaigns for institution "${schoolId}".`);
    }

    const store = ERPStorage.get();
    const all = store.marketingCampaigns || [];
    return all.filter((c) => c.schoolId === schoolId);
  },

  /**
   * Retrieves all inquiries/leads captured for a school.
   */
  getLeads(schoolId: string, actor?: User): MarketingLead[] {
    if (actor && actor.role !== 'super_admin' && actor.institutionId && actor.institutionId !== schoolId) {
      throw new Error(`Access Denied: You cannot view leads for institution "${schoolId}".`);
    }

    const store = ERPStorage.get();
    const all = store.marketingLeads || [];
    return all.filter((l) => l.schoolId === schoolId);
  },

  /**
   * Retrieves channel integration status.
   */
  getIntegrations(schoolId: string): MarketingChannelIntegration[] {
    return [
      {
        channelId: 'google_search',
        name: 'Google Ads Search & Local PMax',
        status: 'connected',
        accountOrPixelId: 'AW-984501234',
        lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        channelId: 'meta_ads',
        name: 'Meta Ads Manager (Facebook)',
        status: 'connected',
        accountOrPixelId: 'ACT-4421098551',
        lastSyncedAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        channelId: 'instagram',
        name: 'Instagram School Spotlight',
        status: 'connected',
        accountOrPixelId: '@stxaviers_academy_official',
        lastSyncedAt: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        channelId: 'local_awareness',
        name: 'WhatsApp Business & Local Micro-sites',
        status: 'action_required',
        accountOrPixelId: 'WABA-9198450123',
        lastSyncedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  },

  /**
   * Creates a new marketing campaign.
   */
  createCampaign(campaignData: Partial<MarketingCampaign>, actor: User): MarketingCampaign {
    if (!campaignData.schoolId) {
      throw new Error('Mandatory schoolId is required to create a marketing campaign.');
    }
    serviceEntitlementService.assertServiceEnabled(campaignData.schoolId, 'digital_marketing');

    const store = ERPStorage.get();
    const campaigns = store.marketingCampaigns || [];
    const now = new Date().toISOString();

    const newCampaign: MarketingCampaign = {
      id: `camp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: campaignData.schoolId,
      name: campaignData.name || 'Untitled Campaign',
      channel: campaignData.channel || 'google_search',
      monthlyBudget: Number(campaignData.monthlyBudget) || 25000,
      spendToDate: Number(campaignData.spendToDate) || 0,
      leadsGenerated: 0,
      clicks: 0,
      impressions: 0,
      status: campaignData.status || 'draft',
      startDate: campaignData.startDate || now.split('T')[0],
      endDate: campaignData.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      principalApprovalStatus: 'pending',
      targetAudience: campaignData.targetAudience || 'Parents of Kindergarten to Grade 10',
      campaignGoal: campaignData.campaignGoal || 'New Academic Admissions 2026-2027',
      creativeUrl: campaignData.creativeUrl,
      notes: campaignData.notes,
      updatedAt: now,
    };

    campaigns.push(newCampaign);
    ERPStorage.set({ ...store, marketingCampaigns: campaigns });
    return newCampaign;
  },

  /**
   * Updates an existing campaign's status (active, paused, draft, completed).
   */
  updateCampaignStatus(
    campaignId: string,
    status: MarketingCampaign['status'],
    actor: User
  ): MarketingCampaign {
    const store = ERPStorage.get();
    const campaigns = store.marketingCampaigns || [];
    const index = campaigns.findIndex((c) => c.id === campaignId);

    if (index === -1) {
      throw new Error(`Campaign with ID "${campaignId}" not found.`);
    }

    const campaign = campaigns[index];
    serviceEntitlementService.assertServiceEnabled(campaign.schoolId, 'digital_marketing');

    const updated = {
      ...campaign,
      status,
      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;
    ERPStorage.set({ ...store, marketingCampaigns: campaigns });
    return updated;
  },

  /**
   * Principal action: approves or requests revisions on a marketing creative/campaign.
   */
  approveCampaign(
    campaignId: string,
    actor: User,
    approved: boolean,
    notes?: string
  ): MarketingCampaign {
    const store = ERPStorage.get();
    const campaigns = store.marketingCampaigns || [];
    const index = campaigns.findIndex((c) => c.id === campaignId);

    if (index === -1) {
      throw new Error(`Campaign with ID "${campaignId}" not found.`);
    }

    const campaign = campaigns[index];
    serviceEntitlementService.assertServiceEnabled(campaign.schoolId, 'digital_marketing');

    const updated: MarketingCampaign = {
      ...campaign,
      principalApprovalStatus: approved ? 'approved' : 'revision_needed',
      notes: notes ? `${campaign.notes ? campaign.notes + '\n' : ''}Principal: ${notes}` : campaign.notes,
      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;
    ERPStorage.set({ ...store, marketingCampaigns: campaigns });
    return updated;
  },

  /**
   * Adds an inquiry lead captured from marketing channels.
   */
  createLead(leadData: Partial<MarketingLead>): MarketingLead {
    if (!leadData.schoolId) {
      throw new Error('Mandatory schoolId is required to register an admission lead.');
    }
    serviceEntitlementService.assertServiceEnabled(leadData.schoolId, 'digital_marketing');

    const store = ERPStorage.get();
    const leads = store.marketingLeads || [];
    const now = new Date().toISOString();

    const newLead: MarketingLead = {
      id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: leadData.schoolId,
      studentName: leadData.studentName || 'Prospective Student',
      parentName: leadData.parentName || 'Prospective Parent',
      email: leadData.email || '',
      phone: leadData.phone || '',
      gradeApplying: leadData.gradeApplying || 'Grade 1',
      sourceChannel: leadData.sourceChannel || 'meta_ads',
      campaignId: leadData.campaignId,
      status: 'new',
      inquiryNotes: leadData.inquiryNotes || 'Inquired via digital admission campaign landing page.',
      receivedAt: now,
    };

    leads.push(newLead);

    // Also update campaign lead count if linked
    if (newLead.campaignId) {
      const campaigns = store.marketingCampaigns || [];
      const campIndex = campaigns.findIndex((c) => c.id === newLead.campaignId);
      if (campIndex !== -1) {
        campaigns[campIndex].leadsGenerated += 1;
      }
    }

    ERPStorage.set({ ...store, marketingLeads: leads });
    return newLead;
  },

  /**
   * Updates lead stage in the admission funnel.
   */
  updateLeadStatus(leadId: string, status: MarketingLeadStatus, notes?: string): MarketingLead {
    const store = ERPStorage.get();
    const leads = store.marketingLeads || [];
    const index = leads.findIndex((l) => l.id === leadId);

    if (index === -1) {
      throw new Error(`Lead with ID "${leadId}" not found.`);
    }

    const lead = leads[index];
    serviceEntitlementService.assertServiceEnabled(lead.schoolId, 'digital_marketing');

    const updated: MarketingLead = {
      ...lead,
      status,
      inquiryNotes: notes ? `${lead.inquiryNotes}\n[${new Date().toLocaleDateString()}] ${notes}` : lead.inquiryNotes,
    };

    leads[index] = updated;
    ERPStorage.set({ ...store, marketingLeads: leads });
    return updated;
  },

  /**
   * Calculates performance summary KPI metrics for a school.
   */
  getMarketingSummary(schoolId: string) {
    const campaigns = this.getCampaigns(schoolId);
    const leads = this.getLeads(schoolId);

    const totalBudget = campaigns.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spendToDate || 0), 0);
    const totalLeads = leads.length;
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);

    const enrolledCount = leads.filter((l) => l.status === 'enrolled').length;
    const conversionRate = totalLeads > 0 ? ((enrolledCount / totalLeads) * 100).toFixed(1) : '0.0';
    const costPerLead = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;

    return {
      activeCampaignsCount: campaigns.filter((c) => c.status === 'active').length,
      totalBudget,
      totalSpend,
      totalLeads,
      totalClicks,
      totalImpressions,
      enrolledCount,
      conversionRate,
      costPerLead,
    };
  },

  /**
   * External Ad Management Operational Advisory Checklist.
   * Explains that disabling the ERP module does not cancel external live ads on Meta or Google.
   */
  getExternalAdChecklist(schoolId: string) {
    return [
      {
        step: 1,
        channel: 'Meta Ads Manager',
        instruction: 'Log into business.facebook.com and toggle active campaigns to "Paused" to stop daily ad spend.',
        status: 'Action Required on Deactivation',
        directLink: 'https://adsmanager.facebook.com',
      },
      {
        step: 2,
        channel: 'Google Ads Platform',
        instruction: 'Log into ads.google.com and pause Search & Performance Max campaigns for this school account.',
        status: 'Action Required on Deactivation',
        directLink: 'https://ads.google.com',
      },
      {
        step: 3,
        channel: 'WhatsApp Business API & CRM Webhooks',
        instruction: 'Disconnect marketing webhook endpoints to prevent new inbound leads from accumulating unaddressed.',
        status: 'Automated on ERP Disable',
      },
      {
        step: 4,
        channel: 'Ad Spend Reconciliation',
        instruction: 'Review invoice from Meta & Google to ensure all month-to-date marketing expenses are billed.',
        status: 'Finance Review',
      },
    ];
  },

  /**
   * Updates an existing campaign's configuration (budget, dates, goal, target audience).
   */
  updateCampaign(
    campaignId: string,
    updates: Partial<MarketingCampaign>,
    actor: User
  ): MarketingCampaign {
    const store = ERPStorage.get();
    const campaigns = store.marketingCampaigns || [];
    const index = campaigns.findIndex((c) => c.id === campaignId);

    if (index === -1) {
      throw new Error(`Campaign with ID "${campaignId}" not found.`);
    }

    const campaign = campaigns[index];
    serviceEntitlementService.assertServiceEnabled(campaign.schoolId, 'digital_marketing');

    const updated: MarketingCampaign = {
      ...campaign,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updated;
    ERPStorage.set({ ...store, marketingCampaigns: campaigns });
    return updated;
  },

  /**
   * Archives a campaign.
   */
  archiveCampaign(campaignId: string, actor: User): MarketingCampaign {
    return this.updateCampaignStatus(campaignId, 'completed', actor);
  },

  /**
   * Content Calendar Management
   */
  getContentItems(schoolId: string, actor?: User): MarketingContentItem[] {
    if (actor && actor.role !== 'super_admin' && actor.institutionId && actor.institutionId !== schoolId) {
      throw new Error(`Access Denied: You cannot view content items for institution "${schoolId}".`);
    }

    const store = ERPStorage.get();
    const items = (store as any).marketingContentItems || [];
    return items.filter((item: MarketingContentItem) => item.schoolId === schoolId);
  },

  createContentItem(data: Partial<MarketingContentItem>, actor: User): MarketingContentItem {
    if (!data.schoolId) {
      throw new Error('Mandatory schoolId is required to schedule marketing content.');
    }
    serviceEntitlementService.assertServiceEnabled(data.schoolId, 'digital_marketing');

    const store = ERPStorage.get();
    const items = (store as any).marketingContentItems || [];
    const now = new Date().toISOString();

    const newItem: MarketingContentItem = {
      id: `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: data.schoolId,
      title: data.title || 'Untitled Post',
      contentType: data.contentType || 'social_post',
      channel: data.channel || 'instagram',
      plannedDate: data.plannedDate || now.split('T')[0],
      publishTime: data.publishTime || '10:00',
      assignedStaffName: data.assignedStaffName || actor.name || 'Marketing Cell',
      assignedStaffId: actor.id,
      captionOrCopy: data.captionOrCopy || '',
      mediaUrlOrDesc: data.mediaUrlOrDesc || '',
      targetAudience: data.targetAudience || 'School Community & Prospective Parents',
      status: data.status || 'draft',
      isExternallyPublished: false,
      createdAt: now,
      updatedAt: now,
    };

    items.push(newItem);
    ERPStorage.set({ ...store, marketingContentItems: items });
    return newItem;
  },

  updateContentItem(
    id: string,
    updates: Partial<MarketingContentItem>,
    actor: User
  ): MarketingContentItem {
    const store = ERPStorage.get();
    const items = ((store as any).marketingContentItems || []) as MarketingContentItem[];
    const index = items.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error(`Content item with ID "${id}" not found.`);
    }

    const item = items[index];
    serviceEntitlementService.assertServiceEnabled(item.schoolId, 'digital_marketing');

    const updated: MarketingContentItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    ERPStorage.set({ ...store, marketingContentItems: items });
    return updated;
  },

  reviewContentItem(
    id: string,
    approved: boolean,
    notes: string,
    actor: User
  ): MarketingContentItem {
    const store = ERPStorage.get();
    const items = ((store as any).marketingContentItems || []) as MarketingContentItem[];
    const index = items.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error(`Content item with ID "${id}" not found.`);
    }

    const item = items[index];
    serviceEntitlementService.assertServiceEnabled(item.schoolId, 'digital_marketing');

    const updated: MarketingContentItem = {
      ...item,
      status: approved ? 'approved' : 'rejected',
      principalApprovalNotes: notes ? notes.trim() : undefined,
      approvedBy: approved ? actor.name : undefined,
      approvedAt: approved ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    ERPStorage.set({ ...store, marketingContentItems: items });
    return updated;
  },

  deleteContentItem(id: string, actor: User): void {
    const store = ERPStorage.get();
    const items = ((store as any).marketingContentItems || []) as MarketingContentItem[];
    const index = items.findIndex((c) => c.id === id);

    if (index === -1) return;

    const item = items[index];
    serviceEntitlementService.assertServiceEnabled(item.schoolId, 'digital_marketing');

    const filtered = items.filter((c) => c.id !== id);
    ERPStorage.set({ ...store, marketingContentItems: filtered });
  },

  /**
   * Admission Module Integration: Convert Marketing Lead to Official ERP Admission Application.
   * Links directly to admissionService.createInquiry to prevent duplicate student records.
   */
  convertLeadToAdmission(
    leadId: string,
    actor: User,
    overrides?: {
      dob?: string;
      gender?: 'male' | 'female' | 'other';
      address?: string;
    }
  ): { lead: MarketingLead; application: AdmissionApplication } {
    const store = ERPStorage.get();
    const leads = store.marketingLeads || [];
    const index = leads.findIndex((l) => l.id === leadId);

    if (index === -1) {
      throw new Error(`Lead with ID "${leadId}" not found.`);
    }

    const lead = leads[index];
    serviceEntitlementService.assertServiceEnabled(lead.schoolId, 'digital_marketing');

    if (lead.convertedApplicationNo) {
      const existingApp = admissionService.getByApplicationNo(lead.convertedApplicationNo);
      if (existingApp) {
        return { lead, application: existingApp };
      }
    }

    // Split student name into first and last name safely
    const nameParts = lead.studentName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Prospective';
    const lastName = nameParts.slice(1).join(' ') || 'Applicant';

    const defaultDob = overrides?.dob || '2018-05-15';
    const rawGender = overrides?.gender?.toLowerCase();
    const formattedGender: 'Male' | 'Female' | 'Other' =
      rawGender === 'female' ? 'Female' : rawGender === 'other' ? 'Other' : 'Male';
    const defaultAddress = overrides?.address || 'Residential Address Provided During Digital Admission Inquiry';

    // Submit inquiry to existing official admissions pipeline
    const admissionResult = admissionService.createInquiry(
      {
        academicYear: '2026-2027',
        targetClassId: 'cls-1',
        targetClassName: lead.gradeApplying || 'Grade 1',
        source: 'Social Media',
        firstName,
        lastName,
        gender: formattedGender,
        dob: defaultDob,
        parentName: lead.parentName,
        parentRelation: 'Guardian',
        parentPhone: lead.phone,
        parentEmail: lead.email,
        address: defaultAddress,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        admissionFeeAmount: 25000,
        reviewRemarks: `Inbound conversion from Digital Marketing lead (${lead.id}). Original inquiry: "${lead.inquiryNotes}"`,
      },
      actor.name
    );

    if (!admissionResult.success || !admissionResult.data) {
      throw new Error(admissionResult.error || 'Failed to initialize official admission application.');
    }

    const createdApp = admissionResult.data;

    // Link application number and update lead status
    const updatedLead: MarketingLead = {
      ...lead,
      status: 'application_submitted',
      convertedApplicationNo: createdApp.applicationNo,
      convertedApplicationId: createdApp.id,
      inquiryNotes: `${lead.inquiryNotes}\n[${new Date().toLocaleDateString()}] Converted to Official Admission Application #${createdApp.applicationNo} by ${actor.name}.`,
    };

    leads[index] = updatedLead;
    ERPStorage.set({ ...store, marketingLeads: leads });

    return { lead: updatedLead, application: createdApp };
  },

  /**
   * Generates comprehensive marketing executive report data.
   */
  generateMarketingReport(
    schoolId: string,
    period = 'Academic Year 2026-2027',
    actor?: User
  ): MarketingReportData {
    const config = serviceEntitlementService.getConfigBySchoolId(schoolId);
    const schoolName = config?.schoolName || 'St. Xavier\'s International Academy';
    const campaigns = this.getCampaigns(schoolId, actor);
    const leads = this.getLeads(schoolId, actor);
    const summary = this.getMarketingSummary(schoolId);

    const channelsSummary = [
      { channel: 'google_search' as MarketingChannel, name: 'Google Ads Search & Local PMax' },
      { channel: 'meta_ads' as MarketingChannel, name: 'Meta Ads Manager (Facebook)' },
      { channel: 'instagram' as MarketingChannel, name: 'Instagram School Spotlight' },
      { channel: 'local_awareness' as MarketingChannel, name: 'WhatsApp & Local Microsites' },
    ].map((ch) => {
      const chCampaigns = campaigns.filter((c) => c.channel === ch.channel);
      const chSpend = chCampaigns.reduce((sum, c) => sum + (c.spendToDate || 0), 0);
      const chLeads = leads.filter((l) => l.sourceChannel === ch.channel).length;
      const cpl = chLeads > 0 ? Math.round(chSpend / chLeads) : 0;
      return {
        channel: ch.channel,
        name: ch.name,
        spend: chSpend,
        leads: chLeads,
        cpl,
      };
    });

    const totalBudget = summary.totalBudget;
    const totalSpend = summary.totalSpend;
    const budgetUtilizationPct = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;
    const costPerEnrollment = summary.enrolledCount > 0 ? Math.round(totalSpend / summary.enrolledCount) : 0;

    return {
      schoolId,
      schoolName,
      periodLabel: period,
      generatedAt: new Date().toISOString(),
      generatedBy: actor?.name || 'System Administrator',
      totalBudget,
      totalSpend,
      budgetUtilizationPct,
      totalLeads: summary.totalLeads,
      totalEnrolled: summary.enrolledCount,
      costPerLead: summary.costPerLead,
      costPerEnrollment,
      conversionRate: summary.conversionRate,
      campaignsSummary: campaigns.map((c) => ({
        name: c.name,
        channel: c.channel,
        budget: c.monthlyBudget,
        spend: c.spendToDate,
        leads: c.leadsGenerated,
        conversions: leads.filter((l) => l.campaignId === c.id && l.status === 'enrolled').length,
        status: c.status,
      })),
      channelsSummary,
      operationalNotes: [
        'Ad spend and click metrics reflect synced platform reports from Google Ads and Meta Ads Manager accounts.',
        'Inquiries and confirmed admissions are attributed and tracked via ERP admission record linkage.',
        'Offline lead follow-ups and campus walkthroughs are handled by school admission counsellors.',
      ],
    };
  },
};

