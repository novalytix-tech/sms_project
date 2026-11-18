// ==========================================
// Public Admission Enquiry Page (no login)
// Prospective students / parents submit a detailed enquiry which
// becomes a lead in the admin's Admissions dashboard (cloud database).
// ==========================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, CheckCircle2, Loader2 } from 'lucide-react';
import { publicEnquiryService, PublicEnquiryInput } from '../../services/publicEnquiryService';

const CLASS_OPTIONS = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
];
const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'];

const emptyForm: PublicEnquiryInput = {
  firstName: '', lastName: '', dob: '', gender: 'Male',
  interestedClassName: 'Class 1', previousSchool: '', previousClass: '', previousBoard: '',
  parentName: '', relationship: 'Father', phone: '', alternatePhone: '', email: '', address: '', notes: '',
};

export const AdmissionEnquiryPage: React.FC = () => {
  const [form, setForm] = useState<PublicEnquiryInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k: keyof PublicEnquiryInput, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Student first and last name are required.'); return; }
    if (!form.parentName.trim()) { setError("Parent / guardian name is required."); return; }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) { setError('A valid 10-digit mobile number is required.'); return; }

    setSubmitting(true);
    const res = await publicEnquiryService.submit(form);
    setSubmitting(false);
    if (res.success) setDone(true);
    else setError(res.error || 'Something went wrong. Please try again.');
  };

  const field: React.CSSProperties = { marginBottom: '14px' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '8px',
    fontSize: '14px', color: '#0F172A', background: '#FFFFFF', boxSizing: 'border-box',
  };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
  const sectionTitle: React.CSSProperties = {
    fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#2563EB', fontWeight: 700, margin: '22px 0 10px',
  };

  if (done) {
    return (
      <div style={pageWrap}>
        <div style={{ ...card, textAlign: 'center', padding: '48px 32px' }}>
          <CheckCircle2 size={56} color="#10B981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', color: '#0F172A', margin: '0 0 8px' }}>Thank you!</h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px' }}>
            Your admission enquiry for <strong>{form.firstName} {form.lastName}</strong> has been received.
            Our admissions team will contact you on <strong>{form.phone}</strong> soon.
          </p>
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setDone(false); }}>
            Submit Another Enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', color: '#0F172A', margin: 0 }}>Admission Enquiry</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>St. Xavier's Academy — fill the form and we'll get back to you</p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', margin: '16px 0' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Student details */}
          <div style={sectionTitle}>Student Details</div>
          <div style={grid2}>
            <div style={field}><label style={labelStyle}>First Name *</label><input style={inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></div>
            <div style={field}><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></div>
          </div>
          <div style={grid2}>
            <div style={field}><label style={labelStyle}>Date of Birth</label><input type="date" style={inputStyle} value={form.dob} onChange={e => set('dob', e.target.value)} /></div>
            <div style={field}>
              <label style={labelStyle}>Gender</label>
              <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
          <div style={field}>
            <label style={labelStyle}>Class seeking admission for *</label>
            <select style={inputStyle} value={form.interestedClassName} onChange={e => set('interestedClassName', e.target.value)}>
              {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Previous school */}
          <div style={sectionTitle}>Previous School</div>
          <div style={field}><label style={labelStyle}>Previous School Name</label><input style={inputStyle} placeholder="e.g. ABC Public School" value={form.previousSchool} onChange={e => set('previousSchool', e.target.value)} /></div>
          <div style={grid2}>
            <div style={field}><label style={labelStyle}>Last Class Attended</label><input style={inputStyle} placeholder="e.g. Class 4" value={form.previousClass} onChange={e => set('previousClass', e.target.value)} /></div>
            <div style={field}>
              <label style={labelStyle}>Previous Board</label>
              <select style={inputStyle} value={form.previousBoard} onChange={e => set('previousBoard', e.target.value)}>
                <option value="">Select</option>
                {BOARD_OPTIONS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Parent / contact */}
          <div style={sectionTitle}>Parent / Guardian & Contact</div>
          <div style={grid2}>
            <div style={field}><label style={labelStyle}>Parent / Guardian Name *</label><input style={inputStyle} value={form.parentName} onChange={e => set('parentName', e.target.value)} required /></div>
            <div style={field}>
              <label style={labelStyle}>Relationship</label>
              <select style={inputStyle} value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                <option>Father</option><option>Mother</option><option>Guardian</option>
              </select>
            </div>
          </div>
          <div style={grid2}>
            <div style={field}><label style={labelStyle}>Mobile Number *</label><input style={inputStyle} placeholder="10-digit mobile" value={form.phone} onChange={e => set('phone', e.target.value)} required /></div>
            <div style={field}><label style={labelStyle}>Alternate Number</label><input style={inputStyle} value={form.alternatePhone} onChange={e => set('alternatePhone', e.target.value)} /></div>
          </div>
          <div style={field}><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div style={field}><label style={labelStyle}>Residential Address</label><textarea style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' }} value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div style={field}><label style={labelStyle}>Message / Remarks</label><textarea style={{ ...inputStyle, minHeight: '56px', resize: 'vertical' }} placeholder="Anything you'd like us to know" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, marginTop: '8px', justifyContent: 'center' }}>
            {submitting ? <><Loader2 size={16} className="spin" /> Submitting...</> : 'Submit Enquiry'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748B' }}>
          Already a member? <Link to="/login" style={{ color: '#2563EB', fontWeight: 600 }}>Login here</Link>
        </div>
      </div>
    </div>
  );
};

const pageWrap: React.CSSProperties = {
  minHeight: '100vh', background: 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)',
  padding: '32px 16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: '640px', background: '#fff', borderRadius: '16px',
  padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
};
