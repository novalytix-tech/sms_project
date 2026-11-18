import React, { useState, useMemo } from 'react';
import { AdmissionEnquiry, AdmissionFollowUp } from '../../../types';
import { classService } from '../../../services/classService';
import { SearchInput } from '../../../components/common/SearchInput';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { formatDate } from '../../../utils/formatters';
import { exportToCSV } from '../../../utils/export';
import { UserPlus, Download, RotateCcw, Eye, PhoneCall, FileText } from 'lucide-react';

interface EnquiriesTabProps {
  enquiries: AdmissionEnquiry[];
  followUps: AdmissionFollowUp[];
  classes: ReturnType<typeof classService.getAll>;
  onOpenNewEnquiry: () => void;
  onViewEnquiry: (enquiry: AdmissionEnquiry) => void;
  onAddFollowUp: (enquiry: AdmissionEnquiry) => void;
  onConvertToApp: (enquiry: AdmissionEnquiry) => void;
  onMarkLost: (enquiry: AdmissionEnquiry) => void;
}

export const EnquiriesTab: React.FC<EnquiriesTabProps> = ({
  enquiries,
  followUps,
  classes,
  onOpenNewEnquiry,
  onViewEnquiry,
  onAddFollowUp,
  onConvertToApp,
  onMarkLost,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [counsellorFilter, setCounsellorFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        search === '' ||
        e.enquiryNo.toLowerCase().includes(q) ||
        e.studentName.toLowerCase().includes(q) ||
        e.parentName.toLowerCase().includes(q) ||
        e.mobileNumber.includes(q);

      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchSource = sourceFilter === 'all' || e.source === sourceFilter;
      const matchClass = classFilter === 'all' || e.interestedClassId === classFilter;
      const matchCounsellor = counsellorFilter === 'all' || e.assignedCounsellor === counsellorFilter;

      return matchSearch && matchStatus && matchSource && matchClass && matchCounsellor;
    });
  }, [enquiries, search, statusFilter, sourceFilter, classFilter, counsellorFilter]);

  const paginatedEnquiries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEnquiries.slice(start, start + pageSize);
  }, [filteredEnquiries, currentPage]);

  const handleExportCSV = () => {
    const headers = [
      'Enquiry ID',
      'Student Name',
      'DOB',
      'Gender',
      'Interested Class',
      'Session',
      'Parent Name',
      'Relationship',
      'Mobile',
      'Email',
      'Source',
      'Counsellor',
      'Next Follow-up',
      'Status',
      'Lost Reason',
      'Converted App ID',
      'Enquiry Date',
    ];

    const rows = filteredEnquiries.map(e => [
      e.enquiryNo,
      e.studentName,
      e.dob,
      e.gender,
      e.interestedClassName,
      e.academicSession,
      e.parentName,
      e.relationship,
      e.mobileNumber,
      e.email,
      e.source,
      e.assignedCounsellor,
      e.nextFollowUpDate || 'None',
      e.status,
      e.lostReason || '',
      e.convertedApplicationNo || '',
      e.enquiryDate,
    ]);

    exportToCSV('Admission_Enquiry_Registry', headers, rows);
  };

  const getStatusBadge = (status: string, lostReason?: string) => {
    switch (status) {
      case 'New':
        return <span className="badge-status new">New</span>;
      case 'Contacted':
        return <span className="badge-status contacted">Contacted</span>;
      case 'Follow-up Required':
        return <span className="badge-status followup">Follow-up Due</span>;
      case 'Visit Scheduled':
      case 'Visit Completed':
        return <span className="badge-status visit">{status}</span>;
      case 'Application Started':
        return <span className="badge-status pending">App Started</span>;
      case 'Converted':
        return <span className="badge-status converted">Converted</span>;
      case 'Lost':
        return <span className="badge-status lost">Lost ({lostReason || 'N/A'})</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Filter & Action Bar */}
      <div className="filter-toolbar">
        <div className="filter-group-left" style={{ flexWrap: 'wrap' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student, parent, phone, ENQ #..."
            ariaLabel="Search enquiries"
          />

          <select
            className="form-select filter-select filter-select-md"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Enquiry Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Follow-up Required">Follow-up Required</option>
            <option value="Visit Scheduled">Visit Scheduled</option>
            <option value="Visit Completed">Visit Completed</option>
            <option value="Application Started">Application Started</option>
            <option value="Converted">Converted to Application</option>
            <option value="Lost">Lost</option>
          </select>

          <select
            className="form-select filter-select filter-select-sm"
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
          >
            <option value="all">All Sources</option>
            <option value="Website">Website</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Phone Call">Phone Call</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Referral">Referral</option>
            <option value="Education Fair">Education Fair</option>
            <option value="Other">Other</option>
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
            value={counsellorFilter}
            onChange={e => setCounsellorFilter(e.target.value)}
          >
            <option value="all">All Counsellors</option>
            <option value="Meenakshi Sharma">Meenakshi Sharma</option>
            <option value="Rajesh Khanna">Rajesh Khanna</option>
            <option value="Preeti Srivastava">Preeti Srivastava</option>
          </select>

          {(search || statusFilter !== 'all' || sourceFilter !== 'all' || classFilter !== 'all' || counsellorFilter !== 'all') && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSourceFilter('all');
                setClassFilter('all');
                setCounsellorFilter('all');
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
          <button className="btn btn-primary btn-sm" onClick={onOpenNewEnquiry}>
            <UserPlus size={15} />
            <span>New Enquiry</span>
          </button>
        </div>
      </div>

      {/* Enquiries Data Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filteredEnquiries.length === 0 ? (
            <EmptyState
              title="No admission enquiries found"
              description="No enquiries match your active search or filter criteria. Click 'New Enquiry' to register a candidate."
              action={
                <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                  Reset Filters
                </button>
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Enquiry Ref</th>
                    <th>Candidate Details</th>
                    <th>Interested Class</th>
                    <th>Parent / Contact</th>
                    <th>Source</th>
                    <th>Counsellor</th>
                    <th>Next Follow-Up</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEnquiries.map(enq => {
                    const isDueToday = enq.nextFollowUpDate === todayStr;
                    const isOverdue = enq.nextFollowUpDate && enq.nextFollowUpDate < todayStr && enq.status !== 'Converted' && enq.status !== 'Lost';

                    return (
                      <tr key={enq.id}>
                        <td>
                          <strong>{enq.enquiryNo}</strong>
                          <div style={{ fontSize: '11px', color: '#71717a' }}>{formatDate(enq.enquiryDate)}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#19191f' }}>{enq.studentName}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            DOB: {formatDate(enq.dob)} ({enq.gender})
                          </div>
                        </td>
                        <td>
                          <strong>{enq.interestedClassName}</strong>
                          <div style={{ fontSize: '11.5px', color: '#71717a' }}>{enq.academicSession}</div>
                        </td>
                        <td>
                          <div>{enq.parentName} ({enq.relationship})</div>
                          <div style={{ fontSize: '12px', color: '#4b5563' }}>{enq.mobileNumber}</div>
                        </td>
                        <td>
                          <span className="badge badge-secondary">{enq.source}</span>
                        </td>
                        <td style={{ fontSize: '12.5px' }}>{enq.assignedCounsellor}</td>
                        <td>
                          {enq.nextFollowUpDate ? (
                            <span style={{
                              fontWeight: isDueToday || isOverdue ? 700 : 400,
                              color: isOverdue ? '#dc2626' : isDueToday ? '#c2410c' : '#374151',
                            }}>
                              {formatDate(enq.nextFollowUpDate)}
                              {isOverdue && ' (Overdue)'}
                              {isDueToday && ' (Today)'}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>—</span>
                          )}
                        </td>
                        <td>{getStatusBadge(enq.status, enq.lostReason)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onViewEnquiry(enq)}
                              title="View full enquiry history"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            {enq.status !== 'Converted' && enq.status !== 'Lost' && (
                              <>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => onAddFollowUp(enq)}
                                  title="Log call or interaction"
                                >
                                  <PhoneCall size={13} />
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => onConvertToApp(enq)}
                                  title="Convert to formal application"
                                >
                                  <FileText size={13} />
                                  <span>Convert</span>
                                </button>
                              </>
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

        {filteredEnquiries.length > pageSize && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
            <Pagination
              currentPage={currentPage}
              totalRecords={filteredEnquiries.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
