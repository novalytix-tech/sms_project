// ==========================================
// Demo Role Switcher Top Banner
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types';
import { ShieldCheck, RotateCcw, Download } from 'lucide-react';

const ROLES: Array<{ role: UserRole; label: string; persona: string }> = [
  { role: 'super_admin', label: 'Super Admin', persona: 'Multi-School ERP' },
  { role: 'school_admin', label: 'School Admin', persona: 'Principal Swaminathan' },
  { role: 'teacher', label: 'Teacher', persona: 'Mrs. Ananya Sharma' },
  { role: 'parent', label: 'Parent', persona: 'Mr. Vikram Patel' },
  { role: 'student', label: 'Student', persona: 'Aarav Patel' },
  { role: 'supplier', label: 'Supplier', persona: 'Apex Supplies' },
];

export const DemoRoleBanner: React.FC = () => {
  const { currentRole, switchRole, resetToDemoData, exportBackup, addToast } = useERP();

  return (
    <div className="demo-role-banner no-print">
      <div className="demo-role-label">
        <span className="demo-badge">Demo Mode</span>
        <ShieldCheck size={14} color="#3B82F6" />
        <span>Role Persona:</span>
      </div>

      <div className="role-switcher-chips">
        {ROLES.map(r => {
          const isActive = currentRole === r.role;
          return (
            <button
              key={r.role}
              className={`role-chip ${isActive ? 'active' : ''}`}
              onClick={() => {
                switchRole(r.role);
                addToast('info', `Switched to ${r.label}`, `Viewing system from persona of ${r.persona}`);
              }}
              title={`Switch role to ${r.label} (${r.persona})`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={exportBackup}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#71717a',
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
          }}
          title="Download JSON Backup"
        >
          <Download size={12} />
          <span>Backup</span>
        </button>

        <button
          onClick={() => {
            if (window.confirm('Reset all demo data back to clean factory default state?')) {
              resetToDemoData();
              addToast('success', 'Demo Data Reset', 'All records have been restored to initial sample state.');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#a51d29',
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '8px',
            background: '#DBEAFE',
            border: '1px solid #fecaca',
            cursor: 'pointer',
          }}
          title="Reset LocalStorage to Original Seed Data"
        >
          <RotateCcw size={12} />
          <span>Reset Data</span>
        </button>
      </div>
    </div>
  );
};

