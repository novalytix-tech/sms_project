import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionApplication } from '../../../types';
import { formatDate, formatCurrencyINR } from '../../../utils/formatters';
import { CheckCircle, FileText, CreditCard, CheckSquare, Award, History } from 'lucide-react';

interface ApplicantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AdmissionApplication | null;
  onVerifyDoc: (appId: string, docId: string, currentVerified: boolean) => void;
  onRejectDoc: (appId: string, docId: string) => void;
  onAdvanceStage: (appId: string, stage: any, notes?: string) => void;
  onRecordFee: (app: AdmissionApplication) => void;
  onOpenEnroll: (app: AdmissionApplication) => void;
  onGenerateOffer: (app: AdmissionApplication) => void;
}

export const ApplicantProfileModal: React.FC<ApplicantProfileModalProps> = ({
  isOpen,
  onClose,
  application,
  onVerifyDoc,
  onRejectDoc,
  onAdvanceStage,
  onRecordFee,
  onOpenEnroll,
  onGenerateOffer,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'student' | 'parent' | 'documents' | 'assessment' | 'fees' | 'communication' | 'timeline'
  >('overview');

  if (!application) return null;

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'inquiry':
        return <span className="badge badge-secondary">Inquiry</span>;
      case 'application_started':
      case 'application_submitted':
        return <span className="badge badge-info">Submitted</span>;
      case 'documents_pending':
        return <span className="badge badge-warning">Docs Pending</span>;
      case 'under_review':
        return <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e' }}>Under Review</span>;
      case 'approved':
        return <span className="badge badge-success">Approved / Offered</span>;
      case 'fee_pending':
        return <span className="badge" style={{ background: '#ffedd5', color: '#c2410c' }}>Fee Pending</span>;
      case 'enrolled':
        return <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>Enrolled</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'withdrawn':
        return <span className="badge badge-neutral">Withdrawn</span>;
      default:
        return <span className="badge badge-secondary">{stage}</span>;
    }
  };

  const verifiedDocsCount = (application.documents || []).filter(d => d.verified).length;
  const totalDocsCount = (application.documents || []).length;
  const totalFee = application.admissionFeeAmount || 25000;
  const feePaid = application.feeAmountPaid !== undefined ? application.feeAmountPaid : (application.isFeePaid ? totalFee : 0);
  const feeOutstanding = totalFee - feePaid;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Applicant Profile: ${application.firstName} ${application.lastName} (${application.applicationNo})`}>
      <div className="adm-profile-container">
        {/* Top Profile Summary Strip */}
        <div className="adm-profile-header">
          <div className="adm-profile-info">
            <div className="adm-profile-avatar">
              {application.firstName.charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#19191f' }}>
                  {application.firstName} {application.lastName}
                </h3>
                {getStageBadge(application.stage)}
              </div>
              <div style={{ fontSize: '13px', color: '#71717a' }}>
                Target: <strong>{application.targetClassName} ({application.targetSection || 'A'})</strong> • DOB: {formatDate(application.dob)} • Blood Group: {application.bloodGroup || 'O+'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {application.stage === 'under_review' && (
              <button className="btn btn-secondary btn-sm" onClick={() => onGenerateOffer(application)}>
                <Award size={14} />
                <span>Issue Offer Letter</span>
              </button>
            )}

            {!application.isFeePaid && (
              <button className="btn btn-secondary btn-sm" onClick={() => onRecordFee(application)}>
                <CreditCard size={14} />
                <span>Record Fee</span>
              </button>
            )}

            {application.stage !== 'enrolled' && application.stage !== 'rejected' && (
              <button className="btn btn-primary btn-sm" onClick={() => onOpenEnroll(application)}>
                <CheckCircle size={14} />
                <span>Confirm Admission & Enroll</span>
              </button>
            )}
          </div>
        </div>

        {/* 8-Tab Navigation Bar */}
        <div className="adm-profile-nav">
          <button
            className={`adm-profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`adm-profile-tab ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            Student Details
          </button>
          <button
            className={`adm-profile-tab ${activeTab === 'parent' ? 'active' : ''}`}
            onClick={() => setActiveTab('parent')}
          >
            Parent & Guardian
          </button>
          <button
            className={`adm-profile-tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Documents ({verifiedDocsCount}/{totalDocsCount})
          </button>
          <button
            className={`adm-profile-tab ${activeTab === 'assessment' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessment')}
          >
            Assessment & Interaction
          </button>
          <button
            className={`adm-profile-tab ${activeTab === 'fees' ? 'active' : ''}`}
            onClick={() => setActiveTab('fees')}
          >
            Fee Details ({application.isFeePaid ? 'Cleared' : 'Pending'})
          </button>
          <button
            className={`adm-profile-tab ${activeTab === 'communication' ? 'active' : ''}`}
            onClick={() => setActiveTab('communication')}
          >
            Communication History
          </button>
          <button
            className={`adm-profile-tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Audit Timeline
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="adm-kpi-card" style={{ padding: '12px 14px' }}>
                <div>
                  <div className="adm-kpi-label">Application Status</div>
                  <div style={{ marginTop: '4px' }}>{getStageBadge(application.stage)}</div>
                </div>
              </div>

              <div className="adm-kpi-card" style={{ padding: '12px 14px' }}>
                <div>
                  <div className="adm-kpi-label">Document Clearance</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: verifiedDocsCount === totalDocsCount ? '#16a34a' : '#d97706' }}>
                    {verifiedDocsCount} / {totalDocsCount} Verified
                  </div>
                </div>
              </div>

              <div className="adm-kpi-card" style={{ padding: '12px 14px' }}>
                <div>
                  <div className="adm-kpi-label">Fee Clearance</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: application.isFeePaid ? '#16a34a' : '#c2410c' }}>
                    {application.isFeePaid ? 'Fully Cleared' : `₹${feeOutstanding.toLocaleString('en-IN')} Outstanding`}
                  </div>
                </div>
              </div>

              <div className="adm-kpi-card" style={{ padding: '12px 14px' }}>
                <div>
                  <div className="adm-kpi-label">Official Admission No</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: application.assignedAdmissionNo ? '#15803d' : '#9ca3af' }}>
                    {application.assignedAdmissionNo || 'Not yet enrolled'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Checklist Tracker */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6', marginBottom: '12px' }}>
                ADMISSION CLEARANCE MILESTONES
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <CheckSquare size={16} color={application.checklist?.contactVerified ? '#16a34a' : '#9ca3af'} />
                  <span>Contact Verified</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <CheckSquare size={16} color={application.checklist?.documentsVerified ? '#16a34a' : '#9ca3af'} />
                  <span>All Docs Verified</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <CheckSquare size={16} color={application.checklist?.interactionCompleted ? '#16a34a' : '#9ca3af'} />
                  <span>Assessment Done</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <CheckSquare size={16} color={application.checklist?.principalApproved ? '#16a34a' : '#9ca3af'} />
                  <span>Principal Approval</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <CheckSquare size={16} color={application.checklist?.feeCleared ? '#16a34a' : '#9ca3af'} />
                  <span>Fee Cleared</span>
                </div>
              </div>
            </div>

            {application.reviewRemarks && (
              <div style={{ background: '#fefce8', borderLeft: '4px solid #ca8a04', padding: '12px 14px', borderRadius: '4px', fontSize: '13px', color: '#854d0e' }}>
                <strong>Committee Remarks:</strong> {application.reviewRemarks}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STUDENT DETAILS */}
        {activeTab === 'student' && (
          <div className="card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6', marginBottom: '14px' }}>
              ACADEMIC & DEMOGRAPHIC DATA
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13.5px' }}>
              <div><strong>First Name:</strong> {application.firstName}</div>
              <div><strong>Last Name:</strong> {application.lastName}</div>
              <div><strong>Date of Birth:</strong> {formatDate(application.dob)}</div>
              <div><strong>Gender:</strong> {application.gender}</div>
              <div><strong>Blood Group:</strong> {application.bloodGroup || 'O+'}</div>
              <div><strong>Previous School:</strong> {application.previousSchool || 'Not attended previously'}</div>
              <div><strong>Previous Grade:</strong> {application.previousClass || 'N/A'}</div>
              <div><strong>Target Class:</strong> {application.targetClassName}</div>
              <div><strong>Target Section:</strong> {application.targetSection || 'A'}</div>
              <div><strong>Academic Session:</strong> {application.academicYear || '2026-2027'}</div>
              <div><strong>Residential Address:</strong> {application.address}</div>
              <div><strong>City & State:</strong> {application.city}, {application.state} - {application.pincode}</div>
            </div>
          </div>
        )}

        {/* TAB 3: PARENT & GUARDIAN */}
        {activeTab === 'parent' && (
          <div className="card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6', marginBottom: '14px' }}>
              PARENT & GUARDIAN PROFILE
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13.5px' }}>
              <div><strong>Primary Contact Name:</strong> {application.parentName}</div>
              <div><strong>Relationship to Student:</strong> {application.parentRelation}</div>
              <div><strong>Mobile Number:</strong> {application.parentPhone}</div>
              <div><strong>Email Address:</strong> {application.parentEmail || 'Not provided'}</div>
              <div><strong>Father / Guardian Occupation:</strong> {application.fatherOccupation || 'Salaried / Professional'}</div>
              <div><strong>Mother Name:</strong> {application.motherName || 'Mrs. ' + application.lastName}</div>
              <div><strong>Emergency Contact:</strong> {application.emergencyContact || application.parentPhone}</div>
              <div><strong>Residential Locality:</strong> {application.city}, {application.pincode}</div>
            </div>
          </div>
        )}

        {/* TAB 4: DOCUMENTS CHECKLIST */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>
                Verify original statutory documents before authorizing admission offer letter.
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                {verifiedDocsCount} of {totalDocsCount} Approved
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(application.documents || []).map(doc => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    background: doc.verified ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={18} color={doc.verified ? '#16a34a' : '#6b7280'} />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#19191f' }}>
                        {doc.title} {doc.required && <span style={{ color: '#dc2626' }}>*</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {doc.verified ? (
                          <span style={{ color: '#16a34a' }}>Verified on {formatDate(doc.verificationDate || '')}</span>
                        ) : (
                          <span style={{ color: '#d97706' }}>Pending verification review</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onVerifyDoc(application.id, doc.id, doc.verified)}
                      style={{
                        color: doc.verified ? '#dc2626' : '#16a34a',
                        borderColor: doc.verified ? '#fecaca' : '#bbf7d0',
                      }}
                    >
                      {doc.verified ? 'Revoke Approval' : 'Approve & Verify'}
                    </button>
                    {!doc.verified && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onRejectDoc(application.id, doc.id)}
                        style={{ color: '#dc2626' }}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ASSESSMENT & INTERACTION */}
        {activeTab === 'assessment' && (
          <div className="card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6', marginBottom: '14px' }}>
              STUDENT ASSESSMENT & EVALUATION
            </h4>
            {application.assessment ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13.5px' }}>
                <div><strong>Assessment Type:</strong> {application.assessment.assessmentType}</div>
                <div><strong>Evaluation Date:</strong> {formatDate(application.assessment.assessmentDate || '')}</div>
                <div><strong>Score / Marks:</strong> {application.assessment.marksObtained} / {application.assessment.maxMarks}</div>
                <div>
                  <strong>Result:</strong>{' '}
                  <span className="badge badge-success">{application.assessment.result}</span>
                </div>
                <div><strong>Evaluator:</strong> {application.assessment.evaluatorTeacher}</div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Teacher Feedback:</strong> {application.assessment.interactionRemarks || 'Candidate showed strong analytical skills and readiness for syllabus.'}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#6b7280' }}>
                <Award size={32} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                <p style={{ margin: '0 0 10px 0' }}>No formal assessment record attached yet for this applicant.</p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onAdvanceStage(application.id, 'approved', 'Assessment completed and approved.')}
                >
                  Mark Assessment Completed
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FEES & PAYMENTS */}
        {activeTab === 'fees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="adm-kpi-card" style={{ padding: '12px' }}>
                <div>
                  <div className="adm-kpi-label">Total Admission Fee</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrencyINR(totalFee)}</div>
                </div>
              </div>
              <div className="adm-kpi-card" style={{ padding: '12px' }}>
                <div>
                  <div className="adm-kpi-label">Amount Cleared</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>{formatCurrencyINR(feePaid)}</div>
                </div>
              </div>
              <div className="adm-kpi-card" style={{ padding: '12px' }}>
                <div>
                  <div className="adm-kpi-label">Outstanding Balance</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: feeOutstanding > 0 ? '#dc2626' : '#16a34a' }}>
                    {formatCurrencyINR(feeOutstanding)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History Table */}
            <div className="card">
              <div className="card-header" style={{ padding: '10px 16px', background: '#F6F8FC' }}>
                <strong>Fee Payment History</strong>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Payment Mode</th>
                      <th>Reference</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {application.feePaymentHistory && application.feePaymentHistory.length > 0 ? (
                      application.feePaymentHistory.map((p: any) => (
                        <tr key={p.id}>
                          <td><strong>{p.receiptNo}</strong></td>
                          <td>{formatDate(p.paymentDate)}</td>
                          <td>{p.paymentMethod}</td>
                          <td><code>{p.transactionRef}</code></td>
                          <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrencyINR(p.amount)}</td>
                        </tr>
                      ))
                    ) : application.isFeePaid ? (
                      <tr>
                        <td><strong>REC-ADM/2026-27/0041</strong></td>
                        <td>{formatDate(application.updatedAt)}</td>
                        <td>UPI / Net Banking</td>
                        <td><code>ADM-TXN-DEMO</code></td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrencyINR(totalFee)}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#71717a' }}>
                          No admission fee recorded yet. Click &quot;Record Fee&quot; above to clear payment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: COMMUNICATION HISTORY */}
        {activeTab === 'communication' && (
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6', marginBottom: '12px' }}>
              PARENT INTERACTIONS & NOTES
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>Application Registered</strong>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>{formatDate(application.createdAt)}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563' }}>
                  Application submitted via {application.source}. Initial contact verified with {application.parentName}.
                </div>
              </div>

              {application.linkedEnquiryNo && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>Original Enquiry Reference</strong>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>{application.linkedEnquiryNo}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#4b5563' }}>
                    Candidate originally enquired through {application.source} and was guided by counsellor {application.assignedCounsellor || 'Admissions Desk'}.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: AUDIT TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6', marginBottom: '14px' }}>
              ACTIVITY AUDIT TRAIL
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(application.statusHistory || []).map((h, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#DBEAFE',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    <History size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <strong>{h.stage.toUpperCase().replace('_', ' ')}</strong>
                      <span style={{ color: '#71717a', fontSize: '12px' }}>{h.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#4b5563', marginTop: '2px' }}>{h.notes}</div>
                    <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '2px' }}>Action by: {h.changedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Bottom Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </Modal>
  );
};

