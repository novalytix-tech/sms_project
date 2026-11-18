// ==========================================
// Digital Marketing Management & Lead Funnel Portal
// Developed by NTS Novalytix
// Enterprise School ERP - Production-Grade Workspace
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { MarketingCampaign, MarketingLead, MarketingLeadStatus, MarketingChannel, MarketingContentItem, MarketingContentType } from '../../types/serviceEntitlement';
import { digitalMarketingService } from '../../services/digitalMarketingService';
import { serviceEntitlementService } from '../../services/serviceEntitlementService';

import { SearchInput } from '../../components/common/SearchInput';
import './digitalMarketing.css';
import { Megaphone, TrendingUp, Users, Target, IndianRupee, CheckCircle2, AlertTriangle, ExternalLink, Plus, Play, Pause, Eye, ShieldCheck, Building2, Calendar as CalendarIcon, Printer, CheckSquare, X, FileText, Sparkles, Link as LinkIcon, Info, CalendarCheck, Edit, Trash2, Database, Globe, Radio } from 'lucide-react';

export const DigitalMarketingPage: React.FC = () => {
  const { currentUser, currentRole, addToast } = useERP();

  // Multi-school selection for Super Admin
  const allConfigs = useMemo(() => serviceEntitlementService.getAllConfigs(), []);
  const marketingSchools = useMemo(() => {
    return allConfigs.filter((c) => c.entitlements.digital_marketing?.enabled);
  }, [allConfigs]);

  const defaultSchoolId =
    currentUser.institutionId ||
    (marketingSchools.length > 0 ? marketingSchools[0].schoolId : (allConfigs[0]?.schoolId || ''));
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(defaultSchoolId);

  // Strict scope tamper protection: Non-super-admins cannot view any other school
  const effectiveSchoolId = useMemo(() => {
    if (currentRole === 'super_admin') {
      return selectedSchoolId || (marketingSchools.length > 0 ? marketingSchools[0].schoolId : (allConfigs[0]?.schoolId || ''));
    }
    return currentUser.institutionId || '';
  }, [currentRole, selectedSchoolId, marketingSchools, allConfigs, currentUser.institutionId]);

  // Active School Configuration
  const activeSchoolConfig = useMemo(() => {
    return serviceEntitlementService.getConfigBySchoolId(effectiveSchoolId);
  }, [effectiveSchoolId]);

  // Primary Navigation Tabs
  type WorkspaceTab =
    | 'overview'
    | 'campaigns'
    | 'content_calendar'
    | 'leads'
    | 'analytics'
    | 'reports'
    | 'integrations';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Main Data States
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [contentItems, setContentItems] = useState<MarketingContentItem[]>([]);

  // Load Data
  const loadData = () => {
    try {
      const cData = digitalMarketingService.getCampaigns(effectiveSchoolId, currentUser);
      const lData = digitalMarketingService.getLeads(effectiveSchoolId, currentUser);
      const ctData = digitalMarketingService.getContentItems(effectiveSchoolId, currentUser);
      setCampaigns(cData);
      setLeads(lData);
      setContentItems(ctData);
    } catch (err: any) {
      addToast('error', 'Access Restricted', err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveSchoolId]);

  // KPI calculations
  const summary = useMemo(() => {
    return digitalMarketingService.getMarketingSummary(effectiveSchoolId);
  }, [effectiveSchoolId, campaigns, leads]);

  const integrations = useMemo(() => {
    return digitalMarketingService.getIntegrations(effectiveSchoolId);
  }, [effectiveSchoolId]);

  const externalChecklist = useMemo(() => {
    return digitalMarketingService.getExternalAdChecklist(effectiveSchoolId);
  }, [effectiveSchoolId]);

  // ----------------------------------------------------
  // Filters & Search States
  // ----------------------------------------------------
  // Campaigns Filters
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignChannelFilter, setCampaignChannelFilter] = useState<string>('all');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string>('all');
  const [campaignApprovalFilter, setCampaignApprovalFilter] = useState<string>('all');

  // Leads Filters
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [leadChannelFilter, setLeadChannelFilter] = useState<string>('all');
  const [leadGradeFilter, setLeadGradeFilter] = useState<string>('all');

  // Content Calendar Filters & View Mode
  const [contentViewMode, setContentViewMode] = useState<'calendar' | 'list'>('list');
  const [contentChannelFilter, setContentChannelFilter] = useState<string>('all');
  const [contentStatusFilter, setContentStatusFilter] = useState<string>('all');

  // Reports Date Range
  const [reportPeriod, setReportPeriod] = useState('Academic Year 2026-2027');

  // ----------------------------------------------------
  // Modals & Action State
  // ----------------------------------------------------
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [showCreateContentModal, setShowCreateContentModal] = useState(false);

  const [inspectingCampaign, setInspectingCampaign] = useState<MarketingCampaign | null>(null);
  const [inspectingLead, setInspectingLead] = useState<MarketingLead | null>(null);
  const [inspectingContent, setInspectingContent] = useState<MarketingContentItem | null>(null);
  const [convertingLead, setConvertingLead] = useState<MarketingLead | null>(null);

  // Campaign Form State
  const [campName, setCampName] = useState('');
  const [campChannel, setCampChannel] = useState<MarketingChannel>('google_search');
  const [campBudget, setCampBudget] = useState(30000);
  const [campGoal, setCampGoal] = useState('Academic Admissions 2026-2027');
  const [campTarget, setCampTarget] = useState('Parents searching for Top CBSE Schools in the locality');
  const [campStartDate, setCampStartDate] = useState('2026-11-01');
  const [campEndDate, setCampEndDate] = useState('2026-12-31');
  const [campCreativeUrl, setCampCreativeUrl] = useState('');
  const [campNotes, setCampNotes] = useState('');

  // Lead Form State
  const [leadStudent, setLeadStudent] = useState('');
  const [leadParent, setLeadParent] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadGrade, setLeadGrade] = useState('Grade 1');
  const [leadChannel, setLeadChannel] = useState<MarketingChannel>('meta_ads');
  const [leadNotes, setLeadNotes] = useState('');
  const [leadFollowUp, setLeadFollowUp] = useState('2026-10-30');

  // Content Form State
  const [contentTitle, setContentTitle] = useState('');
  const [contentType, setContentType] = useState<MarketingContentType>('social_post');
  const [contentChannel, setContentChannel] = useState<MarketingChannel | 'website' | 'newsletter' | 'all_social'>('instagram');
  const [contentPlannedDate, setContentPlannedDate] = useState('2026-10-28');
  const [contentPublishTime, setContentPublishTime] = useState('10:00');
  const [contentStaffName, setContentStaffName] = useState(currentUser.name || 'Admissions Media Cell');
  const [contentCopy, setContentCopy] = useState('');
  const [contentMediaDesc, setContentMediaDesc] = useState('');
  const [contentAudience, setContentAudience] = useState('Prospective Parents and School Community');

  // Review Comment States
  const [principalReviewComment, setPrincipalReviewComment] = useState('');
  const [leadStageUpdate, setLeadStageUpdate] = useState<MarketingLeadStatus>('contacted');
  const [leadFollowUpNote, setLeadFollowUpNote] = useState('');

  // Convert Lead Additional Fields
  const [convDob, setConvDob] = useState('2019-06-15');
  const [convGender, setConvGender] = useState<'male' | 'female' | 'other'>('male');
  const [convAddress, setConvAddress] = useState('Bengaluru Urban, Karnataka');

  // ----------------------------------------------------
  // Campaign Handlers
  // ----------------------------------------------------
  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName.trim()) {
      addToast('warning', 'Missing Details', 'Please provide a campaign name.');
      return;
    }

    try {
      digitalMarketingService.createCampaign(
        {
          schoolId: effectiveSchoolId,
          name: campName.trim(),
          channel: campChannel,
          monthlyBudget: Number(campBudget),
          campaignGoal: campGoal,
          targetAudience: campTarget,
          startDate: campStartDate,
          endDate: campEndDate,
          creativeUrl: campCreativeUrl.trim() || undefined,
          notes: campNotes.trim() || undefined,
          ownerName: currentUser.name,
          status: 'draft',
        },
        currentUser
      );

      addToast('success', 'Campaign Created', `"${campName}" saved as draft awaiting Principal approval.`);
      setShowCreateCampaignModal(false);
      setCampName('');
      loadData();
    } catch (err: any) {
      addToast('error', 'Creation Failed', err.message);
    }
  };

  const handleToggleCampaignStatus = (campaign: MarketingCampaign) => {
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      digitalMarketingService.updateCampaignStatus(campaign.id, nextStatus, currentUser);
      addToast(
        'info',
        'Status Updated',
        `Campaign "${campaign.name}" is now ${nextStatus.toUpperCase()}.`
      );
      loadData();
    } catch (err: any) {
      addToast('error', 'Status Update Failed', err.message);
    }
  };

  const handlePrincipalCampaignApproval = (approved: boolean) => {
    if (!inspectingCampaign) return;
    try {
      digitalMarketingService.approveCampaign(
        inspectingCampaign.id,
        currentUser,
        approved,
        principalReviewComment.trim()
      );
      addToast(
        approved ? 'success' : 'warning',
        approved ? 'Campaign Approved' : 'Revisions Requested',
        approved
          ? `Campaign "${inspectingCampaign.name}" approved. External publishing required on Meta/Google Ads.`
          : 'Revision feedback transmitted to campaign creator.'
      );
      setInspectingCampaign(null);
      setPrincipalReviewComment('');
      loadData();
    } catch (err: any) {
      addToast('error', 'Approval Action Failed', err.message);
    }
  };

  // ----------------------------------------------------
  // Lead Handlers
  // ----------------------------------------------------
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadStudent.trim() || !leadParent.trim() || !leadPhone.trim()) {
      addToast('warning', 'Missing Information', 'Student name, parent name, and phone are mandatory.');
      return;
    }

    try {
      digitalMarketingService.createLead({
        schoolId: effectiveSchoolId,
        studentName: leadStudent.trim(),
        parentName: leadParent.trim(),
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        gradeApplying: leadGrade,
        sourceChannel: leadChannel,
        inquiryNotes: leadNotes.trim() || 'Inbound admission enquiry captured.',
        followUpDate: leadFollowUp,
        assignedStaffName: currentUser.name,
      });

      addToast('success', 'Lead Added', `Admission inquiry for ${leadStudent} recorded.`);
      setShowCreateLeadModal(false);
      setLeadStudent('');
      setLeadParent('');
      setLeadPhone('');
      setLeadEmail('');
      setLeadNotes('');
      loadData();
    } catch (err: any) {
      addToast('error', 'Lead Creation Failed', err.message);
    }
  };

  const handleUpdateLeadStatus = () => {
    if (!inspectingLead) return;
    try {
      digitalMarketingService.updateLeadStatus(
        inspectingLead.id,
        leadStageUpdate,
        leadFollowUpNote.trim() || undefined
      );
      addToast('success', 'Stage Updated', `Lead moved to ${leadStageUpdate.replace('_', ' ').toUpperCase()}.`);
      setInspectingLead(null);
      setLeadFollowUpNote('');
      loadData();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  const handleExecuteConvertLeadToAdmission = () => {
    if (!convertingLead) return;
    try {
      const res = digitalMarketingService.convertLeadToAdmission(
        convertingLead.id,
        currentUser,
        {
          dob: convDob,
          gender: convGender,
          address: convAddress.trim(),
        }
      );
      addToast(
        'success',
        'Official Admission Initialized',
        `Lead successfully linked to Official Admission Application #${res.application.applicationNo}.`
      );
      setConvertingLead(null);
      loadData();
    } catch (err: any) {
      addToast('error', 'Conversion Failed', err.message);
    }
  };

  // ----------------------------------------------------
  // Content Calendar Handlers
  // ----------------------------------------------------
  const handleCreateContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim() || !contentCopy.trim()) {
      addToast('warning', 'Missing Details', 'Title and copy text are required.');
      return;
    }

    try {
      digitalMarketingService.createContentItem(
        {
          schoolId: effectiveSchoolId,
          title: contentTitle.trim(),
          contentType,
          channel: contentChannel,
          plannedDate: contentPlannedDate,
          publishTime: contentPublishTime,
          assignedStaffName: contentStaffName.trim(),
          captionOrCopy: contentCopy.trim(),
          mediaUrlOrDesc: contentMediaDesc.trim() || undefined,
          targetAudience: contentAudience.trim() || undefined,
          status: 'submitted',
        },
        currentUser
      );

      addToast('success', 'Content Submitted', `"${contentTitle}" submitted for Principal approval.`);
      setShowCreateContentModal(false);
      setContentTitle('');
      setContentCopy('');
      setContentMediaDesc('');
      loadData();
    } catch (err: any) {
      addToast('error', 'Submission Failed', err.message);
    }
  };

  const handlePrincipalContentReview = (approved: boolean) => {
    if (!inspectingContent) return;
    try {
      digitalMarketingService.reviewContentItem(
        inspectingContent.id,
        approved,
        principalReviewComment.trim(),
        currentUser
      );
      addToast(
        approved ? 'success' : 'info',
        approved ? 'Post Approved' : 'Post Returned',
        approved
          ? `Content approved. Media team can now publish manually to ${inspectingContent.channel}.`
          : 'Feedback recorded for author correction.'
      );
      setInspectingContent(null);
      setPrincipalReviewComment('');
      loadData();
    } catch (err: any) {
      addToast('error', 'Review Failed', err.message);
    }
  };

  const handleDeleteContent = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content calendar draft?')) return;
    try {
      digitalMarketingService.deleteContentItem(id, currentUser);
      addToast('info', 'Post Deleted', 'Content calendar draft removed.');
      loadData();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  // ----------------------------------------------------
  // Filtered Lists
  // ----------------------------------------------------
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.campaignGoal.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        (c.ownerName && c.ownerName.toLowerCase().includes(campaignSearch.toLowerCase()));
      const matchChannel = campaignChannelFilter === 'all' || c.channel === campaignChannelFilter;
      const matchStatus = campaignStatusFilter === 'all' || c.status === campaignStatusFilter;
      const matchApproval =
        campaignApprovalFilter === 'all' || c.principalApprovalStatus === campaignApprovalFilter;
      return matchSearch && matchChannel && matchStatus && matchApproval;
    });
  }, [campaigns, campaignSearch, campaignChannelFilter, campaignStatusFilter, campaignApprovalFilter]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        l.studentName.toLowerCase().includes(leadSearch.toLowerCase()) ||
        l.parentName.toLowerCase().includes(leadSearch.toLowerCase()) ||
        l.phone.includes(leadSearch) ||
        l.email.toLowerCase().includes(leadSearch.toLowerCase());
      const matchStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter;
      const matchChannel = leadChannelFilter === 'all' || l.sourceChannel === leadChannelFilter;
      const matchGrade = leadGradeFilter === 'all' || l.gradeApplying === leadGradeFilter;
      return matchSearch && matchStatus && matchChannel && matchGrade;
    });
  }, [leads, leadSearch, leadStatusFilter, leadChannelFilter, leadGradeFilter]);

  const filteredContent = useMemo(() => {
    return contentItems.filter((item) => {
      const matchChannel = contentChannelFilter === 'all' || item.channel === contentChannelFilter;
      const matchStatus = contentStatusFilter === 'all' || item.status === contentStatusFilter;
      return matchChannel && matchStatus;
    });
  }, [contentItems, contentChannelFilter, contentStatusFilter]);

  // Executive Report Data
  const reportData = useMemo(() => {
    return digitalMarketingService.generateMarketingReport(effectiveSchoolId, reportPeriod, currentUser);
  }, [effectiveSchoolId, reportPeriod, currentUser, campaigns, leads]);

  // Channel UI helper
  const getChannelTag = (channel: MarketingChannel | string) => {
    switch (channel) {
      case 'google_search':
        return <span className="dm-channel-tag google_search">Google Search & PMax</span>;
      case 'meta_ads':
        return <span className="dm-channel-tag meta_ads">Meta Ads (Facebook)</span>;
      case 'instagram':
        return <span className="dm-channel-tag instagram">Instagram Spotlight</span>;
      case 'local_awareness':
        return <span className="dm-channel-tag local_awareness">WhatsApp & Local</span>;
      default:
        return <span className="dm-channel-tag">{channel}</span>;
    }
  };

  return (
    <div className="dm-workspace-container">
      {/* 1. Header Card */}
      <div className="dm-header-card">
        <div className="dm-header-title-group">
          <span className="dm-header-eyebrow">
            <Radio size={14} /> School Marketing & Inbound Enrolment Workspace
          </span>
          <h1 className="dm-header-title">
            <Megaphone size={24} style={{ color: 'var(--color-primary)' }} />
            Digital Marketing
          </h1>
          <p className="dm-header-subtitle">
            Centralized workspace for orchestrating awareness campaigns, social content schedules, admission inquiry funnels, and verified parent acquisition ROI.
          </p>
        </div>

        <div className="dm-header-meta-group">
          {/* Super Admin School Switcher */}
          {currentRole === 'super_admin' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} className="text-muted" />
              <select
                className="dm-select"
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                title="Select partner school workspace"
              >
                {marketingSchools.map((s) => (
                  <option key={s.schoolId} value={s.schoolId}>
                    {s.schoolName} ({s.schoolId})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="dm-meta-badge">
              <Building2 size={14} style={{ color: 'var(--color-primary)' }} />
              <span>{activeSchoolConfig?.schoolName || 'St. Xavier\'s International Academy'}</span>
            </div>
          )}

          {/* Academic Year Badge */}
          <div className="dm-meta-badge">
            <CalendarCheck size={14} />
            <span>AY 2026-2027</span>
          </div>

          {/* Integration Status Badge */}
          <div className="dm-meta-badge connected" title="API Status for Google Ads, Meta Ads Manager, and Webhook Capture">
            <CheckCircle2 size={14} />
            <span>Integrations Active</span>
          </div>

          {/* LocalStorage Disclosure Badge */}
          <div className="dm-meta-badge" title="Data is stored within the browser's persistent ERP LocalStorage partition">
            <Database size={14} className="text-muted" />
            <span className="dm-sync-time">Local ERP Storage</span>
          </div>
        </div>
      </div>

      {/* 2. Compact 5 KPIs Section */}
      <div className="dm-kpi-grid">
        <div className="dm-kpi-card" title="Count of campaigns actively delivering impressions or in flight">
          <div className="dm-kpi-label-row">
            <span>Active Campaigns</span>
            <Target size={15} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="dm-kpi-value">{summary.activeCampaignsCount}</div>
          <span className="dm-kpi-subtext">Across Google & Meta networks</span>
        </div>

        <div className="dm-kpi-card" title="Total digital advertising expenditure recorded for this academic period">
          <div className="dm-kpi-label-row">
            <span>Marketing Spend</span>
            <IndianRupee size={15} style={{ color: '#1e40af' }} />
          </div>
          <div className="dm-kpi-value">₹{summary.totalSpend.toLocaleString()}</div>
          <span className="dm-kpi-subtext">Budget: ₹{summary.totalBudget.toLocaleString()}</span>
        </div>

        <div className="dm-kpi-card" title="Verified guardian inquiry forms captured from landing pages and ads">
          <div className="dm-kpi-label-row">
            <span>Qualified Inquiries</span>
            <Users size={15} style={{ color: '#17623e' }} />
          </div>
          <div className="dm-kpi-value">{summary.totalLeads}</div>
          <span className="dm-kpi-subtext">Direct parent contact verified</span>
        </div>

        <div className="dm-kpi-card" title="Average marketing expenditure per qualified admission enquiry">
          <div className="dm-kpi-label-row">
            <span>Cost Per Lead (CPL)</span>
            <TrendingUp size={15} style={{ color: '#98440e' }} />
          </div>
          <div className="dm-kpi-value">₹{summary.costPerLead}</div>
          <span className="dm-kpi-subtext">Calculated against live spend</span>
        </div>

        <div className="dm-kpi-card" style={{ borderColor: summary.enrolledCount > 0 ? '#bbf7d0' : undefined }} title="Enquiries successfully converted to confirmed student admissions">
          <div className="dm-kpi-label-row">
            <span>Admissions Attributed</span>
            <Sparkles size={15} style={{ color: '#17623e' }} />
          </div>
          <div className="dm-kpi-value text-success">{summary.enrolledCount}</div>
          <span className="dm-kpi-subtext">{summary.conversionRate}% Inquiry-to-Enrolment</span>
        </div>
      </div>

      {/* 3. Primary Navigation Tabs */}
      <div className="dm-nav-tabs-bar">
        <button
          type="button"
          className={`dm-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={16} /> Overview
        </button>

        <button
          type="button"
          className={`dm-tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <Target size={16} /> Campaigns
          <span className="dm-tab-count-badge">{campaigns.length}</span>
        </button>

        <button
          type="button"
          className={`dm-tab-btn ${activeTab === 'content_calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('content_calendar')}
        >
          <CalendarIcon size={16} /> Content Calendar
          <span className="dm-tab-count-badge">{contentItems.length}</span>
        </button>

        <button
          type="button"
          className={`dm-tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          <Users size={16} /> Admission Leads
          <span className="dm-tab-count-badge">{leads.length}</span>
        </button>

        <button
          type="button"
          className={`dm-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <Radio size={16} /> Analytics
        </button>

        <button
          type="button"
          className={`dm-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={16} /> Reports
        </button>

        <button
          type="button"
          className={`dm-tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          <Globe size={16} /> Integrations & Settings
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: OVERVIEW                                      */}
      {/* ==================================================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Executive Overview Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            {/* Funnel Breakdown Card */}
            <div className="dm-table-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Inbound Admission Funnel</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    End-to-end inquiry progression for the current intake cycle
                  </p>
                </div>
                <span className="dm-badge info">{summary.totalLeads} Total Inquiries</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    label: 'New Uncontacted Leads',
                    count: leads.filter((l) => l.status === 'new').length,
                    color: '#1e40af',
                    bg: '#eff6ff',
                  },
                  {
                    label: 'Counsellor Contacted',
                    count: leads.filter((l) => l.status === 'contacted').length,
                    color: '#98440e',
                    bg: '#fff3dd',
                  },
                  {
                    label: 'Campus Walkthrough Scheduled',
                    count: leads.filter((l) => l.status === 'campus_tour_scheduled').length,
                    color: '#702e82',
                    bg: '#f9edf9',
                  },
                  {
                    label: 'Official Application Submitted',
                    count: leads.filter((l) => l.status === 'application_submitted').length,
                    color: '#3B82F6',
                    bg: '#DBEAFE',
                  },
                  {
                    label: 'Confirmed Student Admission',
                    count: leads.filter((l) => l.status === 'enrolled').length,
                    color: '#17623e',
                    bg: '#e9f8ef',
                  },
                ].map((stage, idx) => {
                  const pct = summary.totalLeads > 0 ? Math.round((stage.count / summary.totalLeads) * 100) : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                        <span>{stage.label}</span>
                        <span>
                          {stage.count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: '7px', background: '#f0e6e4', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: stage.color,
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channel Connectivity Health */}
            <div className="dm-table-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Channel Integration Health</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Active ad accounts, tracking pixels, and webhooks
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('integrations')}
                >
                  Manage
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {integrations.map((ch, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: '6px',
                      border: '1px solid #ebd9d6',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{ch.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        Account ID: {ch.accountOrPixelId || 'Not configured'}
                      </div>
                    </div>
                    {ch.status === 'connected' ? (
                      <span className="dm-badge success">
                        <CheckCircle2 size={11} /> Connected
                      </span>
                    ) : (
                      <span className="dm-badge warning">
                        <AlertTriangle size={11} /> Action Req.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inquiries Requiring Attention & Upcoming Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            {/* Urgent Inquiries Card */}
            <div className="dm-table-card">
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--color-sidebar-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Inquiries Requiring Follow-Up</h4>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Prospective parents awaiting callback or tour arrangement
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('leads')}
                >
                  View All ({leads.length})
                </button>
              </div>

              <div className="dm-table-wrapper">
                <table className="dm-table">
                  <thead>
                    <tr>
                      <th>Student / Parent</th>
                      <th>Class</th>
                      <th>Channel</th>
                      <th>Scheduled Follow-up</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 4).map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <div className="dm-table-title">{lead.studentName}</div>
                          <div className="dm-table-subtitle">
                            {lead.parentName} • {lead.phone}
                          </div>
                        </td>
                        <td>{lead.gradeApplying}</td>
                        <td>{getChannelTag(lead.sourceChannel)}</td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#98440e' }}>
                            {lead.followUpDate || 'Immediate'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setInspectingLead(lead)}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upcoming Content Deadlines */}
            <div className="dm-table-card">
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--color-sidebar-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Scheduled Marketing Posts</h4>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Upcoming social & announcement publications
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('content_calendar')}
                >
                  Calendar ({contentItems.length})
                </button>
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {contentItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setInspectingContent(item)}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: '6px',
                      border: '1px solid #ebd9d6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-text-main)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {item.plannedDate} at {item.publishTime || '10:00'} • {item.channel}
                      </div>
                    </div>
                    <span
                      className={`dm-badge ${
                        item.status === 'approved'
                          ? 'success'
                          : item.status === 'submitted'
                          ? 'warning'
                          : 'neutral'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: CAMPAIGNS                                     */}
      {/* ==================================================== */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Toolbar */}
          <div className="dm-toolbar">
            <div className="dm-toolbar-left">
              <SearchInput
                value={campaignSearch}
                onChange={setCampaignSearch}
                placeholder="Search campaigns by name or goal..."
                ariaLabel="Search marketing campaigns"
                wrapperStyle={{ maxWidth: '300px' }}
              />

              <select
                className="dm-select"
                value={campaignChannelFilter}
                onChange={(e) => setCampaignChannelFilter(e.target.value)}
              >
                <option value="all">All Channels</option>
                <option value="google_search">Google Search</option>
                <option value="meta_ads">Meta Ads Manager</option>
                <option value="instagram">Instagram</option>
                <option value="local_awareness">WhatsApp & Local</option>
              </select>

              <select
                className="dm-select"
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value)}
              >
                <option value="all">All Campaign Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
              </select>

              <select
                className="dm-select"
                value={campaignApprovalFilter}
                onChange={(e) => setCampaignApprovalFilter(e.target.value)}
              >
                <option value="all">All Approvals</option>
                <option value="approved">Principal Approved</option>
                <option value="pending">Approval Pending</option>
                <option value="revision_needed">Revisions Requested</option>
              </select>
            </div>

            <div className="dm-toolbar-right">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateCampaignModal(true)}
              >
                <Plus size={15} /> Create Campaign
              </button>
            </div>
          </div>

          {/* Operational Advisory Warning Banner */}
          <div
            style={{
              padding: '12px 16px',
              background: '#F6F8FC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#574b4a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} style={{ color: 'var(--color-primary)' }} />
              <span>
                <strong>Platform Execution Protocol:</strong> Principal approval authorizes creative and budget within the ERP. Real-time advertising spend and daily auctions must be turned on or paused in your linked Google or Meta Ads accounts.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab('integrations')}
            >
              External Ad Checklist
            </button>
          </div>

          {/* Campaigns Table */}
          <div className="dm-table-card">
            <div className="dm-table-wrapper">
              <table className="dm-table">
                <thead>
                  <tr>
                    <th>Campaign & Objective</th>
                    <th>Channel</th>
                    <th>Duration</th>
                    <th>Budget</th>
                    <th>Spend To Date</th>
                    <th>Impressions / Clicks</th>
                    <th>Inquiries</th>
                    <th>Principal Approval</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                        No advertising campaigns match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((c) => {
                      const spendPct = c.monthlyBudget > 0 ? Math.round((c.spendToDate / c.monthlyBudget) * 100) : 0;
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="dm-table-title">{c.name}</div>
                            <div className="dm-table-subtitle">{c.campaignGoal}</div>
                          </td>
                          <td>{getChannelTag(c.channel)}</td>
                          <td>
                            <div style={{ fontSize: '12px' }}>{c.startDate}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>to {c.endDate}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>₹{c.monthlyBudget.toLocaleString()}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>₹{c.spendToDate.toLocaleString()}</div>
                            <div style={{ fontSize: '10px', color: spendPct > 90 ? '#a51d29' : 'var(--color-text-secondary)' }}>
                              {spendPct}% spent
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{c.impressions.toLocaleString()} imp</span>
                              <span style={{ fontSize: '10px', padding: '1px 4px', background: '#e9f8ef', color: '#17623e', borderRadius: '3px' }}>
                                API
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              {c.clicks.toLocaleString()} clicks
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                              {c.leadsGenerated}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`dm-badge ${
                                c.principalApprovalStatus === 'approved'
                                  ? 'success'
                                  : c.principalApprovalStatus === 'pending'
                                  ? 'warning'
                                  : 'danger'
                              }`}
                            >
                              {c.principalApprovalStatus === 'approved' && <ShieldCheck size={11} />}
                              {c.principalApprovalStatus.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`dm-badge ${
                                c.status === 'active'
                                  ? 'success'
                                  : c.status === 'paused'
                                  ? 'warning'
                                  : 'neutral'
                              }`}
                            >
                              {c.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-right">
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                title="Inspect Campaign Details & Creative"
                                onClick={() => setInspectingCampaign(c)}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                title={c.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                                onClick={() => handleToggleCampaignStatus(c)}
                              >
                                {c.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: CONTENT CALENDAR                              */}
      {/* ==================================================== */}
      {activeTab === 'content_calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Bar */}
          <div className="dm-toolbar">
            <div className="dm-toolbar-left">
              <div style={{ display: 'flex', border: '1px solid #dcd1cf', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  type="button"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: contentViewMode === 'list' ? 'var(--color-primary)' : '#ffffff',
                    color: contentViewMode === 'list' ? '#ffffff' : 'var(--color-text-main)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setContentViewMode('list')}
                >
                  List View
                </button>
                <button
                  type="button"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: contentViewMode === 'calendar' ? 'var(--color-primary)' : '#ffffff',
                    color: contentViewMode === 'calendar' ? '#ffffff' : 'var(--color-text-main)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setContentViewMode('calendar')}
                >
                  Calendar Grid
                </button>
              </div>

              <select
                className="dm-select"
                value={contentChannelFilter}
                onChange={(e) => setContentChannelFilter(e.target.value)}
              >
                <option value="all">All Channels</option>
                <option value="instagram">Instagram Spotlight</option>
                <option value="meta_ads">Meta Ads (Facebook)</option>
                <option value="website">School Website Blog</option>
                <option value="all_social">All Social Media</option>
              </select>

              <select
                className="dm-select"
                value={contentStatusFilter}
                onChange={(e) => setContentStatusFilter(e.target.value)}
              >
                <option value="all">All Post Statuses</option>
                <option value="submitted">Submitted for Approval</option>
                <option value="approved">Principal Approved</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected / Needs Revision</option>
              </select>
            </div>

            <div className="dm-toolbar-right">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateContentModal(true)}
              >
                <Plus size={15} /> Schedule Content
              </button>
            </div>
          </div>

          {/* List View */}
          {contentViewMode === 'list' && (
            <div className="dm-table-card">
              <div className="dm-table-wrapper">
                <table className="dm-table">
                  <thead>
                    <tr>
                      <th>Title & Theme</th>
                      <th>Type</th>
                      <th>Target Channel</th>
                      <th>Scheduled Date & Time</th>
                      <th>Assigned Author</th>
                      <th>Approval Status</th>
                      <th>Publishing Mode</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContent.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                          No content items match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredContent.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="dm-table-title">{item.title}</div>
                            <div className="dm-table-subtitle" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.captionOrCopy}
                            </div>
                          </td>
                          <td>
                            <span className="dm-badge neutral" style={{ textTransform: 'capitalize' }}>
                              {item.contentType.replace('_', ' ')}
                            </span>
                          </td>
                          <td>{getChannelTag(item.channel)}</td>
                          <td>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>{item.plannedDate}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              {item.publishTime || '10:00 AM'}
                            </div>
                          </td>
                          <td style={{ fontSize: '12px' }}>{item.assignedStaffName}</td>
                          <td>
                            <span
                              className={`dm-badge ${
                                item.status === 'approved'
                                  ? 'success'
                                  : item.status === 'submitted'
                                  ? 'warning'
                                  : item.status === 'rejected'
                                  ? 'danger'
                                  : 'neutral'
                              }`}
                            >
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {item.isExternallyPublished ? (
                              <a
                                href={item.publishedUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '11px', color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                Published <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Manual Publish
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setInspectingContent(item)}
                              >
                                <Eye size={13} /> Review
                              </button>
                              <button
                                type="button"
                                className="btn btn-icon btn-sm text-danger"
                                title="Delete Post Draft"
                                onClick={() => handleDeleteContent(item.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar Grid View */}
          {contentViewMode === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="dm-calendar-month-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, idx) => (
                  <div key={idx} className="dm-calendar-day-header">
                    {d}
                  </div>
                ))}

                {/* 28-day representative grid for October-November 2026 */}
                {Array.from({ length: 28 }).map((_, idx) => {
                  const dayNum = idx + 12; // Oct 12 to Nov 8
                  const formattedDate = `2026-10-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                  const dayItems = contentItems.filter((c) => c.plannedDate.endsWith(`-${dayNum}`) || c.plannedDate === formattedDate);
                  const isToday = dayNum === 23; // 23rd October 2026

                  return (
                    <div key={idx} className={`dm-calendar-day-cell ${isToday ? 'today' : ''}`}>
                      <div className="dm-day-number">
                        {dayNum > 31 ? `Nov ${dayNum - 31}` : `Oct ${dayNum}`}
                        {isToday && <span style={{ fontSize: '10px', color: 'var(--color-primary)', marginLeft: '4px' }}>(Today)</span>}
                      </div>

                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="dm-calendar-item-pill"
                          onClick={() => setInspectingContent(item)}
                          title={`${item.title} (${item.status})`}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: item.status === 'approved' ? '#17623e' : '#98440e',
                            }}
                          />
                          <span>{item.title}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: ADMISSION LEADS                               */}
      {/* ==================================================== */}
      {activeTab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Toolbar */}
          <div className="dm-toolbar">
            <div className="dm-toolbar-left">
              <SearchInput
                value={leadSearch}
                onChange={setLeadSearch}
                placeholder="Search by student, parent, phone..."
                ariaLabel="Search leads"
                wrapperStyle={{ maxWidth: '300px' }}
              />

              <select
                className="dm-select"
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
              >
                <option value="all">All Inquiry Stages</option>
                <option value="new">New Inquiries</option>
                <option value="contacted">Contacted</option>
                <option value="campus_tour_scheduled">Tour Scheduled</option>
                <option value="application_submitted">Application Submitted</option>
                <option value="enrolled">Enrolled / Confirmed</option>
              </select>

              <select
                className="dm-select"
                value={leadChannelFilter}
                onChange={(e) => setLeadChannelFilter(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="google_search">Google Search</option>
                <option value="meta_ads">Meta Ads (Facebook)</option>
                <option value="instagram">Instagram</option>
                <option value="local_awareness">WhatsApp & Local</option>
              </select>

              <select
                className="dm-select"
                value={leadGradeFilter}
                onChange={(e) => setLeadGradeFilter(e.target.value)}
              >
                <option value="all">All Grades</option>
                <option value="Kindergarten (PP-1)">Kindergarten</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 9">Grade 9</option>
              </select>
            </div>

            <div className="dm-toolbar-right">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateLeadModal(true)}
              >
                <Plus size={15} /> Add Inbound Lead
              </button>
            </div>
          </div>

          {/* Admission Leads Table */}
          <div className="dm-table-card">
            <div className="dm-table-wrapper">
              <table className="dm-table">
                <thead>
                  <tr>
                    <th>Inquiry Date</th>
                    <th>Student / Prospect</th>
                    <th>Guardian Contact</th>
                    <th>Grade Applying</th>
                    <th>Source Channel</th>
                    <th>Inquiry Status</th>
                    <th>Next Action</th>
                    <th>Official ERP Application</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                        No admission inquiries found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <div style={{ fontSize: '12px' }}>{lead.receivedAt.split(' ')[0]}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {lead.receivedAt.split(' ')[1] || ''}
                          </div>
                        </td>
                        <td>
                          <div className="dm-table-title">{lead.studentName}</div>
                          <div className="dm-table-subtitle">{lead.id}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{lead.parentName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {lead.phone} • {lead.email}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{lead.gradeApplying}</td>
                        <td>{getChannelTag(lead.sourceChannel)}</td>
                        <td>
                          <span
                            className={`dm-badge ${
                              lead.status === 'enrolled'
                                ? 'success'
                                : lead.status === 'application_submitted'
                                ? 'info'
                                : lead.status === 'new'
                                ? 'danger'
                                : 'warning'
                            }`}
                          >
                            {lead.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {lead.followUpDate ? (
                            <div style={{ fontSize: '12px', color: '#98440e', fontWeight: 600 }}>
                              Follow-up: {lead.followUpDate}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {lead.convertedApplicationNo ? (
                            <span
                              className="dm-badge success"
                              style={{ fontWeight: 700, fontFamily: 'monospace' }}
                              title="Linked to official Admissions Application record"
                            >
                              <LinkIcon size={11} /> #{lead.convertedApplicationNo}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => setConvertingLead(lead)}
                            >
                              Convert to ERP
                            </button>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="Inspect Lead & Update Status"
                            onClick={() => setInspectingLead(lead)}
                          >
                            <Edit size={13} /> Update
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: ANALYTICS                                     */}
      {/* ==================================================== */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Channel Performance Breakdown */}
          <div className="dm-table-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
              Multi-Channel Attribution Matrix
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              Performance breakdown across search, paid social, and direct local community engagement
            </p>

            <div className="dm-table-wrapper">
              <table className="dm-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Attributed Spend</th>
                    <th>Clicks Delivered</th>
                    <th>Inquiries Generated</th>
                    <th>Cost Per Lead</th>
                    <th>Enrollment Conversions</th>
                    <th>Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { channel: 'google_search', name: 'Google Ads Search & Local PMax', spend: 35000, clicks: 1420, leads: 42, enroll: 7 },
                    { channel: 'meta_ads', name: 'Meta Ads Manager (Facebook)', spend: 21000, clicks: 1250, leads: 38, enroll: 4 },
                    { channel: 'instagram', name: 'Instagram Spotlight', spend: 12000, clicks: 680, leads: 15, enroll: 2 },
                    { channel: 'local_awareness', name: 'WhatsApp & Local Microsites', spend: 8500, clicks: 410, leads: 12, enroll: 1 },
                  ].map((row, idx) => {
                    const cpl = row.leads > 0 ? Math.round(row.spend / row.leads) : 0;
                    const convRate = row.leads > 0 ? ((row.enroll / row.leads) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx}>
                        <td>{getChannelTag(row.channel)}</td>
                        <td style={{ fontWeight: 600 }}>₹{row.spend.toLocaleString()}</td>
                        <td>{row.clicks.toLocaleString()}</td>
                        <td style={{ fontWeight: 700 }}>{row.leads}</td>
                        <td style={{ fontWeight: 600 }}>₹{cpl}</td>
                        <td style={{ fontWeight: 700, color: '#17623e' }}>{row.enroll}</td>
                        <td style={{ fontWeight: 600 }}>{convRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attribution & Data Transparency Disclosure */}
          <div
            style={{
              padding: '16px 20px',
              background: '#ffffff',
              border: '1px solid var(--color-sidebar-border)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
              color: '#574b4a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--color-primary)' }}>
              <Info size={16} /> Attribution Methodology & Platform Reporting Transparency
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              1. <strong>Platform Sync:</strong> Ad impression and click figures are reported by Google Ads and Meta Pixel integrations.
              <br />
              2. <strong>First-Party ERP Linkage:</strong> Inquiries, campus tour confirmations, and admissions are tracked directly inside the school ERP database via unique inquiry references, eliminating duplicate counting.
              <br />
              3. <strong>Offline Privacy:</strong> Guardian phone numbers and financial details are kept strictly within the school's local database partition and never sent back to external marketing networks.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: REPORTS                                       */}
      {/* ==================================================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls */}
          <div className="dm-toolbar">
            <div className="dm-toolbar-left">
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Select Reporting Period:</label>
              <select
                className="dm-select"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
              >
                <option value="Academic Year 2026-2027">Academic Year 2026-2027</option>
                <option value="Quarter 3 (Autumn 2026)">Quarter 3 (Autumn 2026)</option>
                <option value="Month of October 2026">Month of October 2026</option>
                <option value="Past 30 Days">Past 30 Days</option>
              </select>
            </div>

            <div className="dm-toolbar-right">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Official Report
              </button>
            </div>
          </div>

          {/* Printable Report Sheet */}
          <div className="dm-report-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #3B82F6', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#19191f' }}>
                  {reportData.schoolName}
                </h2>
                <div style={{ fontSize: '13px', color: '#71717a', marginTop: '2px' }}>
                  Executive Digital Marketing & Admission Acquisition Report
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#71717a' }}>
                <div><strong>Period:</strong> {reportData.periodLabel}</div>
                <div><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleDateString()}</div>
                <div><strong>Prepared By:</strong> {reportData.generatedBy}</div>
              </div>
            </div>

            {/* Report KPI Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', background: '#F6F8FC', padding: '16px', borderRadius: '6px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>TOTAL ALLOCATED BUDGET</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>₹{reportData.totalBudget.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>ACTUAL AD EXPENDITURE</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>₹{reportData.totalSpend.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>TOTAL QUALIFIED LEADS</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{reportData.totalLeads} Inquiries</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>CONFIRMED ADMISSIONS</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#17623e' }}>{reportData.totalEnrolled} Students</div>
              </div>
            </div>

            {/* Campaign Breakdown Table */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700 }}>Campaign Performance Breakdown</h4>
              <table className="dm-table" style={{ border: '1px solid #ebd9d6' }}>
                <thead>
                  <tr>
                    <th>Campaign Name</th>
                    <th>Channel</th>
                    <th>Allocated Budget</th>
                    <th>Actual Spend</th>
                    <th>Inquiries</th>
                    <th>Enrolled</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.campaignsSummary.map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.channel}</td>
                      <td>₹{c.budget.toLocaleString()}</td>
                      <td>₹{c.spend.toLocaleString()}</td>
                      <td style={{ fontWeight: 700 }}>{c.leads}</td>
                      <td style={{ fontWeight: 700, color: '#17623e' }}>{c.conversions}</td>
                      <td>{c.status.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Operational Notes */}
            <div style={{ fontSize: '11px', color: '#71717a', borderTop: '1px solid #ebd9d6', paddingTop: '12px' }}>
              <strong>Operational Compliance & Notes:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                {reportData.operationalNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 7: INTEGRATIONS & SETTINGS                       */}
      {/* ==================================================== */}
      {activeTab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Channels Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {integrations.map((ch, idx) => (
              <div key={idx} className="dm-table-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} style={{ color: 'var(--color-primary)' }} />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{ch.name}</h4>
                  </div>
                  {ch.status === 'connected' ? (
                    <span className="dm-badge success">
                      <CheckCircle2 size={11} /> Connected
                    </span>
                  ) : (
                    <span className="dm-badge warning">
                      <AlertTriangle size={11} /> Action Required
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Account / Pixel ID:</strong> {ch.accountOrPixelId || 'Not Configured'}</div>
                  <div><strong>Last Synchronized:</strong> {ch.lastSyncedAt ? new Date(ch.lastSyncedAt).toLocaleString() : 'Never'}</div>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addToast('info', 'Integration Status', `${ch.name} credentials verified.`)}
                  >
                    Verify Connection
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inbound Webhook URL Card */}
          <div className="dm-table-card" style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>
              Website Landing Page Webhook Capture
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Direct HTTP POST endpoint for capturing parent admission inquiry submissions from the school's public website or micro-sites.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                readOnly
                className="dm-form-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px', background: 'var(--color-bg-subtle)' }}
                value={`https://api.novalytix.com/v1/inbound-leads/${effectiveSchoolId}`}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(`https://api.novalytix.com/v1/inbound-leads/${effectiveSchoolId}`);
                  addToast('success', 'Copied', 'Webhook URL copied to clipboard.');
                }}
              >
                Copy URL
              </button>
            </div>
          </div>

          {/* Operational Advisory Checklist */}
          <div className="dm-table-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#98440e' }} />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                External Advertising Deactivation Advisory Checklist
              </h4>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Disabling the Digital Marketing module within the ERP stops internal tracking and lead capture, but <strong>DOES NOT</strong> cancel active campaigns running on third-party ad networks. School administrators must manually pause campaigns on external platforms:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {externalChecklist.map((step) => (
                <div
                  key={step.step}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--color-bg-subtle)',
                    borderRadius: '6px',
                    border: '1px solid #ebd9d6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {step.step}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{step.channel}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {step.instruction}
                      </div>
                    </div>
                  </div>

                  <a
                    href={step.directLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Open Platform <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE CAMPAIGN                               */}
      {/* ==================================================== */}
      {showCreateCampaignModal && (
        <div className="dm-modal-overlay" onClick={() => setShowCreateCampaignModal(false)}>
          <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3 className="dm-modal-title">Create Advertising Campaign</h3>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setShowCreateCampaignModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div className="dm-modal-body">
                <div className="dm-form-group">
                  <label className="dm-form-label">Campaign Title *</label>
                  <input
                    type="text"
                    required
                    className="dm-form-input"
                    placeholder="e.g. Nursery Admissions Spring 2026 Drive"
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Channel</label>
                    <select
                      className="dm-form-select"
                      value={campChannel}
                      onChange={(e) => setCampChannel(e.target.value as MarketingChannel)}
                    >
                      <option value="google_search">Google Ads Search & PMax</option>
                      <option value="meta_ads">Meta Ads Manager (Facebook)</option>
                      <option value="instagram">Instagram Spotlight</option>
                      <option value="local_awareness">WhatsApp & Local Microsites</option>
                    </select>
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-form-label">Allocated Budget (₹) *</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      className="dm-form-input"
                      value={campBudget}
                      onChange={(e) => setCampBudget(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Campaign Objective / Goal</label>
                  <input
                    type="text"
                    className="dm-form-input"
                    value={campGoal}
                    onChange={(e) => setCampGoal(e.target.value)}
                  />
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Target Audience / Geolocation</label>
                  <input
                    type="text"
                    className="dm-form-input"
                    value={campTarget}
                    onChange={(e) => setCampTarget(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Start Date</label>
                    <input
                      type="date"
                      className="dm-form-input"
                      value={campStartDate}
                      onChange={(e) => setCampStartDate(e.target.value)}
                    />
                  </div>
                  <div className="dm-form-group">
                    <label className="dm-form-label">End Date</label>
                    <input
                      type="date"
                      className="dm-form-input"
                      value={campEndDate}
                      onChange={(e) => setCampEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Landing Page / Creative URL</label>
                  <input
                    type="url"
                    className="dm-form-input"
                    placeholder="https://yourschool.edu.in/admissions-2026"
                    value={campCreativeUrl}
                    onChange={(e) => setCampCreativeUrl(e.target.value)}
                  />
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Campaign Operational Notes</label>
                  <textarea
                    rows={2}
                    className="dm-form-textarea"
                    placeholder="Strategic keywords, ad copy themes, target demographic notes..."
                    value={campNotes}
                    onChange={(e) => setCampNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="dm-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateCampaignModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Campaign Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CAMPAIGN INSPECTOR & PRINCIPAL REVIEW         */}
      {/* ==================================================== */}
      {inspectingCampaign && (
        <div className="dm-modal-overlay" onClick={() => setInspectingCampaign(null)}>
          <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <div>
                <h3 className="dm-modal-title">{inspectingCampaign.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  ID: {inspectingCampaign.id} • {inspectingCampaign.channel}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setInspectingCampaign(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="dm-modal-body">
              {/* Metric Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#F6F8FC', padding: '14px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Budget</div>
                  <div style={{ fontWeight: 800 }}>₹{inspectingCampaign.monthlyBudget.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Spend to Date</div>
                  <div style={{ fontWeight: 800 }}>₹{inspectingCampaign.spendToDate.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Inquiries</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{inspectingCampaign.leadsGenerated}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Approval Status</div>
                  <div style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                    {inspectingCampaign.principalApprovalStatus}
                  </div>
                </div>
              </div>

              <div>
                <strong>Campaign Goal:</strong> {inspectingCampaign.campaignGoal}
              </div>
              <div>
                <strong>Target Audience:</strong> {inspectingCampaign.targetAudience}
              </div>
              {inspectingCampaign.creativeUrl && (
                <div>
                  <strong>Creative URL:</strong>{' '}
                  <a href={inspectingCampaign.creativeUrl} target="_blank" rel="noreferrer">
                    {inspectingCampaign.creativeUrl}
                  </a>
                </div>
              )}
              {inspectingCampaign.notes && (
                <div style={{ fontSize: '12px', background: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
                  <strong>Operational Notes:</strong>
                  <p style={{ margin: '4px 0 0 0' }}>{inspectingCampaign.notes}</p>
                </div>
              )}

              {/* Principal Review & Approval Form */}
              <div style={{ borderTop: '1px solid #ebd9d6', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
                  Principal Creative & Budget Approval
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Authorizes educational representation and budget utilization for the school.
                </p>

                <textarea
                  rows={2}
                  className="dm-form-textarea"
                  placeholder="Principal feedback or authorization remarks..."
                  value={principalReviewComment}
                  onChange={(e) => setPrincipalReviewComment(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handlePrincipalCampaignApproval(true)}
                  >
                    <CheckSquare size={14} /> Approve Campaign
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handlePrincipalCampaignApproval(false)}
                  >
                    Request Revisions
                  </button>
                </div>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectingCampaign(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE LEAD                                   */}
      {/* ==================================================== */}
      {showCreateLeadModal && (
        <div className="dm-modal-overlay" onClick={() => setShowCreateLeadModal(false)}>
          <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3 className="dm-modal-title">Record Admission Lead / Inquiry</h3>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setShowCreateLeadModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLead}>
              <div className="dm-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Student / Prospect Name *</label>
                    <input
                      type="text"
                      required
                      className="dm-form-input"
                      placeholder="e.g. Aarav Sharma"
                      value={leadStudent}
                      onChange={(e) => setLeadStudent(e.target.value)}
                    />
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-form-label">Grade Applying For *</label>
                    <select
                      className="dm-form-select"
                      value={leadGrade}
                      onChange={(e) => setLeadGrade(e.target.value)}
                    >
                      <option value="Kindergarten (PP-1)">Kindergarten (PP-1)</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Guardian / Parent Name *</label>
                    <input
                      type="text"
                      required
                      className="dm-form-input"
                      placeholder="e.g. Ramesh Sharma"
                      value={leadParent}
                      onChange={(e) => setLeadParent(e.target.value)}
                    />
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-form-label">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      className="dm-form-input"
                      placeholder="+91 98450 12345"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Guardian Email</label>
                    <input
                      type="email"
                      className="dm-form-input"
                      placeholder="guardian@example.com"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                    />
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-form-label">Source Channel</label>
                    <select
                      className="dm-form-select"
                      value={leadChannel}
                      onChange={(e) => setLeadChannel(e.target.value as MarketingChannel)}
                    >
                      <option value="google_search">Google Search Ad</option>
                      <option value="meta_ads">Meta Ads (Facebook)</option>
                      <option value="instagram">Instagram Spotlight</option>
                      <option value="local_awareness">WhatsApp / Local</option>
                    </select>
                  </div>
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Next Action / Follow-up Date</label>
                  <input
                    type="date"
                    className="dm-form-input"
                    value={leadFollowUp}
                    onChange={(e) => setLeadFollowUp(e.target.value)}
                  />
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Inquiry Notes / Specific Questions</label>
                  <textarea
                    rows={2}
                    className="dm-form-textarea"
                    placeholder="Specific questions about transport, curriculum, fee structure..."
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="dm-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateLeadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Inbound Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: LEAD INSPECTOR & STAGE UPDATE                 */}
      {/* ==================================================== */}
      {inspectingLead && (
        <div className="dm-modal-overlay" onClick={() => setInspectingLead(null)}>
          <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <div>
                <h3 className="dm-modal-title">{inspectingLead.studentName}</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Guardian: {inspectingLead.parentName} • {inspectingLead.phone}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setInspectingLead(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="dm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#F6F8FC', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Grade Applying</div>
                  <div style={{ fontWeight: 700 }}>{inspectingLead.gradeApplying}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Source Channel</div>
                  <div style={{ fontWeight: 600 }}>{inspectingLead.sourceChannel}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Current Stage</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {inspectingLead.status.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              <div>
                <strong>Inquiry History & Notes:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', background: '#f9f9f9', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                  {inspectingLead.inquiryNotes}
                </p>
              </div>

              {/* Stage Update Section */}
              <div style={{ borderTop: '1px solid #ebd9d6', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Update Inquiry Stage & Log Call Note</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Next Stage</label>
                    <select
                      className="dm-form-select"
                      value={leadStageUpdate}
                      onChange={(e) => setLeadStageUpdate(e.target.value as MarketingLeadStatus)}
                    >
                      <option value="new">New Inquiry</option>
                      <option value="contacted">Contacted via Phone/Email</option>
                      <option value="campus_tour_scheduled">Campus Walkthrough Scheduled</option>
                      <option value="application_submitted">Application Form Submitted</option>
                      <option value="enrolled">Enrolled / Confirmed Admission</option>
                      <option value="dropped">Not Interested / Dropped</option>
                    </select>
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-form-label">Counselor Call / Interaction Note</label>
                    <input
                      type="text"
                      className="dm-form-input"
                      placeholder="e.g. Parent confirmed campus visit for Saturday"
                      value={leadFollowUpNote}
                      onChange={(e) => setLeadFollowUpNote(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  {!inspectingLead.convertedApplicationNo && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        const l = inspectingLead;
                        setInspectingLead(null);
                        setConvertingLead(l);
                      }}
                    >
                      <LinkIcon size={13} /> Convert to Official ERP Admission
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleUpdateLeadStatus}
                  >
                    Save Stage Update
                  </button>
                </div>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectingLead(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CONVERT LEAD TO ERP ADMISSION                 */}
      {/* ==================================================== */}
      {convertingLead && (
        <div className="dm-modal-overlay" onClick={() => setConvertingLead(null)}>
          <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3 className="dm-modal-title">Convert Lead to Official ERP Admission</h3>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setConvertingLead(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="dm-modal-body">
              <div
                style={{
                  padding: '12px 14px',
                  background: '#e9f8ef',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#17623e',
                }}
              >
                <strong>Direct ERP Admissions Linkage:</strong> Converting this lead will register an official <code>APP-2026-xxxx</code> record directly inside the school's central Admissions Desk without creating duplicate student profiles.
              </div>

              <div>
                <strong>Applicant:</strong> {convertingLead.studentName} (Applying for {convertingLead.gradeApplying})
                <br />
                <strong>Parent:</strong> {convertingLead.parentName} ({convertingLead.phone})
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="dm-form-group">
                  <label className="dm-form-label">Student Date of Birth</label>
                  <input
                    type="date"
                    className="dm-form-input"
                    value={convDob}
                    onChange={(e) => setConvDob(e.target.value)}
                  />
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Gender</label>
                  <select
                    className="dm-form-select"
                    value={convGender}
                    onChange={(e) => setConvGender(e.target.value as any)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="dm-form-group">
                <label className="dm-form-label">Permanent / Communication Address</label>
                <input
                  type="text"
                  className="dm-form-input"
                  value={convAddress}
                  onChange={(e) => setConvAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="dm-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConvertingLead(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteConvertLeadToAdmission}
              >
                Confirm Official ERP Enrollment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE CONTENT ITEM                           */}
      {/* ==================================================== */}
      {showCreateContentModal && (
        <div className="dm-modal-overlay" onClick={() => setShowCreateContentModal(false)}>
          <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <h3 className="dm-modal-title">Schedule Marketing Content</h3>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setShowCreateContentModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateContent}>
              <div className="dm-modal-body">
                <div className="dm-form-group">
                  <label className="dm-form-label">Post / Article Title *</label>
                  <input
                    type="text"
                    required
                    className="dm-form-input"
                    placeholder="e.g. Highlights from Annual Robotics Exhibition 2026"
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Content Type</label>
                    <select
                      className="dm-form-select"
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value as MarketingContentType)}
                    >
                      <option value="social_post">Social Media Post</option>
                      <option value="admission_announcement">Admission Announcement</option>
                      <option value="website_article">Website Editorial / Blog</option>
                      <option value="event_coverage">School Event Coverage</option>
                      <option value="campaign_creative">Campaign Ad Creative</option>
                      <option value="seo_update">Local SEO Content</option>
                    </select>
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-form-label">Target Channel</label>
                    <select
                      className="dm-form-select"
                      value={contentChannel}
                      onChange={(e) => setContentChannel(e.target.value as any)}
                    >
                      <option value="instagram">Instagram Official Spotlight</option>
                      <option value="meta_ads">Meta Facebook Channel</option>
                      <option value="website">School Website Blog</option>
                      <option value="all_social">All Connected Social Channels</option>
                      <option value="newsletter">Email Newsletter to Parents</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="dm-form-group">
                    <label className="dm-form-label">Scheduled Publication Date</label>
                    <input
                      type="date"
                      className="dm-form-input"
                      value={contentPlannedDate}
                      onChange={(e) => setContentPlannedDate(e.target.value)}
                    />
                  </div>

                  <div className="dm-form-group">
                    <label className="dm-form-label">Publish Time</label>
                    <input
                      type="time"
                      className="dm-form-input"
                      value={contentPublishTime}
                      onChange={(e) => setContentPublishTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Copy / Caption Text *</label>
                  <textarea
                    rows={3}
                    required
                    className="dm-form-textarea"
                    placeholder="Enter copy, announcement details, hashtags, or blog excerpt..."
                    value={contentCopy}
                    onChange={(e) => setContentCopy(e.target.value)}
                  />
                </div>

                <div className="dm-form-group">
                  <label className="dm-form-label">Media Attachment / Creative Notes</label>
                  <input
                    type="text"
                    className="dm-form-input"
                    placeholder="e.g. 1080x1080 graphic with school crest, or drone video reel clip"
                    value={contentMediaDesc}
                    onChange={(e) => setContentMediaDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="dm-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateContentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit for Principal Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CONTENT INSPECTOR & PRINCIPAL REVIEW          */}
      {/* ==================================================== */}
      {inspectingContent && (
        <div className="dm-modal-overlay" onClick={() => setInspectingContent(null)}>
          <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dm-modal-header">
              <div>
                <h3 className="dm-modal-title">{inspectingContent.title}</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {inspectingContent.contentType.replace('_', ' ')} • {inspectingContent.channel}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setInspectingContent(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="dm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#F6F8FC', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Planned Date</div>
                  <div style={{ fontWeight: 700 }}>{inspectingContent.plannedDate} at {inspectingContent.publishTime || '10:00'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Assigned Staff</div>
                  <div style={{ fontWeight: 600 }}>{inspectingContent.assignedStaffName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Status</div>
                  <div style={{ fontWeight: 700, color: inspectingContent.status === 'approved' ? '#17623e' : '#98440e' }}>
                    {inspectingContent.status.toUpperCase()}
                  </div>
                </div>
              </div>

              <div>
                <strong>Caption / Post Copy:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', background: '#f9f9f9', padding: '12px', borderRadius: '6px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {inspectingContent.captionOrCopy}
                </p>
              </div>

              {inspectingContent.mediaUrlOrDesc && (
                <div>
                  <strong>Creative / Media Notes:</strong>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {inspectingContent.mediaUrlOrDesc}
                  </div>
                </div>
              )}

              {inspectingContent.principalApprovalNotes && (
                <div style={{ padding: '10px 12px', background: '#e9f8ef', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '12px' }}>
                  <strong>Principal Remarks ({inspectingContent.approvedBy || 'Principal'}):</strong>
                  <div style={{ marginTop: '2px' }}>{inspectingContent.principalApprovalNotes}</div>
                </div>
              )}

              {/* Principal Action Box */}
              <div style={{ borderTop: '1px solid #ebd9d6', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
                  Principal Review & Content Approval
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Approve content for publishing to school channels or request modifications.
                </p>

                <textarea
                  rows={2}
                  className="dm-form-textarea"
                  placeholder="Principal feedback or authorization remarks..."
                  value={principalReviewComment}
                  onChange={(e) => setPrincipalReviewComment(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handlePrincipalContentReview(true)}
                  >
                    <CheckSquare size={14} /> Approve for Publishing
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handlePrincipalContentReview(false)}
                  >
                    Request Modifications
                  </button>
                </div>
              </div>
            </div>

            <div className="dm-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectingContent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
