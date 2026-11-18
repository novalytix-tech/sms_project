import React, { useState, useMemo } from 'react';
import { FileCheck, Plus, Search, Printer, ShieldCheck, CheckCircle2, X, Award, QrCode, Sparkles } from 'lucide-react';
import { AwardCertificate, AcademicAward, StaffRecognition, CertificateTemplateType } from '../../types/academicAwards';
import { useERP } from '../../context/ERPContext';

interface CertificatesProps {
  certificates: AwardCertificate[];
  awards: AcademicAward[];
  staffRecognitions: StaffRecognition[];
  onIssueCertificate: (payload: {
    awardId?: string;
    recognitionId?: string;
    template?: CertificateTemplateType;
    principalName?: string;
  }) => void;
  onVerifyCode: (code: string) => { verified: boolean; certificate?: AwardCertificate; institutionName?: string };
}

export const Certificates: React.FC<CertificatesProps> = ({
  certificates,
  awards,
  staffRecognitions,
  onIssueCertificate,
  onVerifyCode,
}) => {
  const { currentRole } = useERP();
  const canManage = currentRole === 'school_admin' || currentRole === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<AwardCertificate | null>(null);

  // Issue Form State
  const [recipientCategory, setRecipientCategory] = useState<'student' | 'staff'>('student');
  const [selectedAwardId, setSelectedAwardId] = useState('');
  const [selectedRecognitionId, setSelectedRecognitionId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplateType>('academic_excellence');
  const [principalName, setPrincipalName] = useState('Dr. Arvind Swaminathan');

  // Verification Box State
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    tested: boolean;
    verified: boolean;
    certificate?: AwardCertificate;
    institutionName?: string;
  }>({ tested: false, verified: false });

  // Filtered Certificates
  const filteredCertificates = useMemo(() => {
    return certificates.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        c.recipientName.toLowerCase().includes(q) ||
        c.certificateNo.toLowerCase().includes(q) ||
        c.verificationCode.toLowerCase().includes(q) ||
        c.awardTitle.toLowerCase().includes(q);

      const matchesTemplate = templateFilter === 'all' || c.template === templateFilter;
      return matchesSearch && matchesTemplate;
    });
  }, [certificates, searchTerm, templateFilter]);

  // Approved awards eligible for certificates
  const eligibleAwards = useMemo(() => {
    return awards.filter(a => a.status === 'approved' || a.status === 'published');
  }, [awards]);

  const handleOpenIssueModal = () => {
    setRecipientCategory('student');
    setSelectedAwardId(eligibleAwards[0]?.id || '');
    setSelectedRecognitionId(staffRecognitions[0]?.id || '');
    setSelectedTemplate('academic_excellence');
    setPrincipalName('Dr. Arvind Swaminathan');
    setIsIssueModalOpen(true);
  };

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientCategory === 'student' && !selectedAwardId) return;
    if (recipientCategory === 'staff' && !selectedRecognitionId) return;

    onIssueCertificate({
      awardId: recipientCategory === 'student' ? selectedAwardId : undefined,
      recognitionId: recipientCategory === 'staff' ? selectedRecognitionId : undefined,
      template: selectedTemplate,
      principalName,
    });

    setIsIssueModalOpen(false);
  };

  const handleTestVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;

    const res = onVerifyCode(verifyCodeInput.trim());
    setVerifyResult({
      tested: true,
      verified: res.verified,
      certificate: res.certificate,
      institutionName: res.institutionName,
    });
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div>
      {/* Search & Actions Bar */}
      <div className="awards-filter-bar">
        <div className="awards-search-box">
          <Search size={16} className="awards-search-icon" />
          <input
            type="text"
            placeholder="Search certificate number, recipient name, or verification code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="awards-filter-selects">
          <select
            className="awards-select"
            value={templateFilter}
            onChange={e => setTemplateFilter(e.target.value)}
          >
            <option value="all">All Certificate Templates</option>
            <option value="academic_excellence">Academic Excellence</option>
            <option value="stem_olympiad">STEM & Olympiad</option>
            <option value="sports_achievement">Sports Achievement</option>
            <option value="cultural_arts">Arts & Cultural</option>
            <option value="leadership">Leadership & Service</option>
            <option value="staff_appreciation">Staff Appreciation</option>
          </select>

          {canManage && (
            <button className="awards-btn-primary" onClick={handleOpenIssueModal}>
              <Plus size={16} />
              Issue Certificate
            </button>
          )}
        </div>
      </div>

      {/* Online Verification Tool Box */}
      <div
        className="awards-card"
        style={{
          background: 'linear-gradient(135deg, #F6F8FC 0%, #DBEAFE 100%)',
          borderColor: '#BFDBFE',
          marginBottom: '1.5rem',
        }}
      >
        <div className="awards-card-body" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={22} color="#3B82F6" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Official Certificate Authenticity Verification Engine
            </h4>
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
            Enter any credential verification code (e.g. <code>CERT-2026-AARAV</code> or <code>CERT-2026-DIYA</code>) to validate official issuance and authenticity.
          </p>

          <form onSubmit={handleTestVerify} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="awards-input"
              style={{ maxWidth: '380px', textTransform: 'uppercase' }}
              placeholder="Enter code (e.g. CERT-2026-AARAV)"
              value={verifyCodeInput}
              onChange={e => setVerifyCodeInput(e.target.value)}
            />
            <button type="submit" className="awards-btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              <ShieldCheck size={16} />
              Verify Credential
            </button>
          </form>

          {verifyResult.tested && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                background: verifyResult.verified ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${verifyResult.verified ? '#bbf7d0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: verifyResult.verified ? '#15803d' : '#b91c1c', fontSize: '0.95rem' }}>
                  {verifyResult.verified ? '✓ Verified Authentic Official Certificate' : '✗ Unrecognized Certificate Code'}
                </div>
                {verifyResult.verified && verifyResult.certificate && (
                  <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '0.25rem' }}>
                    Recipient: <strong>{verifyResult.certificate.recipientName}</strong> • {verifyResult.certificate.awardTitle} • Issued: {verifyResult.certificate.issuedDate}
                  </div>
                )}
              </div>

              {verifyResult.verified && verifyResult.certificate && (
                <button
                  type="button"
                  className="awards-btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                  onClick={() => setPreviewCert(verifyResult.certificate!)}
                >
                  Inspect Certificate
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Certificates Directory Table */}
      <div className="awards-card">
        <div className="awards-card-header">
          <h3 className="awards-card-title">
            <FileCheck size={18} color="#3B82F6" />
            Issued Certificates Registry ({filteredCertificates.length})
          </h3>
        </div>
        <div className="awards-card-body" style={{ padding: 0 }}>
          {filteredCertificates.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <FileCheck size={40} color="#3B82F6" style={{ margin: '0 auto 1rem auto' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>No certificates found</div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Issue certificates for approved awards and faculty recognitions.
              </p>
            </div>
          ) : (
            <div className="awards-table-wrapper">
              <table className="awards-table">
                <thead>
                  <tr>
                    <th>Certificate No</th>
                    <th>Recipient</th>
                    <th>Honour / Award Title</th>
                    <th>Template Type</th>
                    <th>Issued Date</th>
                    <th>Verification Code</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map(cert => (
                    <tr key={cert.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#3B82F6' }}>
                          {cert.certificateNo}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{cert.recipientName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {cert.classNameOrDept} • {cert.admissionOrEmployeeNo}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{cert.awardTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cert.categoryName}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: '#f1f5f9',
                            color: '#334155',
                            textTransform: 'capitalize',
                          }}
                        >
                          {cert.template.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                        {cert.issuedDate}
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#0369a1',
                            background: '#e0f2fe',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          {cert.verificationCode}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="awards-btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem' }}
                          onClick={() => setPreviewCert(cert)}
                        >
                          <FileCheck size={14} />
                          Preview & Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Issue Modal */}
      {isIssueModalOpen && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box">
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <FileCheck size={20} color="#3B82F6" />
                Issue Official Academic Certificate
              </h3>
              <button className="awards-modal-close-btn" onClick={() => setIsIssueModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue}>
              <div className="awards-modal-body">
                <div className="awards-form-grid">
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Recipient Category</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="recipientCat"
                          checked={recipientCategory === 'student'}
                          onChange={() => setRecipientCategory('student')}
                        />
                        <span>Student Award Recipient</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="recipientCat"
                          checked={recipientCategory === 'staff'}
                          onChange={() => setRecipientCategory('staff')}
                        />
                        <span>Faculty / Staff Member</span>
                      </label>
                    </div>
                  </div>

                  {recipientCategory === 'student' ? (
                    <div className="awards-form-full awards-form-group">
                      <label className="awards-form-label">
                        Select Approved Student Award <span className="req">*</span>
                      </label>
                      <select
                        className="awards-select"
                        style={{ width: '100%' }}
                        value={selectedAwardId}
                        onChange={e => setSelectedAwardId(e.target.value)}
                        required
                      >
                        {eligibleAwards.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.studentName} — {a.awardTitle} ({a.className})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="awards-form-full awards-form-group">
                      <label className="awards-form-label">
                        Select Faculty Recognition <span className="req">*</span>
                      </label>
                      <select
                        className="awards-select"
                        style={{ width: '100%' }}
                        value={selectedRecognitionId}
                        onChange={e => setSelectedRecognitionId(e.target.value)}
                        required
                      >
                        {staffRecognitions.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.employeeName} — {r.awardTitle} ({r.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="awards-form-group">
                    <label className="awards-form-label">Certificate Template Theme</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={selectedTemplate}
                      onChange={e => setSelectedTemplate(e.target.value as any)}
                    >
                      <option value="academic_excellence">Academic Distinction & Honor</option>
                      <option value="stem_olympiad">STEM & Robotics Olympiad</option>
                      <option value="sports_achievement">Sports & Athletic Excellence</option>
                      <option value="cultural_arts">Arts, Cultural & Debate</option>
                      <option value="leadership">Leadership & Service</option>
                      <option value="staff_appreciation">Staff Appreciation</option>
                      <option value="general_merit">General Merit & Distinction</option>
                    </select>
                  </div>

                  <div className="awards-form-group">
                    <label className="awards-form-label">Principal Signature Authority</label>
                    <input
                      type="text"
                      className="awards-input"
                      value={principalName}
                      onChange={e => setPrincipalName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="awards-modal-footer">
                <button
                  type="button"
                  className="awards-btn-secondary"
                  onClick={() => setIsIssueModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="awards-btn-primary">
                  <CheckCircle2 size={16} />
                  Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authentic Visual Certificate Preview Modal */}
      {previewCert && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box awards-modal-box-large" style={{ maxWidth: '920px' }}>
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <Sparkles size={20} color="#3B82F6" />
                Certificate Viewer: {previewCert.certificateNo}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="awards-btn-primary" onClick={handlePrintCertificate}>
                  <Printer size={16} />
                  Print Certificate
                </button>
                <button className="awards-modal-close-btn" onClick={() => setPreviewCert(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="awards-modal-body" style={{ padding: '1.5rem', background: '#334155' }}>
              <div className="cert-preview-wrapper" style={{ padding: 0 }}>
                <div className="cert-canvas">
                  <div className="cert-outer-border">
                    <div className="cert-inner-border">
                      {/* School Heading */}
                      <div className="cert-header">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <Award size={36} color="#831843" />
                        </div>
                        <h1 className="cert-school-name">St. Xavier's International Academy</h1>
                        <p className="cert-school-sub">Affiliated to CBSE, New Delhi • Established 2020</p>
                        <div className="cert-divider" />
                      </div>

                      {/* Certificate Title */}
                      <div className="cert-badge-ribbon">Certificate of Distinction</div>
                      <div className="cert-present-text">This is proudly presented to</div>

                      {/* Recipient Name */}
                      <div className="cert-recipient-name">{previewCert.recipientName}</div>

                      {/* Citation */}
                      <p className="cert-citation">
                        of <strong>{previewCert.classNameOrDept}</strong> (ID: {previewCert.admissionOrEmployeeNo}) in sincere recognition of outstanding achievement in obtaining <strong>{previewCert.awardTitle}</strong> in the category of <strong>{previewCert.categoryName}</strong>.
                      </p>

                      {/* Signatures & Seal */}
                      <div className="cert-footer-row">
                        <div className="cert-sign-col">
                          <div className="cert-signature-img">A. Swaminathan</div>
                          <div className="cert-sign-line" />
                          <div className="cert-sign-title">{previewCert.principalName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Principal & Head of School</div>
                        </div>

                        <div className="cert-seal-wrap">
                          OFFICIAL<br />SEAL<br />VERIFIED
                        </div>

                        <div className="cert-sign-col">
                          <div className="cert-signature-img" style={{ color: '#047857' }}>V. Rao</div>
                          <div className="cert-sign-line" />
                          <div className="cert-sign-title">Vikramaditya Rao</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Chairman, Board of Governors</div>
                        </div>
                      </div>

                      {/* Security & Verification Row */}
                      <div className="cert-verify-info">
                        <span>Certificate No: <strong>{previewCert.certificateNo}</strong></span>
                        <span>Date of Issuance: {previewCert.issuedDate}</span>
                        <span>Verification Code: <strong>{previewCert.verificationCode}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="awards-modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.825rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <QrCode size={16} />
                Online Verification URL: <code>{previewCert.qrCodeUrl || `https://stxaviers.edu.in/verify/${previewCert.verificationCode}`}</code>
              </div>
              <button
                type="button"
                className="awards-btn-secondary"
                onClick={() => setPreviewCert(null)}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

