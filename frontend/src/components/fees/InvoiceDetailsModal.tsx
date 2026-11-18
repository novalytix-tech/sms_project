// ==========================================
// Invoice Details & Payment Breakdown Modal
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { FeeInvoice, Student } from '../../types';
import { formatCurrencyINR, formatCurrencyINRWithDecimals, formatDate } from '../../utils/formatters';
import { X, FileText, Printer, CreditCard, ArrowRight, Receipt } from 'lucide-react';

interface InvoiceDetailsModalProps {
  invoice: FeeInvoice;
  student: Student;
  schoolName: string;
  onPayNow?: (invoice: FeeInvoice) => void;
  onViewReceipt?: (receiptNo: string) => void;
  onClose: () => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  student,
  schoolName,
  onPayNow,
  onViewReceipt,
  onClose,
}) => {
  const remainingBalance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const isSettled = remainingBalance <= 0 || invoice.status === 'paid';

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="invoice-detail-dialog" onClick={e => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="invoice-dialog-header no-print">
          <div className="dialog-title-group">
            <div className="invoice-icon-badge">
              <FileText size={20} color="#3B82F6" />
            </div>
            <div>
              <h2 className="invoice-dialog-title">Invoice #{invoice.invoiceNo}</h2>
              <p className="invoice-dialog-sub">
                {schoolName} • Issued {formatDate(invoice.invoiceDate || '2026-07-01')}
              </p>
            </div>
          </div>

          <div className="dialog-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrintInvoice}
              title="Print invoice document"
            >
              <Printer size={14} />
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              className="checkout-close-btn"
              onClick={onClose}
              aria-label="Close invoice details"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="invoice-sheet-container" id="printable-invoice-view">
          {/* Institutional Header Row */}
          <div className="invoice-header-row">
            <div className="invoice-brand-block">
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
                  flexShrink: 0,
                }}
              >
                {schoolName.charAt(0)}
              </div>
              <div>
                <h1 className="invoice-school-name">{schoolName}</h1>
                <p className="invoice-school-meta">
                  CBSE Affiliated Senior Secondary Institution • Academic Session {invoice.academicYear}
                </p>
              </div>
            </div>

            <div className="invoice-tag-block">
              <div className="invoice-doc-type">OFFICIAL FEE INVOICE</div>
              <div className="invoice-ref-number">{invoice.invoiceNo}</div>
              <div className="invoice-date-tag">
                Due Date: <strong>{formatDate(invoice.dueDate)}</strong>
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Student & Invoice Meta Grid */}
          <div className="invoice-meta-grid">
            <div className="meta-card">
              <span className="meta-card-title">BILLED TO (STUDENT & GUARDIAN)</span>
              <div className="meta-card-content">
                <div className="meta-line">
                  <span className="lbl">Student Name:</span>
                  <strong className="val">{student.fullName}</strong>
                </div>
                <div className="meta-line">
                  <span className="lbl">Admission Number:</span>
                  <span className="val">{student.admissionNo}</span>
                </div>
                <div className="meta-line">
                  <span className="lbl">Class & Section:</span>
                  <span className="val">
                    {student.className} ({student.section}) • Roll #{student.rollNo}
                  </span>
                </div>
                <div className="meta-line">
                  <span className="lbl">Parent / Guardian:</span>
                  <span className="val">{student.parentName}</span>
                </div>
              </div>
            </div>

            <div className="meta-card">
              <span className="meta-card-title">INVOICE & STATUS PARTICULARS</span>
              <div className="meta-card-content">
                <div className="meta-line">
                  <span className="lbl">Fee Category:</span>
                  <span className="val">{invoice.category} Fee</span>
                </div>
                <div className="meta-line">
                  <span className="lbl">Billing Period:</span>
                  <span className="val">Academic Year {invoice.academicYear}</span>
                </div>
                <div className="meta-line">
                  <span className="lbl">Settlement Status:</span>
                  <span className="val">
                    {isSettled ? (
                      <span className="badge badge-success">Paid in Full</span>
                    ) : invoice.status === 'partial' ? (
                      <span className="badge badge-warning">Partially Paid</span>
                    ) : (
                      <span className="badge badge-danger">Unpaid</span>
                    )}
                  </span>
                </div>
                <div className="meta-line">
                  <span className="lbl">Payment Due Date:</span>
                  <span className="val" style={{ color: invoice.dueDate < new Date().toISOString() && !isSettled ? '#DC2626' : undefined }}>
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>#</th>
                <th>Fee Head / Particulars</th>
                <th style={{ width: '22%' }}>Category</th>
                <th style={{ width: '22%', textAlign: 'right' }}>Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items && invoice.items.length > 0
                ? invoice.items
                : [
                    {
                      id: 'it-default',
                      title: `${invoice.category} Fee Component`,
                      category: invoice.category,
                      amount: invoice.totalAmount,
                    },
                  ]
              ).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>
                    <strong>{item.title}</strong>
                  </td>
                  <td>
                    <span className="category-chip">{item.category}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrencyINRWithDecimals(item.amount)}
                  </td>
                </tr>
              ))}

              {/* Late fees or discounts if present */}
              {invoice.lateFeeAmount !== undefined && invoice.lateFeeAmount > 0 && (
                <tr className="adjustment-row">
                  <td style={{ textAlign: 'center' }}>*</td>
                  <td colSpan={2} style={{ color: '#b91c1c' }}>
                    Late Payment Fee Surcharge ({invoice.lateFeeDays || 0} days past due date)
                  </td>
                  <td style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>
                    + {formatCurrencyINRWithDecimals(invoice.lateFeeAmount)}
                  </td>
                </tr>
              )}

              {invoice.discountAmount !== undefined && invoice.discountAmount > 0 && (
                <tr className="adjustment-row">
                  <td style={{ textAlign: 'center' }}>*</td>
                  <td colSpan={2} style={{ color: '#16a34a' }}>
                    Institutional Sibling / Merit Concession ({invoice.discountReason || 'Approved'})
                  </td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                    - {formatCurrencyINRWithDecimals(invoice.discountAmount)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="invoice-total-row">
                <td colSpan={3} style={{ textAlign: 'right' }}>
                  Original Total Invoice Amount:
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrencyINRWithDecimals(invoice.totalAmount)}
                </td>
              </tr>
              <tr className="invoice-paid-row">
                <td colSpan={3} style={{ textAlign: 'right', color: '#16a34a' }}>
                  Total Amount Realized to Date:
                </td>
                <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                  - {formatCurrencyINRWithDecimals(invoice.paidAmount)}
                </td>
              </tr>
              <tr className="invoice-balance-row">
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                  CURRENT OUTSTANDING BALANCE:
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 800,
                    fontSize: '15px',
                    color: remainingBalance > 0 ? '#DC2626' : '#16a34a',
                  }}
                >
                  {formatCurrencyINRWithDecimals(remainingBalance)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Payment History Log for this specific Invoice */}
          <div className="invoice-payment-history-block">
            <h3 className="history-block-title">
              <Receipt size={15} color="#3B82F6" />
              <span>Realized Payments & Transaction History</span>
            </h3>

            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="history-table-wrapper">
                <table className="mini-ledger-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Transaction Ref</th>
                      <th style={{ textAlign: 'right' }}>Amount Paid</th>
                      <th className="no-print" style={{ textAlign: 'center' }}>
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p, pIdx) => (
                      <tr key={p.id || pIdx}>
                        <td>
                          <strong style={{ color: '#3B82F6' }}>{p.receiptNo}</strong>
                        </td>
                        <td>{formatDate(p.date)}</td>
                        <td>
                          <span className="pay-method-badge">{p.method}</span>
                        </td>
                        <td className="monospace">{p.transactionRef || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                          {formatCurrencyINRWithDecimals(p.amount)}
                        </td>
                        <td className="no-print" style={{ textAlign: 'center' }}>
                          {onViewReceipt && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => onViewReceipt(p.receiptNo)}
                            >
                              <Printer size={12} />
                              <span>View</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-payments-note">
                No payments have been received for this invoice yet. Outstanding balance is due in full.
              </div>
            )}
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="invoice-dialog-footer no-print">
          <div className="footer-balance-text">
            <span>Outstanding Balance:</span>
            <strong style={{ color: remainingBalance > 0 ? '#DC2626' : '#16a34a', marginLeft: '6px' }}>
              {formatCurrencyINRWithDecimals(remainingBalance)}
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>

            {!isSettled && onPayNow && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onPayNow(invoice);
                }}
              >
                <CreditCard size={15} />
                <span>Pay Now ({formatCurrencyINR(remainingBalance)})</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

