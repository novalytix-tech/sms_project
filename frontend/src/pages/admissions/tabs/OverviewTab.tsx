import React, { useState, useMemo } from 'react';
import { AdmissionApplication, AdmissionEnquiry, AdmissionFollowUp, ClassAdmissionCapacity } from '../../../types';

import { Users, UserPlus, Clock, Calendar, CreditCard, CheckCircle, XCircle, Award, TrendingUp, PieChart as PieIcon, PhoneCall, AlertTriangle } from 'lucide-react';

interface OverviewTabProps {
  enquiries: AdmissionEnquiry[];
  applications: AdmissionApplication[];
  followUps: AdmissionFollowUp[];
  capacities: ClassAdmissionCapacity[];
  onNavigateTab: (tab: string) => void;
  onOpenNewEnquiry: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  enquiries,
  applications,
  followUps,
  capacities,
  onNavigateTab,
  onOpenNewEnquiry,
}) => {
  const [dateFilter, setDateFilter] = useState<string>('last_30_days');
  const [sessionFilter, setSessionFilter] = useState<string>('2026-2027');

  // Filtered dataset based on session
  const sessionEnquiries = useMemo(() => {
    return enquiries.filter(e => e.academicSession === sessionFilter);
  }, [enquiries, sessionFilter]);

  const sessionApplications = useMemo(() => {
    return applications.filter(a => a.academicYear === sessionFilter);
  }, [applications, sessionFilter]);

  // KPI Calculations
  const totalEnquiries = sessionEnquiries.length;
  const newEnquiries = sessionEnquiries.filter(e => e.status === 'New').length;
  const followUpsDue = sessionEnquiries.filter(e => e.status === 'Follow-up Required').length;
  const visitsScheduled = sessionEnquiries.filter(e => e.status === 'Visit Scheduled' || e.status === 'Visit Completed').length;

  const appsSubmitted = sessionApplications.length;
  const appsUnderReview = sessionApplications.filter(a => a.stage === 'under_review' || a.stage === 'documents_pending').length;
  const admissionsOffered = sessionApplications.filter(a => a.stage === 'approved').length;
  const feePending = sessionApplications.filter(a => !a.isFeePaid && a.stage !== 'rejected' && a.stage !== 'withdrawn').length;
  const confirmedAdmissions = sessionApplications.filter(a => a.stage === 'enrolled').length;
  const rejectedOrWithdrawn = sessionApplications.filter(a => a.stage === 'rejected' || a.stage === 'withdrawn').length;

  // Source Distribution
  const sourceStats = useMemo(() => {
    const counts: Record<string, number> = {};
    sessionEnquiries.forEach(e => {
      const src = e.source || 'Other';
      counts[src] = (counts[src] || 0) + 1;
    });

    const total = sessionEnquiries.length || 1;
    return Object.entries(counts)
      .map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessionEnquiries]);

  // Conversion Funnel Data
  const funnel = useMemo(() => {
    const totalEnq = sessionEnquiries.length || 1;
    const contacted = sessionEnquiries.filter(e => e.status !== 'New').length;
    const visits = sessionEnquiries.filter(e => e.status === 'Visit Scheduled' || e.status === 'Visit Completed' || e.status === 'Converted').length;
    const apps = sessionApplications.length;
    const offers = sessionApplications.filter(a => a.stage === 'approved' || a.stage === 'enrolled').length;
    const enrolled = confirmedAdmissions;

    return [
      { label: '1. Total Enquiries', count: sessionEnquiries.length, pct: 100 },
      { label: '2. Contacted & Screened', count: contacted, pct: Math.round((contacted / totalEnq) * 100) },
      { label: '3. Campus Walkthroughs', count: visits, pct: Math.round((visits / totalEnq) * 100) },
      { label: '4. Applications Submitted', count: apps, pct: Math.round((apps / totalEnq) * 100) },
      { label: '5. Admissions Offered', count: offers, pct: Math.round((offers / totalEnq) * 100) },
      { label: '6. Confirmed & Enrolled', count: enrolled, pct: Math.round((enrolled / totalEnq) * 100) },
    ];
  }, [sessionEnquiries, sessionApplications, confirmedAdmissions]);

  // Follow-up reminders
  const todayStr = new Date().toISOString().split('T')[0];
  const todayFollowUps = followUps.filter(f => f.followUpDate === todayStr && f.status !== 'Completed');
  const overdueFollowUps = followUps.filter(f => f.followUpDate < todayStr && f.status !== 'Completed');

  // Conversion Rate
  const conversionRate = totalEnquiries > 0 ? Math.round((confirmedAdmissions / totalEnquiries) * 100) : 0;
  const lostCount = sessionEnquiries.filter(e => e.status === 'Lost').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '12px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#19191f' }}>Academic Session:</span>
          <select
            className="form-select filter-select-sm"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
          >
            <option value="2026-2027">2026-2027 (Active Intake)</option>
            <option value="2025-2026">2025-2026</option>
          </select>

          <span style={{ fontSize: '13px', fontWeight: 600, color: '#19191f', marginLeft: '10px' }}>Date Scope:</span>
          <select
            className="form-select filter-select-sm"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="prev_month">Previous Month</option>
            <option value="all">Full Academic Year</option>
          </select>
        </div>

        <div>
          <button className="btn btn-primary btn-sm" onClick={onOpenNewEnquiry}>
            <UserPlus size={15} />
            <span>+ New Admission Enquiry</span>
          </button>
        </div>
      </div>

      {/* 10 KPI CARDS GRID */}
      <div className="adm-kpi-grid">
        <div className="adm-kpi-card" onClick={() => onNavigateTab('enquiries')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Total Enquiries</div>
            <div className="adm-kpi-val">{totalEnquiries}</div>
            <div className="adm-kpi-sub">Registered across all sources</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#DBEAFE', color: '#3B82F6' }}>
            <Users size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('enquiries')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">New Enquiries</div>
            <div className="adm-kpi-val" style={{ color: '#3B82F6' }}>{newEnquiries}</div>
            <div className="adm-kpi-sub">Awaiting counsellor first contact</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: 'var(--color-primary-light, #DBEAFE)', color: 'var(--color-primary, #3B82F6)' }}>
            <UserPlus size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('enquiries')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Follow-ups Due</div>
            <div className="adm-kpi-val" style={{ color: '#c2410c' }}>{followUpsDue}</div>
            <div className="adm-kpi-sub">{todayFollowUps.length} scheduled for today</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#fff7ed', color: '#c2410c' }}>
            <PhoneCall size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('enquiries')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Visits Scheduled</div>
            <div className="adm-kpi-val" style={{ color: '#7e22ce' }}>{visitsScheduled}</div>
            <div className="adm-kpi-sub">Campus walkthroughs & tours</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#faf5ff', color: '#7e22ce' }}>
            <Calendar size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('applications')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Applications Submitted</div>
            <div className="adm-kpi-val">{appsSubmitted}</div>
            <div className="adm-kpi-sub">Formal applications received</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('applications')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Under Review</div>
            <div className="adm-kpi-val" style={{ color: '#92400e' }}>{appsUnderReview}</div>
            <div className="adm-kpi-sub">Verification & committee review</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('offers_fees')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Admissions Offered</div>
            <div className="adm-kpi-val" style={{ color: '#15803d' }}>{admissionsOffered}</div>
            <div className="adm-kpi-sub">Provisional letters issued</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
            <Award size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('offers_fees')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Fee Pending</div>
            <div className="adm-kpi-val" style={{ color: '#c2410c' }}>{feePending}</div>
            <div className="adm-kpi-sub">Awaiting fee clearance</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#fff7ed', color: '#c2410c' }}>
            <CreditCard size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('offers_fees')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Confirmed Admissions</div>
            <div className="adm-kpi-val" style={{ color: '#15803d' }}>{confirmedAdmissions}</div>
            <div className="adm-kpi-sub">Enrolled with Admission Number</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="adm-kpi-card" onClick={() => onNavigateTab('reports')} style={{ cursor: 'pointer' }}>
          <div>
            <div className="adm-kpi-label">Rejected / Withdrawn</div>
            <div className="adm-kpi-val" style={{ color: '#991b1b' }}>{rejectedOrWithdrawn + lostCount}</div>
            <div className="adm-kpi-sub">{lostCount} enquiries + {rejectedOrWithdrawn} applications</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Visualizations Grid: Funnel & Source Distribution */}
      <div className="adm-vis-grid">
        {/* Conversion Funnel */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">
              <TrendingUp size={16} color="#3B82F6" />
              <span>Admission Conversion Funnel</span>
            </span>
            <span style={{ fontSize: '12.5px', color: '#71717a' }}>
              Overall Conversion Rate: <strong>{conversionRate}%</strong>
            </span>
          </div>
          <div className="adm-card-body">
            <div className="adm-funnel-container">
              {funnel.map((step, idx) => (
                <div key={idx} className="adm-funnel-step">
                  <div className="adm-funnel-step-label">{step.label}</div>
                  <div className="adm-funnel-bar-track">
                    <div className="adm-funnel-bar-fill" style={{ width: `${Math.max(8, step.pct)}%` }}>
                      {step.pct}%
                    </div>
                  </div>
                  <div className="adm-funnel-step-count">{step.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">
              <PieIcon size={16} color="#3B82F6" />
              <span>Enquiry Source Breakdown</span>
            </span>
          </div>
          <div className="adm-card-body" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sourceStats.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: idx % 2 === 0 ? '#F6F8FC' : '#ffffff',
                    border: '1px solid #f8ece9',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{item.source}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: '#19191f' }}>{item.count}</span>
                    <span style={{ fontSize: '12px', color: '#71717a', width: '35px', textAlign: 'right' }}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Class-wise Demand & Follow-up Reminders Grid */}
      <div className="adm-vis-grid">
        {/* Class-wise Admission Demand Table */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">
              <span>Class-Wise Admission Demand & Capacity</span>
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('offers_fees')}>
              Manage Seats
            </button>
          </div>
          <div className="adm-card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Approved Seats</th>
                    <th>Enrolled</th>
                    <th>Available Seats</th>
                    <th>Seat Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {capacities.slice(0, 6).map(cap => {
                    const pct = Math.round((cap.confirmedAdmissions / cap.totalApprovedSeats) * 100);
                    const colorClass = pct >= 95 ? 'red' : pct >= 80 ? 'orange' : 'green';

                    return (
                      <tr key={cap.classId}>
                        <td><strong>{cap.className}</strong></td>
                        <td>{cap.totalApprovedSeats}</td>
                        <td style={{ fontWeight: 600 }}>{cap.confirmedAdmissions}</td>
                        <td style={{ color: cap.availableSeats <= 3 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                          {cap.availableSeats}
                        </td>
                        <td style={{ width: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                            <span>{pct}% filled</span>
                            <span>{cap.totalApprovedSeats - cap.confirmedAdmissions} left</span>
                          </div>
                          <div className="adm-capacity-bar">
                            <div className={`adm-capacity-fill ${colorClass}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Actionable Follow-up Reminders */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">
              <Clock size={16} color="#3B82F6" />
              <span>Counsellor Follow-up Desk</span>
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('enquiries')}>
              View All
            </button>
          </div>
          <div className="adm-card-body" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Overdue Warning */}
              {overdueFollowUps.length > 0 && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '12.5px',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <AlertTriangle size={15} />
                  <span><strong>{overdueFollowUps.length} Overdue Follow-ups</strong> requiring immediate parent callback!</span>
                </div>
              )}

              {/* Today's Tasks */}
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>
                Today&apos;s Follow-ups ({todayFollowUps.length})
              </div>

              {todayFollowUps.length === 0 ? (
                <div style={{ color: '#71717a', fontSize: '12.5px', fontStyle: 'italic', padding: '10px 0' }}>
                  No pending follow-ups scheduled for today.
                </div>
              ) : (
                todayFollowUps.slice(0, 4).map(f => (
                  <div
                    key={f.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      background: '#fff',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{f.candidateName}</span>
                      <span style={{ color: '#3B82F6' }}>{f.followUpTime}</span>
                    </div>
                    <div style={{ color: '#6b7280', marginTop: '2px' }}>
                      {f.communicationMethod} • {f.parentName} ({f.contactNumber})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

