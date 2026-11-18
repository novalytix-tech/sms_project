import { describe, it, expect, beforeEach } from 'vitest';
import { feeService } from './feeService';
import { ERPStorage } from './storage';

describe('feeService Financial Calculations & Workflows', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves all seeded fee invoices', () => {
    const invoices = feeService.getAllInvoices();
    expect(Array.isArray(invoices)).toBe(true);
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices[0]).toHaveProperty('totalAmount');
    expect(invoices[0]).toHaveProperty('paidAmount');
  });

  it('calculates admin fee statistics accurately', () => {
    const stats = feeService.getAdminStats();
    expect(stats).toBeDefined();
    expect(stats.totalBilled).toBeGreaterThan(0);
    expect(stats.totalCollected).toBeGreaterThanOrEqual(0);
    expect(stats.totalOutstanding).toBe(stats.totalBilled - stats.totalCollected);
    expect(stats.collectionRate).toBeGreaterThanOrEqual(0);
    expect(stats.collectionRate).toBeLessThanOrEqual(100);
  });

  it('calculates student fee summary with outstanding balances', () => {
    const invoices = feeService.getAllInvoices();
    const studentId = invoices[0].studentId;

    const summary = feeService.getParentSummary(studentId);
    expect(summary).toBeDefined();
    expect(summary.totalYearFees).toBeGreaterThan(0);
    expect(summary.outstandingBalance).toBe(Math.max(0, summary.totalYearFees - summary.totalPaid));
  });

  it('records manual payment and updates invoice balance and status', () => {
    const invoices = feeService.getAllInvoices();
    const targetInvoice = invoices.find(inv => inv.totalAmount > inv.paidAmount) || invoices[0];
    const initialPaid = targetInvoice.paidAmount;
    const paymentAmount = 1000;

    const result = feeService.recordPayment(targetInvoice.id, {
      amount: paymentAmount,
      method: 'Net Banking',
      recordedBy: 'Admin Office',
      remarks: 'Fee payment via NEFT',
    });

    expect(result.success).toBe(true);
    expect(result.invoice).toBeDefined();
    expect(result.invoice?.paidAmount).toBe(initialPaid + paymentAmount);
    expect(result.payment?.receiptNo).toMatch(/^REC-/);

    // Verify invoice was updated in storage
    const updated = feeService.getInvoiceById(targetInvoice.id);
    expect(updated?.paidAmount).toBe(initialPaid + paymentAmount);
  });

  it('rejects manual payment exceeding the remaining balance', () => {
    const invoices = feeService.getAllInvoices();
    const target = invoices[0];
    const remaining = target.totalAmount - target.paidAmount;
    const excessiveAmount = remaining + 10000;

    const result = feeService.recordPayment(target.id, {
      amount: excessiveAmount,
      method: 'Cash',
      recordedBy: 'Admin Office',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot exceed remaining balance');
  });
});
