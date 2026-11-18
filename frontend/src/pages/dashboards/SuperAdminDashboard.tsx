// ==========================================
// Super Administrator Dashboard (Simplified & Clean)
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useEffect } from 'react';
import { institutionService } from '../../services/institutionService';
import { Institution } from '../../types';
import { Badge } from '../../components/common/Badge';
import { DashboardWelcomeSection } from '../../components/dashboard/DashboardWelcomeSection';
import { QuickActions, QuickAction } from '../../components/dashboard/QuickActions';
import { useERP } from '../../context/ERPContext';
import { Building2, Users, Briefcase, ShieldCheck, Search, Power, Layers, BarChart3, Megaphone, Settings, Info } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { addToast } = useERP();

  const [institutions, setInstitutions] = useState<Institution[]>(() => institutionService.getAll());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleUpdate = () => {
      setInstitutions(institutionService.getAll());
    };
    window.addEventListener('nts_erp_storage_updated', handleUpdate);
    return () => {
      window.removeEventListener('nts_erp_storage_updated', handleUpdate);
    };
  }, []);

  const totalSchools = institutions.length;
  const activeSchools = institutions.filter(i => i.status === 'active').length;
  const totalStudentsEnrolled = institutions.reduce((acc, i) => acc + (Number(i.studentCount) || 1250), 0);
  const totalTeachersEmployed = institutions.reduce((acc, i) => acc + (Number(i.teacherCount) || 78), 0);

  const filteredSchools = institutions.filter(
    i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.city.toLowerCase().includes(search.toLowerCase()) ||
      i.board.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = (id: string, name: string) => {
    const updated = institutionService.toggleStatus(id);
    if (updated) {
      setInstitutions(institutionService.getAll());
      addToast(
        'info',
        'Institution Status Updated',
        `${name} is now ${updated.status.toUpperCase()}`
      );
    }
  };

  const quickActions: QuickAction[] = [
    { label: 'Institutions', icon: Building2, to: '/institutions' },
    { label: 'Service Entitlements', icon: Layers, to: '/service-entitlements' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
    { label: 'Marketing', icon: Megaphone, to: '/digital-marketing' },
    { label: 'Settings', icon: Settings, to: '/settings' },
    { label: 'About', icon: Info, to: '/about' },
  ];

  return (
    <div>
      {/* Notice Ticker & Welcome Banner */}
      <DashboardWelcomeSection
        eyebrow="SUPER ADMIN DASHBOARD"
        subtitle="Multi-School Network Directory & System Administration"
      />

      {/* Quick Action Shortcuts */}
      <QuickActions actions={quickActions} />

      {/* Four Essential Summary KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Registered Schools</span>
            <span className="stat-value">{totalSchools}</span>
            <span className="stat-subtext positive">{activeSchools} Active Subscriptions</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Building2 size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Network Students</span>
            <span className="stat-value">{totalStudentsEnrolled.toLocaleString('en-IN')}</span>
            <span className="stat-subtext">Across all member schools</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <Users size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Teaching Faculty</span>
            <span className="stat-value">{totalTeachersEmployed.toLocaleString('en-IN')}</span>
            <span className="stat-subtext">Verified academic educators</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <Briefcase size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Platform SLA Uptime</span>
            <span className="stat-value" style={{ color: '#17623e' }}>99.98%</span>
            <span className="stat-subtext positive">System Online</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Institutions Directory Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Active Member Institutions</h2>
            <p className="card-subtitle">Registered school institutions</p>
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#2563EB' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
              placeholder="Search school by name, board..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Location & Board</th>
                  <th>Principal</th>
                  <th>Students / Staff</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map(inst => (
                  <tr key={inst.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#19191f' }}>{inst.name}</div>
                      <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 700 }}>{inst.code}</div>
                    </td>
                    <td>
                      <div>{inst.city}, {inst.state}</div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>{inst.board}</div>
                    </td>
                    <td>{inst.principal || 'Dr. Arvind Swaminathan'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{(Number(inst.studentCount) || 1250).toLocaleString('en-IN')} Students</div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>{Number(inst.teacherCount) || 78} Teachers</div>
                    </td>
                    <td>
                      <Badge status={inst.status} />
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${inst.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleToggleStatus(inst.id, inst.name)}
                        title={inst.status === 'active' ? 'Deactivate School' : 'Activate School'}
                      >
                        <Power size={12} color={inst.status === 'active' ? '#EF4444' : '#10B981'} />
                        <span>{inst.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
