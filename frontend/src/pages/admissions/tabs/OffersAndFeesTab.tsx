import React, { useState } from 'react';
import { AdmissionApplication, ClassAdmissionCapacity } from '../../../types';
import { classService } from '../../../services/classService';
import { formatDate, formatCurrencyINR } from '../../../utils/formatters';
import { Award, CreditCard, CheckCircle, Printer, Users } from 'lucide-react';

interface OffersAndFeesTabProps {
  applications: AdmissionApplication[];
  capacities: ClassAdmissionCapacity[];
  classes: ReturnType<typeof classService.getAll>;
  onGenerateOffer: (app: AdmissionApplication) => void;
  onPrintOffer: (app: AdmissionApplication) => void;
  onRecordFee: (app: AdmissionApplication) => void;
  onPrintReceipt: (app: AdmissionApplication) => void;
  onOpenEnroll: (app: AdmissionApplication) => void;
}

export const OffersAndFeesTab: React.FC<OffersAndFeesTabProps> = ({
  applications,
  capacities,
  classes,
  onGenerateOffer,
  onPrintOffer,
  onRecordFee,
  onPrintReceipt,
  onOpenEnroll,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'capacity' | 'offers' | 'fees'>('capacity');

  const pendingOffers = applications.filter(a => a.stage === 'under_review');
  const issuedOffers = applications.filter(a => a.stage === 'approved' || a.stage === 'fee_pending');
  const feePendingApps = applications.filter(a => !a.isFeePaid && a.stage !== 'rejected' && a.stage !== 'withdrawn');
  const enrolledApps = applications.filter(a => a.stage === 'enrolled');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sub Navigation Strip */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '10px',
      }}>
        <button
          className={`btn btn-sm ${activeSubTab === 'capacity' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('capacity')}
        >
          <Users size={14} />
          <span>Class Seat Capacity ({capacities.length} Classes)</span>
        </button>

        <button
          className={`btn btn-sm ${activeSubTab === 'offers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('offers')}
        >
          <Award size={14} />
          <span>Admission Decisions & Offer Letters ({issuedOffers.length + pendingOffers.length})</span>
        </button>

        <button
          className={`btn btn-sm ${activeSubTab === 'fees' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('fees')}
        >
          <CreditCard size={14} />
          <span>Admission Fee Collection ({feePendingApps.length} Pending)</span>
        </button>
      </div>

      {/* SECTION 1: CLASS SEAT CAPACITY MANAGER */}
      {activeSubTab === 'capacity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: '#F6F8FC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
          }}>
            <div>
              <strong>Admission Seat Allotment & Strict Capacity Control</strong>
              <div style={{ color: '#71717a', marginTop: '2px' }}>
                Seat occupancy is dynamically updated when an applicant is officially enrolled with an Admission Number.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#16a34a', borderRadius: '50%' }}></span>
                Available Seats
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%' }}></span>
                Near Capacity (&gt;80%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#dc2626', borderRadius: '50%' }}></span>
                Capacity Exhausted
              </span>
            </div>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Grade / Class</th>
                    <th>Academic Session</th>
                    <th>Approved Seats</th>
                    <th>Reserved Quota</th>
                    <th>Confirmed Admissions</th>
                    <th>Available Seats</th>
                    <th>Waitlisted</th>
                    <th>Occupancy Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {capacities.map(cap => {
                    const pct = Math.round((cap.confirmedAdmissions / cap.totalApprovedSeats) * 100);
                    const colorClass = pct >= 98 ? 'red' : pct >= 80 ? 'orange' : 'green';

                    return (
                      <tr key={cap.classId}>
                        <td>
                          <strong>{cap.className}</strong>
                        </td>
                        <td>{cap.academicSession}</td>
                        <td>{cap.totalApprovedSeats}</td>
                        <td style={{ color: '#71717a' }}>{cap.reservedSeats} seats</td>
                        <td>
                          <strong style={{ color: '#19191f' }}>{cap.confirmedAdmissions}</strong>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: cap.availableSeats <= 3 ? '#dc2626' : '#15803d',
                          }}>
                            {cap.availableSeats}
                          </span>
                        </td>
                        <td>
                          {cap.waitlistedApplicants > 0 ? (
                            <span className="badge badge-warning">{cap.waitlistedApplicants} Waitlisted</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>0</span>
                          )}
                        </td>
                        <td style={{ width: '180px' }}>
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
      )}

      {/* SECTION 2: ADMISSION DECISIONS & PROVISIONAL OFFERS */}
      {activeSubTab === 'offers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 18px', background: '#F6F8FC' }}>
              <strong>Issued Offers & Pending Decisions</strong>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Approved Class</th>
                    <th>Decision Status</th>
                    <th>Admission Fee</th>
                    <th>Offer Expiry</th>
                    <th>Approver</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...issuedOffers, ...pendingOffers].map(app => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.firstName} {app.lastName}</strong>
                        <div style={{ fontSize: '11.5px', color: '#71717a' }}>Ref: {app.applicationNo}</div>
                      </td>
                      <td>
                        <strong>{app.targetClassName}</strong> ({app.targetSection || 'A'})
                      </td>
                      <td>
                        {app.stage === 'approved' || app.stage === 'fee_pending' ? (
                          <span className="badge badge-success">Offer Released</span>
                        ) : (
                          <span className="badge badge-warning">Under Review</span>
                        )}
                      </td>
                      <td>
                        <strong>{formatCurrencyINR(app.admissionFeeAmount || 25000)}</strong>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        {app.offer?.expiryDate ? formatDate(app.offer.expiryDate) : '15 days from issue'}
                      </td>
                      <td style={{ fontSize: '12px', color: '#4b5563' }}>
                        {app.offer?.authorizedApprover || 'Dr. Arvind Swaminathan'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onPrintOffer(app)}
                            title="Preview and print official offer letterhead"
                          >
                            <Printer size={13} />
                            <span>Print Offer</span>
                          </button>

                          {app.stage !== 'enrolled' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => onOpenEnroll(app)}
                            >
                              <CheckCircle size={13} />
                              <span>Enroll</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ADMISSION FEE COLLECTION */}
      {activeSubTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 18px', background: '#F6F8FC' }}>
              <strong>Admission Fee Clearance & Receipt Counter</strong>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Target Class</th>
                    <th>Total Admission Dues</th>
                    <th>Amount Cleared</th>
                    <th>Balance Due</th>
                    <th>Payment Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => {
                    const total = app.admissionFeeAmount || 25000;
                    const paid = app.feeAmountPaid !== undefined ? app.feeAmountPaid : (app.isFeePaid ? total : 0);
                    const bal = total - paid;

                    return (
                      <tr key={app.id}>
                        <td>
                          <strong>{app.firstName} {app.lastName}</strong>
                          <div style={{ fontSize: '11.5px', color: '#71717a' }}>{app.applicationNo} • {app.parentPhone}</div>
                        </td>
                        <td>{app.targetClassName}</td>
                        <td>{formatCurrencyINR(total)}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatCurrencyINR(paid)}</td>
                        <td style={{ color: bal > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                          {formatCurrencyINR(bal)}
                        </td>
                        <td>
                          {app.isFeePaid ? (
                            <span className="badge badge-success">Cleared</span>
                          ) : paid > 0 ? (
                            <span className="badge badge-warning">Partially Paid</span>
                          ) : (
                            <span className="badge badge-danger">Payment Pending</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onRecordFee(app)}
                            >
                              <CreditCard size={13} />
                              <span>{app.isFeePaid ? 'Add Txn' : 'Collect Fee'}</span>
                            </button>

                            {(app.isFeePaid || paid > 0) && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onPrintReceipt(app)}
                                title="Print Official Receipt"
                              >
                                <Printer size={13} />
                                <span>Receipt</span>
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
          </div>
        </div>
      )}
    </div>
  );
};

