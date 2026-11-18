// ==========================================
// Credential Delivery Modal
// Allows Admin to securely view and dispatch Login ID & Temporary Password
// ==========================================

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Copy, Check, Mail, Smartphone, ShieldAlert, Eye, EyeOff, UserCheck } from 'lucide-react';

interface CredentialDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  role: string;
  loginId: string;
  temporaryPassword: string;
  phone?: string;
  email?: string;
  onSendSMS?: () => void;
  onSendEmail?: () => void;
}

export const CredentialDeliveryModal: React.FC<CredentialDeliveryModalProps> = ({
  isOpen,
  onClose,
  personName,
  role,
  loginId,
  temporaryPassword,
  phone = '+91 98222 33445',
  email = 'user@stxaviers.edu.in',
  onSendSMS,
  onSendEmail,
}) => {
  const [showPassword, setShowPassword] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(loginId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyPass = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleCopyAll = () => {
    const text = `School ERP Login Credentials\nName: ${personName}\nRole: ${role.toUpperCase()}\nLogin ID: ${loginId}\nTemporary Password: ${temporaryPassword}\nPortal URL: http://localhost:5173/login\nNote: You will be required to change your temporary password upon first login.`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDispatchSMS = () => {
    setSmsSent(true);
    if (onSendSMS) onSendSMS();
    setTimeout(() => setSmsSent(false), 4000);
  };

  const handleDispatchEmail = () => {
    setEmailSent(true);
    if (onSendEmail) onSendEmail();
    setTimeout(() => setEmailSent(false), 4000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Account & Login Credentials"
      size="normal"
    >
      <div style={{ padding: '4px' }}>
        {/* Person Summary Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #CCFBF1',
            borderRadius: '10px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 600,
              }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#0F172A' }}>
                {personName}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Registered User Account
              </div>
            </div>
          </div>
          <Badge status="active" label={role.toUpperCase()} />
        </div>

        {/* Credentials Box */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '18px',
          }}
        >
          {/* Login ID Row */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
              Unique Login ID (Username / ID)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={loginId}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#0F172A',
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyId}
                title="Copy Login ID"
              >
                {copiedId ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copiedId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Temporary Password Row */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
              Temporary Password (Auto-Generated)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  readOnly
                  value={temporaryPassword}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '8px 36px 8px 12px',
                    color: '#0F172A',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyPass}
                title="Copy Password"
              >
                {copiedPass ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copiedPass ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Registered Contact Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
            <div>
              <span style={{ color: '#64748B' }}>Registered Mobile:</span>{' '}
              <strong style={{ color: '#0F172A' }}>{phone}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Registered Email:</span>{' '}
              <strong style={{ color: '#0F172A' }}>{email}</strong>
            </div>
          </div>
        </div>

        {/* Security Alert: First-Time Login Change Required */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#92400E',
            marginBottom: '18px',
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '1px', color: '#D97706' }} />
          <div>
            <strong>Mandatory First-Time Password Change:</strong> When this user logs in with this temporary password, the system will immediately require them to create a new, private password before accessing their dashboard.
          </div>
        </div>

        {/* Credential Delivery Dispatch Options */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            Deliver Credentials to User:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'center', borderColor: smsSent ? '#10B981' : undefined }}
              onClick={handleDispatchSMS}
            >
              {smsSent ? <Check size={15} color="#10B981" /> : <Smartphone size={15} />}
              <span>{smsSent ? 'SMS Dispatched!' : 'Send via SMS (Mobile)'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'center', borderColor: emailSent ? '#10B981' : undefined }}
              onClick={handleDispatchEmail}
            >
              {emailSent ? <Check size={15} color="#10B981" /> : <Mail size={15} />}
              <span>{emailSent ? 'Email Dispatched!' : 'Send via Email (Gmail)'}</span>
            </button>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyAll}
          >
            {copiedAll ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
            <span>{copiedAll ? 'All Details Copied' : 'Copy All Credentials'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            Done & Save
          </button>
        </div>
      </div>
    </Modal>
  );
};
