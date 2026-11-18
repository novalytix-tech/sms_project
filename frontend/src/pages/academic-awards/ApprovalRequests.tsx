import React, { useState, useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, Sparkles, History, Eye, AlertCircle, X } from 'lucide-react';
import { AcademicAward } from '../../types/academicAwards';
import { useERP } from '../../context/ERPContext';

interface ApprovalRequestsProps {
  awards: AcademicAward[];
  onApproveAward: (id: string, remarks?: string) => void;
  onRejectAward: (id: string, reason: string) => void;
  onPublishAward: (id: string, remarks?: string) => void;
  onReviewAward: (id: string) => void;
  onViewAward: (award: AcademicAward) => void;
}

export const ApprovalRequests: React.FC<ApprovalRequestsProps> = ({
  awards,
  onApproveAward,
  onRejectAward,
  onPublishAward,
  onReviewAward,
  onViewAward,
}) => {
  const { currentRole } = useERP();
  const canApprove = currentRole === 'school_admin' || currentRole === 'super_admin';

  // State
  const [activeTabFilter, setActiveTabFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectingAward, setRejectingAward] = useState<AcademicAward | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [historyAward, setHistoryAward] = useState<AcademicAward | null>(null);

  // Grouped awards
  const pendingAwards = useMemo(() => {
    return awards.filter(a => a.status === 'submitted' || a.status === 'under_review');
  }, [awards]);

  const approvedAwards = useMemo(() => {
    return awards.filter(a => a.status === 'approved' || a.status === 'published');
  }, [awards]);

  const rejectedAwards = useMemo(() => {
    return awards.filter(a => a.status === 'rejected');
  }, [awards]);

  const currentList = activeTabFilter === 'pending' ? pendingAwards : activeTabFilter === 'approved' ? approvedAwards : rejectedAwards;

  const handleOpenRejectModal = (award: AcademicAward) => {
    setRejectingAward(award);
    setRejectionReason('');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAward || !rejectionReason.trim()) return;

    onRejectAward(rejectingAward.id, rejectionReason.trim());
    setRejectingAward(null);
  };

  return (
    <div>
      {/* Sub-Navigation Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`awards-btn-secondary ${activeTabFilter === 'pending' ? 'active' : ''}`}
          style={{
            background: activeTabFilter === 'pending' ? '#3B82F6' : '#ffffff',
            color: activeTabFilter === 'pending' ? '#ffffff' : '#334155',
            borderColor: activeTabFilter === 'pending' ? '#3B82F6' : '#cbd5e1',
          }}
          onClick={() => setActiveTabFilter('pending')}
        >
          <Clock size={16} />
          Pending Approvals ({pendingAwards.length})
        </button>

        <button
          className={`awards-btn-secondary ${activeTabFilter === 'approved' ? 'active' : ''}`}
          style={{
            background: activeTabFilter === 'approved' ? '#3B82F6' : '#ffffff',
            color: activeTabFilter === 'approved' ? '#ffffff' : '#334155',
            borderColor: activeTabFilter === 'approved' ? '#3B82F6' : '#cbd5e1',
          }}
          onClick={() => setActiveTabFilter('approved')}
        >
          <CheckCircle2 size={16} />
          Approved & Published ({approvedAwards.length})
        </button>

        <button
          className={`awards-btn-secondary ${activeTabFilter === 'rejected' ? 'active' : ''}`}
          style={{
            background: activeTabFilter === 'rejected' ? '#3B82F6' : '#ffffff',
            color: activeTabFilter === 'rejected' ? '#ffffff' : '#334155',
            borderColor: activeTabFilter === 'rejected' ? '#3B82F6' : '#cbd5e1',
          }}
          onClick={() => setActiveTabFilter('rejected')}
        >
          <XCircle size={16} />
          Returned / Rejected ({rejectedAwards.length})
        </button>
      </div>

      {/* Main Table Card */}
      <div className="awards-card">
        <div className="awards-card-header">
          <h3 className="awards-card-title">
            <Clock size={18} color="#3B82F6" />
            {activeTabFilter === 'pending'
              ? 'Awards Awaiting Principal / Dean Sanction'
              : activeTabFilter === 'approved'
              ? 'Approved Honours & Hall of Fame Roster'
              : 'Returned Entries with Required Revisions'}
          </h3>
        </div>
        <div className="awards-card-body" style={{ padding: 0 }}>
          {currentList.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={40} color="#86efac" style={{ margin: '0 auto 1rem auto' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>
                All clear in this queue
              </div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {activeTabFilter === 'pending'
                  ? 'There are currently no awards awaiting administrative approval.'
                  : 'No records in this workflow state.'}
              </p>
            </div>
          ) : (
            <div className="awards-table-wrapper">
              <table className="awards-table">
                <thead>
                  <tr>
                    <th>Student Recipient</th>
                    <th>Award Title & Competition</th>
                    <th>Category & Level</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Workflow Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map(award => (
                    <tr key={award.id}>
                      <td>
                        <div className="award-recipient-cell">
                          <img
                            src={award.photoUrl || '/student-male.svg'}
                            alt={award.studentName}
                            className="award-avatar-img"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/student-male.svg';
                            }}
                          />
                          <div>
                            <div className="award-recipient-name">{award.studentName}</div>
                            <div className="award-recipient-sub">
                              {award.className} • Adm: {award.admissionNo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{award.awardTitle}</div>
                        {award.competitionName && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {award.competitionName}
                          </div>
                        )}
                        {award.rejectionReason && (
                          <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.2rem', fontWeight: 600 }}>
                            Reason: {award.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 500 }}>
                          {award.categoryName}
                        </div>
                        <span className={`award-level-badge level-${award.achievementLevel.toLowerCase()}`}>
                          {award.achievementLevel}
                        </span>
                      </td>
                      <td>
                        <span className={`award-status-badge status-${award.status}`}>
                          {award.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                        {award.awardDate}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            className="awards-btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem' }}
                            onClick={() => onViewAward(award)}
                          >
                            <Eye size={13} />
                            Details
                          </button>

                          <button
                            className="awards-btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem' }}
                            onClick={() => setHistoryAward(award)}
                          >
                            <History size={13} />
                            Audit
                          </button>

                          {canApprove && (award.status === 'submitted' || award.status === 'under_review') && (
                            <>
                              {award.status === 'submitted' && (
                                <button
                                  className="awards-btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#b45309' }}
                                  onClick={() => onReviewAward(award.id)}
                                >
                                  Reviewing
                                </button>
                              )}

                              <button
                                className="awards-btn-success"
                                onClick={() => onApproveAward(award.id)}
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </button>

                              <button
                                className="awards-btn-danger"
                                onClick={() => handleOpenRejectModal(award)}
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </>
                          )}

                          {canApprove && award.status === 'approved' && (
                            <button
                              className="awards-btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => onPublishAward(award.id)}
                            >
                              <Sparkles size={14} />
                              Publish to Wall
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingAward && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box" style={{ maxWidth: '480px' }}>
            <div className="awards-modal-header">
              <h3 className="awards-modal-title" style={{ color: '#b91c1c' }}>
                <AlertCircle size={20} color="#b91c1c" />
                Return / Reject Award Entry
              </h3>
              <button className="awards-modal-close-btn" onClick={() => setRejectingAward(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="awards-modal-body">
                <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1rem 0' }}>
                  Please state the specific reason for rejecting or returning this award to draft. The submitting teacher will be notified.
                </p>

                <div className="awards-form-group">
                  <label className="awards-form-label">
                    Mandatory Rejection / Revision Reason <span className="req">*</span>
                  </label>
                  <textarea
                    className="awards-textarea"
                    placeholder="e.g. Missing certified organizer scorecard or student name misspelled..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    required
                    style={{ minHeight: '90px' }}
                  />
                </div>
              </div>

              <div className="awards-modal-footer">
                <button
                  type="button"
                  className="awards-btn-secondary"
                  onClick={() => setRejectingAward(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="awards-btn-danger">
                  <XCircle size={16} />
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Audit Modal */}
      {historyAward && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box">
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <History size={20} color="#3B82F6" />
                Workflow Audit History
              </h3>
              <button className="awards-modal-close-btn" onClick={() => setHistoryAward(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="awards-modal-body">
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#0f172a' }}>
                {historyAward.awardTitle}
              </h4>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                Student: <strong>{historyAward.studentName}</strong> • {historyAward.className} • Category: {historyAward.categoryName}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(historyAward.history || []).map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '0.85rem',
                      background: '#F6F8FC',
                      border: '1px solid #E2E8F0',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ marginTop: '0.2rem' }}>
                      <CheckCircle2 size={16} color="#3B82F6" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`award-status-badge status-${step.status}`}>
                          {step.status.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          by <strong>{step.changedByName}</strong> on {new Date(step.changedAt).toLocaleString()}
                        </span>
                      </div>
                      {step.remarks && (
                        <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '0.35rem' }}>
                          {step.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="awards-modal-footer">
              <button
                type="button"
                className="awards-btn-secondary"
                onClick={() => setHistoryAward(null)}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

