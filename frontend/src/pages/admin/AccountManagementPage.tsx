// ==========================================
// User Accounts & Authentication Directory
// Developed for School ERP Platform
// ==========================================

import React, { useState, useEffect, useMemo } from 'react';
import { accountService, UserAccountItem } from '../../services/accountService';
import { CredentialDeliveryModal } from '../../components/auth/CredentialDeliveryModal';
import { sendCredentialsSMS, sendCredentialsEmail } from '../../services/credentialDeliveryService';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types';

import { ShieldCheck, UserPlus, KeyRound, RotateCcw, Lock, Unlock, Users, CheckCircle, AlertTriangle } from 'lucide-react';

export const AccountManagementPage: React.FC = () => {
  const { addToast } = useERP();
  const [accounts, setAccounts] = useState<UserAccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Add Account Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'student' as UserRole,
    loginId: '',
  });

  // Credential Delivery Modal
  const [deliveryModalData, setDeliveryModalData] = useState<{
    isOpen: boolean;
    name: string;
    role: string;
    loginId: string;
    temporaryPassword: string;
    phone: string;
    email: string;
  }>({
    isOpen: false,
    name: '',
    role: '',
    loginId: '',
    temporaryPassword: '',
    phone: '',
    email: '',
  });

  const loadAccounts = async () => {
    setLoading(true);
    const list = await accountService.getAllAccounts({
      role: roleFilter,
      status: statusFilter,
      search,
    });
    setAccounts(list);
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
  }, [roleFilter, statusFilter, search]);

  // Derived metrics
  const totalCount = accounts.length;
  const activeCount = accounts.filter(a => a.status === 'active').length;
  const pendingPassCount = accounts.filter(a => a.must_change_password).length;
  const deactivatedCount = accounts.filter(a => a.status === 'deactivated').length;

  // Paginated records
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return accounts.slice(start, start + pageSize);
  }, [accounts, currentPage]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.firstName.trim() || !newForm.lastName.trim()) {
      addToast('error', 'Validation Error', 'First and Last name are required.');
      return;
    }

    const res = await accountService.createAccount(newForm);
    if (res.success && res.data) {
      addToast('success', 'Account Created', `Login ID: ${res.data.login_id} for ${res.data.full_name}`);
      setIsAddOpen(false);
      setNewForm({ firstName: '', lastName: '', email: '', phone: '', role: 'student', loginId: '' });
      loadAccounts();

      // Open Credential Delivery Modal
      setDeliveryModalData({
        isOpen: true,
        name: res.data.full_name,
        role: res.data.role,
        loginId: res.data.login_id,
        temporaryPassword: res.data.temporary_password || 'Init#2026!',
        phone: res.data.phone || '+91 98222 33445',
        email: res.data.email,
      });
    } else {
      addToast('error', 'Creation Failed', res.error || 'Could not create account.');
    }
  };

  const handleResetPassword = async (account: UserAccountItem) => {
    const res = await accountService.resetUserPassword(account.id);
    if (res.success && res.temporaryPassword) {
      addToast('success', 'Temporary Password Generated', `New temporary password created for ${account.full_name}.`);
      loadAccounts();
      setDeliveryModalData({
        isOpen: true,
        name: account.full_name,
        role: account.role,
        loginId: account.login_id,
        temporaryPassword: res.temporaryPassword,
        phone: account.phone,
        email: account.email,
      });
    }
  };

  const handleToggleStatus = async (account: UserAccountItem) => {
    const res = await accountService.toggleAccountStatus(account.id);
    if (res.success) {
      const willBeActive = account.status !== 'active';
      addToast('info', 'Account Status Updated', `${account.full_name}'s account is now ${willBeActive ? 'Active' : 'Deactivated'}.`);
      setAccounts(prev =>
        prev.map(a => (a.id === account.id ? { ...a, status: willBeActive ? 'active' : 'deactivated', is_active: willBeActive } : a))
      );
    }
  };

  const handleResend = async (account: UserAccountItem, channel: 'sms' | 'email') => {
    const res = await accountService.resendCredentials(account.id, channel);
    if (res.success) {
      addToast('success', 'Credentials Dispatched', `Sent credentials to ${account.full_name} via ${channel.toUpperCase()}.`);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>User Accounts & Authentication</h1>
          <p className="page-subtitle">
            Manage Login IDs, temporary credentials, password policies, and RBAC status
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <UserPlus size={16} />
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Accounts</div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-sub">Across All System Roles</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value" style={{ color: '#059669' }}>{activeCount}</div>
          <div className="stat-sub">Authorized to Log In</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending First Login</div>
          <div className="stat-value" style={{ color: '#D97706' }}>{pendingPassCount}</div>
          <div className="stat-sub">Must Update Temp Password</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Deactivated</div>
          <div className="stat-value" style={{ color: '#DC2626' }}>{deactivatedCount}</div>
          <div className="stat-sub">Login Blocked</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: '1', minWidth: '240px' }}>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by Name, Email, Login ID, or Mobile..."
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                value={roleFilter}
                onChange={e => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '160px' }}
              >
                <option value="">All Roles</option>
                <option value="school_admin">Admin / Principal</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
                <option value="supplier">Supplier</option>
              </select>

              <select
                className="form-select"
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '150px' }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
              </select>

              {(search || roleFilter || statusFilter) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('');
                    setStatusFilter('');
                    setCurrentPage(1);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <ShieldCheck size={18} color="#3B82F6" />
            <span>Registered User Directory</span>
          </h2>
          <span style={{ fontSize: '13px', color: '#64748B' }}>
            Showing {paginatedAccounts.length} of {totalCount} records
          </span>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {paginatedAccounts.length === 0 ? (
            <div style={{ padding: '32px' }}>
              <EmptyState
                icon={<Users size={32} />}
                title="No User Accounts Found"
                description="No users matched your current search and role filters."
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>User / Full Name</th>
                    <th>Assigned Role</th>
                    <th>Login ID</th>
                    <th>Registered Mobile</th>
                    <th>Email Address</th>
                    <th>Account Status</th>
                    <th>Password Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccounts.map(acc => (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: acc.role === 'teacher' ? '#E0F2FE' : acc.role === 'student' ? '#FEF3C7' : '#EFF6FF',
                              color: acc.role === 'teacher' ? '#0284C7' : acc.role === 'student' ? '#D97706' : '#3B82F6',
                              fontWeight: 600,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {acc.first_name ? acc.first_name[0] : acc.full_name[0] || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>
                              {acc.full_name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              ID: {acc.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Badge
                          status={acc.role === 'school_admin' ? 'active' : 'normal'}
                          label={acc.role.toUpperCase()}
                        />
                      </td>

                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            backgroundColor: '#F1F5F9',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#334155',
                          }}
                        >
                          {acc.login_id}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', color: '#334155' }}>
                          {acc.phone || '—'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', color: '#475569' }}>
                          {acc.email}
                        </span>
                      </td>

                      <td>
                        <Badge
                          status={acc.status === 'active' ? 'active' : 'inactive'}
                          label={acc.status === 'active' ? 'ACTIVE' : 'DEACTIVATED'}
                        />
                      </td>

                      <td>
                        {acc.must_change_password ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#D97706', fontWeight: 500 }}>
                            <AlertTriangle size={13} />
                            Temp Password
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#059669' }}>
                            <CheckCircle size={13} />
                            Permanent
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="Generate Temporary Password"
                            onClick={() => handleResetPassword(acc)}
                          >
                            <KeyRound size={13} />
                            <span>Reset Pass</span>
                          </button>

                          <button
                            type="button"
                            className={`btn btn-sm ${acc.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                            title={acc.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                            onClick={() => handleToggleStatus(acc)}
                          >
                            {acc.status === 'active' ? <Lock size={13} /> : <Unlock size={13} />}
                            <span>{acc.status === 'active' ? 'Block' : 'Activate'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {accounts.length > pageSize && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
              <Pagination
                currentPage={currentPage}
                totalRecords={accounts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Account Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create New User Account"
        size="normal"
      >
        <form onSubmit={handleCreateAccount}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ramesh"
                value={newForm.firstName}
                onChange={e => setNewForm({ ...newForm, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Kumar"
                value={newForm.lastName}
                onChange={e => setNewForm({ ...newForm, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label required">Target System Role</label>
              <select
                className="form-select"
                value={newForm.role}
                onChange={e => setNewForm({ ...newForm, role: e.target.value as UserRole })}
                required
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
                <option value="supplier">Supplier</option>
                <option value="school_admin">School Admin / Staff</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Custom Login ID (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Leave blank to auto-generate"
                value={newForm.loginId}
                onChange={e => setNewForm({ ...newForm, loginId: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label required">Registered Mobile Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. +91 98111 22331"
                value={newForm.phone}
                onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address (Optional)</label>
              <input
                type="email"
                className="form-input"
                placeholder="user@stxaviers.edu.in"
                value={newForm.email}
                onChange={e => setNewForm({ ...newForm, email: e.target.value })}
              />
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#64748B',
              marginBottom: '20px',
            }}
          >
            🔐 A unique Login ID and secure temporary password will be generated automatically. You can dispatch them via SMS or Email right after creation.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Generate Account & Credentials
            </button>
          </div>
        </form>
      </Modal>

      {/* Credential Delivery Modal */}
      {deliveryModalData.isOpen && (
        <CredentialDeliveryModal
          isOpen={deliveryModalData.isOpen}
          onClose={() => setDeliveryModalData({ ...deliveryModalData, isOpen: false })}
          personName={deliveryModalData.name}
          role={deliveryModalData.role}
          loginId={deliveryModalData.loginId}
          temporaryPassword={deliveryModalData.temporaryPassword}
          phone={deliveryModalData.phone}
          email={deliveryModalData.email}
          onSendSMS={async () => {
            const r = await sendCredentialsSMS({
              name: deliveryModalData.name,
              role: deliveryModalData.role,
              loginId: deliveryModalData.loginId,
              temporaryPassword: deliveryModalData.temporaryPassword,
              phone: deliveryModalData.phone,
            });
            addToast(r.ok ? 'success' : 'error', r.ok ? 'SMS Dispatched' : 'SMS Not Sent', r.message);
          }}
          onSendEmail={async () => {
            const r = await sendCredentialsEmail({
              name: deliveryModalData.name,
              role: deliveryModalData.role,
              loginId: deliveryModalData.loginId,
              temporaryPassword: deliveryModalData.temporaryPassword,
              email: deliveryModalData.email,
            });
            addToast(r.ok ? 'success' : 'error', r.ok ? 'Email Dispatched' : 'Email Not Sent', r.message);
          }}
        />
      )}
    </div>
  );
};
