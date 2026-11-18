import React from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionEnquiry, AdmissionFollowUp } from '../../../types';
import { formatDate } from '../../../utils/formatters';
import { Phone, Mail, MessageSquare, XCircle, FileText } from 'lucide-react';

interface EnquiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: AdmissionEnquiry | null;
  followUps: AdmissionFollowUp[];
  onAddFollowUp: (enquiry: AdmissionEnquiry) => void;
  onConvertToApplication: (enquiry: AdmissionEnquiry) => void;
  onMarkLost: (enquiry: AdmissionEnquiry) => void;
}

export const EnquiryDetailModal: React.FC<EnquiryDetailModalProps> = ({
  isOpen,
  onClose,
  enquiry,
  followUps,
  onAddFollowUp,
  onConvertToApplication,
  onMarkLost,
}) => {
  if (!enquiry) return null;

  const enquiryFollowUps = followUps.filter(f => f.enquiryId === enquiry.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="badge-status new">New Enquiry</span>;
      case 'Contacted':
        return <span className="badge-status contacted">Contacted</span>;
      case 'Follow-up Required':
        return <span className="badge-status followup">Follow-up Due</span>;
      case 'Visit Scheduled':
      case 'Visit Completed':
        return <span className="badge-status visit">{status}</span>;
      case 'Converted':
        return <span className="badge-status converted">Converted to App</span>;
      case 'Lost':
        return <span className="badge-status lost">Lost ({enquiry.lostReason || 'Not stated'})</span>;
      default:
        return <span className="badge-status pending">{status}</span>;
    }
  };

  const handleWhatsApp = () => {
    const phone = enquiry.mobileNumber.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hello ${enquiry.parentName}, greetings from St. Xavier's International Academy regarding the admission enquiry (${enquiry.enquiryNo}) for ${enquiry.studentName} for ${enquiry.interestedClassName}. How may we assist you today?`
    );
    window.open(`https://wa.me/${phone.startsWith('91') ? phone : `91${phone}`}?text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Admission Enquiry ${enquiry.enquiryNo} - St. Xavier's International Academy`);
    const body = encodeURIComponent(
      `Dear ${enquiry.parentName},\n\nThank you for reaching out to St. Xavier's International Academy regarding the admission of ${enquiry.studentName} into ${enquiry.interestedClassName}.\n\nPlease let us know a convenient time for a campus walkthrough or counsellor interaction.\n\nWarm regards,\nAdmissions Office`
    );
    window.location.href = `mailto:${enquiry.email}?subject=${subject}&body=${body}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Enquiry Details: ${enquiry.enquiryNo}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Top Header Card */}
        <div style={{
          background: '#F6F8FC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#19191f' }}>{enquiry.studentName}</h3>
              {getStatusBadge(enquiry.status)}
            </div>
            <div style={{ fontSize: '13px', color: '#71717a' }}>
              Target: <strong>{enquiry.interestedClassName}</strong> ({enquiry.academicSession}) • DOB: {formatDate(enquiry.dob)} ({enquiry.gender})
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleWhatsApp}
              title="Open WhatsApp chat with prefilled template"
              style={{ color: '#059669', borderColor: '#a7f3d0' }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleEmail}
              title="Compose official email"
              style={{ color: '#3B82F6', borderColor: '#fecaca' }}
            >
              <Mail size={14} />
              <span>Email</span>
            </button>
            <a
              href={`tel:${enquiry.mobileNumber}`}
              className="btn btn-secondary btn-sm"
              style={{ color: '#b91c1c', borderColor: '#fecaca', textDecoration: 'none' }}
            >
              <Phone size={14} />
              <span>Call</span>
            </a>
          </div>
        </div>

        {/* Parent & Enquiry Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left Column: Parent Details */}
          <div className="card" style={{ padding: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#3B82F6', marginBottom: '10px' }}>
              PARENT & GUARDIAN DETAILS
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div><strong>Name:</strong> {enquiry.parentName} ({enquiry.relationship})</div>
              <div><strong>Primary Mobile:</strong> {enquiry.mobileNumber}</div>
              {enquiry.alternateMobile && <div><strong>Alternate Mobile:</strong> {enquiry.alternateMobile}</div>}
              <div><strong>Email:</strong> {enquiry.email || 'Not provided'}</div>
              <div><strong>Address:</strong> {enquiry.residentialAddress || 'Kanpur'}</div>
              {enquiry.previousSchool && <div><strong>Previous School:</strong> {enquiry.previousSchool}</div>}
            </div>
          </div>

          {/* Right Column: Workflow Details */}
          <div className="card" style={{ padding: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#3B82F6', marginBottom: '10px' }}>
              ENQUIRY & METADATA
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div><strong>Enquiry Date:</strong> {formatDate(enquiry.enquiryDate)}</div>
              <div><strong>Enquiry Source:</strong> <span className="badge badge-secondary">{enquiry.source}</span></div>
              <div><strong>Preferred Channel:</strong> {enquiry.preferredContactMethod}</div>
              <div><strong>Assigned Counsellor:</strong> {enquiry.assignedCounsellor}</div>
              <div>
                <strong>Next Follow-up Due:</strong>{' '}
                <span style={{ color: enquiry.nextFollowUpDate ? '#3B82F6' : '#71717a', fontWeight: 600 }}>
                  {enquiry.nextFollowUpDate ? formatDate(enquiry.nextFollowUpDate) : 'Not scheduled'}
                </span>
              </div>
              {enquiry.convertedApplicationNo && (
                <div>
                  <strong>Converted Application:</strong>{' '}
                  <span className="badge badge-success">{enquiry.convertedApplicationNo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Remarks */}
        {enquiry.remarks && (
          <div style={{
            background: '#fafafa',
            borderLeft: '3px solid #3B82F6',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#374151',
          }}>
            <strong>Counsellor Notes:</strong> {enquiry.remarks}
          </div>
        )}

        {/* Follow-up Interaction History */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: '#19191f', margin: 0 }}>
              Interaction & Call History ({enquiryFollowUps.length})
            </h4>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onAddFollowUp(enquiry)}
            >
              + Log Interaction
            </button>
          </div>

          {enquiryFollowUps.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#71717a', fontStyle: 'italic', padding: '10px', background: '#fafafa', borderRadius: '6px' }}>
              No interactions logged yet for this enquiry. Click &quot;Log Interaction&quot; to record calls, parent visits, or WhatsApp replies.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {enquiryFollowUps.map(f => (
                <div
                  key={f.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    background: '#ffffff',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>{f.communicationMethod} by {f.assignedStaff}</strong>
                    <span style={{ color: '#6b7280' }}>{formatDate(f.followUpDate)} at {f.followUpTime}</span>
                  </div>
                  <div style={{ color: '#374151', marginBottom: '4px' }}>{f.interactionNotes}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#6b7280' }}>
                    <span>Next: {f.nextAction}</span>
                    <span className={`badge-status ${f.status === 'Completed' ? 'converted' : 'followup'}`}>{f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #E2E8F0',
          paddingTop: '14px',
          marginTop: '6px',
        }}>
          <div>
            {enquiry.status !== 'Lost' && enquiry.status !== 'Converted' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onMarkLost(enquiry)}
                style={{ color: '#dc2626' }}
              >
                <XCircle size={14} />
                <span>Mark Enquiry as Lost</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {enquiry.status !== 'Converted' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onConvertToApplication(enquiry)}
              >
                <FileText size={15} />
                <span>Convert to Official Application</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

