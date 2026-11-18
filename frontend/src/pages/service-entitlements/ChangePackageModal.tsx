// ==========================================
// Change School Service Package Template Modal
// Developed by NTS Novalytix
// Live Entitlement Delta Previews & Safe Transitions
// ==========================================

import React, { useState, useMemo } from 'react';
import { SchoolServiceConfiguration, ServicePackageTemplate } from '../../types/serviceEntitlement';
import { PACKAGE_TEMPLATES, SERVICE_DEFINITIONS, serviceEntitlementService } from '../../services/serviceEntitlementService';
import { User } from '../../types';
import { Package, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface ChangePackageModalProps {
  config: SchoolServiceConfiguration;
  currentUser: User;
  onUpdate: () => void;
  onClose: () => void;
}

export const ChangePackageModal: React.FC<ChangePackageModalProps> = ({
  config,
  currentUser,
  onUpdate,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ServicePackageTemplate>(config.package);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Calculate live delta preview
  const preview = useMemo(() => {
    return serviceEntitlementService.previewPackageChange(config.schoolId, selectedTemplate);
  }, [config.schoolId, selectedTemplate]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedTemplate === config.package) {
      onClose();
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason or contract reference for changing the service package.');
      return;
    }

    try {
      serviceEntitlementService.switchPackage(
        config.schoolId,
        selectedTemplate,
        currentUser,
        reason.trim()
      );
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch service package.');
    }
  };

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal-content qp-create-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qp-modal-header">
          <div className="qp-modal-title-group">
            <Package size={22} className="text-primary" />
            <div>
              <h3>Switch Service Package Template</h3>
              <p className="qp-modal-sub">
                School: <strong>{config.schoolName}</strong> (ID: {config.schoolId}) • Current:{' '}
                <strong>{PACKAGE_TEMPLATES[config.package]?.name || config.package}</strong>
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleApply}>
          <div className="qp-modal-body">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {/* Template Selector Cards */}
            <div className="form-group">
              <label className="form-label">Select Standard Service Package Template *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '6px' }}>
                {(Object.keys(PACKAGE_TEMPLATES) as ServicePackageTemplate[]).map((tplKey) => {
                  const tpl = PACKAGE_TEMPLATES[tplKey];
                  const isSelected = selectedTemplate === tplKey;
                  const isCurrent = config.package === tplKey;

                  return (
                    <div
                      key={tplKey}
                      onClick={() => setSelectedTemplate(tplKey)}
                      style={{
                        border: `2px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                        background: isSelected ? '#DBEAFE' : '#ffffff',
                        borderRadius: '8px',
                        padding: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '14px', color: '#19191f' }}>{tpl.name}</strong>
                        {isCurrent && <span className="badge badge-sm badge-neutral">Current</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: '#71717a', margin: 0, lineHeight: '1.4' }}>
                        {tpl.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consequential Live Change Preview */}
            <div
              className="card"
              style={{
                background: '#faf6f5',
                border: '1px solid #ebdcdc',
                padding: '16px',
                margin: '16px 0',
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#574b4a' }}>
                Consequential Package Delta Preview
              </h4>

              {preview.enabledServices.length === 0 && preview.disabledServices.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#71717a' }}>
                  No service changes will occur. The selected template matches the current active state.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {preview.enabledServices.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span className="badge badge-sm badge-success" style={{ flexShrink: 0, marginTop: '2px' }}>
                        + Enabling ({preview.enabledServices.length})
                      </span>
                      <div style={{ fontSize: '12px', color: '#166534' }}>
                        {preview.enabledServices.map((s) => SERVICE_DEFINITIONS[s]?.name || s).join(', ')}
                      </div>
                    </div>
                  )}

                  {preview.disabledServices.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span className="badge badge-sm badge-danger" style={{ flexShrink: 0, marginTop: '2px' }}>
                        - Disabling ({preview.disabledServices.length})
                      </span>
                      <div style={{ fontSize: '12px', color: '#991b1b' }}>
                        {preview.disabledServices.map((s) => SERVICE_DEFINITIONS[s]?.name || s).join(', ')}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '6px' }}>
                    <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Existing student, exam, financial, and digital marketing records will remain completely intact.
                  </div>
                </div>
              )}
            </div>

            {/* Mandatory Reason Input */}
            <div className="form-group">
              <label className="form-label">Mandatory Subscription Justification / Notes *</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Upgraded to full digital marketing suite per 2026-2027 contract renewal..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required={selectedTemplate !== config.package}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="qp-modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={selectedTemplate === config.package && !reason}
            >
              Apply Package Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

