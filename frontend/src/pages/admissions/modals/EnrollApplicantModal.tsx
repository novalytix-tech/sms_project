import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionApplication, Student } from '../../../types';
import { admissionService } from '../../../services/admissionService';
import { classService } from '../../../services/classService';
import { transportService } from '../../../services/transportService';
import { studentService } from '../../../services/studentService';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface EnrollApplicantModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AdmissionApplication | null;
  classes: ReturnType<typeof classService.getAll>;
  routes: ReturnType<typeof transportService.getAllRoutes>;
  onSuccess: (student: Student) => void;
}

export const EnrollApplicantModal: React.FC<EnrollApplicantModalProps> = ({
  isOpen,
  onClose,
  application,
  classes,
  routes,
  onSuccess,
}) => {
  const targetClass = classes.find(c => c.id === application?.targetClassId) || classes[0];
  const defaultSec = application?.targetSection || targetClass?.section || 'A';

  const [section, setSection] = useState(defaultSec);
  const [rollNo, setRollNo] = useState(
    studentService.getNextRollNo(targetClass?.id || '', defaultSec)
  );
  const [busRouteId, setBusRouteId] = useState(routes[0]?.id || '');
  const [busStop, setBusStop] = useState(routes[0]?.stops[0]?.stopName || '');
  const [allowOverride, setAllowOverride] = useState(false);
  const [error, setError] = useState('');

  if (!application) return null;

  // Capacity check
  const capacity = admissionService.checkCapacity(application.targetClassId);
  const unverifiedDocs = (application.documents || []).filter(d => d.required && !d.verified);
  const isFeePending = !application.isFeePaid;

  const hasRestrictions = capacity.isFull || unverifiedDocs.length > 0 || isFeePending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = admissionService.enrollApplicant(application.id, {
      rollNo,
      section,
      busRouteId,
      busStop,
      enrolledBy: 'Dr. Arvind Swaminathan (Principal)',
      allowUnverifiedDocsOverride: allowOverride,
      allowFeePendingEnrollment: allowOverride,
      allowCapacityOverride: allowOverride,
    });

    if (res.success && res.student) {
      onSuccess(res.student);
      onClose();
    } else {
      setError(res.error || 'Enrollment validation failed.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Confirm Final Enrollment: ${application.firstName} ${application.lastName}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ background: '#DBEAFE', color: '#a51d29', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{
          background: '#F6F8FC',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '13px',
        }}>
          <div>Applicant: <strong>{application.firstName} {application.lastName}</strong> • Application Ref: <code>{application.applicationNo}</code></div>
          <div style={{ marginTop: '2px', color: '#6b7280' }}>
            Enrolling will generate a permanent Admission Number, create a student record in the Directory, and allocate active session capacity.
          </div>
        </div>

        {/* Capacity & Clearance Validation Warnings */}
        {hasRestrictions && (
          <div style={{
            background: '#fff3dd',
            border: '1px solid #fed7aa',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12.5px',
            color: '#98440e',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>Enrollment Clearance Prerequisites:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {capacity.isFull && (
                <li>Class {application.targetClassName} is currently full ({capacity.confirmed} seats filled out of {capacity.totalSeats}).</li>
              )}
              {unverifiedDocs.length > 0 && (
                <li>{unverifiedDocs.length} mandatory document(s) pending verification ({unverifiedDocs.map(d => d.title).join(', ')}).</li>
              )}
              {isFeePending && (
                <li>Admission registration fee has not been recorded as cleared.</li>
              )}
            </ul>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Allotted Section *</label>
            <select
              className="form-select"
              value={section}
              onChange={e => {
                const newSec = e.target.value;
                setSection(newSec);
                setRollNo(studentService.getNextRollNo(targetClass?.id || '', newSec));
              }}
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Roll No *</label>
            <input
              type="text"
              className="form-input"
              required
              value={rollNo}
              onChange={e => setRollNo(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Transport Bus Route (Optional)</label>
            <select
              className="form-select"
              value={busRouteId}
              onChange={e => {
                setBusRouteId(e.target.value);
                const r = routes.find(rt => rt.id === e.target.value);
                if (r && r.stops.length > 0) setBusStop(r.stops[0].stopName);
              }}
            >
              <option value="">No Transport Required (Self)</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.routeName} ({r.routeNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Designated Bus Stop</label>
            <input
              type="text"
              className="form-input"
              disabled={!busRouteId}
              placeholder="e.g. Civil Lines Crossing"
              value={busStop}
              onChange={e => setBusStop(e.target.value)}
            />
          </div>
        </div>

        {hasRestrictions && (
          <div style={{
            background: '#fafafa',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '10px 14px',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={allowOverride}
                onChange={e => setAllowOverride(e.target.checked)}
              />
              <span style={{ fontWeight: 600, color: '#1f2937' }}>
                Authorize Principal Override for pending prerequisites / capacity
              </span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={hasRestrictions && !allowOverride}
            style={{
              background: '#15803d',
              borderColor: '#15803d',
              opacity: hasRestrictions && !allowOverride ? 0.6 : 1,
            }}
          >
            <CheckCircle size={15} />
            <span>Confirm & Generate Admission Number</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
