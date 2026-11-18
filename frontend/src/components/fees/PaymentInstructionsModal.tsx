import React from 'react';
import { FeeInvoice, FeePolicy } from '../../types';
import { Modal } from '../common/Modal';
import { formatCurrencyINRWithDecimals, formatDate } from '../../utils/formatters';

interface Props {
  invoice: FeeInvoice;
  policy: FeePolicy;
  schoolName: string;
  onClose: () => void;
}

/**
 * Shows how to pay an invoice. There is no online payment gateway yet, so parents pay
 * the school directly; the accounts office records the payment and the receipt then
 * appears under Payment History.
 */
export const PaymentInstructionsModal: React.FC<Props> = ({ invoice, policy, schoolName, onClose }) => {
  const balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const bank = policy.bankAccountDetails;
  const hasBank = Boolean(bank.accountNumber && bank.ifscCode);

  return (
    <Modal isOpen onClose={onClose} title="How to Pay" size="normal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div>
            Invoice <strong>{invoice.invoiceNo}</strong> · {invoice.studentName}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0' }}>{formatCurrencyINRWithDecimals(balance)}</div>
          <div style={{ color: 'var(--text-secondary, #475569)' }}>Due {formatDate(invoice.dueDate)}</div>
        </div>

        {policy.paymentInstructions && <p style={{ margin: 0 }}>{policy.paymentInstructions}</p>}

        {policy.upiId && (
          <div>
            <strong>UPI:</strong> {policy.upiId}
          </div>
        )}

        {hasBank && (
          <div>
            <strong>Bank transfer</strong>
            <div>Account name: {bank.accountName || schoolName}</div>
            <div>Account number: {bank.accountNumber}</div>
            <div>IFSC: {bank.ifscCode}</div>
            {bank.bankName && (
              <div>
                Bank: {bank.bankName}
                {bank.branch ? `, ${bank.branch}` : ''}
              </div>
            )}
          </div>
        )}

        {!policy.upiId && !hasBank && !policy.paymentInstructions && (
          <p style={{ margin: 0 }}>Please pay at the school accounts office.</p>
        )}

        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
          Mention invoice number <strong>{invoice.invoiceNo}</strong> as the payment reference. Your receipt appears
          under Payment History once the accounts office records the payment.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
