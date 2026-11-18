// ==========================================
// Student Admissions & Enrollment Management Page
// Complete School Admission Management System
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { AdmissionApplication, AdmissionEnquiry, AdmissionDocument } from '../../types';
import { admissionService } from '../../services/admissionService';
import { publicEnquiryService } from '../../services/publicEnquiryService';
import { classService } from '../../services/classService';
import { transportService } from '../../services/transportService';

// Tabs
import { OverviewTab } from './tabs/OverviewTab';
import { EnquiriesTab } from './tabs/EnquiriesTab';
import { ApplicationsTab } from './tabs/ApplicationsTab';
import { DocumentVerificationTab } from './tabs/DocumentVerificationTab';
import { AssessmentTab } from './tabs/AssessmentTab';
import { OffersAndFeesTab } from './tabs/OffersAndFeesTab';
import { ReportsTab } from './tabs/ReportsTab';

// Modals
import { NewEnquiryModal } from './modals/NewEnquiryModal';
import { EnquiryDetailModal } from './modals/EnquiryDetailModal';
import { AddFollowUpModal } from './modals/AddFollowUpModal';
import { MarkLostModal } from './modals/MarkLostModal';
import { ApplicantProfileModal } from './modals/ApplicantProfileModal';
import { DocumentInspectorModal } from './modals/DocumentInspectorModal';
import { RecordAssessmentModal } from './modals/RecordAssessmentModal';
import { GenerateOfferModal } from './modals/GenerateOfferModal';
import { RecordAdmissionFeeModal } from './modals/RecordAdmissionFeeModal';
import { EnrollApplicantModal } from './modals/EnrollApplicantModal';

// Printable Templates
import { PrintableOfferLetter } from './components/PrintableOfferLetter';
import { PrintableAdmissionReceipt } from './components/PrintableAdmissionReceipt';

// Styling
import './admissions.css';

import { Users, UserPlus, FileText, ShieldCheck, Award, CreditCard, BarChart3, Download } from 'lucide-react';

export const AdmissionsPage: React.FC = () => {
  const { currentRole, schoolSettings, addToast } = useERP();
  const classes = useMemo(() => classService.getAll(), []);
  const routes = useMemo(() => transportService.getAllRoutes(), []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'enquiries' | 'applications' | 'documents' | 'assessment' | 'offers_fees' | 'reports'
  >('overview');

  // Store refresh state
  const [storeVersion, setStoreVersion] = useState(0);

  useEffect(() => {
    const handleStorageUpdate = () => setStoreVersion(v => v + 1);
    window.addEventListener('nts_erp_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('nts_erp_storage_updated', handleStorageUpdate);
  }, []);

  // Data collections from admissionService
  const applications = useMemo(() => admissionService.getAll(), [storeVersion]);
  const localEnquiries = useMemo(() => admissionService.getAllEnquiries(), [storeVersion]);
  // Leads submitted from the public website enquiry form (cloud database)
  const [webLeads, setWebLeads] = useState<AdmissionEnquiry[]>([]);
  useEffect(() => {
    publicEnquiryService.fetchLeadsAsEnquiries().then(setWebLeads).catch(() => {});
  }, [storeVersion]);
  const enquiries = useMemo(() => [...webLeads, ...localEnquiries], [webLeads, localEnquiries]);
  const followUps = useMemo(() => admissionService.getAllFollowUps(), [storeVersion]);
  const capacities = useMemo(() => admissionService.getClassCapacities(), [storeVersion]);

  // Modal States
  const [isNewEnquiryOpen, setIsNewEnquiryOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<AdmissionEnquiry | null>(null);
  const [followUpEnquiryTarget, setFollowUpEnquiryTarget] = useState<AdmissionEnquiry | null>(null);
  const [lostEnquiryTarget, setLostEnquiryTarget] = useState<AdmissionEnquiry | null>(null);

  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [inspectDocTarget, setInspectDocTarget] = useState<{ app: AdmissionApplication; doc: AdmissionDocument } | null>(null);
  const [assessmentTarget, setAssessmentTarget] = useState<AdmissionApplication | null>(null);
  const [offerTarget, setOfferTarget] = useState<AdmissionApplication | null>(null);
  const [feeTarget, setFeeTarget] = useState<AdmissionApplication | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<AdmissionApplication | null>(null);

  // Print Overlays
  const [printOfferApp, setPrintOfferApp] = useState<AdmissionApplication | null>(null);
  const [printReceiptData, setPrintReceiptData] = useState<{
    app: AdmissionApplication;
    receiptNo?: string;
    amount?: number;
    method?: string;
  } | null>(null);

  // Keep selected app updated on storage changes
  useEffect(() => {
    if (selectedApp) {
      const fresh = admissionService.getById(selectedApp.id);
      if (fresh) setSelectedApp(fresh);
    }
  }, [storeVersion]);

  // Handlers
  const handleVerifyDocument = (appId: string, docId: string, currentVerified: boolean) => {
    const res = admissionService.verifyDocument(appId, docId, !currentVerified);
    if (res.success && res.data) {
      if (selectedApp && selectedApp.id === appId) setSelectedApp(res.data);
      addToast('info', 'Document Verified', !currentVerified ? 'Document requirement approved.' : 'Verification revoked.');
    }
  };

  const handleRejectDocument = (appId: string, docId: string, reason: string) => {
    const res = admissionService.rejectDocument(appId, docId, reason);
    if (res.success && res.data) {
      if (selectedApp && selectedApp.id === appId) setSelectedApp(res.data);
      addToast('warning', 'Document Rejected', `Document marked rejected: ${reason}`);
    }
  };

  const handleAdvanceStage = (appId: string, nextStage: any, notes?: string) => {
    const res = admissionService.updateStage(appId, nextStage, 'School Administrator', notes);
    if (res.success && res.data) {
      if (selectedApp && selectedApp.id === appId) setSelectedApp(res.data);
      addToast('success', 'Stage Advanced', `Application moved to ${nextStage.replace('_', ' ')}.`);
    } else {
      addToast('error', 'Stage Error', res.error || 'Failed to advance stage.');
    }
  };

  const handleConvertToApplication = (enq: AdmissionEnquiry) => {
    const res = admissionService.convertEnquiryToApplication(enq.id);
    if (res.success && res.application) {
      addToast(
        'success',
        'Enquiry Converted!',
        `Official Application ${res.application.applicationNo} created for ${res.application.firstName} ${res.application.lastName}.`
      );
      setSelectedEnquiry(null);
      setActiveTab('applications');
    } else {
      addToast('error', 'Conversion Error', res.error || 'Failed to convert enquiry.');
    }
  };

  // Badge Counts
  const newEnquiriesCount = enquiries.filter(e => e.status === 'New').length;
  const pendingDocsCount = applications.filter(a => (a.documents || []).some(d => d.required && !d.verified)).length;
  const feePendingCount = applications.filter(a => !a.isFeePaid && a.stage !== 'rejected' && a.stage !== 'withdrawn').length;

  return (
    <div className="admissions-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Student Admissions & Enrollment</h1>
          <p className="page-subtitle">
            Enterprise Indian School Admission Management System • Inquiries, Follow-ups, Applications, Document Verification, Assessment, Seat Capacity, Fee Receipts & Enrollment
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsNewEnquiryOpen(true)}>
            <UserPlus size={16} />
            <span>New Admission Enquiry</span>
          </button>
        </div>
      </div>

      {/* 7-Tab Navigation Header */}
      <div className="admissions-tabs-nav">
        <button
          className={`admissions-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={15} />
          <span>1. Overview</span>
        </button>

        <button
          className={`admissions-tab-btn ${activeTab === 'enquiries' ? 'active' : ''}`}
          onClick={() => setActiveTab('enquiries')}
        >
          <Users size={15} />
          <span>2. Admission Enquiries</span>
          {newEnquiriesCount > 0 && <span className="admissions-tab-badge">{newEnquiriesCount} New</span>}
        </button>

        <button
          className={`admissions-tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <FileText size={15} />
          <span>3. Applications</span>
          <span className="admissions-tab-badge">{applications.length}</span>
        </button>

        <button
          className={`admissions-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <ShieldCheck size={15} />
          <span>4. Document Verification</span>
          {pendingDocsCount > 0 && <span className="admissions-tab-badge">{pendingDocsCount} Pending</span>}
        </button>

        <button
          className={`admissions-tab-btn ${activeTab === 'assessment' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessment')}
        >
          <Award size={15} />
          <span>5. Assessment & Interaction</span>
        </button>

        <button
          className={`admissions-tab-btn ${activeTab === 'offers_fees' ? 'active' : ''}`}
          onClick={() => setActiveTab('offers_fees')}
        >
          <CreditCard size={15} />
          <span>6. Offers & Fee Confirmation</span>
          {feePendingCount > 0 && <span className="admissions-tab-badge">{feePendingCount} Due</span>}
        </button>

        <button
          className={`admissions-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <Download size={15} />
          <span>7. Admission Reports</span>
        </button>
      </div>

      {/* ACTIVE TAB RENDERER */}
      {activeTab === 'overview' && (
        <OverviewTab
          enquiries={enquiries}
          applications={applications}
          followUps={followUps}
          capacities={capacities}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
          onOpenNewEnquiry={() => setIsNewEnquiryOpen(true)}
        />
      )}

      {activeTab === 'enquiries' && (
        <EnquiriesTab
          enquiries={enquiries}
          followUps={followUps}
          classes={classes}
          onOpenNewEnquiry={() => setIsNewEnquiryOpen(true)}
          onViewEnquiry={(enq) => setSelectedEnquiry(enq)}
          onAddFollowUp={(enq) => setFollowUpEnquiryTarget(enq)}
          onConvertToApp={(enq) => handleConvertToApplication(enq)}
          onMarkLost={(enq) => setLostEnquiryTarget(enq)}
        />
      )}

      {activeTab === 'applications' && (
        <ApplicationsTab
          applications={applications}
          classes={classes}
          onViewProfile={(app) => setSelectedApp(app)}
          onRecordFee={(app) => setFeeTarget(app)}
          onGenerateOffer={(app) => setOfferTarget(app)}
          onOpenEnroll={(app) => setEnrollTarget(app)}
        />
      )}

      {activeTab === 'documents' && (
        <DocumentVerificationTab
          applications={applications}
          classes={classes}
          onInspectDoc={(app, doc) => setInspectDocTarget({ app, doc })}
          onVerifyDoc={(appId, docId, verified) => handleVerifyDocument(appId, docId, verified)}
        />
      )}

      {activeTab === 'assessment' && (
        <AssessmentTab
          applications={applications}
          classes={classes}
          onRecordAssessment={(app) => setAssessmentTarget(app)}
        />
      )}

      {activeTab === 'offers_fees' && (
        <OffersAndFeesTab
          applications={applications}
          capacities={capacities}
          classes={classes}
          onGenerateOffer={(app) => setOfferTarget(app)}
          onPrintOffer={(app) => setPrintOfferApp(app)}
          onRecordFee={(app) => setFeeTarget(app)}
          onPrintReceipt={(app) => setPrintReceiptData({ app })}
          onOpenEnroll={(app) => setEnrollTarget(app)}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          enquiries={enquiries}
          applications={applications}
          followUps={followUps}
          capacities={capacities}
          classes={classes}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL WINDOWS                                              */}
      {/* ========================================================= */}

      {/* New Enquiry Modal */}
      <NewEnquiryModal
        isOpen={isNewEnquiryOpen}
        onClose={() => setIsNewEnquiryOpen(false)}
        classes={classes}
        currentSession={schoolSettings.academicYear || '2026-2027'}
        onSuccess={(newEnq) => {
          addToast('success', 'Enquiry Created', `Enquiry ${newEnq.enquiryNo} registered for ${newEnq.studentName}.`);
        }}
      />

      {/* Enquiry Detail Modal */}
      <EnquiryDetailModal
        isOpen={Boolean(selectedEnquiry)}
        onClose={() => setSelectedEnquiry(null)}
        enquiry={selectedEnquiry}
        followUps={followUps}
        onAddFollowUp={(enq) => {
          setSelectedEnquiry(null);
          setFollowUpEnquiryTarget(enq);
        }}
        onConvertToApplication={(enq) => {
          handleConvertToApplication(enq);
        }}
        onMarkLost={(enq) => {
          setSelectedEnquiry(null);
          setLostEnquiryTarget(enq);
        }}
      />

      {/* Add Follow-Up Interaction Modal */}
      <AddFollowUpModal
        isOpen={Boolean(followUpEnquiryTarget)}
        onClose={() => setFollowUpEnquiryTarget(null)}
        enquiry={followUpEnquiryTarget}
        onSuccess={(fup) => {
          addToast('success', 'Interaction Recorded', `${fup.communicationMethod} logged for ${fup.candidateName}.`);
        }}
      />

      {/* Mark Enquiry Lost Modal */}
      <MarkLostModal
        isOpen={Boolean(lostEnquiryTarget)}
        onClose={() => setLostEnquiryTarget(null)}
        enquiry={lostEnquiryTarget}
        onSuccess={(enq) => {
          addToast('warning', 'Enquiry Closed', `Enquiry ${enq.enquiryNo} archived as lost (${enq.lostReason}).`);
        }}
      />

      {/* 8-Tab Comprehensive Applicant Profile Modal */}
      <ApplicantProfileModal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        application={selectedApp}
        onVerifyDoc={(appId, docId, verified) => handleVerifyDocument(appId, docId, verified)}
        onRejectDoc={(appId, docId) => {
          const reason = prompt('Please specify reason for rejecting document:');
          if (reason) handleRejectDocument(appId, docId, reason);
        }}
        onAdvanceStage={(appId, stage, notes) => handleAdvanceStage(appId, stage, notes)}
        onRecordFee={(app) => setFeeTarget(app)}
        onOpenEnroll={(app) => setEnrollTarget(app)}
        onGenerateOffer={(app) => setOfferTarget(app)}
      />

      {/* Document Inspector Modal */}
      <DocumentInspectorModal
        isOpen={Boolean(inspectDocTarget)}
        onClose={() => setInspectDocTarget(null)}
        application={inspectDocTarget?.app || null}
        document={inspectDocTarget?.doc || null}
        onVerify={(appId, docId, verified, notes) => {
          admissionService.verifyDocument(appId, docId, verified, notes);
          addToast('success', 'Document Verified', 'Document requirement marked as verified.');
        }}
        onReject={(appId, docId, reason) => {
          handleRejectDocument(appId, docId, reason);
        }}
      />

      {/* Record Assessment Modal */}
      <RecordAssessmentModal
        isOpen={Boolean(assessmentTarget)}
        onClose={() => setAssessmentTarget(null)}
        application={assessmentTarget}
        onSuccess={() => {
          addToast('success', 'Assessment Saved', 'Candidate entrance evaluation updated.');
        }}
      />

      {/* Generate Admission Offer Modal */}
      <GenerateOfferModal
        isOpen={Boolean(offerTarget)}
        onClose={() => setOfferTarget(null)}
        application={offerTarget}
        classes={classes}
        onSuccess={() => {
          addToast('success', 'Offer Generated', 'Admission offer letter released.');
        }}
      />

      {/* Record Admission Fee Modal */}
      <RecordAdmissionFeeModal
        isOpen={Boolean(feeTarget)}
        onClose={() => setFeeTarget(null)}
        application={feeTarget}
        onSuccess={({ application, receiptNo, amount, method }) => {
          addToast('success', 'Payment Recorded', `Received ₹${amount.toLocaleString('en-IN')}. Receipt ${receiptNo} generated.`);
          setPrintReceiptData({ app: application, receiptNo, amount, method });
        }}
      />

      {/* Final Student Enrollment Modal */}
      <EnrollApplicantModal
        isOpen={Boolean(enrollTarget)}
        onClose={() => setEnrollTarget(null)}
        application={enrollTarget}
        classes={classes}
        routes={routes}
        onSuccess={(student) => {
          addToast(
            'success',
            'Student Officially Enrolled!',
            `${student.fullName} has been granted Admission No: ${student.admissionNo} in ${student.className} (${student.section}).`
          );
        }}
      />

      {/* ========================================================= */}
      {/* PRINTABLE OVERLAYS                                         */}
      {/* ========================================================= */}

      {/* Printable Offer Letter */}
      {printOfferApp && (
        <PrintableOfferLetter
          application={printOfferApp}
          offer={printOfferApp.offer}
          schoolName={schoolSettings.schoolName || "St. Xavier's International Academy"}
          onClose={() => setPrintOfferApp(null)}
        />
      )}

      {/* Printable Admission Fee Receipt */}
      {printReceiptData && (
        <PrintableAdmissionReceipt
          application={printReceiptData.app}
          receiptNo={printReceiptData.receiptNo}
          amountPaid={printReceiptData.amount}
          paymentMethod={printReceiptData.method}
          schoolName={schoolSettings.schoolName || "St. Xavier's International Academy"}
          onClose={() => setPrintReceiptData(null)}
        />
      )}
    </div>
  );
};
