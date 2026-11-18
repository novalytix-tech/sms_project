// ==========================================
// Service Disabled & Entitlement Screen
// Developed by NTS Novalytix
// Informative feedback for non-entitled school features
// ==========================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ServiceIdentifier } from '../../types/serviceEntitlement';
import { SERVICE_DEFINITIONS, serviceEntitlementService } from '../../services/serviceEntitlementService';
import { digitalMarketingService } from '../../services/digitalMarketingService';
import { Lock, ArrowLeft, ExternalLink, AlertTriangle, HelpCircle } from 'lucide-react';

interface ServiceDisabledScreenProps {
  schoolId: string;
  serviceId: ServiceIdentifier;
  customMessage?: string;
}

export const ServiceDisabledScreen: React.FC<ServiceDisabledScreenProps> = ({
  schoolId,
  serviceId,
  customMessage,
}) => {
  const navigate = useNavigate();
  const def = SERVICE_DEFINITIONS[serviceId];
  const config = serviceEntitlementService.getConfigBySchoolId(schoolId);
  const entitlement = config?.entitlements[serviceId];

  const isMarketing = serviceId === 'digital_marketing';
  const externalChecklist = isMarketing
    ? digitalMarketingService.getExternalAdChecklist(schoolId)
    : [];

  return (
    <div className="qp-page-container" style={{ padding: '40px 20px', maxWidth: '850px' }}>
      <div className="card" style={{ padding: '36px', textAlign: 'center', borderTop: '4px solid #3B82F6' }}>
        <div style={{ display: 'inline-flex', padding: '16px', background: '#DBEAFE', borderRadius: '50%', marginBottom: '16px' }}>
          <Lock size={44} color="#3B82F6" />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: '#19191f' }}>
          Service Entitlement Not Active: {def?.name || serviceId}
        </h2>

        <p style={{ fontSize: '14px', color: '#71717a', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
          {customMessage ||
            `Access to "${def?.name || serviceId}" is currently disabled for ${
              config?.schoolName || 'your school'
            } (ID: ${schoolId}) under the ${config?.package ? config.package.replace(/_/g, ' ').toUpperCase() : 'current'} subscription plan.`}
        </p>

        {entitlement?.reason && (
          <div
            style={{
              background: '#F6F8FC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '12px 18px',
              maxWidth: '600px',
              margin: '0 auto 24px auto',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            <strong>Recorded Entitlement Note:</strong>
            <p style={{ margin: '4px 0 0 0', color: '#574b4a' }}>"{entitlement.reason}"</p>
          </div>
        )}

        {/* Advisory for Digital Marketing deactivation */}
        {isMarketing && (
          <div
            style={{
              background: '#fff8eb',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '18px',
              textAlign: 'left',
              margin: '0 auto 24px auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#98440e', fontWeight: 700, marginBottom: '8px' }}>
              <AlertTriangle size={18} />
              <span>External Live Ad Operations Advisory</span>
            </div>
            <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 12px 0', lineHeight: '1.4' }}>
              <strong>Important:</strong> Disabling Digital Marketing in the ERP halts portal management, inquiry ingestion, and reports. However, it <em>does not automatically stop live billing</em> on external ad platforms (Google Ads / Meta Ads Manager).
            </p>

            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {externalChecklist.map((item) => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <span style={{ fontWeight: 700, color: '#98440e' }}>Step {item.step}:</span>
                  <div style={{ flex: 1 }}>
                    <strong>{item.channel}</strong> — {item.instruction}
                  </div>
                  {item.directLink && (
                    <a
                      href={item.directLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Console <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => alert(`To activate this service for ${config?.schoolName || schoolId}, please contact the Super Administrator (superadmin@novalytix.com) or submit an upgrade request.`)}
          >
            <HelpCircle size={16} /> Request Service Activation
          </button>
        </div>
      </div>
    </div>
  );
};

