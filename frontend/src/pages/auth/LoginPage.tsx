import React from 'react';
import { Navigate } from 'react-router-dom';
import { SignIn } from '@clerk/react';
import { useERP } from '../../context/ERPContext';

/**
 * Sign-in is fully handled by Clerk (passwords, passkeys, MFA, password reset).
 * Public sign-up is disabled: accounts are created by the school and the user
 * receives a Clerk invitation email.
 */
export const LoginPage: React.FC = () => {
  const { authStatus, authError, logout } = useERP();

  if (authStatus === 'ready') {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 16,
        background: 'var(--bg-secondary, #f8fafc)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/nts-logo.png" alt="" width={44} height={44} />
        <h1 style={{ fontSize: 22, margin: 0 }}>School ERP</h1>
      </div>

      {authStatus === 'error' ? (
        <div className="card" style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>Access not available</h2>
          <p style={{ color: 'var(--text-secondary, #475569)' }}>{authError}</p>
          <button className="btn btn-primary" onClick={logout}>
            Sign out
          </button>
        </div>
      ) : authStatus === 'signed_out' ? (
        <SignIn routing="path" path="/login" withSignUp={false} fallbackRedirectUrl="/" />
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
};

export default LoginPage;
