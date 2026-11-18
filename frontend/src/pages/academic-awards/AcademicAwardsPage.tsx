import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, LayoutDashboard, Award, Users, Layers, Calendar, FileCheck, Clock, BarChart3, Sparkles, ShieldCheck, X } from 'lucide-react';
import './AcademicAwards.css';
import { useERP } from '../../context/ERPContext';
import { academicAwardsService } from '../../services/academicAwardsService';
import { AcademicAward, StaffRecognition as StaffRecognitionType, AwardCategory, CompetitionEvent, AwardCertificate, AwardsAnalyticsSummary } from '../../types/academicAwards';

// Subcomponents
import { AwardsDashboard } from './AwardsDashboard';
import { StudentAwards } from './StudentAwards';
import { StaffRecognition } from './StaffRecognition';
import { AwardCategories } from './AwardCategories';
import { CompetitionsEvents } from './CompetitionsEvents';
import { Certificates } from './Certificates';
import { ApprovalRequests } from './ApprovalRequests';
import { AwardsReports } from './AwardsReports';
import { AwardGallery } from './AwardGallery';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
}

export const AcademicAwardsPage: React.FC = () => {
  const { currentRole, currentUser } = useERP();

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Module Data States
  const [awards, setAwards] = useState<AcademicAward[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionEvent[]>([]);
  const [staffRecognitions, setStaffRecognitions] = useState<StaffRecognitionType[]>([]);
  const [certificates, setCertificates] = useState<AwardCertificate[]>([]);
  const [analytics, setAnalytics] = useState<AwardsAnalyticsSummary>({
    totalAwards: 0,
    pendingApprovals: 0,
    approvedAwards: 0,
    publishedWall: 0,
    totalStaffRecognitions: 0,
    categoryDistribution: [],
    levelDistribution: [],
    recentAchievements: [],
  });

  // Modal inspection states
  const [inspectAward, setInspectAward] = useState<AcademicAward | null>(null);
  const [activeCertificatePreview, setActiveCertificatePreview] = useState<AwardCertificate | null>(null);

  // Reload data from service
  const refreshData = useCallback(() => {
    const allAwards = academicAwardsService.getAwards();
    const allCats = academicAwardsService.getCategories();
    const allComps = academicAwardsService.getCompetitions();
    const allStaff = academicAwardsService.getStaffRecognitions();
    const allCerts = academicAwardsService.getCertificates();
    const summary = academicAwardsService.getAnalyticsSummary();

    setAwards(allAwards);
    setCategories(allCats);
    setCompetitions(allComps);
    setStaffRecognitions(allStaff);
    setCertificates(allCerts);
    setAnalytics(summary);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Tab definitions based on role
  const tabList = useMemo(() => {
    const isStaffOrAdmin = currentRole === 'school_admin' || currentRole === 'teacher' || currentRole === 'super_admin';

    const base: TabItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'gallery', label: 'Wall of Fame', icon: Sparkles },
      { id: 'student_awards', label: 'Student Awards', icon: Trophy },
      { id: 'certificates', label: 'Certificates & Verification', icon: FileCheck },
    ];

    if (isStaffOrAdmin) {
      base.splice(3, 0,
        { id: 'staff', label: 'Faculty Recognition', icon: Users },
        { id: 'events', label: 'Competitions & Meets', icon: Calendar },
        { id: 'categories', label: 'Award Categories', icon: Layers },
      );

      base.push(
        {
          id: 'approvals',
          label: 'Approval Requests',
          icon: Clock,
          badge: analytics.pendingApprovals > 0 ? analytics.pendingApprovals : undefined,
        },
        { id: 'reports', label: 'Awards Reports', icon: BarChart3 }
      );
    }

    return base;
  }, [currentRole, analytics.pendingApprovals]);

  // Handler functions
  const handleSaveAward = (data: Partial<AcademicAward>) => {
    if (data.id) {
      academicAwardsService.updateAward(data.id, data, {
        id: currentUser.id,
        name: currentUser.name,
      });
    } else {
      academicAwardsService.createAward(data, {
        id: currentUser.id,
        name: currentUser.name,
      });
    }
    refreshData();
  };

  const handleDeleteAward = (id: string) => {
    academicAwardsService.deleteAward(id);
    refreshData();
  };

  const handleSubmitAward = (id: string) => {
    academicAwardsService.submitAward(id, {
      id: currentUser.id,
      name: currentUser.name,
    });
    refreshData();
  };

  const handleReviewAward = (id: string) => {
    academicAwardsService.reviewAward(id, {
      id: currentUser.id,
      name: currentUser.name,
    });
    refreshData();
  };

  const handleApproveAward = (id: string, remarks?: string) => {
    academicAwardsService.approveAward(id, {
      id: currentUser.id,
      name: currentUser.name,
    }, remarks);
    refreshData();
  };

  const handleRejectAward = (id: string, reason: string) => {
    academicAwardsService.rejectAward(id, {
      id: currentUser.id,
      name: currentUser.name,
    }, reason);
    refreshData();
  };

  const handlePublishAward = (id: string, remarks?: string) => {
    academicAwardsService.publishAward(id, {
      id: currentUser.id,
      name: currentUser.name,
    }, remarks);
    refreshData();
  };

  const handleSaveCategory = (cat: Partial<AwardCategory>) => {
    if (cat.id) {
      academicAwardsService.updateCategory(cat.id, cat);
    } else {
      academicAwardsService.createCategory(cat);
    }
    refreshData();
  };

  const handleDeleteCategory = (id: string) => {
    academicAwardsService.deleteCategory(id);
    refreshData();
  };

  const handleSaveCompetition = (comp: Partial<CompetitionEvent>) => {
    if (comp.id) {
      academicAwardsService.updateCompetition(comp.id, comp);
    } else {
      academicAwardsService.createCompetition(comp);
    }
    refreshData();
  };

  const handleDeleteCompetition = (id: string) => {
    academicAwardsService.deleteCompetition(id);
    refreshData();
  };

  const handleSaveStaffRecognition = (rec: Partial<StaffRecognitionType>) => {
    academicAwardsService.createStaffRecognition(rec);
    refreshData();
  };

  const handleDeleteStaffRecognition = (id: string) => {
    academicAwardsService.deleteStaffRecognition(id);
    refreshData();
  };

  const handleIssueCertificate = (payload: any) => {
    const res = academicAwardsService.issueCertificate(payload);
    refreshData();
    if (res.data) {
      setActiveCertificatePreview(res.data);
    }
  };

  const handleOpenCertificateForAward = (award: AcademicAward) => {
    // Find or issue certificate
    let cert = certificates.find(c => c.awardId === award.id);
    if (!cert) {
      const issued = academicAwardsService.issueCertificate({
        awardId: award.id,
        template: 'academic_excellence',
      });
      refreshData();
      cert = issued.data;
    }
    if (cert) {
      setActiveCertificatePreview(cert);
    }
  };

  const handleOpenCertificateForStaff = (rec: StaffRecognitionType) => {
    let cert = certificates.find(c => c.recognitionId === rec.id);
    if (!cert) {
      const issued = academicAwardsService.issueCertificate({
        recognitionId: rec.id,
        template: 'staff_appreciation',
      });
      refreshData();
      cert = issued.data;
    }
    if (cert) {
      setActiveCertificatePreview(cert);
    }
  };

  return (
    <div className="awards-module-container">
      {/* 1. Header Banner */}
      <div className="awards-header-banner">
        <div className="awards-header-title-area">
          <div className="awards-header-pill">
            <Trophy size={14} />
            Academic & Co-Curricular Honours System
          </div>
          <h1 className="awards-header-title">Awards & Achievements Management</h1>
          <p className="awards-header-subtitle">
            Comprehensive lifecycle tracking for scholastic excellence, STEM Olympiads, sports championships, faculty recognitions, and verified credentials.
          </p>
        </div>

        <div className="awards-header-actions">
          <button className="awards-btn-outline-white" onClick={() => setActiveTab('gallery')}>
            <Sparkles size={16} />
            Wall of Fame
          </button>
          <button className="awards-btn-light" onClick={() => setActiveTab('certificates')}>
            <ShieldCheck size={16} />
            Verify Certificate
          </button>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="awards-tabs-container">
        {tabList.map(tab => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`awards-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="awards-tab-badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Sub-View Content */}
      {activeTab === 'dashboard' && (
        <AwardsDashboard
          analytics={analytics}
          onNavigateTab={setActiveTab}
          onViewAward={setInspectAward}
        />
      )}

      {activeTab === 'gallery' && (
        <AwardGallery
          awards={awards}
          categories={categories}
          onViewCertificate={handleOpenCertificateForAward}
          onViewAward={setInspectAward}
        />
      )}

      {activeTab === 'student_awards' && (
        <StudentAwards
          awards={awards}
          categories={categories}
          onSaveAward={handleSaveAward}
          onDeleteAward={handleDeleteAward}
          onSubmitAward={handleSubmitAward}
          onViewCertificate={handleOpenCertificateForAward}
          onViewAward={setInspectAward}
        />
      )}

      {activeTab === 'staff' && (
        <StaffRecognition
          recognitions={staffRecognitions}
          onSaveRecognition={handleSaveStaffRecognition}
          onDeleteRecognition={handleDeleteStaffRecognition}
          onViewStaffCertificate={handleOpenCertificateForStaff}
        />
      )}

      {activeTab === 'categories' && (
        <AwardCategories
          categories={categories}
          awards={awards}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {activeTab === 'events' && (
        <CompetitionsEvents
          competitions={competitions}
          categories={categories}
          awards={awards}
          onSaveCompetition={handleSaveCompetition}
          onDeleteCompetition={handleDeleteCompetition}
        />
      )}

      {activeTab === 'certificates' && (
        <Certificates
          certificates={certificates}
          awards={awards}
          staffRecognitions={staffRecognitions}
          onIssueCertificate={handleIssueCertificate}
          onVerifyCode={academicAwardsService.verifyCertificate}
        />
      )}

      {activeTab === 'approvals' && (
        <ApprovalRequests
          awards={awards}
          onApproveAward={handleApproveAward}
          onRejectAward={handleRejectAward}
          onPublishAward={handlePublishAward}
          onReviewAward={handleReviewAward}
          onViewAward={setInspectAward}
        />
      )}

      {activeTab === 'reports' && (
        <AwardsReports awards={awards} categories={categories} />
      )}

      {/* Award Details Modal */}
      {inspectAward && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box">
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <Trophy size={20} color="#3B82F6" />
                Award Details & Verification Dossier
              </h3>
              <button className="awards-modal-close-btn" onClick={() => setInspectAward(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="awards-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <img
                  src={inspectAward.photoUrl || '/student-male.svg'}
                  alt={inspectAward.studentName}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '3px solid #3B82F6',
                  }}
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/student-male.svg';
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                    {inspectAward.studentName}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {inspectAward.className} ({inspectAward.section}) • Admission No: {inspectAward.admissionNo} • Roll: {inspectAward.rollNo || 'N/A'}
                  </div>
                  <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.4rem' }}>
                    <span className={`award-status-badge status-${inspectAward.status}`}>
                      {inspectAward.status.replace('_', ' ')}
                    </span>
                    <span className={`award-level-badge level-${inspectAward.achievementLevel.toLowerCase()}`}>
                      {inspectAward.achievementLevel} Level
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#F6F8FC', border: '1px solid #BFDBFE', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3B82F6', marginBottom: '0.35rem' }}>
                  {inspectAward.awardTitle}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Category: <strong>{inspectAward.categoryName}</strong> • Rank/Position: <strong>{inspectAward.position}</strong>
                </div>
                {inspectAward.competitionName && (
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
                    Competition: <strong>{inspectAward.competitionName}</strong> (Organized by: {inspectAward.organizer || 'Inter-School Committee'})
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
                  Date: <strong>{inspectAward.awardDate}</strong> • Session: <strong>{inspectAward.academicYear}</strong> • Awarded By: <strong>{inspectAward.awardedBy}</strong>
                </div>
              </div>

              {inspectAward.description && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Citation / Summary</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                    {inspectAward.description}
                  </p>
                </div>
              )}

              {inspectAward.remarks && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Internal Remarks</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {inspectAward.remarks}
                  </p>
                </div>
              )}

              {inspectAward.teamMembers && inspectAward.teamMembers.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    Team Members ({inspectAward.teamMembers.length})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.35rem' }}>
                    {inspectAward.teamMembers.map(m => (
                      <span
                        key={m.studentId}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '16px',
                          fontSize: '0.8rem',
                        }}
                      >
                        {m.studentName} ({m.className})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="awards-modal-footer">
              {(inspectAward.status === 'approved' || inspectAward.status === 'published') && (
                <button
                  type="button"
                  className="awards-btn-primary"
                  onClick={() => {
                    setInspectAward(null);
                    handleOpenCertificateForAward(inspectAward);
                  }}
                >
                  <FileCheck size={16} />
                  View Certificate
                </button>
              )}
              <button
                type="button"
                className="awards-btn-secondary"
                onClick={() => setInspectAward(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Certificate Preview Modal if triggered from any tab */}
      {activeCertificatePreview && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box awards-modal-box-large" style={{ maxWidth: '920px' }}>
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <Sparkles size={20} color="#3B82F6" />
                Certificate: {activeCertificatePreview.certificateNo}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="awards-btn-primary" onClick={() => window.print()}>
                  Print
                </button>
                <button className="awards-modal-close-btn" onClick={() => setActiveCertificatePreview(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="awards-modal-body" style={{ background: '#334155', padding: '1.5rem' }}>
              <div className="cert-preview-wrapper" style={{ padding: 0 }}>
                <div className="cert-canvas">
                  <div className="cert-outer-border">
                    <div className="cert-inner-border">
                      <div className="cert-header">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <Award size={36} color="#831843" />
                        </div>
                        <h1 className="cert-school-name">St. Xavier's International Academy</h1>
                        <p className="cert-school-sub">Affiliated to CBSE, New Delhi • Established 2020</p>
                        <div className="cert-divider" />
                      </div>

                      <div className="cert-badge-ribbon">Certificate of Distinction</div>
                      <div className="cert-present-text">This is proudly presented to</div>

                      <div className="cert-recipient-name">{activeCertificatePreview.recipientName}</div>

                      <p className="cert-citation">
                        of <strong>{activeCertificatePreview.classNameOrDept}</strong> (ID: {activeCertificatePreview.admissionOrEmployeeNo}) in sincere recognition of outstanding achievement in obtaining <strong>{activeCertificatePreview.awardTitle}</strong> in the category of <strong>{activeCertificatePreview.categoryName}</strong>.
                      </p>

                      <div className="cert-footer-row">
                        <div className="cert-sign-col">
                          <div className="cert-signature-img">A. Swaminathan</div>
                          <div className="cert-sign-line" />
                          <div className="cert-sign-title">{activeCertificatePreview.principalName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Principal & Head of School</div>
                        </div>

                        <div className="cert-seal-wrap">
                          OFFICIAL<br />SEAL<br />VERIFIED
                        </div>

                        <div className="cert-sign-col">
                          <div className="cert-signature-img" style={{ color: '#047857' }}>V. Rao</div>
                          <div className="cert-sign-line" />
                          <div className="cert-sign-title">Vikramaditya Rao</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Chairman, Board of Governors</div>
                        </div>
                      </div>

                      <div className="cert-verify-info">
                        <span>Certificate No: <strong>{activeCertificatePreview.certificateNo}</strong></span>
                        <span>Date of Issuance: {activeCertificatePreview.issuedDate}</span>
                        <span>Verification Code: <strong>{activeCertificatePreview.verificationCode}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="awards-modal-footer">
              <button
                type="button"
                className="awards-btn-secondary"
                onClick={() => setActiveCertificatePreview(null)}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

