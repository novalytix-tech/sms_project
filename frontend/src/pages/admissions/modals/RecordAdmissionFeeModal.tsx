import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionApplication, PaymentMethodType } from '../../../types';
import { admissionService } from '../../../services/admissionService';
import { formatCurrencyINR } from '../../../utils/formatters';
import { CheckCircle } from 'lucide-react';

interface RecordAdmissionFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AdmissionApplication | null;
  onSuccess: (receiptData: { application: AdmissionApplication; receiptNo: string; amount: number; method: string }) => void;
}

export const RecordAdmissionFeeModal: React.FC<RecordAdmissionFeeModalProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const totalFee = application?.admissionFeeAmount || 25000;
  const currentPaid = application?.feeAmountPaid || (application?.isFeePaid ? totalFee : 0);
  const remainingDue = Math.max(0, totalFee - currentPaid);

  const [amount, setAmount] = useState<number>(remainingDue);
  const [method, setMethod] = useState<PaymentMethodType>('UPI');
  const [txnRef, setTxnRef] = useState(`TXN-ADM-${Date.now().toString().slice(-6)}`);
  const [remarks, setRemarks] = useState('Admission and registration fee clearance.');
  const [recordedBy, setRecordedBy] = useState('Accounts Desk');
  const [error, setError] = useState('');

  if (!application) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (amount > remainingDue) {
      setError(`Payment cannot exceed outstanding balance of ₹${remainingDue.toLocaleString('en-IN')}.`);
      return;
    }

    const res = admissionService.recordAdmissionFee(
      application.id,
      method,
      `${remarks} (Txn Ref: ${txnRef})`,
      amount,
      recordedBy
    );

    if (res.success && res.data) {
      onSuccess({
        application: res.data,
        receiptNo: res.receiptNo || `REC-ADM/${Math.floor(1000 + Math.random() * 9000)}`,
        amount,
        method,
      });
      onClose();
    } else {
      setError(res.error || 'Failed to record fee payment.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Fee Payment: ${application.firstName} ${application.lastName}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ background: '#DBEAFE', color: '#a51d29', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Fee Balances Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px',
          background: '#F6F8FC',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '13px',
        }}>
          <div>
            <div style={{ color: '#71717a', fontSize: '11.5px', textTransform: 'uppercase' }}>Total Fee</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrencyINR(totalFee)}</div>
          </div>
          <div>
            <div style={{ color: '#71717a', fontSize: '11.5px', textTransform: 'uppercase' }}>Previously Paid</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>{formatCurrencyINR(currentPaid)}</div>
          </div>
          <div>
            <div style={{ color: '#71717a', fontSize: '11.5px', textTransform: 'uppercase' }}>Outstanding Balance</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: remainingDue > 0 ? '#dc2626' : '#16a34a' }}>
              {formatCurrencyINR(remainingDue)}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Payment Amount to Collect (INR) *</label>
            <input
              type="number"
              className="form-input"
              required
              min={1}
              max={remainingDue}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Mode *</label>
            <select
              className="form-select"
              value={method}
              onChange={e => setMethod(e.target.value as any)}
            >
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="Net Banking">Net Banking / NEFT / RTGS</option>
              <option value="Demand Draft">Demand Draft (DD)</option>
              <option value="Cheque">Bank Cheque</option>
              <option value="Cash">Cash (Counter Deposit)</option>
              <option value="Card">Debit / Credit Card (POS)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bank / Txn Reference No *</label>
            <input
              type="text"
              className="form-input"
              required
              value={txnRef}
              onChange={e => setTxnRef(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Counter Cashier / Collector</label>
            <input
              type="text"
              className="form-input"
              value={recordedBy}
              onChange={e => setRecordedBy(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Cashier Remarks / Notes</label>
          <input
            type="text"
            className="form-input"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }}>
            <CheckCircle size={15} />
            <span>Generate Receipt & Confirm Payment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

