// ==========================================
// School Settings & Identity Configuration
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Building, Save, RotateCcw, Download, Upload, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    schoolSettings,
    updateSchoolSettings,
    addToast,
  } = useERP();

  const [form, setForm] = useState({ ...schoolSettings });
  const [logoPreview, setLogoPreview] = useState(schoolSettings.logoUrl || '');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolSettings({
      ...form,
      logoUrl: logoPreview,
    });
    addToast('success', 'School Profile Saved', 'Updated institutional identity is now live across the entire system.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>School Settings</h1>
          <p className="page-subtitle">
            Institution profile and academic year
          </p>
        </div>
      </div>

      <div className="dashboard-two-col">
        {/* Left Column: School Profile Form */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Building size={18} color="#3B82F6" />
              School Information
            </h2>
          </div>

          <div className="card-body">
            <form onSubmit={handleSaveSettings}>
              {/* Logo Preview Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    border: '2px dashed #CBD5E1',
                    background: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="School Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Building size={24} color="#94A3B8" />
                  )}
                </div>
                <div>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <span>Upload Logo Image</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    PNG, SVG, or JPG recommended (Max 2MB)
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">School Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.schoolName}
                  onChange={e => setForm({ ...form, schoolName: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label required">School Board</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.schoolBoard}
                    onChange={e => setForm({ ...form, schoolBoard: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Affiliation Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.affiliationNo}
                    onChange={e => setForm({ ...form, affiliationNo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Academic Session Year</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.academicYear}
                    onChange={e => setForm({ ...form, academicYear: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Principal / Head of School</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.principalName}
                    onChange={e => setForm({ ...form, principalName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Official Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Phone Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Campus Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label required">City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">State</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Postal Pincode</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.pincode}
                    onChange={e => setForm({ ...form, pincode: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
                <Save size={16} />
                <span>Save School Identity</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: System Information & Data Operations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* System Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <ShieldCheck size={18} color="#3B82F6" />
                System Information
              </h2>
            </div>
            <div className="card-body">
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#475569' }}>
                <div><strong style={{ color: '#19191f' }}>Application:</strong> School Management System (SMS)</div>
                <div><strong style={{ color: '#19191f' }}>Version:</strong> 1.0.0 (Enterprise Edition)</div>
                <div><strong style={{ color: '#19191f' }}>Academic Session:</strong> {schoolSettings.academicYear}</div>
                <div><strong style={{ color: '#19191f' }}>School Board:</strong> {schoolSettings.schoolBoard}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

