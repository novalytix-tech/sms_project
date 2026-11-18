// ==========================================
// Forgot Password & Mobile OTP Verification Modal
// Developed for School ERP Platform
// ==========================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { accountService, OTPRequestResult } from '../../services/accountService';
import { Smartphone, KeyRound, ShieldCheck, CheckCircle, AlertTriangle, Eye, EyeOff, BellRing } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedEmailOrLoginId: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Wizard steps: 'request' | 'verify' | 'new_password' | 'done'
  const [step, setStep] = useState<'request' | 'verify' | 'new_password' | 'done'>('request');

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2 State
  const [otpResult, setOtpResult] = useState<OTPRequestResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resetToken, setResetToken] = useState('');

  // Step 3 State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Timer effect for 60s cooldown
  useEffect(() => {
    let timer: any = null;
    if (step === 'verify' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleResetState = () => {
    setStep('request');
    setIdentifier('');
    setError('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpResult(null);
    setResetToken('');
    setCountdown(60);
    setCanResend(false);
    setResendCount(0);
  };

  const handleClose = () => {
    handleResetState();
    onClose();
  };

  // Step 1: Send OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('Please enter your registered mobile number, email, or Login ID.');
      return;
    }

    setLoading(true);
    const res = await accountService.requestOTP(identifier.trim(), 'sms');
    setLoading(false);

    if (res.success && res.data) {
      setOtpResult(res.data);
      setStep('verify');
      setCountdown(60);
      setCanResend(false);
    } else {
      setError(res.error || 'Failed to dispatch verification code.');
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend || resendCount >= 3) return;
    setError('');
    setLoading(true);
    const res = await accountService.requestOTP(identifier.trim(), 'sms');
    setLoading(false);
    if (res.success && res.data) {
      setOtpResult(res.data);
      setCountdown(60);
      setCanResend(false);
      setResendCount(prev => prev + 1);
    } else {
      setError(res.error || 'Failed to resend code.');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setLoading(true);
    const res = await accountService.verifyOTP(otpResult?.session_id || '', otpCode.trim());
    setLoading(false);

    if (res.success && res.resetToken) {
      setResetToken(res.resetToken);
      setStep('new_password');
    } else {
      setError(res.error || 'Incorrect OTP code.');
    }
  };

  // Step 3: Set New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long with letters and numbers.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    const res = await accountService.resetPasswordWithOTP(resetToken, newPassword, confirmPassword);
    setLoading(false);

    if (res.success) {
      setStep('done');
    } else {
      setError(res.error || 'Failed to update password.');
    }
  };

  const handleFinishAndLogin = () => {
    onSuccess(identifier.trim());
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Password via Mobile OTP"
      size="normal"
    >
      <div style={{ padding: '6px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Mobile / Identifier */}
        {step === 'request' && (
          <form onSubmit={handleRequestOTP}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Smartphone size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                Forgot Your Password?
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                Enter your registered mobile number or Login ID. We will send a secure 6-digit OTP verification code via SMS.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label required" style={{ fontWeight: 600 }}>
                Registered Mobile Number (or Login ID / Email)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 9811122331, principal, or email"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoFocus
                required
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                💡 Mobile numbers with or without +91 (e.g. 9822233445) are automatically recognized.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Verify 6-Digit OTP */}
        {step === 'verify' && otpResult && (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <KeyRound size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                Verify 6-Digit OTP
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B' }}>
                Verification code sent to registered mobile{' '}
                <strong style={{ color: '#0F172A' }}>{otpResult.masked_phone}</strong>
              </p>
            </div>

            {/* Simulated SMS Alert Banner for Instant Testing */}
            {otpResult.simulated_sms && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  <BellRing size={14} color="#3B82F6" />
                  <span>Incoming SMS Preview (Device Simulation)</span>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginBottom: '6px' }}>
                  "{otpResult.simulated_sms}"
                </div>
                {otpResult.debug_otp && (
                  <button
                    type="button"
                    style={{
                      fontSize: '11px',
                      color: '#3B82F6',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    onClick={() => setOtpCode(otpResult.debug_otp!)}
                  >
                    Quick Auto-Fill Code ({otpResult.debug_otp})
                  </button>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label required" style={{ textAlign: 'center', display: 'block', fontWeight: 600 }}>
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                className="form-input"
                maxLength={6}
                placeholder="• • • • • •"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  fontSize: '24px',
                  letterSpacing: '10px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
                autoFocus
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '8px' }}>
                <span style={{ color: '#64748B' }}>Valid for 10 minutes</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3B82F6',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Resend OTP
                  </button>
                ) : (
                  <span style={{ color: '#94A3B8' }}>Resend in {countdown}s</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('request')}
              >
                Change Number
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || otpCode.length < 6}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Create New Password */}
        {step === 'new_password' && (
          <form onSubmit={handleUpdatePassword}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: '#3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                Set New Password
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B' }}>
                Create a strong, private password for your account.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label required">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ paddingRight: '36px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label required">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success Complete */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle size={36} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
              Password Reset Complete!
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              Your account password has been updated securely. You can now login using your mobile number or Login ID and your new password.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '15px' }}
              onClick={handleFinishAndLogin}
            >
              Proceed to Sign In
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
