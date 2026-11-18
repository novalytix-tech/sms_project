import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionEnquiry, EnquirySource, PreferredContactMethod } from '../../../types';
import { admissionService } from '../../../services/admissionService';
import { classService } from '../../../services/classService';
import { AlertCircle, UserCheck } from 'lucide-react';
import { todayISO } from '../../../utils/date';

interface NewEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (enquiry: AdmissionEnquiry) => void;
  classes: ReturnType<typeof classService.getAll>;
  currentSession?: string;
}

export const NewEnquiryModal: React.FC<NewEnquiryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classes,
  currentSession = '2026-2027',
}) => {
  const [form, setForm] = useState({
    studentName: '',
    dob: '2018-05-15',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    interestedClassId: classes[0]?.id || 'cls-1a',
    academicSession: currentSession,
    previousSchool: '',
    parentName: '',
    relationship: 'Father' as 'Father' | 'Mother' | 'Guardian',
    mobileNumber: '',
    alternateMobile: '',
    email: '',
    residentialAddress: '',
    source: 'Website' as EnquirySource,
    preferredContactMethod: 'Phone Call' as PreferredContactMethod,
    assignedCounsellor: 'Meenakshi Sharma',
    nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    remarks: '',
  });

  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleMobileChange = (val: string) => {
    setForm(f => ({ ...f, mobileNumber: val }));
    if (val.replace(/\D/g, '').length >= 10) {
      // Live check for existing enquiries
      const cleanPhone = val.replace(/\D/g, '').slice(-10);
      const existing = admissionService.getAllEnquiries().find(e => e.mobileNumber.replace(/\D/g, '').includes(cleanPhone));
      if (existing) {
        setDuplicateWarning(`Contact matches existing enquiry ${existing.enquiryNo} for applicant ${existing.studentName}. Sibling or repeat inquiry will be recorded.`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.studentName.trim()) {
      setError('Please provide candidate full name.');
      return;
    }
    if (!form.parentName.trim() || !form.mobileNumber.trim()) {
      setError('Please provide parent/guardian name and primary mobile number.');
      return;
    }

    const targetClass = classes.find(c => c.id === form.interestedClassId);
    const targetClassName = targetClass ? targetClass.name : 'Class 1';

    const res = admissionService.createEnquiry({
      ...form,
      enquiryDate: todayISO(),
      interestedClassName: targetClassName,
      status: 'New',
    });

    if (res.success && res.data) {
      onSuccess(res.data);
      onClose();
    } else {
      setError(res.error || 'Failed to create admission enquiry.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Admission Enquiry">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            background: '#DBEAFE',
            color: '#a51d29',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {duplicateWarning && (
          <div style={{
            background: '#fff3dd',
            color: '#98440e',
            border: '1px solid #fed7aa',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <UserCheck size={16} />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Section 1: Candidate Details */}
        <div>
          <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: '#3B82F6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            1. Student / Candidate Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Student Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Aarav Sharma"
                value={form.studentName}
                onChange={e => setForm({ ...form, studentName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input
                type="date"
                className="form-input"
                required
                value={form.dob}
                onChange={e => setForm({ ...form, dob: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value as any })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Interested Class *</label>
              <select
                className="form-select"
                value={form.interestedClassId}
                onChange={e => setForm({ ...form, interestedClassId: e.target.value })}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Academic Session</label>
              <select
                className="form-select"
                value={form.academicSession}
                onChange={e => setForm({ ...form, academicSession: e.target.value })}
              >
                <option value="2026-2027">2026-2027 (Upcoming)</option>
                <option value="2025-2026">2025-2026 (Mid-term)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Previous School (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Modern Playway Kanpur"
                value={form.previousSchool}
                onChange={e => setForm({ ...form, previousSchool: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Parent / Guardian Details */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
          <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: '#3B82F6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            2. Parent & Contact Information
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Parent / Guardian Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Rajesh Sharma"
                value={form.parentName}
                onChange={e => setForm({ ...form, parentName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Relationship</label>
              <select
                className="form-select"
                value={form.relationship}
                onChange={e => setForm({ ...form, relationship: e.target.value as any })}
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Mobile No *</label>
              <input
                type="tel"
                className="form-input"
                required
                placeholder="e.g. +91 98765 43210"
                value={form.mobileNumber}
                onChange={e => handleMobileChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Alternate Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. +91 94150 11223"
                value={form.alternateMobile}
                onChange={e => setForm({ ...form, alternateMobile: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. parent@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Residential Address & Locality</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Flat 302, Ratan Orbit, Civil Lines, Kanpur"
                value={form.residentialAddress}
                onChange={e => setForm({ ...form, residentialAddress: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Enquiry Source & Assignment */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
          <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: '#3B82F6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            3. Channel & Follow-up Assignment
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Enquiry Source *</label>
              <select
                className="form-select"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value as any })}
              >
                <option value="Website">Website</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Phone Call">Phone Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="Referral">Referral</option>
                <option value="Education Fair">Education Fair</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Contact Channel</label>
              <select
                className="form-select"
                value={form.preferredContactMethod}
                onChange={e => setForm({ ...form, preferredContactMethod: e.target.value as any })}
              >
                <option value="Phone Call">Phone Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="In-Person">In-Person</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Counsellor</label>
              <select
                className="form-select"
                value={form.assignedCounsellor}
                onChange={e => setForm({ ...form, assignedCounsellor: e.target.value })}
              >
                <option value="Meenakshi Sharma">Meenakshi Sharma (Senior Counsellor)</option>
                <option value="Rajesh Khanna">Rajesh Khanna (Admissions Officer)</option>
                <option value="Preeti Srivastava">Preeti Srivastava (Counsellor)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Next Follow-up Due Date</label>
              <input
                type="date"
                className="form-input"
                value={form.nextFollowUpDate}
                onChange={e => setForm({ ...form, nextFollowUpDate: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Parent Query / Counsellor Remarks</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Parent questions on curriculum, school bus timings, special sports coaching..."
                value={form.remarks}
                onChange={e => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Register Enquiry
          </button>
        </div>
      </form>
    </Modal>
  );
};
