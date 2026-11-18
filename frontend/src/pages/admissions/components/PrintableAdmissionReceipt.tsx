import React from 'react';
import { AdmissionApplication } from '../../../types';
import { formatDate, formatCurrencyINR } from '../../../utils/formatters';
import { Printer, X } from 'lucide-react';
import { todayISO } from '../../../utils/date';

interface PrintableAdmissionReceiptProps {
  application: AdmissionApplication;
  receiptNo?: string;
  amountPaid?: number;
  paymentMethod?: string;
  transactionRef?: string;
  paymentDate?: string;
  schoolName?: string;
  onClose: () => void;
}

export const PrintableAdmissionReceipt: React.FC<PrintableAdmissionReceiptProps> = ({
  application,
  receiptNo = `REC-ADM/2026-27/${Math.floor(1000 + Math.random() * 9000)}`,
  amountPaid,
  paymentMethod = 'UPI / Net Banking',
  transactionRef = `TXN-ADM-${Date.now().toString().slice(-6)}`,
  paymentDate = todayISO(),
  schoolName = "St. Xavier's International Academy",
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const amount = amountPaid || application.feeAmountPaid || application.admissionFeeAmount || 25000;

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
        maxWidth: '800px',
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
            <h3 style={{ margin: 0, fontSize: '16px', color: '#19191f' }}>Official Admission Fee Receipt</h3>
            <span style={{ fontSize: '12px', color: '#71717a' }}>Receipt: {receiptNo}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={15} />
              <span>Print Receipt</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <X size={15} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="printable-document" style={{
          padding: '36px 45px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#1a1a1a',
          lineHeight: '1.5',
          border: '1px solid #e2e8f0',
          margin: '20px',
          borderRadius: '8px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #3B82F6', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#1D4ED8', fontWeight: '800' }}>
                {schoolName}
              </h2>
              <div style={{ fontSize: '12px', color: '#555' }}>
                Affiliated to CBSE, New Delhi | Affiliation No: 2130894
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                Plot 12-B, Knowledge City, Civil Lines, Kanpur, UP - 208001 | accounts@stxaviers.edu.in
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                background: '#e9f8ef',
                color: '#17623e',
                border: '1px solid #bbf7d0',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '6px',
              }}>
                FEE PAYMENT RECEIPT
              </div>
              <div style={{ fontSize: '12.5px' }}><strong>Receipt No:</strong> {receiptNo}</div>
              <div style={{ fontSize: '12px', color: '#555' }}><strong>Date:</strong> {formatDate(paymentDate)}</div>
            </div>
          </div>

          {/* Student & Applicant Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: '#fafafa',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            <div><strong>Candidate Name:</strong> {application.firstName} {application.lastName}</div>
            <div><strong>Application Ref:</strong> {application.applicationNo}</div>
            <div><strong>Class & Section:</strong> {application.targetClassName} ({application.targetSection || 'A'})</div>
            <div><strong>Academic Session:</strong> {application.academicYear || '2026-2027'}</div>
            <div><strong>Parent / Guardian:</strong> {application.parentName} ({application.parentRelation})</div>
            <div><strong>Contact No:</strong> {application.parentPhone}</div>
          </div>

          {/* Fee Itemization Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>S.No</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Fee Head Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Category</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount Paid (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px' }}>1</td>
                <td style={{ padding: '8px 10px' }}>Institutional Admission & Registration Fee</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>Admission</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{Math.min(amount, 15000).toLocaleString('en-IN')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px' }}>2</td>
                <td style={{ padding: '8px 10px' }}>Caution Money & Security Deposit (Refundable)</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>Security</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{Math.min(Math.max(0, amount - 15000), 5000).toLocaleString('en-IN')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px' }}>3</td>
                <td style={{ padding: '8px 10px' }}>Composite Academic & Activity Dues (Term 1)</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>Academic</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{Math.max(0, amount - 20000).toLocaleString('en-IN')}</td>
              </tr>
              <tr style={{ background: '#F6F8FC', fontWeight: 'bold', borderTop: '2px solid #3B82F6' }}>
                <td style={{ padding: '10px' }} colSpan={3}>TOTAL AMOUNT RECEIVED</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#1D4ED8', fontSize: '15px' }}>
                  {formatCurrencyINR(amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Transaction Metadata */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '35px',
          }}>
            <div>
              <div><strong>Payment Mode:</strong> {paymentMethod}</div>
              <div style={{ marginTop: '2px' }}><strong>Txn Reference:</strong> {transactionRef}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><strong>Payment Status:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>CLEARED</span></div>
              <div style={{ marginTop: '2px', color: '#666' }}>Generated automatically via School ERP Accounts Desk</div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            <div style={{ textAlign: 'center', width: '180px' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '30px' }}></div>
              <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '600' }}>Depositor / Parent Sign</div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '30px' }}></div>
              <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '600' }}>Cashier / Accounts Officer</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Office of Finance & Accounts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

