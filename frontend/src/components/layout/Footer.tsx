// ==========================================
// Application Footer Component
// Developed by NTS Novalytix
// ==========================================

import React from 'react';

import { useERP } from '../../context/ERPContext';

export const Footer: React.FC = () => {
  const { schoolSettings } = useERP();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer no-print">
      <div className="footer-attribution">
        <span>© {currentYear}</span>
        <strong>{schoolSettings.schoolName}</strong>
        <span>•</span>
        <span>Academic Session {schoolSettings.academicYear}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '11px', color: '#71717a' }}>Version 1.0</span>
      </div>
    </footer>
  );
};

