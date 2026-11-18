import React from 'react';
import { AdmissionApplication, AdmissionOffer } from '../../../types';
import { formatDate, formatCurrencyINR } from '../../../utils/formatters';
import { Printer, X } from 'lucide-react';

interface PrintableOfferLetterProps {
  application: AdmissionApplication;
  offer?: AdmissionOffer;
  schoolName?: string;
  onClose: () => void;
}

export const PrintableOfferLetter: React.FC<PrintableOfferLetterProps> = ({
  application,
  offer,
  schoolName = "St. Xavier's International Academy",
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const offerDate = offer?.offerDate || application.updatedAt || new Date().toISOString().split('T')[0];
  const expiryDate = offer?.expiryDate || '2026-11-15';
  const feeAmount = offer?.admissionFeeAmount || application.admissionFeeAmount || 25000;
  const targetClass = offer?.approvedClassName || application.targetClassName;
  const targetSection = offer?.offeredSection || application.targetSection || 'A';

  return (
    <div className="printable-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
        position: 'relative',
      }}>
        {/* Top Control Bar */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          borderBottom: '1px solid #E2E8F0',
          background: '#F6F8FC',
          borderRadius: '12px 12px 0 0',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#19191f' }}>Provisional Admission Offer Letter</h3>
            <span style={{ fontSize: '12px', color: '#71717a' }}>Reference: {application.applicationNo}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={15} />
              <span>Print Offer Letter</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <X size={15} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Letter Body */}
        <div className="printable-document" style={{
          padding: '40px 50px',
          fontFamily: 'serif',
          color: '#1a1a1a',
          lineHeight: '1.6',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #3B82F6', paddingBottom: '20px', marginBottom: '28px' }}>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', color: '#1D4ED8', letterSpacing: '0.5px' }}>
              {schoolName.toUpperCase()}
            </h1>
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#4a4a4a' }}>
              Affiliated to CBSE, New Delhi (Affiliation No: 2130894 / School Code: 70112)
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
              Plot 12-B, Knowledge City, Civil Lines, Kanpur, Uttar Pradesh - 208001 | Tel: +91 512 2334455 | Email: admissions@stxaviers.edu.in
            </p>
          </div>

          {/* Letter Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '13.5px' }}>
            <div>
              <strong>Ref No:</strong> SXIA/ADM/OFFER/{application.academicYear || '2026-27'}/{application.applicationNo.replace('APP-', '')}
            </div>
            <div>
              <strong>Date:</strong> {formatDate(offerDate)}
            </div>
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: '24px', fontSize: '14px' }}>
            <div><strong>To,</strong></div>
            <div>Mr./Mrs. <strong>{application.parentName}</strong> ({application.parentRelation})</div>
            <div>Parent/Guardian of Master/Miss <strong>{application.firstName} {application.lastName}</strong></div>
            <div>{application.address}, {application.city}, {application.state} - {application.pincode}</div>
            <div>Phone: {application.parentPhone}</div>
          </div>

          {/* Subject */}
          <div style={{ textAlign: 'center', margin: '24px 0', fontSize: '15px', fontWeight: 'bold', textDecoration: 'underline' }}>
            SUBJECT: PROVISIONAL OFFER OF ADMISSION TO {targetClass.toUpperCase()} FOR ACADEMIC SESSION {application.academicYear || '2026-2027'}
          </div>

          {/* Body Content */}
          <div style={{ fontSize: '14px', textAlign: 'justify', marginBottom: '18px' }}>
            <p>Dear Mr./Mrs. {application.parentName},</p>
            <p>
              We are pleased to inform you that following the review of your admission application and the successful completion of the academic evaluation/interaction, Master/Miss <strong>{application.firstName} {application.lastName}</strong> has been granted <strong>Provisional Admission</strong> to <strong>{targetClass} ({targetSection})</strong> at {schoolName} for the Academic Session <strong>{application.academicYear || '2026-2027'}</strong>.
            </p>
            <p>
              This provisional offer is subject to the clearance of the admission fee schedule and the submission of original transfer documents as per CBSE statutory norms.
            </p>
          </div>

          {/* Fee Table */}
          <div style={{ margin: '22px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#fdf2f2', borderTop: '1px solid #e5c3c1', borderBottom: '1px solid #e5c3c1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Fee Component</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Particulars</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 12px' }}>1. One-time Admission Fee</td>
                  <td style={{ padding: '8px 12px' }}>Non-refundable institutional enrollment fee</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹15,000</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 12px' }}>2. Caution Money (Refundable)</td>
                  <td style={{ padding: '8px 12px' }}>Security deposit refundable on transfer</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹5,000</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 12px' }}>3. Annual Academic & Lab Charges</td>
                  <td style={{ padding: '8px 12px' }}>First Quarter Composite Academic Fee</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{Math.max(0, feeAmount - 20000).toLocaleString('en-IN')}</td>
                </tr>
                <tr style={{ background: '#fcfcfc', fontWeight: 'bold', borderTop: '2px solid #1D4ED8' }}>
                  <td style={{ padding: '10px 12px' }} colSpan={2}>TOTAL ADMISSION DUES PAYABLE</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1D4ED8' }}>
                    {formatCurrencyINR(feeAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Terms & Conditions */}
          <div style={{ fontSize: '12.5px', background: '#fafafa', padding: '14px 18px', borderLeft: '3px solid #3B82F6', marginBottom: '28px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>TERMS OF ADMISSION CONFIRMATION:</div>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              <li>This offer remains valid strictly until <strong>{formatDate(expiryDate)}</strong>, failing which the reserved seat will be re-allotted to the waitlisted candidate.</li>
              <li>Official Admission Number (Permanent Student ID) and Section allotment will be confirmed upon fee receipt clearance.</li>
              <li>Original Transfer Certificate (TC) countersigned by the competent education authority must be submitted within 15 days of joining.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '20px' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #777', paddingBottom: '35px' }}></div>
              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>Admissions Coordinator</div>
              <div style={{ fontSize: '11.5px', color: '#666' }}>Office of Admissions</div>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #777', paddingBottom: '35px' }}></div>
              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>Dr. Arvind Swaminathan</div>
              <div style={{ fontSize: '11.5px', color: '#666' }}>Principal & Head of School</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

