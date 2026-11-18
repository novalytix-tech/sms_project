// ==========================================
// School Admin Fee Management & Ledger Portal
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { FeeInvoice, FeeCategory, PaymentMethodType, FeePolicy, PaymentReceipt } from '../../types';
import { feeService, AdminFeeStats } from '../../services/feeService';
import { studentService } from '../../services/studentService';
import { formatCurrencyINR, formatCurrencyINRWithDecimals, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/export';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { SearchInput } from '../common/SearchInput';
import { PrintableReceiptModal } from './PrintableReceiptModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { IndianRupee, Plus, Download, Printer, CheckCircle, AlertCircle, FileText, CreditCard, Users, Eye, Sliders } from 'lucide-react';

export const AdminFeePortal: React.FC = () => {
  const { schoolSettings, addToast, currentRole } = useERP();
  const students = useMemo(() => studentService.getAll(), []);

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

  // Fee data comes from the backend finance API (cached in feeService).
  useEffect(() => {
    feeService.load();
  }, []);

  // All invoices & stats from shared service
  const invoices = useMemo(() => feeService.getAllInvoices(), [storeVersion]);
  const stats: AdminFeeStats = useMemo(() => feeService.getAdminStats(), [storeVersion]);
  const transactions = useMemo(() => feeService.getPaymentTransactions(), [storeVersion]);
  const feePolicy = useMemo(() => feeService.getFeePolicy(), [storeVersion]);
  const feeStructures = useMemo(() => feeService.getFeeStructures(), [storeVersion]);

  // Admin Navigation Tabs: 'ledger' | 'transactions' | 'balances' | 'policy'
  const [adminTab, setAdminTab] = useState<'ledger' | 'transactions' | 'balances' | 'policy'>('ledger');

  // Filter States for Ledger Tab
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pagination States for Ledger Tab
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, categoryFilter]);

  // Filter States for Transactions Tab
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('');
  const [txChannelFilter, setTxChannelFilter] = useState('');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<FeeInvoice | null>(null);
  const [printReceiptTarget, setPrintReceiptTarget] = useState<PaymentReceipt | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<FeeInvoice | null>(null);

  // Manual payment recording form
  const [paymentForm, setPaymentForm] = useState({
    amount: 10000,
    method: 'Bank Transfer' as PaymentMethodType,
    transactionRef: '',
    remarks: 'Term fee installment received at office counter',
  });
  const [paymentError, setPaymentError] = useState('');

  // Invoice creation form
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    studentId: students[0]?.id || 'stud-1',
    category: 'Tuition' as FeeCategory,
    totalAmount: 45000,
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    allowPartial: true,
  });

  // Policy edit form
  const [policyForm, setPolicyForm] = useState<FeePolicy>(feePolicy);
  useEffect(() => {
    setPolicyForm(feePolicy);
  }, [feePolicy]);
  const [saving, setSaving] = useState(false);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch =
        search === '' ||
        inv.studentName.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNo.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === '' || inv.status === statusFilter;
      const matchCat = categoryFilter === '' || inv.category === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [invoices, search, statusFilter, categoryFilter]);

  // Paginated Invoices for Ledger Tab
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch =
        txSearch === '' ||
        t.transactionRef.toLowerCase().includes(txSearch.toLowerCase()) ||
        (t.receiptNo && t.receiptNo.toLowerCase().includes(txSearch.toLowerCase())) ||
        t.invoiceNo.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.studentName.toLowerCase().includes(txSearch.toLowerCase());

      const matchStatus = txStatusFilter === '' || t.status === txStatusFilter;
      const matchChannel = txChannelFilter === '' || t.channel === txChannelFilter;

      return matchSearch && matchStatus && matchChannel;
    });
  }, [transactions, txSearch, txStatusFilter, txChannelFilter]);

  // Student-wise aggregated balances
  const studentBalances = useMemo(() => {
    return students.map(s => {
      const sInvoices = invoices.filter(inv => inv.studentId === s.id);
      const totalBilled = sInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
      const totalPaid = sInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
      const balance = Math.max(0, totalBilled - totalPaid);
      const overdueCount = sInvoices.filter(inv => inv.status === 'overdue').length;

      return {
        student: s,
        invoicesCount: sInvoices.length,
        totalBilled,
        totalPaid,
        balance,
        overdueCount,
      };
    });
  }, [students, invoices]);

  // Actions
  const handleExportCSV = () => {
    const headers = ['Invoice No', 'Student Name', 'Class', 'Category', 'Total Amount', 'Paid Amount', 'Due Date', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNo,
      inv.studentName,
      `${inv.className}-${inv.section}`,
      inv.category,
      inv.totalAmount,
      inv.paidAmount,
      inv.dueDate,
      inv.status,
    ]);
    exportToCSV('Fee_Invoices_Ledger', headers, rows);
    addToast('success', 'Export Complete', 'Fee invoices exported to CSV.');
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const stud = students.find(s => s.id === newInvoiceForm.studentId);
    if (!stud || saving) return;
    setSaving(true);
    const res = await feeService.createInvoice({
      studentId: stud.id,
      category: newInvoiceForm.category,
      academicYear: schoolSettings.academicYear,
      dueDate: newInvoiceForm.dueDate,
      allowPartial: newInvoiceForm.allowPartial,
      items: [{ title: `${newInvoiceForm.category} Fee`, amount: Number(newInvoiceForm.totalAmount) }],
    });
    setSaving(false);
    if (!res.success) {
      addToast('error', 'Invoice Not Created', res.error);
      return;
    }
    addToast('success', 'Fee Invoice Generated', `Invoice ${res.data.invoiceNo} created for ${stud.fullName}.`);
    setIsInvoiceModalOpen(false);
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetInvoice || saving) return;
    setPaymentError('');
    setSaving(true);
    const res = await feeService.recordPayment(paymentTargetInvoice.id, {
      amount: Number(paymentForm.amount),
      method: paymentForm.method,
      transactionRef: paymentForm.transactionRef || undefined,
      remarks: paymentForm.remarks || undefined,
    });
    setSaving(false);
    if (!res.success) {
      setPaymentError(res.error);
      return;
    }
    addToast(
      'success',
      'Payment Recorded',
      `Received ${formatCurrencyINR(paymentForm.amount)} for ${paymentTargetInvoice.invoiceNo}.`
    );
    const rc = feeService.getReceiptByReceiptNo(res.data.receiptNo);
    if (rc) setPrintReceiptTarget(rc);
    setPaymentTargetInvoice(null);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await feeService.updateFeePolicy(policyForm);
    if (res.success) {
      addToast('success', 'Fee Policy Saved', 'School fee rules and payment details updated.');
    } else {
      addToast('error', 'Policy Not Saved', res.error);
    }
  };

  return (
    <div className="admin-fee-portal-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Fees & Accounting</h1>
          <p className="page-subtitle">
            Fee invoices, payment tracking, and collection ledger
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          {['school_admin', 'super_admin'].includes(currentRole) && (
            <button className="btn btn-primary" onClick={() => setIsInvoiceModalOpen(true)}>
              <Plus size={16} />
              <span>Create Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Financial Summary Cards */}
      <div className="stat-grid" style={{ marginBottom: '22px' }}>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Billed Invoices</span>
            <span className="stat-value">{formatCurrencyINR(stats.totalBilled)}</span>
            <span className="stat-subtext">{invoices.length} total generated invoices</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <FileText size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Collected & Realized</span>
            <span className="stat-value" style={{ color: '#16A34A' }}>
              {formatCurrencyINR(stats.totalCollected)}
            </span>
            <span className="stat-subtext positive">
              Recorded at school office: {formatCurrencyINR(stats.manualCollected)}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Outstanding Balance</span>
            <span className="stat-value" style={{ color: '#DC2626' }}>
              {formatCurrencyINR(stats.totalOutstanding)}
            </span>
            <span className="stat-subtext negative">
              {stats.overdueCount} Overdue • {stats.partialCount} Partially Settled
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-red">
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Collection Efficiency</span>
            <span className="stat-value">{stats.collectionRate}%</span>
            <span className="stat-subtext">{stats.paidCount} invoices fully settled</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <IndianRupee size={22} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="fee-tabs-container">
        <button
          type="button"
          className={`fee-tab-pill ${adminTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setAdminTab('ledger')}
        >
          <FileText size={15} />
          <span>All Fee Invoices ({invoices.length})</span>
        </button>

        <button
          type="button"
          className={`fee-tab-pill ${adminTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setAdminTab('transactions')}
        >
          <CreditCard size={15} />
          <span>Online Payments & Transactions ({transactions.length})</span>
        </button>

        <button
          type="button"
          className={`fee-tab-pill ${adminTab === 'balances' ? 'active' : ''}`}
          onClick={() => setAdminTab('balances')}
        >
          <Users size={15} />
          <span>Student Fee Balances ({students.length})</span>
        </button>

        <button
          type="button"
          className={`fee-tab-pill ${adminTab === 'policy' ? 'active' : ''}`}
          onClick={() => setAdminTab('policy')}
        >
          <Sliders size={15} />
          <span>Fee Policy & Structures</span>
        </button>
      </div>

      {/* TAB 1: ALL INVOICES LEDGER */}
      {adminTab === 'ledger' && (
        <div>
          <div className="filter-toolbar">
            <div className="filter-group-left">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by invoice number or student name..."
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
                <option value="Tuition">Tuition</option>
                <option value="Admission">Admission</option>
                <option value="Transport">Transport</option>
                <option value="Examination">Examination</option>
                <option value="Activity">Activity</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} invoices
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Total Fee</th>
                  <th style={{ textAlign: 'right' }}>Paid Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance Due</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map(inv => {
                    const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                    const isFullyPaid = balance <= 0 || inv.status === 'paid';

                    return (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.invoiceNo}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => {
                              const stud = students.find(s => s.id === inv.studentId);
                              const photo = stud ? studentService.getStudentPhoto(stud) : '/student-male.svg';
                              return (
                                <img
                                  src={photo}
                                  alt={inv.studentName}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }}
                                  onError={e => { (e.target as HTMLImageElement).src = '/student-male.svg'; }}
                                />
                              );
                            })()}
                            <span style={{ fontWeight: 600 }}>{inv.studentName}</span>
                          </div>
                        </td>
                        <td>
                          {inv.className}-{inv.section}
                        </td>
                        <td>
                          <span className="category-pill">{inv.category}</span>
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
                        <td>{formatDate(inv.dueDate)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {isFullyPaid ? (
                            <span className="badge badge-success">Paid</span>
                          ) : inv.status === 'partial' ? (
                            <span className="badge badge-warning">Partial</span>
                          ) : inv.status === 'overdue' ? (
                            <span className="badge badge-danger">Overdue</span>
                          ) : (
                            <span className="badge badge-danger">Unpaid</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="table-action-cell" style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setDetailsTarget(inv)}
                              title="View breakdown"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>

                            {!isFullyPaid && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setPaymentTargetInvoice(inv);
                                  setPaymentForm({
                                    amount: balance,
                                    method: 'Bank Transfer',
                                    transactionRef: '',
                                    remarks: 'Installment received at counter',
                                  });
                                  setPaymentError('');
                                }}
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                              >
                                <span>Record Pay</span>
                              </button>
                            )}

                            {inv.payments && inv.payments.length > 0 && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  const rc = feeService.getReceiptByReceiptNo(
                                    inv.payments[inv.payments.length - 1].receiptNo
                                  );
                                  if (rc) setPrintReceiptTarget(rc);
                                }}
                                title="Print Receipt"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                              >
                                <Printer size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px' }}>
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredInvoices.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalRecords={filteredInvoices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageSizeChange={setPageSize}
              itemLabel="invoices"
            />
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT TRANSACTIONS */}
      {adminTab === 'transactions' && (
        <div>
          <div className="filter-toolbar">
            <div className="filter-group-left">
              <SearchInput
                value={txSearch}
                onChange={setTxSearch}
                placeholder="Search receipt, transaction ref, or student..."
                ariaLabel="Search transactions"
              />

              <select
                className="form-select filter-select filter-select-sm"
                value={txStatusFilter}
                onChange={e => setTxStatusFilter(e.target.value)}
                aria-label="Filter by Transaction Status"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed Attempt</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                className="form-select filter-select filter-select-md"
                value={txChannelFilter}
                onChange={e => setTxChannelFilter(e.target.value)}
                aria-label="Filter by Payment Channel"
              >
                <option value="">All Payment Channels</option>
                <option value="manual_office">Office Manual Counter</option>
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
                  <th>Receipt #</th>
                  <th>Transaction Ref</th>
                  <th>Student & Adm</th>
                  <th>Invoice Ref</th>
                  <th>Date & Time</th>
                  <th>Mode & Channel</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
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
                        <strong>{tx.studentName}</strong>
                        <div style={{ fontSize: '11px', color: '#71717a' }}>{tx.admissionNo}</div>
                      </td>
                      <td>{tx.invoiceNo}</td>
                      <td>
                        {formatDate(tx.date)} <small style={{ color: '#71717a' }}>{tx.time}</small>
                      </td>
                      <td>
                        <span className="pay-method-badge">{tx.method}</span>
                        <span className="badge badge-secondary" style={{ marginLeft: '6px' }}>
                          Office Counter
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrencyINRWithDecimals(tx.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {tx.status === 'success' ? (
                          <span className="badge badge-success">Success</span>
                        ) : tx.status === 'failed' ? (
                          <span className="badge badge-danger" title={tx.failureReason}>
                            Failed
                          </span>
                        ) : (
                          <span className="badge badge-warning">Cancelled</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {tx.receiptNo ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              const rc = feeService.getReceiptByReceiptNo(tx.receiptNo!);
                              if (rc) setPrintReceiptTarget(rc);
                            }}
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            <Printer size={12} />
                            <span>Receipt</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#2563EB' }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px' }}>
                      No payment transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT FEE BALANCES */}
      {adminTab === 'balances' && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Admission No</th>
                <th>Class & Section</th>
                <th>Invoices Generated</th>
                <th style={{ textAlign: 'right' }}>Total Billed</th>
                <th style={{ textAlign: 'right' }}>Total Realized</th>
                <th style={{ textAlign: 'right' }}>Balance Due</th>
                <th style={{ textAlign: 'center' }}>Dues Status</th>
              </tr>
            </thead>
            <tbody>
              {studentBalances.map(sb => (
                <tr key={sb.student.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={studentService.getStudentPhoto(sb.student)}
                        alt={sb.student.fullName}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).src = '/student-male.svg'; }}
                      />
                      <strong>{sb.student.fullName}</strong>
                    </div>
                  </td>
                  <td>{sb.student.admissionNo}</td>
                  <td>
                    Class {sb.student.className} ({sb.student.section})
                  </td>
                  <td>{sb.invoicesCount} Invoices</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrencyINRWithDecimals(sb.totalBilled)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                    {formatCurrencyINRWithDecimals(sb.totalPaid)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: sb.balance > 0 ? '#DC2626' : '#16a34a',
                    }}
                  >
                    {formatCurrencyINRWithDecimals(sb.balance)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {sb.balance === 0 ? (
                      <span className="badge badge-success">Clear</span>
                    ) : sb.overdueCount > 0 ? (
                      <span className="badge badge-danger">{sb.overdueCount} Overdue</span>
                    ) : (
                      <span className="badge badge-warning">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: FEE POLICY & STRUCTURES */}
      {adminTab === 'policy' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          {/* Policy Settings Form */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Fee Collection Policies</h2>
                <p className="card-subtitle">Configure installment rules, late fees, and banking details</p>
              </div>
            </div>

            <form onSubmit={handleSavePolicy} className="card-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={policyForm.allowPartialPayments}
                    onChange={e => setPolicyForm({ ...policyForm, allowPartialPayments: e.target.checked })}
                    style={{ accentColor: '#3B82F6', width: '16px', height: '16px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '13px' }}>Allow Partial Payments in Parent Portal</strong>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>
                      Parents can pay flexible partial installments rather than full balance only.
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Minimum Partial Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={policyForm.minPartialAmount}
                    onChange={e => setPolicyForm({ ...policyForm, minPartialAmount: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Late Fee Per Day (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={policyForm.lateFeePerDay}
                    onChange={e => setPolicyForm({ ...policyForm, lateFeePerDay: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">School Designated UPI VPA</label>
                <input
                  type="text"
                  className="form-input"
                  value={policyForm.upiId}
                  onChange={e => setPolicyForm({ ...policyForm, upiId: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Bank Account Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={policyForm.bankAccountDetails.accountNumber}
                  onChange={e =>
                    setPolicyForm({
                      ...policyForm,
                      bankAccountDetails: {
                        ...policyForm.bankAccountDetails,
                        accountNumber: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <span>Save Fee Policy Settings</span>
              </button>
            </form>
          </div>

          {/* Fee Structures List */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Configured Fee Structures</h2>
                <p className="card-subtitle">Default templates for term and annual grade invoicing</p>
              </div>
            </div>

            <div className="card-body" style={{ padding: 0 }}>
              {feeStructures.map(fs => (
                <div
                  key={fs.id}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: '#19191f' }}>{fs.title}</strong>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>
                      Class: {fs.className} • Category: {fs.category} • Term: {fs.term}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#3B82F6' }}>
                      {formatCurrencyINRWithDecimals(fs.totalAmount)}
                    </div>
                    <small style={{ color: '#16a34a', fontSize: '10.5px' }}>
                      {fs.allowPartial ? 'Partial allowed' : 'Full only'}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Generate New Fee Invoice"
        size="normal"
      >
        <form onSubmit={handleCreateInvoice}>
          <div className="form-group">
            <label className="form-label required">Target Student</label>
            <select
              className="form-select"
              value={newInvoiceForm.studentId}
              onChange={e => setNewInvoiceForm({ ...newInvoiceForm, studentId: e.target.value })}
              required
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName} — Class {s.className}-{s.section} ({s.admissionNo})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label required">Fee Category</label>
              <select
                className="form-select"
                value={newInvoiceForm.category}
                onChange={e =>
                  setNewInvoiceForm({ ...newInvoiceForm, category: e.target.value as FeeCategory })
                }
              >
                <option value="Tuition">Tuition Fee</option>
                <option value="Transport">Transport Fee</option>
                <option value="Examination">Examination Fee</option>
                <option value="Activity">Activity Fee</option>
                <option value="Admission">Admission Fee</option>
                <option value="Library">Library Fee</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Total Fee Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                value={newInvoiceForm.totalAmount}
                onChange={e => setNewInvoiceForm({ ...newInvoiceForm, totalAmount: Number(e.target.value) })}
                required
                min={100}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Payment Due Date</label>
            <input
              type="date"
              className="form-input"
              value={newInvoiceForm.dueDate}
              onChange={e => setNewInvoiceForm({ ...newInvoiceForm, dueDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newInvoiceForm.allowPartial}
                onChange={e => setNewInvoiceForm({ ...newInvoiceForm, allowPartial: e.target.checked })}
                style={{ accentColor: '#3B82F6' }}
              />
              <span style={{ fontSize: '13px' }}>Allow partial installment payments for this invoice</span>
            </label>
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsInvoiceModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Generate & Publish Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD MANUAL PAYMENT MODAL */}
      {paymentTargetInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setPaymentTargetInvoice(null)}
          title={`Record Manual Payment: ${paymentTargetInvoice.invoiceNo}`}
          size="normal"
        >
          <form onSubmit={handleRecordManualPayment}>
            {paymentError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
                }}
              >
                {paymentError}
              </div>
            )}

            <div
              style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div>
                Student: <strong>{paymentTargetInvoice.studentName}</strong> (
                {paymentTargetInvoice.className}-{paymentTargetInvoice.section})
              </div>
              <div style={{ marginTop: '4px' }}>
                Remaining Balance:{' '}
                <strong style={{ color: '#dc2626' }}>
                  {formatCurrencyINRWithDecimals(
                    paymentTargetInvoice.totalAmount - paymentTargetInvoice.paidAmount
                  )}
                </strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Amount Received (₹)</label>
              <input
                type="number"
                className="form-input"
                value={paymentForm.amount}
                onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                required
                max={paymentTargetInvoice.totalAmount - paymentTargetInvoice.paidAmount}
                min={1}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Payment Mode</label>
              <select
                className="form-select"
                value={paymentForm.method}
                onChange={e =>
                  setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethodType })
                }
              >
                <option value="UPI">UPI (to school account)</option>
                <option value="Cash">Cash (Counter)</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">NEFT / RTGS Bank Transfer</option>
                <option value="Demand Draft">Demand Draft</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cheque / Bank Reference #</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CHQ-991203 or UTR ref"
                value={paymentForm.transactionRef}
                onChange={e => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
              />
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPaymentTargetInvoice(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Record Payment & Issue Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* INVOICE DETAILS MODAL */}
      {detailsTarget && (
        <InvoiceDetailsModal
          invoice={detailsTarget}
          student={
            students.find(s => s.id === detailsTarget.studentId) || {
              id: detailsTarget.studentId,
              fullName: detailsTarget.studentName,
              admissionNo: detailsTarget.admissionNo || 'ADM-2024-001',
              className: detailsTarget.className,
              section: detailsTarget.section,
              rollNo: '01',
              parentName: 'Parent / Guardian',
            } as any
          }
          schoolName={schoolSettings.schoolName}
          onViewReceipt={receiptNo => {
            const rc = feeService.getReceiptByReceiptNo(receiptNo);
            if (rc) setPrintReceiptTarget(rc);
          }}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {/* PRINTABLE OFFICIAL RECEIPT MODAL */}
      {printReceiptTarget && (
        <PrintableReceiptModal
          receipt={printReceiptTarget}
          onClose={() => setPrintReceiptTarget(null)}
        />
      )}
    </div>
  );
};
