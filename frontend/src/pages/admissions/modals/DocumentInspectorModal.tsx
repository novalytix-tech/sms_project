import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionApplication, AdmissionDocument } from '../../../types';
import { formatDate } from '../../../utils/formatters';
import { FileText, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DocumentInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AdmissionApplication | null;
  document: AdmissionDocument | null;
  onVerify: (appId: string, docId: string, verified: boolean, notes?: string) => void;
  onReject: (appId: string, docId: string, reason: string) => void;
}

export const DocumentInspectorModal: React.FC<DocumentInspectorModalProps> = ({
  isOpen,
  onClose,
  application,
  document,
  onVerify,
  onReject,
}) => {
  const [remarks, setRemarks] = useState('');
  const [rejectMode, setRejectMode] = useState(false);

  if (!application || !document) return null;

  const handleApprove = () => {
    onVerify(application.id, document.id, true, remarks || 'Verified against original copy.');
    onClose();
  };

  const handleConfirmReject = () => {
    if (!remarks.trim()) return;
    onReject(application.id, document.id, remarks);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Inspect Document: ${document.title}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Applicant Header */}
        <div style={{
          background: '#F6F8FC',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
        }}>
          <div>
            <strong>{application.firstName} {application.lastName}</strong> • Ref: <code>{application.applicationNo}</code> • Class: {application.targetClassName}
          </div>
          <div>
            Status: {document.verified ? (
              <span className="badge badge-success">Verified</span>
            ) : (
              <span className="badge badge-warning">Pending Verification</span>
            )}
          </div>
        </div>

        {/* Document Simulated Viewer Canvas */}
        <div style={{
          height: '240px',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          background: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
        }}>
          <FileText size={48} color="#9ca3af" style={{ marginBottom: '10px' }} />
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1f2937' }}>{document.title}</h4>
          <span style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
            Official Electronic Copy • Uploaded: {formatDate(application.updatedAt)} • Format: PDF (1.4 MB)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => alert(`Simulated download for: ${document.title} (${application.applicationNo}.pdf)`)}
          >
            <Download size={14} />
            <span>Download Original Scan</span>
          </button>
        </div>

        {/* Rejection Mode Input */}
        {rejectMode ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} />
              <span>Specify Document Discrepancy / Rejection Reason *</span>
            </h5>
            <textarea
              className="form-input"
              rows={2}
              required
              placeholder="e.g. Birth certificate scan is blurred or date does not match municipal registration..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejectMode(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={handleConfirmReject}
              >
                Confirm Rejection & Request Re-upload
              </button>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Verifier Remarks / Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Verified with original municipal record."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        )}

        {/* Modal Actions */}
        {!rejectMode && (
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setRejectMode(true)}
              style={{ color: '#dc2626' }}
            >
              <XCircle size={15} />
              <span>Reject Document</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApprove}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
              >
                <CheckCircle size={16} />
                <span>Approve & Mark Verified</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

