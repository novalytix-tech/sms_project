// ==========================================
// Toast Notification Container Component
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useERP } from '../../context/ERPContext';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useERP();

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 10050,
        maxWidth: '380px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => {
        let bg = '#FFFFFF';
        let borderColor = '#E2E8F0';
        let icon = <Info size={18} color="#3B82F6" />;

        if (t.type === 'success') {
          borderColor = '#16A34A';
          icon = <CheckCircle size={18} color="#16A34A" />;
        } else if (t.type === 'error') {
          borderColor = '#DC2626';
          icon = <AlertCircle size={18} color="#DC2626" />;
        } else if (t.type === 'warning') {
          borderColor = '#D97706';
          icon = <AlertTriangle size={18} color="#D97706" />;
        }

        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              background: bg,
              border: `1px solid ${borderColor}`,
              borderLeft: `5px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div style={{ marginTop: '2px', flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#172033' }}>{t.title}</div>
              {t.message && (
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                color: '#94A3B8',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

