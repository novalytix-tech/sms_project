import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionEnquiry, AdmissionFollowUp, CallOutcome } from '../../../types';
import { admissionService } from '../../../services/admissionService';

interface AddFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: AdmissionEnquiry | null;
  onSuccess: (followUp: AdmissionFollowUp) => void;
}

export const AddFollowUpModal: React.FC<AddFollowUpModalProps> = ({
  isOpen,
  onClose,
  enquiry,
  onSuccess,
}) => {
  const [method, setMethod] = useState<'Phone Call' | 'WhatsApp' | 'Email' | 'Campus Visit'>('Phone Call');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [outcome, setOutcome] = useState<CallOutcome>('Interested');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('Follow up after campus visit');
  const [status, setStatus] = useState<'Scheduled' | 'Completed'>('Completed');
  const [staff, setStaff] = useState('Meenakshi Sharma');

  if (!enquiry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    const newFollowUp = admissionService.createFollowUp({
      enquiryId: enquiry.id,
      candidateName: enquiry.studentName,
      parentName: enquiry.parentName,
      contactNumber: enquiry.mobileNumber,
      assignedStaff: staff,
      followUpDate: date,
      followUpTime: time,
      communicationMethod: method,
      interactionNotes: notes,
      nextAction,
      status,
      callOutcome: outcome,
    });

    onSuccess(newFollowUp);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Interaction: ${enquiry.studentName}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: '#F6F8FC',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#19191f',
        }}>
          Enquiry: <strong>{enquiry.enquiryNo}</strong> • Parent: <strong>{enquiry.parentName}</strong> ({enquiry.mobileNumber}) • Class: <strong>{enquiry.interestedClassName}</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Communication Channel</label>
            <select
              className="form-select"
              value={method}
              onChange={e => setMethod(e.target.value as any)}
            >
              <option value="Phone Call">Phone Call</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Campus Visit">Campus Walkthrough / Visit</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Interaction Status</label>
            <select
              className="form-select"
              value={status}
              onChange={e => setStatus(e.target.value as any)}
            >
              <option value="Completed">Completed Interaction</option>
              <option value="Scheduled">Scheduled Reminder</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Interaction Date</label>
            <input
              type="date"
              className="form-input"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Time</label>
            <input
              type="time"
              className="form-input"
              required
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Call / Interaction Outcome</label>
            <select
              className="form-select"
              value={outcome}
              onChange={e => setOutcome(e.target.value as any)}
            >
              <option value="Interested">Interested / Positive Feedback</option>
              <option value="Campus Visit Planned">Campus Visit Planned</option>
              <option value="Busy / Callback Requested">Busy / Callback Requested</option>
              <option value="Call Not Received">Call Not Received / No Answer</option>
              <option value="Fee / Scholarship Inquiry">Fee / Scholarship Inquiry</option>
              <option value="Documents Awaited">Documents Awaited</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Staff</label>
            <select
              className="form-select"
              value={staff}
              onChange={e => setStaff(e.target.value)}
            >
              <option value="Meenakshi Sharma">Meenakshi Sharma</option>
              <option value="Rajesh Khanna">Rajesh Khanna</option>
              <option value="Preeti Srivastava">Preeti Srivastava</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Discussion Notes & Parent Feedback *</label>
          <textarea
            className="form-input"
            rows={3}
            required
            placeholder="Key discussion points, parent queries, syllabus clarification, transport doubts..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Next Planned Action</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Call back on Friday after father returns from travel"
            value={nextAction}
            onChange={e => setNextAction(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Interaction
          </button>
        </div>
      </form>
    </Modal>
  );
};

