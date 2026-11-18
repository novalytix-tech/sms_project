// ==========================================
// Parent Online Fee Payment Checkout Modal
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { FeeInvoice, Student, PaymentMethodType, FeePolicy } from '../../types';
import { feeService } from '../../services/feeService';
import { DemoPaymentService } from '../../services/paymentService';
import { formatCurrencyINR, formatCurrencyINRWithDecimals, formatDate } from '../../utils/formatters';
import { X, CreditCard, Smartphone, Building2, ShieldCheck, AlertCircle, CheckCircle2, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

interface PayNowModalProps {
  invoice: FeeInvoice;
  student: Student;
  schoolName: string;
  policy: FeePolicy;
  onSuccess: (receipt: any) => void;
  onClose: () => void;
}

export const PayNowModal: React.FC<PayNowModalProps> = ({
  invoice,
  student,
  schoolName,
  policy,
  onSuccess,
  onClose,
}) => {
  const outstandingBalance = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  // Payment amount option: 'full' | 'partial'
  const allowPartial = policy.allowPartialPayments && (invoice.allowPartial ?? true);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [customAmount, setCustomAmount] = useState<number>(
    allowPartial ? Math.min(outstandingBalance, Math.max(policy.minPartialAmount || 1000, 5000)) : outstandingBalance
  );

  // Selected Payment Method Tab
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('UPI');

  // Sub-options
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'vpa'>('gpay');
  const [upiVpaInput, setUpiVpaInput] = useState(`${student.parentEmail?.split('@')[0] || 'parent'}@okhdfcbank`);
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [cardHolderName, setCardHolderName] = useState(student.parentName || 'Vikram Patel');
  const [notes, setNotes] = useState('');

  // Processing & Simulation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Active payable amount
  const payableAmount = paymentType === 'full' ? outstandingBalance : Number(customAmount) || 0;
  const convenienceFee = 0; // Free for parents
  const totalAmountToCharge = payableAmount + convenienceFee;

  // Validation
  const isValidAmount =
    payableAmount > 0 &&
    payableAmount <= outstandingBalance &&
    (!allowPartial || paymentType === 'full' || payableAmount >= (policy.minPartialAmount || 500));

  // Simulation handler for Successful Payment
  const handleSimulateSuccess = async () => {
    if (!isValidAmount || isProcessing) return;
    setErrorMessage('');
    setIsProcessing(true);
    setProcessingStatus('Connecting to Payment Gateway Sandbox...');

    await DemoPaymentService.simulateProcessing(600);
    setProcessingStatus(`Initiating ${selectedMethod} payment authorization of ${formatCurrencyINR(payableAmount)}...`);

    await DemoPaymentService.simulateProcessing(800);
    setProcessingStatus('Payment authorized. Generating official digital receipt...');

    await DemoPaymentService.simulateProcessing(400);

    const res = feeService.processOnlineDemoPayment({
      invoiceId: invoice.id,
      amount: payableAmount,
      paymentMethod: selectedMethod,
      payerName: student.parentName || 'Parent / Guardian',
      parentId: 'user-parent-vikram',
      studentId: student.id,
      upiVpa: selectedMethod === 'UPI' ? upiVpaInput : undefined,
      bankName: selectedMethod === 'Net Banking' ? selectedBank : undefined,
      cardLast4: selectedMethod.includes('Card') ? '4242' : undefined,
      notes: notes.trim() || undefined,
    });

    setIsProcessing(false);

    if (res.success && res.receipt) {
      onSuccess(res.receipt);
    } else {
      setErrorMessage(res.error || 'Payment processing failed. Please try again.');
    }
  };

  // Simulation handler for Failed Payment
  const handleSimulateFailure = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage('');
    setProcessingStatus('Simulating Payment Gateway processing...');

    await DemoPaymentService.simulateProcessing(800);
    setProcessingStatus('Contacting issuing bank authorization network...');

    await DemoPaymentService.simulateProcessing(800);

    // Record the failed transaction in the audit log without altering balance
    feeService.recordFailedOrCancelledAttempt({
      invoiceId: invoice.id,
      amount: payableAmount,
      paymentMethod: selectedMethod,
      payerName: student.parentName || 'Parent / Guardian',
      parentId: 'user-parent-vikram',
      studentId: student.id,
      status: 'failed',
      failureReason: 'Bank Sandbox Error: Insufficient funds or card authorization declined (Simulation Test)',
    });

    setIsProcessing(false);
    setErrorMessage(
      'Transaction Declined by Bank (Simulated Failure): No funds were deducted. Your invoice balance remains unchanged. You may retry or select an alternate payment method.'
    );
  };

  // Simulation handler for Cancelled Payment
  const handleCancelPayment = () => {
    feeService.recordFailedOrCancelledAttempt({
      invoiceId: invoice.id,
      amount: payableAmount,
      paymentMethod: selectedMethod,
      payerName: student.parentName || 'Parent / Guardian',
      parentId: 'user-parent-vikram',
      studentId: student.id,
      status: 'cancelled',
      failureReason: 'User cancelled payment session before authorization',
    });
    onClose();
  };

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="checkout-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="checkout-modal-header">
          <div className="checkout-title-group">
            <div className="checkout-brand-badge">
              <ShieldCheck size={20} color="#3B82F6" />
            </div>
            <div>
              <h2 className="checkout-modal-title">Fee Payment Checkout</h2>
              <p className="checkout-modal-sub">
                {schoolName} • Invoice #{invoice.invoiceNo}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="checkout-close-btn"
            onClick={onClose}
            aria-label="Close payment checkout"
            disabled={isProcessing}
          >
            <X size={18} />
          </button>
        </div>

        {/* Demo Mode Notice Banner */}
        <div className="checkout-demo-banner">
          <ShieldAlert size={16} className="banner-icon" />
          <div className="banner-text">
            <strong>Demo Payment Mode:</strong> No real money has been transferred. Online payments will be
            available after payment gateway integration.
          </div>
        </div>

        {/* Error Notice if simulation failed */}
        {errorMessage && (
          <div className="checkout-error-banner">
            <AlertCircle size={18} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
          </div>
        )}

        <div className="checkout-modal-body">
          {/* Top Invoice & Student Summary Grid */}
          <div className="checkout-summary-card">
            <div className="summary-col">
              <span className="summary-lbl">Selected Student</span>
              <strong className="summary-val">{student.fullName}</strong>
              <span className="summary-sub">
                Class {student.className} ({student.section}) • Adm: {student.admissionNo}
              </span>
            </div>

            <div className="summary-col">
              <span className="summary-lbl">Fee Category</span>
              <strong className="summary-val">{invoice.category} Fee</strong>
              <span className="summary-sub">Due by {formatDate(invoice.dueDate)}</span>
            </div>

            <div className="summary-col balance-highlight">
              <span className="summary-lbl">Outstanding Balance</span>
              <div className="balance-due-text">{formatCurrencyINRWithDecimals(outstandingBalance)}</div>
              <span className="summary-sub">Total Billed: {formatCurrencyINR(invoice.totalAmount)}</span>
            </div>
          </div>

          {/* Amount Selection Section */}
          <div className="checkout-section">
            <div className="section-header-row">
              <span className="section-title">1. Choose Payment Amount</span>
              {allowPartial && (
                <span className="section-badge-info">Partial payments allowed by school policy</span>
              )}
            </div>

            <div className="amount-options-container">
              <label className={`amount-option-box ${paymentType === 'full' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'full'}
                  onChange={() => setPaymentType('full')}
                  disabled={isProcessing}
                />
                <div className="option-content">
                  <strong className="option-title">Pay Full Outstanding</strong>
                  <span className="option-sub">Clear complete invoice balance in single transaction</span>
                </div>
                <div className="option-amount">{formatCurrencyINRWithDecimals(outstandingBalance)}</div>
              </label>

              {allowPartial && (
                <label className={`amount-option-box ${paymentType === 'partial' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === 'partial'}
                    onChange={() => setPaymentType('partial')}
                    disabled={isProcessing}
                  />
                  <div className="option-content">
                    <strong className="option-title">Pay Custom Partial Amount</strong>
                    <span className="option-sub">
                      Enter installment amount (Min: {formatCurrencyINR(policy.minPartialAmount || 1000)})
                    </span>
                  </div>

                  {paymentType === 'partial' ? (
                    <div className="partial-input-wrapper">
                      <span className="rupee-sign">₹</span>
                      <input
                        type="number"
                        className="partial-number-input"
                        value={customAmount}
                        min={policy.minPartialAmount || 500}
                        max={outstandingBalance}
                        step={500}
                        onChange={e => setCustomAmount(Number(e.target.value))}
                        disabled={isProcessing}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="option-amount">Custom</div>
                  )}
                </label>
              )}
            </div>

            {/* Quick partial chips */}
            {paymentType === 'partial' && (
              <div className="quick-amount-chips">
                <span className="chip-label">Quick select:</span>
                {[
                  Math.round(outstandingBalance * 0.25),
                  Math.round(outstandingBalance * 0.5),
                  Math.round(outstandingBalance * 0.75),
                ]
                  .filter(a => a >= (policy.minPartialAmount || 500) && a < outstandingBalance)
                  .map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="amount-chip-btn"
                      onClick={() => setCustomAmount(amt)}
                      disabled={isProcessing}
                    >
                      {formatCurrencyINR(amt)}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="checkout-section">
            <span className="section-title">2. Select Payment Method (Demo)</span>

            <div className="method-tabs-bar">
              <button
                type="button"
                className={`method-tab-btn ${selectedMethod === 'UPI' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('UPI')}
                disabled={isProcessing}
              >
                <Smartphone size={15} />
                <span>UPI (Instant)</span>
              </button>

              <button
                type="button"
                className={`method-tab-btn ${selectedMethod === 'Debit Card' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('Debit Card')}
                disabled={isProcessing}
              >
                <CreditCard size={15} />
                <span>Debit Card</span>
              </button>

              <button
                type="button"
                className={`method-tab-btn ${selectedMethod === 'Credit Card' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('Credit Card')}
                disabled={isProcessing}
              >
                <CreditCard size={15} />
                <span>Credit Card</span>
              </button>

              <button
                type="button"
                className={`method-tab-btn ${selectedMethod === 'Net Banking' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('Net Banking')}
                disabled={isProcessing}
              >
                <Building2 size={15} />
                <span>Net Banking</span>
              </button>
            </div>

            {/* Method Details Pane */}
            <div className="method-details-pane">
              {selectedMethod === 'UPI' && (
                <div>
                  <div className="upi-app-selector">
                    {[
                      { id: 'gpay', name: 'Google Pay', icon: '🟢 GPay' },
                      { id: 'phonepe', name: 'PhonePe', icon: '🟣 PhonePe' },
                      { id: 'paytm', name: 'Paytm UPI', icon: '🔵 Paytm' },
                      { id: 'bhim', name: 'BHIM UPI', icon: '🇮🇳 BHIM' },
                    ].map(app => (
                      <button
                        key={app.id}
                        type="button"
                        className={`upi-app-pill ${selectedUpiApp === app.id ? 'selected' : ''}`}
                        onClick={() => setSelectedUpiApp(app.id as any)}
                        disabled={isProcessing}
                      >
                        <span>{app.icon}</span>
                      </button>
                    ))}
                  </div>

                  <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Virtual Payment Address (UPI ID)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={upiVpaInput}
                      onChange={e => setUpiVpaInput(e.target.value)}
                      placeholder="username@bank"
                      disabled={isProcessing}
                    />
                    <small style={{ color: '#71717a', fontSize: '10.5px' }}>
                      A secure UPI collect notification will be simulated for this VPA.
                    </small>
                  </div>
                </div>
              )}

              {selectedMethod.includes('Card') && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ gridColumn: 'span 3', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={cardHolderName}
                      onChange={e => setCardHolderName(e.target.value)}
                      placeholder="Name as printed on card"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Demo Card Number
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value="4242 •••• •••• 4242"
                      disabled
                      style={{ background: '#fcf8f7' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Expiry
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value="12 / 28"
                      disabled
                      style={{ background: '#fcf8f7' }}
                    />
                  </div>
                </div>
              )}

              {selectedMethod === 'Net Banking' && (
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Select Your Bank
                  </label>
                  <div className="bank-pill-grid">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'].map(
                      b => (
                        <button
                          key={b}
                          type="button"
                          className={`bank-pill ${selectedBank === b ? 'selected' : ''}`}
                          onClick={() => setSelectedBank(b)}
                          disabled={isProcessing}
                        >
                          <Building2 size={13} />
                          <span>{b}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="checkout-breakdown-card">
            <div className="breakdown-row">
              <span className="lbl">Base Fee Payment Amount:</span>
              <span className="val">{formatCurrencyINRWithDecimals(payableAmount)}</span>
            </div>
            <div className="breakdown-row">
              <span className="lbl">Convenience & Gateway Fee:</span>
              <span className="val free-tag">₹ 0.00 (School Sponsored)</span>
            </div>
            <div className="breakdown-row total-row">
              <strong className="lbl">Total Payable Now:</strong>
              <strong className="val total-val">{formatCurrencyINRWithDecimals(totalAmountToCharge)}</strong>
            </div>
          </div>

          {/* Processing State Indicator */}
          {isProcessing && (
            <div className="checkout-processing-overlay">
              <Loader2 size={32} className="animate-spin" color="#3B82F6" />
              <div className="processing-status-text">{processingStatus}</div>
              <small style={{ color: '#71717a' }}>Do not refresh or press back button.</small>
            </div>
          )}
        </div>

        {/* Demo Simulation Action Buttons */}
        <div className="checkout-modal-footer">
          <div className="simulation-notice">
            <Sparkles size={13} color="#3B82F6" />
            <span>Developer Sandbox: Test success or decline flow</span>
          </div>

          <div className="checkout-footer-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancelPayment}
              disabled={isProcessing}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-danger-outline"
              onClick={handleSimulateFailure}
              disabled={isProcessing || !isValidAmount}
              title="Test payment failure and error handling"
            >
              Simulate Failed Payment
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSimulateSuccess}
              disabled={isProcessing || !isValidAmount}
              style={{ minWidth: '200px' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Simulate Successful Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

