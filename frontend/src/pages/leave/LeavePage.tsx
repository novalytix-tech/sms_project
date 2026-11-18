// ==========================================
// Leave Management & Approvals Workflow
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo } from 'react';
import { leaveService } from '../../services/leaveService';
import { LeaveRequest, LeaveType } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { CheckSquare, Plus, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { currentRole, currentUser, selectedChild, parentChildren, addToast } = useERP();
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => leaveService.getAll());

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedWardId, setSelectedWardId] = useState<string>(
    selectedChild?.id || parentChildren[0]?.id || ''
  );

  const [applyForm, setApplyForm] = useState({
    leaveType: 'Medical' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    reason: '',
  });

  // Decision Modal State (replaces native window.prompt)
  const [reviewTarget, setReviewTarget] = useState<{
    leave: LeaveRequest;
    status: 'approved' | 'rejected';
  } | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewError, setReviewError] = useState('');

  const refreshList = () => {
    setLeaves([...leaveService.getAll()]);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.reason.trim()) return;

    let applicantId = currentUser.referenceId || currentUser.id;
    let applicantName = currentUser.name;
    let applicantRole: 'teacher' | 'student' | 'staff' = 'staff';

    if (currentRole === 'parent') {
      const targetWard =
        parentChildren.find(c => c.id === selectedWardId) || selectedChild || parentChildren[0];
      if (!targetWard) {
        addToast('error', 'No Ward Linked', 'You must have a linked student to submit a leave request.');
        return;
      }
      applicantId = targetWard.id;
      applicantName = `${targetWard.fullName} (Ward of ${currentUser.name})`;
      applicantRole = 'student';
    } else if (currentRole === 'student') {
      applicantRole = 'student';
    } else if (currentRole === 'teacher') {
      applicantRole = 'teacher';
    }

    leaveService.submitRequest({
      applicantId,
      applicantName,
      applicantRole,
      leaveType: applyForm.leaveType,
      startDate: applyForm.startDate,
      endDate: applyForm.endDate,
      totalDays: Number(applyForm.totalDays),
      reason: applyForm.reason,
    });

    addToast('success', 'Leave Submitted', 'Your leave application has been routed for administrative sanction.');
    setIsApplyOpen(false);
    setApplyForm({
      leaveType: 'Casual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalDays: 1,
      reason: '',
    });
    refreshList();
  };

  const handleOpenReview = (leave: LeaveRequest, status: 'approved' | 'rejected') => {
    setReviewTarget({ leave, status });
    setReviewRemarks('');
    setReviewError('');
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;

    if (reviewTarget.status === 'rejected' && !reviewRemarks.trim()) {
      setReviewError('Please provide a reason for rejecting this leave request.');
      return;
    }

    leaveService.updateStatus(
      reviewTarget.leave.id,
      reviewTarget.status,
      `${currentUser.name} (${currentRole.replace('_', ' ')})`,
      reviewRemarks.trim() || undefined
    );

    addToast(
      reviewTarget.status === 'approved' ? 'success' : 'warning',
      `Leave ${reviewTarget.status.toUpperCase()}`,
      `Application for ${reviewTarget.leave.applicantName} marked ${reviewTarget.status}.`
    );

    setReviewTarget(null);
    refreshList();
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (statusFilter && l.status !== statusFilter) return false;

      // Privacy Scoping:
      if (currentRole === 'parent') {
        const wardIds = parentChildren.map(c => c.id);
        const matchWard = wardIds.includes(l.applicantId);
        const matchParentRef = l.applicantId === currentUser.referenceId;
        const matchParentName = l.applicantName.toLowerCase().includes(currentUser.name.toLowerCase());
        return matchWard || matchParentRef || matchParentName;
      }

      if (currentRole === 'student') {
        return (
          l.applicantId === currentUser.referenceId ||
          l.applicantName.toLowerCase().includes(currentUser.name.toLowerCase())
        );
      }

      if (currentRole === 'teacher') {
        return (
          l.applicantId === currentUser.referenceId ||
          l.applicantId === currentUser.id ||
          (l.applicantRole === 'teacher' && (l.applicantName || '').toLowerCase() === (currentUser.name || '').toLowerCase())
        );
      }

      // Admins see all leaves
      return true;
    });
  }, [leaves, statusFilter, currentRole, currentUser, parentChildren]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Leave Requests</h1>
          <p className="page-subtitle">
            Student and staff leave applications
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsApplyOpen(true)}>
            <Plus size={16} />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <select
            className="form-select filter-select filter-select-md"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter Leave Status"
          >
            <option value="">All Applications</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {statusFilter && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => setStatusFilter('')}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing <strong>{filteredLeaves.length}</strong> applications
          </span>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="card">
        <div className="card-body" style={{ padding: '0' }}>
          {filteredLeaves.length === 0 ? (
            <div style={{ padding: '40px 20px' }}>
              <EmptyState
                icon={<CheckSquare size={32} />}
                title="No leave requests found"
                description={
                  currentRole === 'parent'
                    ? 'No leave applications have been submitted for your linked student ward(s).'
                    : 'There are currently no active or historical leave records matching your filter.'
                }
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Category</th>
                    <th>Leave Type</th>
                    <th>Duration / Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map(leave => (
                    <tr key={leave.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{leave.applicantName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Applied on {formatDate(leave.appliedOn)}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                          {leave.applicantRole}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{leave.leaveType}</td>
                      <td>
                        {formatDate(leave.startDate)} {leave.startDate !== leave.endDate ? `to ${formatDate(leave.endDate)}` : ''}
                      </td>
                      <td style={{ fontWeight: 700 }}>{leave.totalDays} Day(s)</td>
                      <td style={{ maxWidth: '280px' }}>
                        <span style={{ fontSize: '12px', color: '#334155' }}>"{leave.reason}"</span>
                        {leave.reviewRemarks && (
                          <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>
                            Remarks: "{leave.reviewRemarks}" (by {leave.reviewedBy})
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge status={leave.status} />
                      </td>
                      <td>
                        {leave.status === 'pending' && ['school_admin', 'super_admin'].includes(currentRole) ? (
                          <div className="table-action-cell">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleOpenReview(leave, 'approved')}
                            >
                              <CheckCircle size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleOpenReview(leave, 'rejected')}
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                            {leave.status === 'pending' ? 'Pending Review' : 'Finalized'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {isApplyOpen && (
        <Modal
          isOpen={isApplyOpen}
          onClose={() => setIsApplyOpen(false)}
          title="Apply for Leave"
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsApplyOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApply}>
                Submit Leave
              </button>
            </>
          }
        >
          <form onSubmit={handleApply}>
            {currentRole === 'parent' && (
              <div className="form-group">
                <label className="form-label required">Student Ward</label>
                <select
                  className="form-select"
                  value={selectedWardId}
                  onChange={e => setSelectedWardId(e.target.value)}
                >
                  {parentChildren.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.className}-{c.section} • Roll #{c.rollNo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label required">Leave Nature / Category</label>
              <select
                className="form-select"
                value={applyForm.leaveType}
                onChange={e => setApplyForm({ ...applyForm, leaveType: e.target.value as any })}
              >
                <option value="Medical">Medical / Health Leave</option>
                <option value="Casual">Casual Personal Leave</option>
                <option value="Emergency">Urgent Family Emergency</option>
                <option value="Vacation">Approved Family Travel</option>
              </select>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label required">From Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={applyForm.startDate}
                  onChange={e => setApplyForm({ ...applyForm, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">To Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={applyForm.endDate}
                  onChange={e => setApplyForm({ ...applyForm, endDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Total Working Days</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="30"
                  value={applyForm.totalDays}
                  onChange={e => setApplyForm({ ...applyForm, totalDays: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Detailed Reason & Description</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="State the reason for absence..."
                value={applyForm.reason}
                onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Leave Decision Review Modal */}
      {reviewTarget && (
        <Modal
          isOpen={true}
          onClose={() => setReviewTarget(null)}
          title={reviewTarget.status === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReviewTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${reviewTarget.status === 'approved' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleConfirmReview}
              >
                {reviewTarget.status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleConfirmReview}>
            <div
              style={{
                marginBottom: '14px',
                fontSize: '12.5px',
                color: '#475569',
                padding: '10px 12px',
                background: '#fcf6f5',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
              }}
            >
              <div>
                <strong>Applicant:</strong> {reviewTarget.leave.applicantName} ({reviewTarget.leave.applicantRole})
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong>Dates:</strong> {formatDate(reviewTarget.leave.startDate)} to{' '}
                {formatDate(reviewTarget.leave.endDate)} ({reviewTarget.leave.totalDays} days)
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong>Reason:</strong> {reviewTarget.leave.reason}
              </div>
            </div>

            {reviewError && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {reviewError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">
                {reviewTarget.status === 'approved'
                  ? 'Administrative Approval Remarks (Optional)'
                  : 'Rejection Reason & Feedback (Required)'}
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={
                  reviewTarget.status === 'approved'
                    ? 'e.g. Approved as per medical certificate submitted.'
                    : 'e.g. Incomplete documentation / scheduled examination on applied dates.'
                }
                value={reviewRemarks}
                onChange={e => {
                  setReviewRemarks(e.target.value);
                  if (reviewError) setReviewError('');
                }}
                autoFocus
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

