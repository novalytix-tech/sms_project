import React, { useState, useMemo } from 'react';
import { AdmissionApplication, AdmissionDocument } from '../../../types';
import { classService } from '../../../services/classService';
import { SearchInput } from '../../../components/common/SearchInput';
import { EmptyState } from '../../../components/common/EmptyState';
import { formatDate } from '../../../utils/formatters';
import { FileText, CheckCircle, Clock, Eye, RotateCcw, ShieldCheck } from 'lucide-react';

interface DocumentVerificationTabProps {
  applications: AdmissionApplication[];
  classes: ReturnType<typeof classService.getAll>;
  onInspectDoc: (app: AdmissionApplication, doc: AdmissionDocument) => void;
  onVerifyDoc: (appId: string, docId: string, verified: boolean) => void;
}

export const DocumentVerificationTab: React.FC<DocumentVerificationTabProps> = ({
  applications,
  classes,
  onInspectDoc,
  onVerifyDoc,
}) => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [docFilter, setDocFilter] = useState<'all' | 'pending' | 'verified'>('pending');

  // Summary Metrics
  const allDocs = useMemo(() => {
    return applications.flatMap(a => (a.documents || []).map(d => ({ ...d, app: a })));
  }, [applications]);

  const totalDocs = allDocs.length;
  const verifiedDocs = allDocs.filter(d => d.verified).length;
  const pendingDocs = totalDocs - verifiedDocs;

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        search === '' ||
        app.applicationNo.toLowerCase().includes(q) ||
        `${app.firstName} ${app.lastName}`.toLowerCase().includes(q);

      const matchClass = classFilter === 'all' || app.targetClassId === classFilter;

      const isAllVerified = (app.documents || []).filter(d => d.required).every(d => d.verified);
      const matchDoc =
        docFilter === 'all' ||
        (docFilter === 'verified' && isAllVerified) ||
        (docFilter === 'pending' && !isAllVerified);

      return matchSearch && matchClass && matchDoc;
    });
  }, [applications, search, classFilter, docFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <div className="adm-kpi-card">
          <div>
            <div className="adm-kpi-label">Total Documents Tracked</div>
            <div className="adm-kpi-val">{totalDocs}</div>
            <div className="adm-kpi-sub">Across all active applicants</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: 'var(--color-primary-light, #DBEAFE)', color: 'var(--color-primary, #3B82F6)' }}>
            <FileText size={20} />
          </div>
        </div>

        <div className="adm-kpi-card">
          <div>
            <div className="adm-kpi-label">Verified & Approved</div>
            <div className="adm-kpi-val" style={{ color: '#15803d' }}>{verifiedDocs}</div>
            <div className="adm-kpi-sub">Cleared against originals</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="adm-kpi-card">
          <div>
            <div className="adm-kpi-label">Pending Verification</div>
            <div className="adm-kpi-val" style={{ color: '#c2410c' }}>{pendingDocs}</div>
            <div className="adm-kpi-sub">Requires registrar review</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#fff7ed', color: '#c2410c' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="adm-kpi-card">
          <div>
            <div className="adm-kpi-label">Compliance Clearance</div>
            <div className="adm-kpi-val" style={{ color: '#702e82' }}>
              {totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0}%
            </div>
            <div className="adm-kpi-sub">Statutory compliance rate</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#f9edf9', color: '#702e82' }}>
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search candidate name or application number..."
            ariaLabel="Search applicants"
          />

          <select
            className="form-select filter-select filter-select-md"
            value={docFilter}
            onChange={e => setDocFilter(e.target.value as any)}
          >
            <option value="pending">Pending Document Clearance</option>
            <option value="verified">All Mandatory Verified</option>
            <option value="all">All Applicants</option>
          </select>

          <select
            className="form-select filter-select filter-select-sm"
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {(search || classFilter !== 'all' || docFilter !== 'pending') && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                setSearch('');
                setClassFilter('all');
                setDocFilter('pending');
              }}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification Matrix Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredApps.length === 0 ? (
          <EmptyState
            title="No pending documents for verification"
            description="All active applications have completed document requirements or no candidates match your filters."
          />
        ) : (
          filteredApps.map(app => {
            const docs = app.documents || [];
            const reqVerified = docs.filter(d => d.required && d.verified).length;
            const reqTotal = docs.filter(d => d.required).length;
            const isAllCleared = reqTotal > 0 && reqVerified === reqTotal;

            return (
              <div key={app.id} className="card" style={{ padding: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  borderBottom: '1px solid #E2E8F0',
                  paddingBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px', color: '#19191f' }}>
                        {app.firstName} {app.lastName}
                      </strong>
                      <span className="badge badge-secondary">{app.applicationNo}</span>
                      <span className="badge badge-info">{app.targetClassName}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                      Guardian: {app.parentName} ({app.parentPhone}) • Previous: {app.previousSchool || 'Not specified'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      Mandatory: <span style={{ color: isAllCleared ? '#16a34a' : '#c2410c' }}>{reqVerified}/{reqTotal} Verified</span>
                    </div>
                    {isAllCleared ? (
                      <span className="badge badge-success">Documents Cleared</span>
                    ) : (
                      <span className="badge badge-warning">Verification Incomplete</span>
                    )}
                  </div>
                </div>

                {/* Individual Documents Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        background: doc.verified ? '#f0fdf4' : '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1f2937' }}>
                            {doc.title} {doc.required && <span style={{ color: '#dc2626' }}>*</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            {doc.verified ? (
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>Verified on {formatDate(doc.verificationDate || '')}</span>
                            ) : (
                              <span style={{ color: '#d97706' }}>Awaiting verification</span>
                            )}
                          </div>
                        </div>
                        {doc.verified ? (
                          <CheckCircle size={16} color="#16a34a" />
                        ) : (
                          <Clock size={16} color="#d97706" />
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11.5px' }}
                          onClick={() => onInspectDoc(app, doc)}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            color: doc.verified ? '#dc2626' : '#16a34a',
                            borderColor: doc.verified ? '#fecaca' : '#bbf7d0',
                          }}
                          onClick={() => onVerifyDoc(app.id, doc.id, doc.verified)}
                        >
                          {doc.verified ? 'Revoke' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

