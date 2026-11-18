// ==========================================
// School Service Management & Entitlements Portal
// Developed by NTS Novalytix
// Super Admin Centralized Entitlement Engine
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { SchoolServiceConfiguration, ServicePackageTemplate } from '../../types/serviceEntitlement';
import { SERVICE_DEFINITIONS, serviceEntitlementService } from '../../services/serviceEntitlementService';
import { ConfigureServicesModal } from './ConfigureServicesModal';
import { ChangePackageModal } from './ChangePackageModal';
import { AuditHistoryModal } from './AuditHistoryModal';
import { SearchInput } from '../../components/common/SearchInput';
import { ShieldCheck, Building2, Package, Sliders, History, Megaphone, Layers, Lock, Unlock } from 'lucide-react';

export const ServiceEntitlementsPage: React.FC = () => {
  const { currentUser, currentRole, addToast } = useERP();

  const [configs, setConfigs] = useState<SchoolServiceConfiguration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [configuringSchool, setConfiguringSchool] = useState<SchoolServiceConfiguration | null>(null);
  const [changingPackageSchool, setChangingPackageSchool] = useState<SchoolServiceConfiguration | null>(null);
  const [viewingAuditSchoolId, setViewingAuditSchoolId] = useState<string | undefined>(undefined);
  const [showGlobalAudit, setShowGlobalAudit] = useState(false);

  const loadConfigs = () => {
    const data = serviceEntitlementService.getAllConfigs();
    setConfigs(data);

    // Refresh active modal school if open
    if (configuringSchool) {
      const fresh = data.find((c) => c.schoolId === configuringSchool.schoolId);
      if (fresh) setConfiguringSchool(fresh);
    }
    if (changingPackageSchool) {
      const fresh = data.find((c) => c.schoolId === changingPackageSchool.schoolId);
      if (fresh) setChangingPackageSchool(fresh);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // Filtered schools
  const filteredConfigs = useMemo(() => {
    let result = configs;

    if (packageFilter !== 'all') {
      result = result.filter((c) => c.package === packageFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.accountStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.schoolName.toLowerCase().includes(q) ||
          c.schoolId.toLowerCase().includes(q) ||
          c.package.toLowerCase().includes(q)
      );
    }

    return result;
  }, [configs, packageFilter, statusFilter, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    return {
      total: configs.length,
      erpAndMarketing: configs.filter((c) => c.package === 'erp_marketing').length,
      erpOnly: configs.filter((c) => c.package === 'erp_only').length,
      marketingOnly: configs.filter((c) => c.package === 'marketing_only').length,
      suspended: configs.filter((c) => c.accountStatus === 'suspended').length,
    };
  }, [configs]);

  const handleToggleAccountStatus = (config: SchoolServiceConfiguration) => {
    const isSuspending = config.accountStatus === 'active';
    const actionWord = isSuspending ? 'suspend' : 'activate';

    const reason = prompt(
      `Enter mandatory reason to ${actionWord} account for "${config.schoolName}" (ID: ${config.schoolId}):`
    );

    if (!reason || !reason.trim()) {
      addToast('warning', 'Action Cancelled', 'A mandatory reason is required to alter school account status.');
      return;
    }

    try {
      serviceEntitlementService.setAccountStatus(
        config.schoolId,
        isSuspending ? 'suspended' : 'active',
        currentUser,
        reason.trim()
      );
      loadConfigs();
      addToast('success', 'Account Status Updated', `School account is now ${isSuspending ? 'suspended' : 'active'}.`);
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message || 'Failed to update account status.');
    }
  };

  const getPackageBadge = (pkg: ServicePackageTemplate) => {
    switch (pkg) {
      case 'erp_marketing':
        return (
          <span className="badge badge-success" style={{ fontWeight: 600 }}>
            <Layers size={11} style={{ display: 'inline', marginRight: '4px' }} />
            ERP + Marketing
          </span>
        );
      case 'erp_only':
        return (
          <span className="badge badge-info" style={{ fontWeight: 600 }}>
            <Building2 size={11} style={{ display: 'inline', marginRight: '4px' }} />
            ERP Only
          </span>
        );
      case 'marketing_only':
        return (
          <span className="badge badge-warning" style={{ fontWeight: 600 }}>
            <Megaphone size={11} style={{ display: 'inline', marginRight: '4px' }} />
            Marketing Only
          </span>
        );
      case 'custom':
        return (
          <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
            <Sliders size={11} style={{ display: 'inline', marginRight: '4px' }} />
            Custom Plan
          </span>
        );
    }
  };

  return (
    <div className="qp-page-container">
      {/* Page Header */}
      <div className="page-header qp-page-header">
        <div>
          <div className="qp-principal-badge" style={{ background: 'var(--color-primary-light, #DBEAFE)', color: 'var(--color-primary-dark, #1D4ED8)' }}>
            <ShieldCheck size={14} /> Super Admin Enterprise Control
          </div>
          <h1 className="page-title">School Service Management & Entitlements</h1>
          <p className="page-subtitle">
            Configure, activate, suspend, and customize independent service entitlements across all partner schools.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowGlobalAudit(true)}
          >
            <History size={16} /> Global Audit Ledger
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="kpi-grid qp-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Partner Schools</span>
          <span className="kpi-value">{stats.total}</span>
          <span className="kpi-desc">Total managed accounts</span>
        </div>
        <div className="kpi-card" style={{ borderColor: stats.erpAndMarketing > 0 ? '#10b981' : undefined }}>
          <span className="kpi-label">ERP + Digital Marketing</span>
          <span className="kpi-value text-success">{stats.erpAndMarketing}</span>
          <span className="kpi-desc">Comprehensive bundle</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">ERP Only Accounts</span>
          <span className="kpi-value text-info">{stats.erpOnly}</span>
          <span className="kpi-desc">Standard academic plans</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Marketing Only</span>
          <span className="kpi-value text-warning">{stats.marketingOnly}</span>
          <span className="kpi-desc">Growth pilot accounts</span>
        </div>
        <div className="kpi-card" style={{ borderColor: stats.suspended > 0 ? '#ef4444' : undefined }}>
          <span className="kpi-label">Suspended Accounts</span>
          <span className="kpi-value text-danger">{stats.suspended}</span>
          <span className="kpi-desc">Temporarily disabled</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="qp-controls-bar">
        <div className="qp-filter-group">
          <label className="qp-filter-label">Package Plan:</label>
          <select
            className="form-control form-control-sm"
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            aria-label="Filter by Package Plan"
          >
            <option value="all">All Packages</option>
            <option value="erp_marketing">ERP + Digital Marketing</option>
            <option value="erp_only">ERP Only</option>
            <option value="marketing_only">Marketing Only</option>
            <option value="custom">Custom Package</option>
          </select>

          <label className="qp-filter-label" style={{ marginLeft: '12px' }}>
            Account Status:
          </label>
          <select
            className="form-control form-control-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Account Status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="suspended">Suspended Accounts</option>
          </select>
        </div>

        <div className="qp-search-box">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search school name, ID, or package..."
            ariaLabel="Search school accounts"
          />
        </div>
      </div>

      {/* School Service Configurations Table */}
      <div className="card qp-table-card">
        {filteredConfigs.length === 0 ? (
          <div className="qp-empty-state">
            <Building2 size={48} className="qp-empty-icon" />
            <h3>No School Accounts Found</h3>
            <p>No partner schools match the selected criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School Name & Code</th>
                  <th>School ID</th>
                  <th>Service Package</th>
                  <th>Account Status</th>
                  <th>Active Services</th>
                  <th>Digital Marketing</th>
                  <th>Growth Lead</th>
                  <th>Last Modified</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConfigs.map((cfg) => {
                  const enabledServicesCount = Object.values(cfg.entitlements).filter((e) => e.enabled).length;
                  const totalServicesCount = Object.keys(SERVICE_DEFINITIONS).length;
                  const hasMarketing = cfg.entitlements.digital_marketing?.enabled;
                  const isSuspended = cfg.accountStatus === 'suspended';

                  return (
                    <tr key={cfg.schoolId} className={isSuspended ? 'qp-row-pending-highlight' : undefined}>
                      <td>
                        <div className="qp-table-title">{cfg.schoolName}</div>
                      </td>
                      <td>
                        <span className="qp-code-pill">{cfg.schoolId}</span>
                      </td>
                      <td>{getPackageBadge(cfg.package)}</td>
                      <td>
                        <span
                          className={`badge badge-sm badge-${
                            cfg.accountStatus === 'active' ? 'success' : 'danger'
                          }`}
                        >
                          {cfg.accountStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>
                            {enabledServicesCount} / {totalServicesCount}
                          </span>
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            Active
                          </span>
                        </div>
                      </td>
                      <td>
                        {hasMarketing ? (
                          <span className="badge badge-sm badge-success" style={{ fontWeight: 600 }}>
                            <Megaphone size={11} style={{ display: 'inline', marginRight: '4px' }} />
                            Live
                          </span>
                        ) : (
                          <span className="badge badge-sm badge-neutral">Disabled</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#574b4a' }}>
                          {cfg.assignedMarketingManager || '—'}
                        </div>
                      </td>
                      <td className="text-muted" style={{ fontSize: '12px' }}>
                        {new Date(cfg.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <div className="btn-group">
                          {/* Configure Services Button */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="Configure Independent Services"
                            onClick={() => setConfiguringSchool(cfg)}
                          >
                            <Sliders size={14} /> Services
                          </button>

                          {/* Switch Package Button */}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            title="Switch Service Package Template"
                            onClick={() => setChangingPackageSchool(cfg)}
                          >
                            <Package size={14} /> Plan
                          </button>

                          {/* Suspend / Activate Account */}
                          <button
                            type="button"
                            className={`btn btn-icon btn-sm ${isSuspended ? 'text-success' : 'text-danger'}`}
                            title={isSuspended ? 'Activate Account' : 'Suspend Account'}
                            onClick={() => handleToggleAccountStatus(cfg)}
                          >
                            {isSuspended ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>

                          {/* View Audit Trail */}
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            title="View School Entitlements Audit History"
                            onClick={() => setViewingAuditSchoolId(cfg.schoolId)}
                          >
                            <History size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configure Services Modal */}
      {configuringSchool && (
        <ConfigureServicesModal
          config={configuringSchool}
          currentUser={currentUser}
          onUpdate={loadConfigs}
          onClose={() => setConfiguringSchool(null)}
        />
      )}

      {/* Change Package Template Modal */}
      {changingPackageSchool && (
        <ChangePackageModal
          config={changingPackageSchool}
          currentUser={currentUser}
          onUpdate={loadConfigs}
          onClose={() => setChangingPackageSchool(null)}
        />
      )}

      {/* School Specific Audit Ledger Modal */}
      {viewingAuditSchoolId && (
        <AuditHistoryModal
          schoolId={viewingAuditSchoolId}
          onClose={() => setViewingAuditSchoolId(undefined)}
        />
      )}

      {/* System-wide Global Audit Ledger Modal */}
      {showGlobalAudit && (
        <AuditHistoryModal
          onClose={() => setShowGlobalAudit(false)}
        />
      )}
    </div>
  );
};

