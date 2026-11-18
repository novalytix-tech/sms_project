// ==========================================
// About Software Information Page
// Clean, User-Centric Application Overview
// ==========================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { ShieldCheck, Mail, Phone, Clock } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { currentRole, schoolSettings } = useERP();

  // Role guard: Only Super Admin and School Admin can access About Software
  if (currentRole !== 'super_admin' && currentRole !== 'school_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Clean Page Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-title-group">
          <h1>About Software</h1>
          <p className="page-subtitle">Application version and institutional support information</p>
        </div>
        <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 600 }}>
          Version 1.0.0
        </div>
      </div>

      <div className="responsive-cards-grid">
        {/* Application Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <ShieldCheck size={18} color="#3B82F6" />
              Application Details
            </h2>
          </div>
          <div className="card-body">
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5e4e0', paddingBottom: '6px' }}>
                <span style={{ color: '#19191f', fontWeight: 600 }}>Application Name</span>
                <span>School Management System (SMS)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5e4e0', paddingBottom: '6px' }}>
                <span style={{ color: '#19191f', fontWeight: 600 }}>Version</span>
                <span>1.0.0 (Enterprise Edition)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5e4e0', paddingBottom: '6px' }}>
                <span style={{ color: '#19191f', fontWeight: 600 }}>Active Session</span>
                <span>{schoolSettings.academicYear}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5e4e0', paddingBottom: '6px' }}>
                <span style={{ color: '#19191f', fontWeight: 600 }}>Institution</span>
                <span>{schoolSettings.schoolName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#19191f', fontWeight: 600 }}>Affiliation</span>
                <span>{schoolSettings.schoolBoard}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Contact */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Mail size={18} color="#3B82F6" />
              Technical Support
            </h2>
          </div>
          <div className="card-body">
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={15} color="#3B82F6" />
                <span>support@novalytix.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={15} color="#3B82F6" />
                <span>Helpdesk: +91 (080) 4123-8890</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} color="#3B82F6" />
                <span>Support Hours: Mon – Fri, 9:00 AM – 6:00 PM IST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
