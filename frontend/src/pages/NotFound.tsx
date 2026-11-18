// ==========================================
// 404 Not Found Page
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          fontSize: '72px',
          fontWeight: 900,
          color: '#3B82F6',
          lineHeight: 1,
          marginBottom: '12px',
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#19191f', marginBottom: '8px' }}>
        Page Not Found
      </h1>
      <p style={{ fontSize: '14px', color: '#71717a', maxWidth: '420px', marginBottom: '24px' }}>
        The requested ERP section or route does not exist. Please check the URL or return to your dashboard.
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Go Back</span>
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Home size={16} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

