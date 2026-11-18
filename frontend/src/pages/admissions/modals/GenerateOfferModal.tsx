import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionApplication } from '../../../types';
import { admissionService } from '../../../services/admissionService';
import { classService } from '../../../services/classService';
import { todayISO } from '../../../utils/date';

interface GenerateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AdmissionApplication | null;
  classes: ReturnType<typeof classService.getAll>;
  onSuccess: () => void;
}

export const GenerateOfferModal: React.FC<GenerateOfferModalProps> = ({
  isOpen,
  onClose,
  application,
  classes,
  onSuccess,
}) => {
  const [decision, setDecision] = useState<'Offered' | 'Waitlisted' | 'Rejected' | 'Withdrawn'>('Offered');
  const [classId, setClassId] = useState(application?.targetClassId || classes[0]?.id || 'cls-1a');
  const [section, setSection] = useState(application?.targetSection || 'A');
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0]
  );
  const [feeAmount, setFeeAmount] = useState(application?.admissionFeeAmount || 25000);
  const [approver, setApprover] = useState('Dr. Arvind Swaminathan (Principal)');
  const [instructions, setInstructions] = useState(
    'Please deposit the one-time admission dues and submit the counter-signed Transfer Certificate within 15 days of this offer.'
  );

  if (!application) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetClass = classes.find(c => c.id === classId);
    const approvedClassName = targetClass ? targetClass.name : application.targetClassName;

    const res = admissionService.generateOffer({
      applicationId: application.id,
      decision,
      decisionDate: todayISO(),
      approvedClassId: classId,
      approvedClassName,
      offeredSection: section,
      offerDate: todayISO(),
      expiryDate,
      admissionFeeAmount: Number(feeAmount),
      admissionInstructions: instructions,
      authorizedApprover: approver,
    });

    if (res.success) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Generate Admission Offer: ${application.firstName} ${application.lastName}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: '#F6F8FC',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '13px',
        }}>
          Applicant: <strong>{application.firstName} {application.lastName}</strong> • Ref: <code>{application.applicationNo}</code> • Guardian: <strong>{application.parentName}</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Admission Decision *</label>
            <select
              className="form-select"
              value={decision}
              onChange={e => setDecision(e.target.value as any)}
            >
              <option value="Offered">Provisional Admission Offered</option>
              <option value="Waitlisted">Waitlisted (Capacity Pending)</option>
              <option value="Rejected">Application Rejected</option>
              <option value="Withdrawn">Withdrawn by Parent</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Offer Expiry Date *</label>
            <input
              type="date"
              className="form-input"
              required
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Approved Class</label>
            <select
              className="form-select"
              value={classId}
              onChange={e => setClassId(e.target.value)}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Allotted Section</label>
            <select
              className="form-select"
              value={section}
              onChange={e => setSection(e.target.value)}
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Admission Fee Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              required
              value={feeAmount}
              onChange={e => setFeeAmount(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Authorized Approver</label>
            <input
              type="text"
              className="form-input"
              required
              value={approver}
              onChange={e => setApprover(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Admission Instructions to Parent</label>
          <textarea
            className="form-input"
            rows={2}
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Issue & Release Offer Letter
          </button>
        </div>
      </form>
    </Modal>
  );
};

