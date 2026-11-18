// ==========================================
// Official Fee Payment Receipt (A4 Printable Component)
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { PaymentReceipt } from '../../types';
import { useERP } from '../../context/ERPContext';
import { formatCurrencyINRWithDecimals, amountInWordsINR, formatDate } from '../../utils/formatters';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface PrintableReceiptModalProps {
  receipt: PaymentReceipt;
  onClose: () => void;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({ receipt, onClose }) => {
  const { schoolSettings } = useERP();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Modal Action Bar (Hidden in @media print) */}
        <div className="receipt-modal-actions no-print">
          <div className="receipt-actions-left">
            <span className="receipt-badge-pill">
              <CheckCircle2 size={14} color="#16a34a" />
              <span>Official Fee Receipt</span>
            </span>
          </div>

          <div className="receipt-actions-right">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              title="Print receipt or save to PDF"
            >
              <Printer size={15} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              aria-label="Close receipt dialog"
            >
              <X size={15} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* The Printable A4 Sheet */}
        <div className="printable-receipt-sheet" id="printable-fee-receipt">

          {/* Institutional Header */}
          <header className="receipt-header-row">
            <div className="receipt-logo-container">
              {schoolSettings.logoUrl ? (
                <img src={schoolSettings.logoUrl} alt={receipt.schoolName} className="receipt-school-logo" />
              ) : (
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    background: '#3B82F6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '18px',
                  }}
                >
                  {receipt.schoolName.charAt(0)}
                </div>
              )}
            </div>

            <div className="receipt-school-meta">
              <h1 className="receipt-school-title">{receipt.schoolName}</h1>
              <p className="receipt-school-affil">{receipt.schoolAffiliation}</p>
              <p className="receipt-school-address">{receipt.schoolAddress}</p>
              <div className="receipt-doc-title-badge">OFFICIAL FEE PAYMENT RECEIPT</div>
            </div>

            <div className="receipt-qr-placeholder">
              <div className="qr-box">
                <span className="qr-label">DIGITAL VERIFIED</span>
                <span className="qr-hash">{receipt.transactionRef.substring(0, 16)}</span>
              </div>
            </div>
          </header>

          <div className="receipt-divider" />

          {/* Reference Meta Grid */}
          <div className="receipt-meta-grid">
            <div className="meta-col">
              <div className="meta-pair">
                <span className="meta-label">Receipt Number:</span>
                <strong className="meta-val highlight-val">{receipt.receiptNo}</strong>
              </div>
              <div className="meta-pair">
                <span className="meta-label">Transaction Ref:</span>
                <span className="meta-val monospace">{receipt.transactionRef}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-label">Invoice Number:</span>
                <span className="meta-val">{receipt.invoiceNo}</span>
              </div>
            </div>

            <div className="meta-col">
              <div className="meta-pair">
                <span className="meta-label">Date & Time:</span>
                <span className="meta-val">
                  {formatDate(receipt.paymentDate)} at {receipt.paymentTime}
                </span>
              </div>
              <div className="meta-pair">
                <span className="meta-label">Academic Session:</span>
                <span className="meta-val">{receipt.academicYear}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-label">Fee Category:</span>
                <span className="meta-val">{receipt.category} Fee</span>
              </div>
            </div>
          </div>

          {/* Student Information Box */}
          <div className="receipt-student-box">
            <div className="student-box-header">STUDENT & GUARDIAN PARTICULARS</div>
            <div className="student-box-grid">
              <div>
                <span className="field-lbl">Student Name:</span>
                <strong className="field-txt">{receipt.studentName}</strong>
              </div>
              <div>
                <span className="field-lbl">Admission Number:</span>
                <span className="field-txt">{receipt.admissionNo}</span>
              </div>
              <div>
                <span className="field-lbl">Class & Section:</span>
                <span className="field-txt">
                  {receipt.className} ({receipt.section})
                </span>
              </div>
              <div>
                <span className="field-lbl">Payment Mode:</span>
                <span className="field-txt">
                  {receipt.paymentMethod}
                  {receipt.upiVpa ? ` (${receipt.upiVpa})` : ''}
                  {receipt.bankName ? ` • ${receipt.bankName}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Itemization Ledger Table */}
          <table className="receipt-ledger-table">
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>#</th>
                <th>Particulars / Fee Head Description</th>
                <th style={{ width: '22%', textAlign: 'right' }}>Amount Paid (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center' }}>1</td>
                <td>
                  <strong>{receipt.category} Fee Installment</strong>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    Payment towards Invoice Ref: {receipt.invoiceNo}
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrencyINRWithDecimals(receipt.amountPaid)}
                </td>
              </tr>
              {receipt.remainingBalance > 0 && (
                <tr className="sub-note-row">
                  <td colSpan={2} style={{ textAlign: 'right', color: '#475569', fontSize: '12px' }}>
                    Outstanding Balance Remaining for this Invoice:
                  </td>
                  <td style={{ textAlign: 'right', color: '#3B82F6', fontWeight: 600, fontSize: '12px' }}>
                    {formatCurrencyINRWithDecimals(receipt.remainingBalance)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="receipt-total-row">
                <td colSpan={2} style={{ textAlign: 'right' }}>
                  TOTAL AMOUNT REALIZED:
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrencyINRWithDecimals(receipt.amountPaid)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words */}
          <div className="receipt-words-box">
            <span className="words-label">Amount in Words:</span>
            <span className="words-value">{amountInWordsINR(receipt.amountPaid)}</span>
          </div>

          {/* Status & Terms Footer */}
          <div className="receipt-terms-row">
            <div className="terms-col">
              <div className="terms-title">Terms & Settlement Conditions:</div>
              <ul className="terms-list">
                <li>This is an authentic computer-generated digital receipt and requires no physical signature.</li>
                <li>Fees once paid are non-refundable and non-transferable under school management policy.</li>
              </ul>
            </div>

            <div className="signature-col">
              <div className="signature-line" />
              <div className="signatory-label">Accounts Officer / Bursar</div>
              <div className="signatory-sub">{receipt.schoolName}</div>
            </div>
          </div>

          {/* Bottom attribution */}
          <footer className="receipt-footer-strip">
            <span>Official Student Fee Receipt • {receipt.schoolName}</span>
            <span>Generated on {new Date().toLocaleString('en-IN')}</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

