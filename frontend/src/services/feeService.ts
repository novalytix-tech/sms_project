// ==========================================
// Fees & Finance Service - Complete Ledger & Online Portal
// Developed by NTS Novalytix
// ==========================================

import {
  FeeInvoice,
  FeePayment,
  PaymentTransaction,
  PaymentReceipt,
  FeePolicy,
  FeeStructure,
  PaymentMethodType,
  TransactionStatus,
} from '../types';
import { ERPStorage } from './storage';
import { DemoPaymentService } from './paymentService';
import { httpClient } from './api/httpClient';

export interface ParentFeeSummary {
  studentId: string;
  totalYearFees: number;
  totalPaid: number;
  outstandingBalance: number;
  upcomingDue: {
    amount: number;
    dueDate: string;
    category: string;
    invoiceNo: string;
    invoiceId: string;
  } | null;
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

export const feeService = {
  // -------------------------------------------------------------
  // Invoices Core Retrieval
  // -------------------------------------------------------------
  getAllInvoices: (): FeeInvoice[] => {
    return ERPStorage.get().feeInvoices || [];
  },

  getInvoiceById: (id: string): FeeInvoice | undefined => {
    return (ERPStorage.get().feeInvoices || []).find(inv => inv.id === id);
  },

  getInvoicesByStudentId: (studentId: string): FeeInvoice[] => {
    return (ERPStorage.get().feeInvoices || []).filter(inv => inv.studentId === studentId);
  },

  // -------------------------------------------------------------
  // Parent Financial KPI Calculation
  // -------------------------------------------------------------
  getParentSummary: (studentId: string): ParentFeeSummary => {
    const studentInvoices = (ERPStorage.get().feeInvoices || []).filter(
      inv => inv.studentId === studentId
    );

    const todayStr = new Date().toISOString().split('T')[0];

    let totalYearFees = 0;
    let totalPaid = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;

    const futureDueInvoices: FeeInvoice[] = [];

    studentInvoices.forEach(inv => {
      totalYearFees += inv.totalAmount;
      totalPaid += inv.paidAmount;

      const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);

      if (remaining <= 0) {
        paidInvoicesCount += 1;
      } else {
        pendingInvoicesCount += 1;
        // Check if overdue
        if (inv.dueDate < todayStr || inv.status === 'overdue') {
          overdueAmount += remaining;
          overdueCount += 1;
        } else {
          futureDueInvoices.push(inv);
        }
      }
    });

    const outstandingBalance = Math.max(0, totalYearFees - totalPaid);

    // Sort upcoming future due by nearest due date
    futureDueInvoices.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nextDue = futureDueInvoices[0];

    const upcomingDue = nextDue
      ? {
          amount: Math.max(0, nextDue.totalAmount - nextDue.paidAmount),
          dueDate: nextDue.dueDate,
          category: nextDue.category,
          invoiceNo: nextDue.invoiceNo,
          invoiceId: nextDue.id,
        }
      : null;

    return {
      studentId,
      totalYearFees,
      totalPaid,
      outstandingBalance,
      upcomingDue,
      overdueAmount,
      overdueCount,
      paidInvoicesCount,
      pendingInvoicesCount,
    };
  },

  // -------------------------------------------------------------
  // School Admin Financial KPI Calculation
  // -------------------------------------------------------------
  getAdminStats: (): AdminFeeStats => {
    const invoices = ERPStorage.get().feeInvoices || [];
    const transactions = ERPStorage.get().paymentTransactions || [];

    const totalBilled = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalCollected = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const totalOutstanding = Math.max(0, totalBilled - totalCollected);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = invoices.filter(
      inv => (inv.status === 'overdue' || inv.dueDate < todayStr) && inv.totalAmount > inv.paidAmount
    ).length;
    const partialCount = invoices.filter(inv => inv.status === 'partial').length;
    const paidCount = invoices.filter(inv => inv.status === 'paid').length;

    // Split collected amounts between online demo & manual office
    let onlineCollected = 0;
    let manualCollected = 0;

    transactions.forEach(t => {
      if (t.status === 'success') {
        if (t.channel === 'online_demo') {
          onlineCollected += t.amount;
        } else {
          manualCollected += t.amount;
        }
      }
    });

    // Fallback if transaction history has gap
    if (onlineCollected + manualCollected === 0) {
      manualCollected = totalCollected;
    }

    return {
      totalBilled,
      totalCollected,
      onlineCollected,
      manualCollected,
      totalOutstanding,
      collectionRate,
      overdueCount,
      partialCount,
      paidCount,
    };
  },

  // Retain legacy method for backward compatibility
  getFinancialSummary: () => {
    const stats = feeService.getAdminStats();
    return {
      totalBilled: stats.totalBilled,
      totalCollected: stats.totalCollected,
      totalOutstanding: stats.totalOutstanding,
      collectionRate: stats.collectionRate,
      overdueCount: stats.overdueCount,
    };
  },

  // -------------------------------------------------------------
  // Online Demo Payment Flow (Simulation)
  // -------------------------------------------------------------
  processOnlineDemoPayment: (params: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethodType;
    payerName: string;
    parentId?: string;
    studentId: string;
    upiVpa?: string;
    bankName?: string;
    cardLast4?: string;
    notes?: string;
  }): {
    success: boolean;
    receipt?: PaymentReceipt;
    transaction?: PaymentTransaction;
    invoice?: FeeInvoice;
    error?: string;
  } => {
    const store = ERPStorage.get();
    const invoice = (store.feeInvoices || []).find(inv => inv.id === params.invoiceId);

    if (!invoice) {
      return { success: false, error: 'Fee invoice record not found in system.' };
    }

    if (invoice.studentId !== params.studentId) {
      return { success: false, error: 'Invoice does not belong to the selected student.' };
    }

    const remainingBalance = invoice.totalAmount - invoice.paidAmount;
    if (remainingBalance <= 0 || invoice.status === 'paid') {
      return { success: false, error: 'This invoice has already been fully settled.' };
    }

    if (params.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    if (params.amount > remainingBalance) {
      return {
        success: false,
        error: `Payment amount (₹${params.amount}) exceeds outstanding balance of ₹${remainingBalance}.`,
      };
    }

    // Check school fee policy if partial payments are allowed
    const policy = feeService.getFeePolicy();
    if (!policy.allowPartialPayments && params.amount < remainingBalance) {
      return {
        success: false,
        error: `Partial payments are currently disabled by school policy. Full balance of ₹${remainingBalance} is required.`,
      };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const transactionRef = DemoPaymentService.generateTransactionRef();
    const receiptNo = DemoPaymentService.generateReceiptNo();

    const previousBalance = remainingBalance;
    const newPaidTotal = invoice.paidAmount + params.amount;
    const newRemainingBalance = Math.max(0, invoice.totalAmount - newPaidTotal);

    // 1. Create FeePayment on invoice
    const newPayment: FeePayment = {
      id: `pay-${Date.now()}`,
      receiptNo,
      date: dateStr,
      time: timeStr,
      amount: params.amount,
      method: params.paymentMethod,
      recordedBy: 'Online Parent Portal (Demo Payment Gateway)',
      transactionRef,
      remarks: params.notes || `Online fee installment for ${invoice.invoiceNo}`,
      status: 'success',
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      parentId: params.parentId,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      isDemo: true,
      payerName: params.payerName,
      channel: 'online_demo',
      upiVpa: params.upiVpa,
      bankName: params.bankName,
      cardLast4: params.cardLast4,
    };

    invoice.payments.push(newPayment);
    invoice.paidAmount = newPaidTotal;
    invoice.status = newRemainingBalance === 0 ? 'paid' : 'partial';

    // 2. Create Transaction Ledger Record
    const student = (store.students || []).find(s => s.id === invoice.studentId);
    const admissionNo = student?.admissionNo || invoice.admissionNo || 'ADM-2024-001';

    const transactionRecord: PaymentTransaction = {
      id: `txn-${Date.now()}`,
      transactionRef,
      receiptNo,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      admissionNo,
      parentId: params.parentId,
      amount: params.amount,
      method: params.paymentMethod,
      status: 'success',
      date: dateStr,
      time: timeStr,
      isDemo: true,
      channel: 'online_demo',
      payerName: params.payerName,
      upiVpa: params.upiVpa,
      bankName: params.bankName,
      cardLast4: params.cardLast4,
      notes: params.notes,
    };

    if (!store.paymentTransactions) {
      store.paymentTransactions = [];
    }
    store.paymentTransactions.unshift(transactionRecord);

    // 3. Assemble Official Receipt Data
    const settings = store.settings;
    const receiptData: PaymentReceipt = {
      receiptNo,
      transactionRef,
      invoiceNo: invoice.invoiceNo,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      admissionNo,
      className: invoice.className,
      section: invoice.section,
      academicYear: invoice.academicYear,
      category: invoice.category,
      amountPaid: params.amount,
      previousBalance,
      remainingBalance: newRemainingBalance,
      paymentDate: dateStr,
      paymentTime: timeStr,
      paymentMethod: params.paymentMethod,
      status: 'success',
      isDemo: true,
      recordedBy: 'Online Parent Portal (Demo Payment Gateway)',
      schoolName: settings.schoolName,
      schoolAddress: `${settings.address}, ${settings.city}, ${settings.state} - ${settings.pincode}`,
      schoolAffiliation: `CBSE Affiliation No: ${settings.affiliationNo} • Board: ${settings.schoolBoard}`,
      upiVpa: params.upiVpa,
      bankName: params.bankName,
      cardLast4: params.cardLast4,
    };

    ERPStorage.set(store);
    return {
      success: true,
      receipt: receiptData,
      transaction: transactionRecord,
      invoice,
    };
  },

  // -------------------------------------------------------------
  // Record Failed or Cancelled Payment Simulation Attempt
  // -------------------------------------------------------------
  recordFailedOrCancelledAttempt: (params: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethodType;
    payerName: string;
    parentId?: string;
    studentId: string;
    status: 'failed' | 'cancelled';
    failureReason?: string;
  }): PaymentTransaction => {
    const store = ERPStorage.get();
    const invoice = (store.feeInvoices || []).find(inv => inv.id === params.invoiceId);
    const student = (store.students || []).find(s => s.id === params.studentId);
    const admissionNo = student?.admissionNo || invoice?.admissionNo || 'ADM-2024-001';

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const transactionRef = `TXN-DEMO-${params.status.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const transactionRecord: PaymentTransaction = {
      id: `txn-${Date.now()}`,
      transactionRef,
      invoiceId: params.invoiceId,
      invoiceNo: invoice?.invoiceNo || 'INV-UNKNOWN',
      studentId: params.studentId,
      studentName: student?.fullName || invoice?.studentName || 'Student',
      admissionNo,
      parentId: params.parentId,
      amount: params.amount,
      method: params.paymentMethod,
      status: params.status,
      date: dateStr,
      time: timeStr,
      isDemo: true,
      channel: 'online_demo',
      payerName: params.payerName,
      failureReason:
        params.failureReason ||
        (params.status === 'failed'
          ? 'Bank simulator: Payment timed out or declined'
          : 'User cancelled payment checkout session'),
    };

    if (!store.paymentTransactions) {
      store.paymentTransactions = [];
    }
    // Failed/Cancelled transactions DO NOT modify invoice balance or status!
    store.paymentTransactions.unshift(transactionRecord);
    ERPStorage.set(store);

    return transactionRecord;
  },

  // -------------------------------------------------------------
  // Manual Payment Recording (School Admin)
  // -------------------------------------------------------------
  recordPayment: (
    invoiceId: string,
    paymentData: {
      amount: number;
      method: PaymentMethodType;
      recordedBy: string;
      transactionRef?: string;
      remarks?: string;
    }
  ): { success: boolean; invoice?: FeeInvoice; payment?: FeePayment; error?: string } => {
    const store = ERPStorage.get();
    const invoice = (store.feeInvoices || []).find(inv => inv.id === invoiceId);
    if (!invoice) {
      return { success: false, error: 'Fee invoice record not found.' };
    }

    const remainingBalance = invoice.totalAmount - invoice.paidAmount;
    if (paymentData.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    if (paymentData.amount > remainingBalance) {
      return {
        success: false,
        error: `Payment amount cannot exceed remaining balance of ₹${remainingBalance.toLocaleString('en-IN')}.`,
      };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const receiptNo = `REC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionRef = paymentData.transactionRef || `OFFICE-${Math.floor(100000 + Math.random() * 900000)}`;

    const newPayment: FeePayment = {
      id: `pay-${Date.now()}`,
      receiptNo,
      date: dateStr,
      time: timeStr,
      amount: paymentData.amount,
      method: paymentData.method,
      recordedBy: paymentData.recordedBy,
      transactionRef,
      remarks: paymentData.remarks,
      status: 'success',
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      isDemo: true,
      channel: 'manual_office',
    };

    invoice.payments.push(newPayment);
    invoice.paidAmount += paymentData.amount;
    invoice.status = invoice.paidAmount >= invoice.totalAmount ? 'paid' : 'partial';

    // Record in transactions list as well
    const student = (store.students || []).find(s => s.id === invoice.studentId);
    const admissionNo = student?.admissionNo || invoice.admissionNo || 'ADM-2024-001';

    const transactionRecord: PaymentTransaction = {
      id: `txn-${Date.now()}`,
      transactionRef,
      receiptNo,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      admissionNo,
      amount: paymentData.amount,
      method: paymentData.method,
      status: 'success',
      date: dateStr,
      time: timeStr,
      isDemo: true,
      channel: 'manual_office',
      payerName: invoice.studentName,
      notes: paymentData.remarks,
    };

    if (!store.paymentTransactions) {
      store.paymentTransactions = [];
    }
    store.paymentTransactions.unshift(transactionRecord);

    ERPStorage.set(store);

    // Persist payment to PostgreSQL 18 backend
    httpClient.post(`/finance/invoices/${invoice.id}/pay`, {
      amount: paymentData.amount,
      payment_method: paymentData.method,
      transaction_reference: transactionRef,
    }).catch(err => console.debug('Backend fee payment sync notice:', err));

    return { success: true, invoice, payment: newPayment };
  },

  // -------------------------------------------------------------
  // Invoice Creation
  // -------------------------------------------------------------
  createInvoice: (
    data: Omit<FeeInvoice, 'id' | 'paidAmount' | 'payments' | 'status'> & {
      items?: FeeInvoice['items'];
      allowPartial?: boolean;
    }
  ): FeeInvoice => {
    const store = ERPStorage.get();
    const newInvoice: FeeInvoice = {
      ...data,
      id: `inv-${Date.now()}`,
      paidAmount: 0,
      payments: [],
      status: 'unpaid',
      items: data.items || [
        {
          id: `item-${Date.now()}`,
          title: `${data.category} Fee`,
          category: data.category,
          amount: data.totalAmount,
        },
      ],
      allowPartial: data.allowPartial !== undefined ? data.allowPartial : true,
    };
    store.feeInvoices = [newInvoice, ...(store.feeInvoices || [])];
    ERPStorage.set(store);
    return newInvoice;
  },

  // -------------------------------------------------------------
  // Payment Transactions Retrieval & Filters
  // -------------------------------------------------------------
  getPaymentTransactions: (filters?: {
    studentId?: string;
    status?: TransactionStatus;
    method?: PaymentMethodType;
    search?: string;
  }): PaymentTransaction[] => {
    let list = ERPStorage.get().paymentTransactions || [];

    if (filters?.studentId) {
      list = list.filter(t => t.studentId === filters.studentId);
    }
    if (filters?.status) {
      list = list.filter(t => t.status === filters.status);
    }
    if (filters?.method) {
      list = list.filter(t => t.method === filters.method);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        t =>
          t.transactionRef.toLowerCase().includes(q) ||
          (t.receiptNo && t.receiptNo.toLowerCase().includes(q)) ||
          t.invoiceNo.toLowerCase().includes(q) ||
          t.studentName.toLowerCase().includes(q) ||
          t.admissionNo.toLowerCase().includes(q)
      );
    }

    return list;
  },

  // -------------------------------------------------------------
  // Structured Receipt Lookup
  // -------------------------------------------------------------
  getReceiptByReceiptNo: (receiptNo: string): PaymentReceipt | undefined => {
    const store = ERPStorage.get();
    const invoices = store.feeInvoices || [];
    const settings = store.settings;

    for (const inv of invoices) {
      const p = inv.payments.find(pay => pay.receiptNo === receiptNo);
      if (p) {
        const student = (store.students || []).find(s => s.id === inv.studentId);
        const admissionNo = student?.admissionNo || inv.admissionNo || 'ADM-2024-001';

        // Calculate balance at time of this receipt
        const paymentsBeforeThis = inv.payments.filter(
          other => new Date(other.date).getTime() < new Date(p.date).getTime()
        );
        const paidBefore = paymentsBeforeThis.reduce((acc, curr) => acc + curr.amount, 0);
        const previousBalance = Math.max(0, inv.totalAmount - paidBefore);
        const remainingBalance = Math.max(0, previousBalance - p.amount);

        return {
          receiptNo: p.receiptNo,
          transactionRef: p.transactionRef || 'TXN-DEMO-RECORDED',
          invoiceNo: inv.invoiceNo,
          invoiceId: inv.id,
          studentId: inv.studentId,
          studentName: inv.studentName,
          admissionNo,
          className: inv.className,
          section: inv.section,
          academicYear: inv.academicYear,
          category: inv.category,
          amountPaid: p.amount,
          previousBalance,
          remainingBalance,
          paymentDate: p.date,
          paymentTime: p.time || '10:00 AM',
          paymentMethod: p.method,
          status: p.status || 'success',
          isDemo: p.isDemo ?? true,
          recordedBy: p.recordedBy,
          schoolName: settings.schoolName,
          schoolAddress: `${settings.address}, ${settings.city}, ${settings.state} - ${settings.pincode}`,
          schoolAffiliation: `CBSE Affiliation No: ${settings.affiliationNo} • Board: ${settings.schoolBoard}`,
          upiVpa: p.upiVpa,
          bankName: p.bankName,
          cardLast4: p.cardLast4,
        };
      }
    }

    return undefined;
  },

  // -------------------------------------------------------------
  // Fee Policy & Settings
  // -------------------------------------------------------------
  getFeePolicy: (): FeePolicy => {
    const store = ERPStorage.get();
    if (store.feePolicy) {
      return store.feePolicy;
    }
    // Fallback default policy
    return {
      academicYear: '2026-2027',
      currency: 'INR',
      allowPartialPayments: true,
      minPartialAmount: 1000,
      gracePeriodDays: 7,
      lateFeePerDay: 50,
      maxLateFee: 1500,
      discountPercentageSibling: 10,
      convenienceFeePercentage: 0,
      upiId: 'stxaviers.kanpur@icici',
      paymentInstructions:
        'Online fees can be paid via UPI, Debit/Credit Cards, or Net Banking. Official digital receipts are issued immediately.',
      bankAccountDetails: {
        accountName: "St. Xavier's Senior Secondary School",
        accountNumber: '919020048129031',
        bankName: 'Axis Bank',
        ifscCode: 'UTIB0000124',
        branch: 'Mall Road, Kanpur',
      },
    };
  },

  updateFeePolicy: (policyUpdates: Partial<FeePolicy>): FeePolicy => {
    const store = ERPStorage.get();
    const current = feeService.getFeePolicy();
    const updated: FeePolicy = {
      ...current,
      ...policyUpdates,
    };
    store.feePolicy = updated;
    ERPStorage.set(store);
    return updated;
  },

  // -------------------------------------------------------------
  // Fee Structures
  // -------------------------------------------------------------
  getFeeStructures: (): FeeStructure[] => {
    const store = ERPStorage.get();
    return store.feeStructures || [];
  },

  createFeeStructure: (data: Omit<FeeStructure, 'id'>): FeeStructure => {
    const store = ERPStorage.get();
    const newFs: FeeStructure = {
      ...data,
      id: `fs-${Date.now()}`,
    };
    if (!store.feeStructures) {
      store.feeStructures = [];
    }
    store.feeStructures.push(newFs);
    ERPStorage.set(store);
    return newFs;
  },
};
