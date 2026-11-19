import React from 'react';
import { Navigate } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import { useERP } from '../../context/ERPContext';

/**
 * Accepting a school invitation. The invitation email links here with a Clerk ticket;
 * the person sets their own password. Public sign-up is restricted in Clerk, so this
 * page only works for people the school invited.
 */
export const SignUpPage: React.FC = () => {
  const { authStatus } = useERP();

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
      <SignUp routing="path" path="/sign-up" signInUrl="/login" fallbackRedirectUrl="/" />
    </div>
  );
};

export default SignUpPage;
