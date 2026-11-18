// ==========================================
// Mandatory First-Time Password Change Modal
// Prompts users with temporary credentials to set a private password
// ==========================================

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { accountService } from '../../services/accountService';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  defaultCurrentPassword?: string;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  isOpen,
  onSuccess,
  defaultCurrentPassword = '',
}) => {
  const [currentPassword, setCurrentPassword] = useState(defaultCurrentPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword.trim()) {
      setError('Current temporary password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as your temporary password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    const res = await accountService.firstLoginChangePassword(
      currentPassword.trim(),
      newPassword,
      confirmPassword
    );
    setLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to update temporary password.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Non-dismissible: user must change password to proceed
      title="First-Time Login Security Setup"
      size="normal"
    >
      <div style={{ padding: '6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '8px',
            marginBottom: '18px',
          }}
        >
          <ShieldAlert size={22} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#92400E', marginBottom: '2px' }}>
              Temporary Password Detected
            </div>
            <div style={{ fontSize: '12px', color: '#B45309', lineHeight: '1.4' }}>
              You are logging in with temporary credentials issued by the school. Please choose a permanent, private password before entering your dashboard.
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Current Temporary Password */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label required">Current Temporary Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter the temporary password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                style={{ paddingRight: '36px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Permanent Password */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label required">New Private Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                className="form-input"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ paddingRight: '36px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Use at least 8 characters including letters and numbers.
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label className="form-label required">Confirm New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-type new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 600 }}
            disabled={loading}
          >
            {loading ? 'Securing Account...' : 'Set Permanent Password & Enter Dashboard'}
          </button>
        </form>
      </div>
    </Modal>
  );
};
