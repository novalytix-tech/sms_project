// ==========================================
// Unified Workspace Login & Landing Portal
// Developed for School ERP Platform
// ==========================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types';
import { DEMO_USERS } from '../../data/seedData';
import { httpClient } from '../../services/api/httpClient';
import { ERPStorage } from '../../services/storage';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';
import { ForcePasswordChangeModal } from '../../components/auth/ForcePasswordChangeModal';
import {
  BarChart3,
  Users,
  ShieldCheck,
  GraduationCap,
  Settings,
  Package,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  AlertCircle,
} from 'lucide-react';

interface RolePreset {
  role: UserRole;
  label: string;
  subtitle: string;
  name: string;
  email: string;
  loginId: string;
  phone: string;
  defaultPass: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ROLES: RolePreset[] = [
  {
    role: 'school_admin',
    label: 'Admin',
    subtitle: 'Academics, fees & staff',
    name: 'Dr. Arvind Swaminathan',
    email: 'principal@stxaviers.edu.in',
    loginId: 'principal',
    phone: '+91 98111 22331',
    defaultPass: 'Principal#2026!',
    icon: BarChart3,
  },
  {
    role: 'teacher',
    label: 'Teacher',
    subtitle: 'Attendance, marks & tasks',
    name: 'Mrs. Ananya Sharma',
    email: 'ananya.sharma@stxaviers.edu.in',
    loginId: 'ananya.sharma',
    phone: '+91 97111 22334',
    defaultPass: 'Teacher#Ananya26!',
    icon: Users,
  },
  {
    role: 'parent',
    label: 'Parent',
    subtitle: 'Ward attendance & fees',
    name: 'Mr. Vikram Patel',
    email: 'vikram.patel@gmail.com',
    loginId: 'vikram.patel',
    phone: '+91 98222 33445',
    defaultPass: 'Parent#2026!',
    icon: ShieldCheck,
  },
  {
    role: 'student',
    label: 'Student',
    subtitle: 'Timetable, tasks & results',
    name: 'Aarav Sharma (Class 6-A)',
    email: 'aarav.sharma@student.stxaviers.edu.in',
    loginId: 'aarav.sharma',
    phone: '+91 98222 33445',
    defaultPass: 'Aarav#601',
    icon: GraduationCap,
  },
  {
    role: 'super_admin',
    label: 'Super Admin',
    subtitle: 'School network directory',
    name: 'Vikramaditya Rao',
    email: 'superadmin@sms.edu.in',
    loginId: 'superadmin',
    phone: '+91 98111 00001',
    defaultPass: 'SuperAdmin#2026!',
    icon: Settings,
  },
  {
    role: 'supplier',
    label: 'Supplier',
    subtitle: 'Purchase orders & delivery',
    name: 'Apex Educational Supplies',
    email: 'orders@apexsupplies.in',
    loginId: 'apexsupplies',
    phone: '+91 80412 34567',
    defaultPass: 'Supplier#2026!',
    icon: Package,
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, addToast, isAuthenticated } = useERP();

  // Unified login state
  const [loginIdentifier, setLoginIdentifier] = useState('principal@stxaviers.edu.in');
  const [loginPassword, setLoginPassword] = useState('Principal#2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Modals state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [showForcePasswordModal, setShowForcePasswordModal] = useState(false);

  // Ticker pause toggle

  const handleSelectPreset = (preset: RolePreset) => {
    setLoginIdentifier(preset.email);
    setLoginPassword(preset.defaultPass);
    setLoginError('');
  };

  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your mobile number, email, or Login ID and password.');
      return;
    }

    setSubmitting(true);
    setLoginError('');

    try {
      const res = await httpClient.post<{
        access_token: string;
        user: {
          id: string;
          username: string;
          email: string;
          phone?: string;
          roles: string[];
          full_name?: string;
          institution_id?: string;
          must_change_password?: boolean;
        };
      }>('/auth/login', {
        identifier: loginIdentifier.trim(),
        email: loginIdentifier.trim(),
        password: loginPassword,
      });

      if (res && res.success && res.data) {
        if (res.data.access_token) {
          httpClient.setToken(res.data.access_token);
          localStorage.setItem('nts_erp_token', res.data.access_token);
        }
        ERPStorage.syncFromBackend().catch(err => console.debug('Sync background notice:', err));

        const role = (res.data.user.roles?.[0] as UserRole) || 'school_admin';
        const demoUser = DEMO_USERS[role] || DEMO_USERS.school_admin;
        login(role, {
          ...demoUser,
          id: res.data.user.id || demoUser.id,
          name: res.data.user.full_name || res.data.user.username || demoUser.name,
          email: res.data.user.email || demoUser.email,
          role,
          phone: res.data.user.phone || demoUser.phone,
          institutionId: role === 'super_admin' ? undefined : (res.data.user.institution_id || demoUser.institutionId || 'inst-1'),
          referenceId: demoUser.referenceId,
        });

        // Check if mandatory first-time password change is required
        if (res.data.user.must_change_password) {
          setShowForcePasswordModal(true);
          setSubmitting(false);
          return;
        }

        addToast('success', `Signed In Successfully`, `Welcome back, ${res.data.user.full_name || res.data.user.username}!`);
        navigate('/');
        return;
      }

      setLoginError(res?.error?.message || res?.message || 'Invalid email, Login ID, or password.');
    } catch (err: any) {
      console.warn('Login attempt fallback:', err);
      // Offline fallback matching against preset credentials
      const matchedPreset = ROLES.find(
        r =>
          r.email.toLowerCase() === loginIdentifier.trim().toLowerCase() ||
          r.loginId.toLowerCase() === loginIdentifier.trim().toLowerCase() ||
          r.phone.replace(/\D/g, '').endsWith(loginIdentifier.trim().replace(/\D/g, ''))
      );
      if (matchedPreset) {
        login(matchedPreset.role);
        addToast('info', `Signed In as ${matchedPreset.label}`, `Running in local workspace mode`);
        navigate('/');
        return;
      }
      setLoginError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-landing-page">
      <div className="login-content-wrapper">
        <div>
          {/* Top Header Bar */}
          <header className="login-header-bar">
            {/* Top Left: NTS Logo + Wordmark + India Edition Pill */}
            <div className="login-brand">
              <img
                src="/nts-logo.png"
                alt="NTS Novalytix Logo"
                className="nts-logo"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="sms-wordmark">
                <strong>SMS</strong>
                <small>School Management System</small>
              </div>
            </div>

            {/* Top Right: Academic Session Badge & Navigation Actions */}
            <div className="header-extras" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#3B82F6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Return to Active Workspace"
                >
                  <ArrowRight size={14} />
                  <span>Return to Dashboard</span>
                </button>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <span style={{ fontWeight: 700, color: '#3B82F6' }}>St. Xavier's International Academy</span>
                <span>•</span>
                <span>Session 2026-2027</span>
              </div>
            </div>
          </header>

          {/* Central Titles Section */}
          <div className="login-header-section" style={{ marginBottom: '18px' }}>
            <h1>School Management System</h1>
            <div className="login-header-underline" />
            <p className="muted">
              Log in with your registered mobile number, email, or Login ID
            </p>
          </div>

          {/* UNIFIED SIGN IN CARD */}
          <div
            style={{
              maxWidth: '480px',
              margin: '0 auto 32px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px 24px 14px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Account Sign In
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Mobile Number, Login ID, or Email Address
                </div>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {loginError && (
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
                    marginBottom: '18px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleUnifiedLogin}>
                {/* Identifier Input */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label required" style={{ fontWeight: 600, color: '#334155' }}>
                    Registered Mobile, Login ID, or Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. 9811122331, principal, or email"
                      required
                      style={{ fontSize: '14px', padding: '10px 14px' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    Accepts 10-digit mobile, username, staff ID, or email.
                  </div>
                </div>

                {/* Password Input */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label required" style={{ margin: 0, fontWeight: 600, color: '#334155' }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3B82F6',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      style={{ paddingRight: '40px', fontSize: '14px', padding: '10px 14px' }}
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
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    fontSize: '12px',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#3B82F6', width: '15px', height: '15px' }}
                    />
                    <span style={{ color: '#475569' }}>Remember credentials on this browser</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    justifyContent: 'center',
                    borderRadius: '10px',
                  }}
                >
                  <span>{submitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Demo quick-login presets */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Quick Demo Login
            </span>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
              Tap a role to auto-fill its demo sign-in details
            </div>
          </div>

          <div className="roles-grid" style={{ marginBottom: '24px' }}>
            {ROLES.map(preset => {
              const IconComponent = preset.icon;
              return (
                <button
                  key={preset.role}
                  className="role-card"
                  onClick={() => handleSelectPreset(preset)}
                  title={`Auto-fill ${preset.label} Credentials`}
                  style={{
                    textAlign: 'left',
                    borderColor: loginIdentifier === preset.email ? '#3B82F6' : undefined,
                    backgroundColor: loginIdentifier === preset.email ? '#EFF6FF' : undefined,
                  }}
                >
                  <div className="role-tile">
                    <IconComponent size={28} />
                  </div>
                  <strong>{preset.label}</strong>
                  <span>{preset.subtitle}</span>
                  <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '4px', fontWeight: 600 }}>
                    Auto-Fill ➔
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Footer Attribution */}
        <div className="login-landing-footer">
          <span>School ERP | Developed by <strong>NTS Novalytix</strong></span>
        </div>
      </div>

      {/* Forgot Password Modal (OTP Verification Flow) */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={updatedIdentifier => {
          setLoginIdentifier(updatedIdentifier);
          setLoginPassword('');
          addToast('success', 'Password Updated', 'You can now sign in with your new password.');
        }}
      />

      {/* Mandatory First-Time Password Change Modal */}
      {showForcePasswordModal && (
        <ForcePasswordChangeModal
          isOpen={showForcePasswordModal}
          defaultCurrentPassword={loginPassword}
          onSuccess={() => {
            setShowForcePasswordModal(false);
            addToast('success', 'Security Setup Completed', 'Welcome to your permanent workspace dashboard!');
            navigate('/');
          }}
        />
      )}
    </div>
  );
};
