// ==========================================
// Parent Fee Payment Portal Component
// Developed by NTS Novalytix
// Complete Online Payment Experience for Parents
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { FeeInvoice, Student, PaymentReceipt } from '../../types';
import { feeService, ParentFeeSummary } from '../../services/feeService';
import { studentService } from '../../services/studentService';
import { formatCurrencyINR, formatCurrencyINRWithDecimals, formatDate } from '../../utils/formatters';
import { PayNowModal } from './PayNowModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { PrintableReceiptModal } from './PrintableReceiptModal';
import { EmptyState } from '../common/EmptyState';
import { SearchInput } from '../common/SearchInput';
import { IndianRupee, CreditCard, Receipt, FileText, Clock, AlertCircle, CheckCircle2, Users, Printer, Eye, Info, Calendar, Building2 } from 'lucide-react';

export const ParentFeePortal: React.FC = () => {
  const { currentRole, currentUser, selectedChild, parentChildren, setSelectedChildId, schoolSettings, addToast } = useERP();

  // Active Tab: 'invoices' | 'history' | 'policy'
  const [activeTab, setActiveTab] = useState<'invoices' | 'history' | 'policy'>('invoices');

  // Selected Student dynamically resolved
  const currentStudent: Student | null = useMemo(() => {
    if (currentRole === 'student') {
      return (
        (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
        studentService.getAll().find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
        null
      );
    }
    return selectedChild || parentChildren[0] || null;
  }, [currentRole, currentUser, selectedChild, parentChildren]);

  // Store trigger for auto-updating when localStorage changes
  const [storeVersion, setStoreVersion] = useState(0);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setStoreVersion(v => v + 1);
    };
    window.addEventListener('nts_erp_storage_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('nts_erp_storage_updated', handleStorageUpdate);
    };
  }, []);

  // Summary statistics for selected student
  const summary: ParentFeeSummary | null = useMemo(() => {
    if (!currentStudent) return null;
    return feeService.getParentSummary(currentStudent.id);
  }, [currentStudent, storeVersion]);

  // Invoices for selected student
  const studentInvoices = useMemo(() => {
    if (!currentStudent) return [];
    return feeService.getInvoicesByStudentId(currentStudent.id);
  }, [currentStudent, storeVersion]);

  // Payment transactions history for selected student
  const studentTransactions = useMemo(() => {
    if (!currentStudent) return [];
    return feeService.getPaymentTransactions({ studentId: currentStudent.id });
  }, [currentStudent, storeVersion]);

  // Fee Policy
  const feePolicy = useMemo(() => {
    return feeService.getFeePolicy();
  }, [storeVersion]);

  // Filter States for Invoices Tab
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Filter States for History Tab
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('');

  // Interactive Modals State
  const [checkoutTarget, setCheckoutTarget] = useState<FeeInvoice | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<FeeInvoice | null>(null);
  const [confirmedReceipt, setConfirmedReceipt] = useState<PaymentReceipt | null>(null);
  const [printReceiptTarget, setPrintReceiptTarget] = useState<PaymentReceipt | null>(null);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return studentInvoices.filter(inv => {
      const matchSearch =
        invoiceSearch === '' ||
        inv.invoiceNo.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.category.toLowerCase().includes(invoiceSearch.toLowerCase());

      const matchStatus = statusFilter === '' || inv.status === statusFilter;
      const matchCat = categoryFilter === '' || inv.category === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [studentInvoices, invoiceSearch, statusFilter, categoryFilter]);

  // Filtered History Transactions
  const filteredTransactions = useMemo(() => {
    return studentTransactions.filter(t => {
      const matchSearch =
        historySearch === '' ||
        t.transactionRef.toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.receiptNo && t.receiptNo.toLowerCase().includes(historySearch.toLowerCase())) ||
        t.invoiceNo.toLowerCase().includes(historySearch.toLowerCase());

      const matchStatus = historyStatusFilter === '' || t.status === historyStatusFilter;
      const matchMethod = historyMethodFilter === '' || t.method === historyMethodFilter;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [studentTransactions, historySearch, historyStatusFilter, historyMethodFilter]);

  // Handlers
  const handleOpenCheckout = (inv: FeeInvoice) => {
    setCheckoutTarget(inv);
  };

  const handleOpenDetails = (inv: FeeInvoice) => {
    setDetailsTarget(inv);
  };

  const handleViewReceiptFromHistory = (receiptNo: string) => {
    const rc = feeService.getReceiptByReceiptNo(receiptNo);
    if (rc) {
      setPrintReceiptTarget(rc);
    } else {
      addToast('error', 'Receipt Not Found', 'Could not locate full electronic receipt record.');
    }
  };

  const handlePaymentSuccess = (receipt: PaymentReceipt) => {
    setCheckoutTarget(null);
    setConfirmedReceipt(receipt);
    setStoreVersion(v => v + 1);
    addToast(
      'success',
      'Payment Realized (Demo)',
      `Receipt ${receipt.receiptNo} generated for ${formatCurrencyINR(receipt.amountPaid)}`
    );
  };

  if (!currentStudent || !summary) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <EmptyState
          icon={<Users size={32} />}
          title="No Student Ward Linked"
          description="There is currently no student profile linked to your authenticated account credentials. Please contact the admissions and accounts office."
        />
      </div>
    );
  }

  return (
    <div className="parent-fee-portal-wrapper">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div className="page-title-group">
          <h1>Fees & Payments</h1>
          <p className="page-subtitle">
            Fee schedules, online payment, and payment history
          </p>
        </div>

        {/* Linked Ward Selector */}
        {parentChildren.length > 1 && (
          <div className="ward-selector-box">
            <span className="ward-selector-label">
              <Users size={14} /> Linked Ward:
            </span>
            <div className="ward-buttons-group">
              {parentChildren.map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`ward-pill-btn ${currentStudent.id === child.id ? 'active' : ''}`}
                >
                  <span className="ward-dot" />
                  <strong>{child.firstName}</strong>
                  <span className="ward-class-badge">Class {child.className}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5 Essential Summary Cards (Strictly dynamically calculated from selected student) */}
      <div className="stat-grid" style={{ marginBottom: '22px' }}>
        {/* 1. Total fees for academic year */}
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Academic Fees</span>
            <span className="stat-value">{formatCurrencyINRWithDecimals(summary.totalYearFees)}</span>
            <span className="stat-subtext">Session {schoolSettings.academicYear}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <FileText size={22} />
          </div>
        </div>

        {/* 2. Total amount paid */}
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Amount Paid</span>
            <span className="stat-value" style={{ color: '#16a34a' }}>
              {formatCurrencyINRWithDecimals(summary.totalPaid)}
            </span>
            <span className="stat-subtext positive">{summary.paidInvoicesCount} invoices settled in full</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* 3. Outstanding balance */}
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Outstanding Balance</span>
            <span
              className="stat-value"
              style={{ color: summary.outstandingBalance > 0 ? '#DC2626' : '#16a34a' }}
            >
              {formatCurrencyINRWithDecimals(summary.outstandingBalance)}
            </span>
            <span className="stat-subtext">
              {summary.outstandingBalance > 0 ? `${summary.pendingInvoicesCount} pending invoices` : 'All dues clear'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-red">
            <IndianRupee size={22} />
          </div>
        </div>

        {/* 4. Upcoming fee due */}
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Upcoming Fee Due</span>
            <span className="stat-value">
              {summary.upcomingDue
                ? formatCurrencyINRWithDecimals(summary.upcomingDue.amount)
                : '₹ 0.00'}
            </span>
            <span className="stat-subtext">
              {summary.upcomingDue ? `Due by ${formatDate(summary.upcomingDue.dueDate)}` : 'No upcoming deadlines'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Clock size={22} />
          </div>
        </div>

        {/* 5. Overdue amount if any */}
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Overdue Amount</span>
            <span
              className="stat-value"
              style={{ color: summary.overdueAmount > 0 ? '#b91c1c' : '#71717a' }}
            >
              {formatCurrencyINRWithDecimals(summary.overdueAmount)}
            </span>
            <span className="stat-subtext negative">
              {summary.overdueAmount > 0 ? `${summary.overdueCount} overdue invoices` : 'Zero overdue payments'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-red">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="fee-tabs-container">
        <button
          type="button"
          className={`fee-tab-pill ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <CreditCard size={15} />
          <span>Fee Invoices & Dues</span>
          <span className="tab-count-badge">{studentInvoices.length}</span>
        </button>

        <button
          type="button"
          className={`fee-tab-pill ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Receipt size={15} />
          <span>Payment History & Receipts</span>
          <span className="tab-count-badge">{studentTransactions.length}</span>
        </button>

        <button
          type="button"
          className={`fee-tab-pill ${activeTab === 'policy' ? 'active' : ''}`}
          onClick={() => setActiveTab('policy')}
        >
          <Info size={15} />
          <span>Fee Policy & Bank Accounts</span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: FEE INVOICES & DUES
          ========================================================= */}
      {activeTab === 'invoices' && (
        <div>
          {/* Filter Toolbar */}
          <div className="filter-toolbar">
            <div className="filter-group-left">
              <SearchInput
                value={invoiceSearch}
                onChange={setInvoiceSearch}
                placeholder="Search invoice number or fee category..."
                ariaLabel="Search invoices"
              />

              <select
                className="form-select filter-select filter-select-sm"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                aria-label="Filter by Invoice Status"
              >
                <option value="">All Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>

              <select
                className="form-select filter-select filter-select-md"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                aria-label="Filter by Fee Category"
              >
                <option value="">All Categories</option>
                <option value="Tuition">Tuition Fee</option>
                <option value="Transport">Transport Fee</option>
                <option value="Examination">Examination Fee</option>
                <option value="Activity">Activity Fee</option>
                <option value="Admission">Admission Fee</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Showing <strong>{filteredInvoices.length}</strong> of {studentInvoices.length} invoices
            </div>
          </div>

          {/* Invoices Data Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice Ref</th>
                  <th>Student & Adm No</th>
                  <th>Category</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Total Fee</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                  <th style={{ textAlign: 'right' }}>Remaining Balance</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Available Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map(inv => {
                    const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                    const isFullyPaid = balance <= 0 || inv.status === 'paid';
                    const hasPayments = inv.payments && inv.payments.length > 0;

                    return (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: '#19191f' }}>{inv.invoiceNo}</strong>
                            <small style={{ color: '#71717a' }}>Session {inv.academicYear}</small>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#19191f' }}>{inv.studentName}</div>
                          <div style={{ fontSize: '11px', color: '#71717a' }}>{currentStudent.admissionNo}</div>
                        </td>

                        <td>
                          <span className="category-pill">{inv.category}</span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} color="#2563EB" />
                            <span>{formatDate(inv.dueDate)}</span>
                          </div>
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrencyINRWithDecimals(inv.totalAmount)}
                        </td>

                        <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                          {formatCurrencyINRWithDecimals(inv.paidAmount)}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: balance > 0 ? '#DC2626' : '#16a34a',
                          }}
                        >
                          {formatCurrencyINRWithDecimals(balance)}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {isFullyPaid ? (
                            <span className="badge badge-success">Paid</span>
                          ) : inv.status === 'partial' ? (
                            <span className="badge badge-warning">Partially Paid</span>
                          ) : inv.status === 'overdue' ? (
                            <span className="badge badge-danger">Overdue</span>
                          ) : (
                            <span className="badge badge-danger">Unpaid</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div className="table-action-cell" style={{ justifyContent: 'center' }}>
                            {/* Pay Now Button */}
                            {!isFullyPaid ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenCheckout(inv)}
                                style={{ padding: '5px 12px', fontSize: '12px' }}
                              >
                                <CreditCard size={13} />
                                <span>Pay Now</span>
                              </button>
                            ) : null}

                            {/* View Breakdown */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDetails(inv)}
                              title="View itemized breakdown"
                              style={{ padding: '5px 9px', fontSize: '12px' }}
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            {/* Print Receipt of last payment if available */}
                            {hasPayments && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleViewReceiptFromHistory(inv.payments[inv.payments.length - 1].receiptNo)}
                                title="View official receipt"
                                style={{ padding: '5px 9px', fontSize: '12px' }}
                              >
                                <Printer size={13} />
                                <span>Receipt</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>
                      <div className="empty-state-container">
                        <FileText size={38} color="#2563EB" />
                        <h4 style={{ margin: '8px 0 4px', color: '#19191f' }}>No Fee Invoices Found</h4>
                        <p style={{ margin: 0, color: '#71717a', fontSize: '13px' }}>
                          No fee records match your selected filter criteria.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: PAYMENT HISTORY & OFFICIAL RECEIPTS
          ========================================================= */}
      {activeTab === 'history' && (
        <div>
          <div className="filter-toolbar">
            <div className="filter-group-left">
              <SearchInput
                value={historySearch}
                onChange={setHistorySearch}
                placeholder="Search receipt, transaction reference, or invoice..."
                ariaLabel="Search payment history"
              />

              <select
                className="form-select filter-select filter-select-sm"
                value={historyStatusFilter}
                onChange={e => setHistoryStatusFilter(e.target.value)}
                aria-label="Filter by Payment Status"
              >
                <option value="">All Statuses</option>
                <option value="success">Successful</option>
                <option value="failed">Failed Attempt</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                className="form-select filter-select filter-select-md"
                value={historyMethodFilter}
                onChange={e => setHistoryMethodFilter(e.target.value)}
                aria-label="Filter by Payment Mode"
              >
                <option value="">All Payment Modes</option>
                <option value="UPI">UPI</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Online Demand Draft">Demand Draft</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Showing <strong>{filteredTransactions.length}</strong> transactions
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt Number</th>
                  <th>Transaction Reference</th>
                  <th>Invoice Ref</th>
                  <th>Date & Time</th>
                  <th>Payment Method</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                  <th style={{ textAlign: 'center' }}>Transaction Status</th>
                  <th style={{ textAlign: 'center' }}>Receipt Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        {tx.receiptNo ? (
                          <strong style={{ color: '#3B82F6' }}>{tx.receiptNo}</strong>
                        ) : (
                          <span style={{ color: '#71717a' }}>—</span>
                        )}
                      </td>

                      <td className="monospace" style={{ fontSize: '12px' }}>
                        {tx.transactionRef}
                      </td>

                      <td>
                        <strong>{tx.invoiceNo}</strong>
                      </td>

                      <td>
                        <div style={{ fontSize: '12px' }}>
                          {formatDate(tx.date)} <small style={{ color: '#71717a' }}>{tx.time}</small>
                        </div>
                      </td>

                      <td>
                        <span className="pay-method-badge">{tx.method}</span>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrencyINRWithDecimals(tx.amount)}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {tx.status === 'success' ? (
                          <span className="badge badge-success">Successful</span>
                        ) : tx.status === 'failed' ? (
                          <span className="badge badge-danger" title={tx.failureReason}>
                            Failed Attempt
                          </span>
                        ) : (
                          <span className="badge badge-warning">Cancelled</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {tx.status === 'success' && tx.receiptNo ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleViewReceiptFromHistory(tx.receiptNo!)}
                            style={{ padding: '4px 10px', fontSize: '11.5px' }}
                          >
                            <Printer size={13} />
                            <span>Print Receipt</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#2563EB' }}>No receipt issued</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                      <div className="empty-state-container">
                        <Receipt size={38} color="#2563EB" />
                        <h4 style={{ margin: '8px 0 4px', color: '#19191f' }}>No Transactions Found</h4>
                        <p style={{ margin: 0, color: '#71717a', fontSize: '13px' }}>
                          No electronic payments have been recorded matching your search.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: FEE POLICY & BANK ACCOUNT PARTICULARS
          ========================================================= */}
      {activeTab === 'policy' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Institutional Banking Coordinates */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Building2 size={16} color="#3B82F6" />
                  School Bank Account Details
                </h2>
                <p className="card-subtitle">Official designated accounts for NEFT / RTGS payments</p>
              </div>
            </div>

            <div className="card-body">
              <div className="bank-meta-list">
                <div className="bank-meta-row">
                  <span className="lbl">Beneficiary Name:</span>
                  <strong className="val">{feePolicy.bankAccountDetails.accountName}</strong>
                </div>
                <div className="bank-meta-row">
                  <span className="lbl">Bank & Branch:</span>
                  <span className="val">
                    {feePolicy.bankAccountDetails.bankName} • {feePolicy.bankAccountDetails.branch}
                  </span>
                </div>
                <div className="bank-meta-row">
                  <span className="lbl">Account Number:</span>
                  <strong className="val monospace highlight-val">
                    {feePolicy.bankAccountDetails.accountNumber}
                  </strong>
                </div>
                <div className="bank-meta-row">
                  <span className="lbl">IFSC Code:</span>
                  <strong className="val monospace highlight-val">{feePolicy.bankAccountDetails.ifscCode}</strong>
                </div>
                <div className="bank-meta-row">
                  <span className="lbl">Official School UPI ID:</span>
                  <strong className="val monospace" style={{ color: '#16a34a' }}>
                    {feePolicy.upiId}
                  </strong>
                </div>
              </div>

              <div className="bank-instructions-note">
                <strong>Important Instruction:</strong> When making direct bank transfers, please mention the
                student's <strong>Admission Number</strong> and <strong>Invoice Reference</strong> in the remarks
                field for automated reconciliation.
              </div>
            </div>
          </div>

          {/* School Fee Regulations & Rules */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Info size={16} color="#3B82F6" />
                  Fee Settlement Policy
                </h2>
                <p className="card-subtitle">Rules, installment terms, and grace periods</p>
              </div>
            </div>

            <div className="card-body">
              <div className="policy-rule-list">
                <div className="policy-rule-item">
                  <strong>Partial Installments:</strong>
                  <p>
                    {feePolicy.allowPartialPayments
                      ? `Allowed. Parents may pay in flexible installments with a minimum threshold of ${formatCurrencyINR(
                          feePolicy.minPartialAmount
                        )}.`
                      : 'Disabled by school management. Full invoice settlement is required.'}
                  </p>
                </div>

                <div className="policy-rule-item">
                  <strong>Grace Period & Surcharges:</strong>
                  <p>
                    A grace period of {feePolicy.gracePeriodDays} calendar days is granted after the due date.
                    Thereafter, a late surcharge of ₹{feePolicy.lateFeePerDay} per day is applicable up to a
                    maximum cap of ₹{feePolicy.maxLateFee}.
                  </p>
                </div>

                <div className="policy-rule-item">
                  <strong>Sibling Concession:</strong>
                  <p>
                    A {feePolicy.discountPercentageSibling}% concession on base tuition fee is applicable for the
                    second linked child enrolled in the institution.
                  </p>
                </div>

                <div className="policy-rule-item">
                  <strong>Instant Receipts:</strong>
                  <p>
                    Computer-generated official digital receipts are issued instantaneously upon online
                    realization. These receipts are valid for academic records and income tax education rebate
                    claims.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS
          ========================================================= */}
      {/* 1. Pay Now Checkout Modal */}
      {checkoutTarget && (
        <PayNowModal
          invoice={checkoutTarget}
          student={currentStudent}
          schoolName={schoolSettings.schoolName}
          policy={feePolicy}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckoutTarget(null)}
        />
      )}

      {/* 2. Invoice Details Breakdown Modal */}
      {detailsTarget && (
        <InvoiceDetailsModal
          invoice={detailsTarget}
          student={currentStudent}
          schoolName={schoolSettings.schoolName}
          onPayNow={inv => handleOpenCheckout(inv)}
          onViewReceipt={receiptNo => handleViewReceiptFromHistory(receiptNo)}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {/* 3. Payment Confirmation Screen */}
      {confirmedReceipt && (
        <PaymentConfirmationModal
          receipt={confirmedReceipt}
          onPrintReceipt={() => {
            const rc = confirmedReceipt;
            setConfirmedReceipt(null);
            setPrintReceiptTarget(rc);
          }}
          onViewInvoice={invId => {
            setConfirmedReceipt(null);
            const inv = feeService.getInvoiceById(invId);
            if (inv) setDetailsTarget(inv);
          }}
          onClose={() => setConfirmedReceipt(null)}
        />
      )}

      {/* 4. A4 Printable Fee Receipt Sheet */}
      {printReceiptTarget && (
        <PrintableReceiptModal
          receipt={printReceiptTarget}
          onClose={() => setPrintReceiptTarget(null)}
        />
      )}
    </div>
  );
};

