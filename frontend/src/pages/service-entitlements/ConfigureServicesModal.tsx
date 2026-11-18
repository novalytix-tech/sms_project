// ==========================================
// Configure School Service Entitlements Modal
// Developed by NTS Novalytix
// Independent Toggles with Consequential Alerts & Reason Prompts
// ==========================================

import React, { useState } from 'react';
import { SchoolServiceConfiguration, ServiceIdentifier } from '../../types/serviceEntitlement';
import { SERVICE_DEFINITIONS, serviceEntitlementService } from '../../services/serviceEntitlementService';
import { User } from '../../types';
import { Sliders, AlertTriangle, X } from 'lucide-react';

interface ConfigureServicesModalProps {
  config: SchoolServiceConfiguration;
  currentUser: User;
  onUpdate: () => void;
  onClose: () => void;
}

export const ConfigureServicesModal: React.FC<ConfigureServicesModalProps> = ({
  config,
  currentUser,
  onUpdate,
  onClose,
}) => {
  const [activeConfig, setActiveConfig] = useState<SchoolServiceConfiguration>(config);
  const [pendingToggle, setPendingToggle] = useState<{
    serviceId: ServiceIdentifier;
    targetState: boolean;
  } | null>(null);
  const [toggleReason, setToggleReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { key: 'core', label: 'Core Infrastructure' },
    { key: 'academic', label: 'Academic & Curriculum' },
    { key: 'operations', label: 'Campus Operations & Safety' },
    { key: 'marketing', label: 'Enrollment & Digital Marketing' },
    { key: 'finance', label: 'Finance & Accounts' },
    { key: 'admin', label: 'Administration & Reporting' },
  ];

  const handleToggleClick = (serviceId: ServiceIdentifier) => {
    const currentEnabled = activeConfig.entitlements[serviceId]?.enabled ?? false;
    const targetState = !currentEnabled;

    // Consequential prompt especially when turning off
    setPendingToggle({ serviceId, targetState });
    setToggleReason('');
    setError(null);
  };

  const handleConfirmToggle = () => {
    if (!pendingToggle) return;
    setError(null);

    const def = SERVICE_DEFINITIONS[pendingToggle.serviceId];

    // Require reason if disabling a core or major service
    if (!pendingToggle.targetState && !toggleReason.trim()) {
      setError(`A reason is required when disabling "${def.name}".`);
      return;
    }

    try {
      const updated = serviceEntitlementService.toggleService(
        activeConfig.schoolId,
        pendingToggle.serviceId,
        pendingToggle.targetState,
        currentUser,
        toggleReason.trim()
      );

      setActiveConfig(updated);
      setPendingToggle(null);
      setToggleReason('');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update service entitlement.');
    }
  };

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal-content qp-inspector-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="qp-modal-header">
          <div className="qp-modal-title-group">
            <Sliders size={22} className="text-primary" />
            <div>
              <h3>Service Entitlements Configuration</h3>
              <p className="qp-modal-sub">
                School: <strong>{activeConfig.schoolName}</strong> (ID: {activeConfig.schoolId}) • Plan:{' '}
                <span className="badge badge-neutral">{activeConfig.package.replace(/_/g, ' ').toUpperCase()}</span>
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="qp-modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* Pending Toggle Confirmation Callout */}
          {pendingToggle && (
            <div
              style={{
                background: pendingToggle.targetState ? '#eef8f2' : '#fee2e2',
                border: `1px solid ${pendingToggle.targetState ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: pendingToggle.targetState ? '#166534' : '#991b1b', marginBottom: '6px' }}>
                <AlertTriangle size={18} />
                <span>
                  Confirm {pendingToggle.targetState ? 'Activation' : 'Disabling'}: {SERVICE_DEFINITIONS[pendingToggle.serviceId].name}
                </span>
              </div>

              <p style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#333' }}>
                {pendingToggle.targetState
                  ? `Enabling this service will immediately grant authorized school users access to its features and navigation.`
                  : SERVICE_DEFINITIONS[pendingToggle.serviceId].consequentialImpact}
              </p>

              {!pendingToggle.targetState && (
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    Mandatory Justification / Contract Note *
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Service contract opted out, seasonal pause, subscription downgrade..."
                    value={toggleReason}
                    onChange={(e) => setToggleReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPendingToggle(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${pendingToggle.targetState ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleConfirmToggle}
                >
                  Confirm {pendingToggle.targetState ? 'Enable Service' : 'Disable Service'}
                </button>
              </div>
            </div>
          )}

          {/* Service Categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {categories.map((cat) => {
              const catServices = Object.values(SERVICE_DEFINITIONS).filter((s) => s.category === cat.key);
              if (catServices.length === 0) return null;

              return (
                <div key={cat.key} className="card" style={{ padding: '16px', background: '#ffffff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717a', marginBottom: '12px' }}>
                    {cat.label}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {catServices.map((service) => {
                      const entitlement = activeConfig.entitlements[service.id];
                      const isEnabled = entitlement?.enabled ?? false;

                      return (
                        <div
                          key={service.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            background: isEnabled ? '#F6F8FC' : '#fafafa',
                            border: `1px solid ${isEnabled ? '#ebdcdc' : '#e5e5e5'}`,
                            borderRadius: '6px',
                            gap: '16px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px', color: isEnabled ? '#19191f' : '#71717a' }}>
                                {service.name}
                              </strong>
                              {service.isCore && (
                                <span className="badge badge-sm badge-info">Core Anchor</span>
                              )}
                              <span className={`badge badge-sm badge-${isEnabled ? 'success' : 'neutral'}`}>
                                {isEnabled ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#71717a' }}>
                              {service.description}
                            </p>
                            {entitlement?.reason && (
                              <div style={{ fontSize: '11px', color: '#98440e', marginTop: '2px', fontStyle: 'italic' }}>
                                Reason: "{entitlement.reason}"
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${isEnabled ? 'btn-outline text-danger' : 'btn-primary'}`}
                              onClick={() => handleToggleClick(service.id)}
                            >
                              {isEnabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="qp-modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

