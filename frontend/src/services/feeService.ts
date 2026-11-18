// Fees & finance — backed by the Flask finance API (/api/v1/finance).
//
// Data is loaded into an in-memory cache with load(); the synchronous getters read
// that cache so existing screens keep rendering synchronously. Every change goes to
// the server first and the cache is refreshed from the server's answer, so the
// browser never decides balances or payment status on its own.
// The server scopes data by role: admins see their school, parents their linked
// children, students themselves.

import { FeeInvoice, FeePolicy, FeeStructure, PaymentMethodType, PaymentReceipt, PaymentTransaction, TransactionStatus } from '../types';
import { httpClient } from './api/httpClient';
import { ERPStorage } from './storage';

export interface ParentFeeSummary {
  studentId: string;
  totalYearFees: number;
  totalPaid: number;
  outstandingBalance: number;
  upcomingDue: { amount: number; dueDate: string; category: string; invoiceNo: string; invoiceId: string } | null;
  overdueAmount: number;
  overdueCount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
}

export interface AdminFeeStats {
  totalBilled: number;
  totalCollected: number;
  onlineCollected: number;
  manualCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  overdueCount: number;
  partialCount: number;
  paidCount: number;
}

type Result<T> = { success: true; data: T } | { success: false; error: string };

export const EMPTY_FEE_POLICY: FeePolicy = {
  academicYear: '',
  currency: 'INR',
  allowPartialPayments: true,
  minPartialAmount: 0,
  gracePeriodDays: 0,
  lateFeePerDay: 0,
  maxLateFee: 0,
  discountPercentageSibling: 0,
  convenienceFeePercentage: 0,
  upiId: '',
  paymentInstructions: '',
  bankAccountDetails: { accountName: '', accountNumber: '', bankName: '', ifscCode: '', branch: '' },
};

const cache: {
  invoices: FeeInvoice[];
  transactions: PaymentTransaction[];
  structures: FeeStructure[];
  policy: FeePolicy;
  loaded: boolean;
  error: string | null;
} = { invoices: [], transactions: [], structures: [], policy: EMPTY_FEE_POLICY, loaded: false, error: null };

let inFlight: Promise<void> | null = null;

function notify() {
  window.dispatchEvent(new CustomEvent('nts_erp_storage_updated'));
}

function errorOf(res: { error?: { message: string }; message?: string }, fallback: string) {
  return res.error?.message || res.message || fallback;
}

function summarize(invoices: FeeInvoice[], studentId: string): ParentFeeSummary {
  let totalYearFees = 0;
  let totalPaid = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let paidInvoicesCount = 0;
  let pendingInvoicesCount = 0;
  const upcoming: FeeInvoice[] = [];

  invoices.forEach(inv => {
    totalYearFees += inv.totalAmount;
    totalPaid += inv.paidAmount;
    const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
    if (remaining <= 0) {
      paidInvoicesCount += 1;
    } else {
      pendingInvoicesCount += 1;
      if (inv.status === 'overdue') {
        overdueAmount += remaining;
        overdueCount += 1;
      } else {
        upcoming.push(inv);
      }
    }
  });
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const next = upcoming[0];
  return {
    studentId,
    totalYearFees,
    totalPaid,
    outstandingBalance: Math.max(0, totalYearFees - totalPaid),
    upcomingDue: next
      ? {
          amount: Math.max(0, next.totalAmount - next.paidAmount),
          dueDate: next.dueDate,
          category: next.category,
          invoiceNo: next.invoiceNo,
          invoiceId: next.id,
        }
      : null,
    overdueAmount,
    overdueCount,
    paidInvoicesCount,
    pendingInvoicesCount,
  };
}

export const feeService = {
  // ------------------------------------------------------------- loading

  /** Fetch everything this user may see. Safe to call repeatedly; concurrent calls share one request. */
  load: (): Promise<void> => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const [inv, pay, policy, structures] = await Promise.all([
        httpClient.get<FeeInvoice[]>('/finance/invoices'),
        httpClient.get<PaymentTransaction[]>('/finance/payments'),
        httpClient.get<FeePolicy>('/finance/policy'),
        httpClient.get<FeeStructure[]>('/finance/fee-structures'), // admin only; 403 for others
      ]);
      if (inv.success) {
        cache.invoices = inv.data;
        cache.error = null;
      } else {
        cache.invoices = [];
        cache.error = errorOf(inv, 'Could not load fee records.');
      }
      cache.transactions = pay.success ? pay.data : [];
      cache.policy = policy.success ? { ...EMPTY_FEE_POLICY, ...policy.data } : EMPTY_FEE_POLICY;
      cache.structures = structures.success ? structures.data : [];
      cache.loaded = true;
      notify();
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  },

  /** Clear cached fee data (e.g. on sign-out). */
  reset: () => {
    cache.invoices = [];
    cache.transactions = [];
    cache.structures = [];
    cache.policy = EMPTY_FEE_POLICY;
    cache.loaded = false;
    cache.error = null;
  },

  isLoaded: () => cache.loaded,
  getLoadError: () => cache.error,

  // ------------------------------------------------------------- reads (cache)

  getAllInvoices: (): FeeInvoice[] => cache.invoices,
  getInvoiceById: (id: string): FeeInvoice | undefined => cache.invoices.find(inv => inv.id === id),
  getInvoicesByStudentId: (studentId: string): FeeInvoice[] => cache.invoices.filter(inv => inv.studentId === studentId),

  /** Children (students) that appear on the invoices visible to this user. */
  getBilledStudents: (): { id: string; name: string; className: string; section: string; admissionNo: string }[] => {
    const seen = new Map<string, { id: string; name: string; className: string; section: string; admissionNo: string }>();
    cache.invoices.forEach(inv => {
      if (!seen.has(inv.studentId)) {
        seen.set(inv.studentId, {
          id: inv.studentId,
          name: inv.studentName,
          className: inv.className,
          section: inv.section,
          admissionNo: inv.admissionNo || '',
        });
      }
    });
    return [...seen.values()];
  },

  getParentSummary: (studentId: string): ParentFeeSummary =>
    summarize(cache.invoices.filter(inv => inv.studentId === studentId), studentId),

  /** Summary over every invoice visible to the signed-in user (all of a parent's children). */
  getMySummary: (): ParentFeeSummary => summarize(cache.invoices, ''),

  getAdminStats: (): AdminFeeStats => {
    const invoices = cache.invoices;
    const totalBilled = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalCollected = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    return {
      totalBilled,
      totalCollected,
      onlineCollected: 0,
      manualCollected: totalCollected,
      totalOutstanding: Math.max(0, totalBilled - totalCollected),
      collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
      overdueCount: invoices.filter(inv => inv.status === 'overdue').length,
      partialCount: invoices.filter(inv => inv.status === 'partial').length,
      paidCount: invoices.filter(inv => inv.status === 'paid').length,
    };
  },

  getFinancialSummary: () => {
    const s = feeService.getAdminStats();
    return {
      totalBilled: s.totalBilled,
      totalCollected: s.totalCollected,
      totalOutstanding: s.totalOutstanding,
      collectionRate: s.collectionRate,
      overdueCount: s.overdueCount,
    };
  },

  getPaymentTransactions: (filters?: {
    studentId?: string;
    status?: TransactionStatus;
    method?: PaymentMethodType;
    search?: string;
  }): PaymentTransaction[] => {
    let list = cache.transactions;
    if (filters?.studentId) list = list.filter(t => t.studentId === filters.studentId);
    if (filters?.status) list = list.filter(t => t.status === filters.status);
    if (filters?.method) list = list.filter(t => t.method === filters.method);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(t =>
        [t.transactionRef, t.receiptNo, t.invoiceNo, t.studentName, t.admissionNo].some(v => (v || '').toLowerCase().includes(q)),
      );
    }
    return list;
  },

  /** Receipt built from the server's invoice + payment records. */
  getReceiptByReceiptNo: (receiptNo: string): PaymentReceipt | undefined => {
    const settings = ERPStorage.get().settings;
    for (const inv of cache.invoices) {
      const p = inv.payments.find(pay => pay.receiptNo === receiptNo);
      if (!p) continue;
      const index = inv.payments.indexOf(p);
      const paidBefore = inv.payments.slice(0, index).reduce((acc, cur) => acc + cur.amount, 0);
      const previousBalance = Math.max(0, inv.totalAmount - paidBefore);
      return {
        receiptNo: p.receiptNo,
        transactionRef: p.transactionRef || p.receiptNo,
        invoiceNo: inv.invoiceNo,
        invoiceId: inv.id,
        studentId: inv.studentId,
        studentName: inv.studentName,
        admissionNo: inv.admissionNo || '',
        className: inv.className,
        section: inv.section,
        academicYear: inv.academicYear,
        category: inv.category,
        amountPaid: p.amount,
        previousBalance,
        remainingBalance: Math.max(0, previousBalance - p.amount),
        paymentDate: p.date,
        paymentTime: p.time || '',
        paymentMethod: p.method,
        status: 'success',
        isDemo: false,
        recordedBy: p.recordedBy,
        schoolName: settings.schoolName,
        schoolAddress: [settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(', '),
        schoolAffiliation: settings.affiliationNo ? `Affiliation No: ${settings.affiliationNo} • Board: ${settings.schoolBoard}` : '',
      };
    }
    return undefined;
  },

  getFeePolicy: (): FeePolicy => cache.policy,
  getFeeStructures: (): FeeStructure[] => cache.structures,

  // ------------------------------------------------------------- writes (server first)

  createInvoice: async (data: {
    studentId: string;
    category: FeeInvoice['category'];
    academicYear: string;
    dueDate: string;
    items: { title: string; amount: number }[];
    discountAmount?: number;
    discountReason?: string;
    notes?: string;
    allowPartial?: boolean;
  }): Promise<Result<FeeInvoice>> => {
    const res = await httpClient.post<FeeInvoice>('/finance/invoices', data);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not create the invoice.') };
    await feeService.load();
    return { success: true, data: res.data };
  },

  recordPayment: async (
    invoiceId: string,
    payment: { amount: number; method: PaymentMethodType; transactionRef?: string; remarks?: string },
  ): Promise<Result<{ invoice: FeeInvoice; receiptNo: string }>> => {
    const res = await httpClient.post<{ invoice: FeeInvoice; receiptNo: string }>(`/finance/invoices/${invoiceId}/pay`, payment);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not record the payment.') };
    await feeService.load();
    return { success: true, data: res.data };
  },

  updateFeePolicy: async (updates: Partial<FeePolicy>): Promise<Result<FeePolicy>> => {
    const res = await httpClient.put<FeePolicy>('/finance/policy', updates);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not save the fee policy.') };
    cache.policy = { ...EMPTY_FEE_POLICY, ...res.data };
    notify();
    return { success: true, data: cache.policy };
  },

  createFeeStructure: async (data: Omit<FeeStructure, 'id' | 'totalAmount'>): Promise<Result<FeeStructure>> => {
    const res = await httpClient.post<FeeStructure>('/finance/fee-structures', data);
    if (!res.success) return { success: false, error: errorOf(res, 'Could not create the fee structure.') };
    await feeService.load();
    return { success: true, data: res.data };
  },
};
