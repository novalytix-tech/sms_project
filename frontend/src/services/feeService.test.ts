import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { feeService } from './feeService';
import { httpClient } from './api/httpClient';
import { FeeInvoice } from '../types';

const invoice = (over: Partial<FeeInvoice>): FeeInvoice => ({
  id: 'inv-1',
  invoiceNo: 'INV-2026-AAAA',
  studentId: 'stu-1',
  studentName: 'Aarav Sharma',
  admissionNo: 'ADM-1',
  className: 'Class 10',
  section: 'A',
  category: 'Tuition',
  academicYear: '2026-2027',
  totalAmount: 10000,
  paidAmount: 0,
  dueDate: '2030-01-01',
  status: 'unpaid',
  payments: [],
  ...over,
});

const SERVER_INVOICES = [
  invoice({ id: 'a', studentId: 'stu-1', totalAmount: 10000, paidAmount: 10000, status: 'paid',
    payments: [{ id: 'p1', receiptNo: 'REC-1', date: '2026-07-01', amount: 10000, method: 'Cash', recordedBy: 'Office' }] }),
  invoice({ id: 'b', studentId: 'stu-1', totalAmount: 8000, paidAmount: 3000, status: 'partial', dueDate: '2030-02-01' }),
  invoice({ id: 'c', studentId: 'stu-2', studentName: 'Diya Patel', totalAmount: 5000, status: 'overdue', dueDate: '2020-01-01' }),
];

function mockServer() {
  vi.spyOn(httpClient, 'get').mockImplementation(async (url: string) => {
    if (url === '/finance/invoices') return { success: true, data: SERVER_INVOICES } as any;
    if (url === '/finance/payments') return { success: true, data: [] } as any;
    if (url === '/finance/policy') return { success: true, data: { upiId: 'school@upi' } } as any;
    return { success: false, data: null, error: { code: 'FORBIDDEN', message: 'no' } } as any;
  });
}

describe('feeService (server-backed)', () => {
  beforeEach(() => {
    feeService.reset();
    mockServer();
  });
  afterEach(() => vi.restoreAllMocks());

  it('loads invoices and policy from the API', async () => {
    expect(feeService.isLoaded()).toBe(false);
    await feeService.load();
    expect(feeService.isLoaded()).toBe(true);
    expect(feeService.getAllInvoices()).toHaveLength(3);
    expect(feeService.getFeePolicy().upiId).toBe('school@upi');
    expect(feeService.getFeeStructures()).toEqual([]); // 403 for non-admins → empty
  });

  it('computes admin stats from server data', async () => {
    await feeService.load();
    const s = feeService.getAdminStats();
    expect(s.totalBilled).toBe(23000);
    expect(s.totalCollected).toBe(13000);
    expect(s.totalOutstanding).toBe(10000);
    expect(s.overdueCount).toBe(1);
    expect(s.paidCount).toBe(1);
    expect(s.onlineCollected).toBe(0);
  });

  it('summarises a student and lists billed students', async () => {
    await feeService.load();
    const sum = feeService.getParentSummary('stu-1');
    expect(sum.totalYearFees).toBe(18000);
    expect(sum.outstandingBalance).toBe(5000);
    expect(sum.upcomingDue?.invoiceId).toBe('b');
    expect(feeService.getBilledStudents().map(s => s.id)).toEqual(['stu-1', 'stu-2']);
  });

  it('builds a receipt from server payments, never marked demo', async () => {
    await feeService.load();
    const rc = feeService.getReceiptByReceiptNo('REC-1');
    expect(rc?.amountPaid).toBe(10000);
    expect(rc?.previousBalance).toBe(10000);
    expect(rc?.remainingBalance).toBe(0);
    expect(rc?.isDemo).toBe(false);
  });

  it('records a payment on the server and reloads', async () => {
    const post = vi.spyOn(httpClient, 'post').mockResolvedValue({
      success: true, data: { invoice: SERVER_INVOICES[1], receiptNo: 'REC-2' },
    } as any);
    const res = await feeService.recordPayment('b', { amount: 1000, method: 'Cash' });
    expect(post).toHaveBeenCalledWith('/finance/invoices/b/pay', { amount: 1000, method: 'Cash' });
    expect(res.success).toBe(true);
    expect(feeService.isLoaded()).toBe(true);
  });

  it('surfaces server errors instead of faking success', async () => {
    vi.spyOn(httpClient, 'post').mockResolvedValue({
      success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Payment cannot exceed the remaining balance' },
    } as any);
    const res = await feeService.recordPayment('b', { amount: 999999, method: 'Cash' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/exceed/);
  });
});
