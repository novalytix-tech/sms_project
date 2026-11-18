import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionEnquiry, LostReason } from '../../../types';
import { admissionService } from '../../../services/admissionService';
import { AlertTriangle } from 'lucide-react';

interface MarkLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: AdmissionEnquiry | null;
  onSuccess: (updated: AdmissionEnquiry) => void;
}

export const MarkLostModal: React.FC<MarkLostModalProps> = ({
  isOpen,
  onClose,
  enquiry,
  onSuccess,
}) => {
  const [reason, setReason] = useState<LostReason>('Distance / Location far');
  const [remarks, setRemarks] = useState('');

  if (!enquiry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const res = admissionService.markEnquiryLost(enquiry.id, reason);
    if (res.success && res.data) {
      if (remarks.trim()) {
        admissionService.updateEnquiry(enquiry.id, {
          remarks: `${enquiry.remarks ? `${enquiry.remarks} • ` : ''}Lost Reason: ${reason} (${remarks.trim()})`,
        });
      }
      onSuccess(res.data);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mark Enquiry as Lost: ${enquiry.enquiryNo}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '13px',
          color: '#991b1b',
          display: 'flex',
          gap: '10px',
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Marking an enquiry as lost removes it from the active follow-up pipeline while preserving its analytics and source history for conversion reports.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Primary Reason for Discontinuation *</label>
          <select
            className="form-select"
            value={reason}
            onChange={e => setReason(e.target.value as any)}
          >
            <option value="Fee too high">Fee structure exceeds family budget</option>
            <option value="Distance / Location far">School location / travel time too far</option>
            <option value="Chose another school">Admitted to another school</option>
            <option value="Transport unavailable">School bus route unavailable for residence</option>
            <option value="Ineligible age / Grade requirement">Ineligible age or prerequisite criteria</option>
            <option value="Curriculum / Board preference">Prefers ICSE / State Board over CBSE</option>
            <option value="Parent relocated">Family relocated out of Kanpur</option>
            <option value="No response after multiple attempts">Unreachable after 3+ follow-up attempts</option>
            <option value="Other">Other school-specific reason</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Additional Feedback / Context (Optional)</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="e.g. Parent finalized admissions at DPS due to walk-to-school proximity..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: '#b91c1c', borderColor: '#b91c1c' }}>
            Confirm Lost Enquiry
          </button>
        </div>
      </form>
    </Modal>
  );
};

