// ==========================================
// Service Entitlements Audit History Modal
// Developed by NTS Novalytix
// Immutable Timeline of Service Changes & Package Switches
// ==========================================

import React, { useMemo } from 'react';
import { serviceEntitlementService } from '../../services/serviceEntitlementService';
import { SERVICE_DEFINITIONS } from '../../services/serviceEntitlementService';
import { History, Clock, X } from 'lucide-react';

interface AuditHistoryModalProps {
  schoolId?: string;
  onClose: () => void;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({ schoolId, onClose }) => {
  const logs = useMemo(() => {
    return serviceEntitlementService.getAuditLogs(schoolId);
  }, [schoolId]);

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal-content qp-version-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qp-modal-header">
          <div className="qp-modal-title-group">
            <History size={22} className="text-primary" />
            <div>
              <h3>Service Entitlements Audit Ledger</h3>
              <p className="qp-modal-sub">
                {schoolId
                  ? `Filtering history for school ID: "${schoolId}"`
                  : 'System-wide record of all service modifications and package template switches.'}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="qp-modal-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div className="qp-empty-state">
              <History size={40} className="qp-empty-icon" />
              <h3>No Service Changes Recorded</h3>
              <p>All school service entitlements remain in their baseline provisioned state.</p>
            </div>
          ) : (
            <div className="qp-audit-timeline">
              {logs.map((log) => (
                <div key={log.id} className="qp-audit-entry">
                  <div className="qp-audit-marker" />
                  <div className="qp-audit-content">
                    <div className="qp-audit-top">
                      <span className="qp-audit-action-badge">
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '13px', marginLeft: '6px' }}>{log.schoolName}</strong>
                      <span className="qp-audit-time">
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="qp-audit-actor">
                      Modified by: <strong>{log.actorName}</strong> ({log.actorRole})
                    </div>

                    <div className="qp-audit-details">
                      {log.serviceId && (
                        <span>
                          Service: <strong>{SERVICE_DEFINITIONS[log.serviceId]?.name || log.serviceId}</strong> •{' '}
                        </span>
                      )}
                      Transition: <span className="badge badge-sm badge-neutral">{log.previousValue}</span> →{' '}
                      <span className="badge badge-sm badge-success">{log.newValue}</span>
                    </div>

                    {log.reason && (
                      <div className="qp-audit-reason">
                        <em>Reason:</em> "{log.reason}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="qp-modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};

