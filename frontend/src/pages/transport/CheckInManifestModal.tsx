import React from 'react';
import { TransportTrip, TransportRoute, Student, TransportSafetyEvent } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  UserCheck,
  CheckCircle2,
  UserX,
} from 'lucide-react';

interface CheckInManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TransportTrip;
  route?: TransportRoute;
  assignedStudents: Student[];
  safetyEvents: TransportSafetyEvent[];
  checkInStop: string;
  onCheckInStopChange: (stop: string) => void;
  verificationMethod: 'manual_attendant' | 'qr_code' | 'rfid_card' | 'emergency_override';
  onVerificationMethodChange: (method: 'manual_attendant' | 'qr_code' | 'rfid_card' | 'emergency_override') => void;
  onRecordStudentEvent: (studentId: string, eventType: 'boarded' | 'dropped_off' | 'not_boarded' | 'exception') => void;
}

export const CheckInManifestModal: React.FC<CheckInManifestModalProps> = ({
  isOpen,
  onClose,
  trip,
  route,
  assignedStudents,
  safetyEvents,
  checkInStop,
  onCheckInStopChange,
  verificationMethod,
  onVerificationMethodChange,
  onRecordStudentEvent,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bus Attendance — ${trip.routeNumber || trip.vehicleNo}`}
      size="large"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div>
        {/* Top Stop & Method Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            background: '#f8fafc',
            padding: '12px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <label className="form-label required" style={{ fontSize: '13px', marginBottom: '4px' }}>
              Current Bus Stop
            </label>
            <select
              className="form-select"
              value={checkInStop}
              onChange={e => onCheckInStopChange(e.target.value)}
            >
              {route?.stops.map(s => (
                <option key={s.stopName} value={s.stopName}>
                  {s.stopName} (Pick: {s.pickupTime} / Drop: {s.dropTime})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label required" style={{ fontSize: '13px', marginBottom: '4px' }}>
              Verification Method
            </label>
            <select
              className="form-select"
              value={verificationMethod}
              onChange={e => onVerificationMethodChange(e.target.value as any)}
            >
              <option value="manual_attendant">Manual Attendance by Conductor</option>
              <option value="qr_code">QR Code Scan</option>
              <option value="rfid_card">RFID Bus Card Swipe</option>
              <option value="emergency_override">Emergency Override</option>
            </select>
          </div>
        </div>

        {/* Student Manifest Table */}
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Assigned Stop</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Mark</th>
              </tr>
            </thead>
            <tbody>
              {assignedStudents.map(stud => {
                const studentEventsOnTrip = safetyEvents.filter(
                  e => e.tripId === trip.id && e.studentId === stud.id
                );
                const isBoarded = studentEventsOnTrip.some(e => e.eventType === 'boarded');
                const isDroppedOff = studentEventsOnTrip.some(e => e.eventType === 'dropped_off');
                const isAbsent = studentEventsOnTrip.some(e => e.eventType === 'not_boarded');

                return (
                  <tr key={stud.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{stud.fullName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Roll #{stud.rollNo} • Class {stud.className} ({stud.section})
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {stud.busStop || 'Main Gate'}
                      </div>
                    </td>

                    <td>
                      {isDroppedOff ? (
                        <span className="badge badge-success">Dropped Off</span>
                      ) : isBoarded ? (
                        <span className="badge badge-info">Boarded Bus</span>
                      ) : isAbsent ? (
                        <span className="badge badge-secondary">Absent</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Not Boarded</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={isBoarded || isDroppedOff}
                          style={{
                            color: isBoarded ? '#94a3b8' : '#16a34a',
                            borderColor: isBoarded ? '#e2e8f0' : '#16a34a',
                          }}
                          onClick={() => onRecordStudentEvent(stud.id, 'boarded')}
                          title="Mark Boarded"
                        >
                          <UserCheck size={13} />
                          <span>Board</span>
                        </button>

                        <button
                          className="btn btn-sm btn-outline"
                          disabled={isDroppedOff}
                          style={{
                            color: isDroppedOff ? '#94a3b8' : '#15803d',
                            borderColor: isDroppedOff ? '#e2e8f0' : '#15803d',
                          }}
                          onClick={() => onRecordStudentEvent(stud.id, 'dropped_off')}
                          title="Mark Dropped Off"
                        >
                          <CheckCircle2 size={13} />
                          <span>Drop</span>
                        </button>

                        <button
                          className="btn btn-sm btn-outline"
                          disabled={isBoarded || isDroppedOff || isAbsent}
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => onRecordStudentEvent(stud.id, 'not_boarded')}
                          title="Mark Absent"
                        >
                          <UserX size={13} />
                          <span>Absent</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {assignedStudents.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No enrolled students assigned to this route.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
