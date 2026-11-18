import React, { useState, useMemo } from 'react';
import { AdmissionApplication } from '../../../types';
import { classService } from '../../../services/classService';
import { SearchInput } from '../../../components/common/SearchInput';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { formatDate } from '../../../utils/formatters';
import { exportToCSV } from '../../../utils/export';
import { Download, RotateCcw, Eye, CreditCard, CheckCircle, Award } from 'lucide-react';

interface ApplicationsTabProps {
  applications: AdmissionApplication[];
  classes: ReturnType<typeof classService.getAll>;
  onViewProfile: (app: AdmissionApplication) => void;
  onRecordFee: (app: AdmissionApplication) => void;
  onGenerateOffer: (app: AdmissionApplication) => void;
  onOpenEnroll: (app: AdmissionApplication) => void;
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  classes,
  onViewProfile,
  onRecordFee,
  onGenerateOffer,
  onOpenEnroll,
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        search === '' ||
        app.applicationNo.toLowerCase().includes(q) ||
        `${app.firstName} ${app.lastName}`.toLowerCase().includes(q) ||
        app.parentName.toLowerCase().includes(q) ||
        app.parentPhone.includes(q);

      const matchStage = stageFilter === 'all' || app.stage === stageFilter;
      const matchClass = classFilter === 'all' || app.targetClassId === classFilter;
      const matchFee =
        feeFilter === 'all' ||
        (feeFilter === 'paid' && app.isFeePaid) ||
        (feeFilter === 'pending' && !app.isFeePaid);

      const allDocsVerified = (app.documents || []).filter(d => d.required).every(d => d.verified);
      const matchDoc =
        docFilter === 'all' ||
        (docFilter === 'verified' && allDocsVerified) ||
        (docFilter === 'pending' && !allDocsVerified);

      return matchSearch && matchStage && matchClass && matchFee && matchDoc;
    });
  }, [applications, search, stageFilter, classFilter, feeFilter, docFilter]);

  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage]);

  const handleExportCSV = () => {
    const headers = [
      'Application No',
      'Candidate Name',
      'DOB',
      'Gender',
      'Target Class',
      'Section',
      'Parent Name',
      'Parent Phone',
      'Parent Email',
      'Source',
      'Counsellor',
      'Application Stage',
      'Document Status',
      'Fee Paid',
      'Fee Amount',
      'Admission Number',
      'Submission Date',
    ];

    const rows = filteredApps.map(a => [
      a.applicationNo,
      `${a.firstName} ${a.lastName}`,
      a.dob,
      a.gender,
      a.targetClassName,
      a.targetSection || 'A',
      a.parentName,
      a.parentPhone,
      a.parentEmail,
      a.source,
      a.assignedCounsellor || 'Admissions Desk',
      a.stage,
      (a.documents || []).every(d => d.verified) ? 'Verified' : 'Pending',
      a.isFeePaid ? 'Paid' : 'Pending',
      a.admissionFeeAmount,
      a.assignedAdmissionNo || 'Not Enrolled',
      a.createdAt,
    ]);

    exportToCSV('Admission_Applications_Registry', headers, rows);
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'inquiry':
        return <span className="badge badge-secondary">Inquiry</span>;
      case 'application_started':
      case 'application_submitted':
        return <span className="badge badge-info">Submitted</span>;
      case 'documents_pending':
        return <span className="badge badge-warning">Docs Pending</span>;
      case 'under_review':
        return <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e' }}>Under Review</span>;
      case 'approved':
        return <span className="badge badge-success">Approved / Offered</span>;
      case 'fee_pending':
        return <span className="badge" style={{ background: '#ffedd5', color: '#c2410c' }}>Fee Pending</span>;
      case 'enrolled':
        return <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>Enrolled</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'withdrawn':
        return <span className="badge badge-neutral">Withdrawn</span>;
      default:
        return <span className="badge badge-secondary">{stage}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group-left" style={{ flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by candidate, APP #, parent phone..."
            ariaLabel="Search applications"
          />

          <select
            className="form-select filter-select filter-select-md"
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
          >
            <option value="all">All Application Stages</option>
            <option value="inquiry">Inquiry</option>
            <option value="application_submitted">Submitted</option>
            <option value="documents_pending">Documents Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved / Offered</option>
            <option value="fee_pending">Fee Pending</option>
            <option value="enrolled">Enrolled</option>
            <option value="rejected">Rejected</option>
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

          <select
            className="form-select filter-select filter-select-sm"
            value={docFilter}
            onChange={e => setDocFilter(e.target.value)}
          >
            <option value="all">All Document Statuses</option>
            <option value="verified">All Docs Verified</option>
            <option value="pending">Docs Pending</option>
          </select>

          <select
            className="form-select filter-select filter-select-sm"
            value={feeFilter}
            onChange={e => setFeeFilter(e.target.value)}
          >
            <option value="all">All Fee Statuses</option>
            <option value="paid">Fee Cleared</option>
            <option value="pending">Fee Pending</option>
          </select>

          {(search || stageFilter !== 'all' || classFilter !== 'all' || docFilter !== 'all' || feeFilter !== 'all') && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                setSearch('');
                setStageFilter('all');
                setClassFilter('all');
                setDocFilter('all');
                setFeeFilter('all');
              }}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="filter-group-right">
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filteredApps.length === 0 ? (
            <EmptyState
              title="No admission applications found"
              description="No applications match your filter criteria."
              action={
                <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setStageFilter('all'); }}>
                  Reset Filters
                </button>
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Application Ref</th>
                    <th>Candidate Details</th>
                    <th>Class</th>
                    <th>Parent & Contact</th>
                    <th>Source</th>
                    <th>Workflow Stage</th>
                    <th>Documents</th>
                    <th>Fee Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApps.map(app => {
                    const verifiedCount = (app.documents || []).filter(d => d.verified).length;
                    const totalReq = (app.documents || []).length;
                    const allVerified = totalReq > 0 && verifiedCount === totalReq;

                    return (
                      <tr key={app.id}>
                        <td>
                          <strong>{app.applicationNo}</strong>
                          <div style={{ fontSize: '11px', color: '#71717a' }}>{formatDate(app.createdAt)}</div>
                          {app.linkedEnquiryNo && (
                            <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>via {app.linkedEnquiryNo}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#19191f' }}>
                            {app.firstName} {app.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            DOB: {formatDate(app.dob)} ({app.gender})
                          </div>
                        </td>
                        <td>
                          <strong>{app.targetClassName}</strong>
                          <div style={{ fontSize: '11.5px', color: '#71717a' }}>Sec {app.targetSection || 'A'}</div>
                        </td>
                        <td>
                          <div>{app.parentName}</div>
                          <div style={{ fontSize: '12px', color: '#4b5563' }}>{app.parentPhone}</div>
                        </td>
                        <td>
                          <span className="badge badge-secondary">{app.source}</span>
                        </td>
                        <td>{getStageBadge(app.stage)}</td>
                        <td>
                          {allVerified ? (
                            <span className="badge badge-success" style={{ fontSize: '11.5px' }}>Verified</span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontSize: '11.5px' }}>
                              {verifiedCount}/{totalReq} Done
                            </span>
                          )}
                        </td>
                        <td>
                          {app.isFeePaid ? (
                            <span className="badge badge-success" style={{ fontSize: '11.5px' }}>Paid</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '11.5px' }}>
                              ₹{(app.admissionFeeAmount || 25000).toLocaleString('en-IN')} Due
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onViewProfile(app)}
                              title="Open 8-tab comprehensive profile"
                            >
                              <Eye size={13} />
                              <span>Process</span>
                            </button>

                            {app.stage === 'under_review' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onGenerateOffer(app)}
                                title="Issue Offer Letter"
                              >
                                <Award size={13} />
                              </button>
                            )}

                            {!app.isFeePaid && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onRecordFee(app)}
                                title="Record Fee"
                              >
                                <CreditCard size={13} />
                              </button>
                            )}

                            {app.stage !== 'enrolled' && app.stage !== 'rejected' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => onOpenEnroll(app)}
                                title="Confirm Enrollment"
                              >
                                <CheckCircle size={13} />
                                <span>Enroll</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredApps.length > pageSize && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
            <Pagination
              currentPage={currentPage}
              totalRecords={filteredApps.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
