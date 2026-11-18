// ==========================================
// Payment Confirmation Modal Component
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { PaymentReceipt } from '../../types';
import { formatCurrencyINR, formatCurrencyINRWithDecimals, formatDate } from '../../utils/formatters';
import { CheckCircle2, Printer, FileText, ArrowRight, ShieldAlert, Building, CreditCard, Hash, Calendar } from 'lucide-react';

interface PaymentConfirmationModalProps {
  receipt: PaymentReceipt;
  onPrintReceipt: () => void;
  onViewInvoice: (invoiceId: string) => void;
  onClose: () => void;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  receipt,
  onPrintReceipt,
  onViewInvoice,
  onClose,
}) => {
  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="confirmation-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Success Header Banner */}
        <div className="confirmation-header-banner">
          <div className="confirmation-icon-badge">
            <CheckCircle2 size={36} color="#ffffff" />
          </div>
          <h2 className="confirmation-title">Payment Successful!</h2>
          <p className="confirmation-subtitle">
            Your online fee transaction has been processed and confirmed.
          </p>

          <div className="confirmation-demo-pill">
            <ShieldAlert size={13} />
            <span>Demo Mode: No real funds were deducted. Verified sandbox simulation.</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="confirmation-body">
          {/* Amount Paid Highlight Card */}
          <div className="confirmation-amount-card">
            <div className="amount-label">AMOUNT REALIZED</div>
            <div className="amount-value">{formatCurrencyINRWithDecimals(receipt.amountPaid)}</div>
            <div className="amount-status-pill">Status: Paid (Demo Authorized)</div>
          </div>

          {/* Key Details Grid */}
          <div className="confirmation-details-grid">
            <div className="conf-detail-item">
              <span className="conf-detail-label">
                <Hash size={13} /> Receipt Number
              </span>
              <strong className="conf-detail-val" style={{ color: '#3B82F6' }}>
                {receipt.receiptNo}
              </strong>
            </div>

            <div className="conf-detail-item">
              <span className="conf-detail-label">
                <Hash size={13} /> Transaction Ref
              </span>
              <strong className="conf-detail-val monospace">{receipt.transactionRef}</strong>
            </div>

            <div className="conf-detail-item">
              <span className="conf-detail-label">
                <FileText size={13} /> Invoice Number
              </span>
              <span className="conf-detail-val">{receipt.invoiceNo}</span>
            </div>

            <div className="conf-detail-item">
              <span className="conf-detail-label">
                <Calendar size={13} /> Date & Time
              </span>
              <span className="conf-detail-val">
                {formatDate(receipt.paymentDate)} at {receipt.paymentTime}
              </span>
            </div>

            <div className="conf-detail-item">
              <span className="conf-detail-label">
                <CreditCard size={13} /> Payment Method
              </span>
              <span className="conf-detail-val">
                {receipt.paymentMethod}
                {receipt.upiVpa ? ` (${receipt.upiVpa})` : ''}
              </span>
            </div>

            <div className="conf-detail-item">
              <span className="conf-detail-label">
                <Building size={13} /> Student Details
              </span>
              <span className="conf-detail-val">
                {receipt.studentName} ({receipt.admissionNo})
              </span>
            </div>
          </div>

          {/* Balance Reconciliation Bar */}
          <div className="confirmation-balance-bar">
            <div>
              <span className="balance-bar-label">Previous Balance</span>
              <div className="balance-bar-value">{formatCurrencyINR(receipt.previousBalance)}</div>
            </div>
            <div className="balance-arrow">→</div>
            <div>
              <span className="balance-bar-label">Amount Paid</span>
              <div className="balance-bar-value" style={{ color: '#16a34a' }}>
                - {formatCurrencyINR(receipt.amountPaid)}
              </div>
            </div>
            <div className="balance-arrow">=</div>
            <div>
              <span className="balance-bar-label">Remaining Balance</span>
              <div
                className="balance-bar-value"
                style={{ color: receipt.remainingBalance > 0 ? '#DC2626' : '#16a34a' }}
              >
                {receipt.remainingBalance > 0 ? formatCurrencyINR(receipt.remainingBalance) : 'Fully Settled (₹0)'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="confirmation-actions">
            <button type="button" className="btn btn-primary" onClick={onPrintReceipt}>
              <Printer size={16} />
              <span>Print Official Receipt</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onViewInvoice(receipt.invoiceId)}
            >
              <FileText size={15} />
              <span>View Invoice</span>
            </button>

            <button type="button" className="btn btn-outline" onClick={onClose}>
              <span>Return to Fees & Payments</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

