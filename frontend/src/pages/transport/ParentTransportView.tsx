import React from 'react';
import { Student, TransportTrip, TransportSafetyEvent, TransportAlert } from '../../types';
import { StudentCommuteDetails } from '../../services/transportService';
import { TransportMap } from '../../components/transport/TransportMap';
import {
  Bus,
  Clock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Play,
  Navigation,
  Check,
  Bell,
} from 'lucide-react';

interface ParentTransportViewProps {
  currentRole: string;
  targetStudent: Student | null;
  parentChildren: Student[];
  selectedChild: Student | null;
  onSelectChild: (id: string) => void;
  hasStudentOpted: (student: Student) => boolean;
  commuteDetails: StudentCommuteDetails;
  activeTrip: TransportTrip | null;
  latestEvent?: TransportSafetyEvent;
  alerts: TransportAlert[];
  onSimulateStep: () => void;
}

export const ParentTransportView: React.FC<ParentTransportViewProps> = ({
  currentRole,
  targetStudent,
  parentChildren,
  selectedChild,
  onSelectChild,
  hasStudentOpted,
  commuteDetails,
  activeTrip,
  latestEvent,
  alerts,
  onSimulateStep,
}) => {
  const { route, assignedStop, pickupTime, dropTime } = commuteDetails;
  const isTripInTransit = activeTrip?.status === 'in_transit';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div className="transport-header">
        <div className="transport-header-title">
          <h1>School Bus Tracking</h1>
          <p>
            Live bus tracking and stop timings for {targetStudent?.fullName} • Class {targetStudent?.className} ({targetStudent?.section})
          </p>
        </div>

        <div className="transport-header-actions">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#dcfce7',
              color: '#15803d',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <CheckCircle2 size={15} />
            <span>Bus Service Opted</span>
          </span>
        </div>
      </div>

      {/* Multi-Child Selector for Parents */}
      {currentRole === 'parent' && parentChildren.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Select Child:</span>
          {parentChildren.map(c => {
            const isSelected = c.id === selectedChild?.id;
            const childOpted = hasStudentOpted(c);
            return (
              <button
                key={c.id}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => onSelectChild(c.id)}
              >
                {c.fullName} ({childOpted ? 'Bus' : 'Self-Commute'})
              </button>
            );
          })}
        </div>
      )}

      {/* Hero Commute Card */}
      <div className="commute-hero-card">
        <div className="commute-hero-title">
          <div className="commute-hero-icon">
            <Bus size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {route.routeNumber} — {route.routeName}
              </h2>
              <span className={`status-pill ${activeTrip?.status ? activeTrip.status.replace('_', '-') : 'scheduled'}`}>
                <span className={`status-dot ${isTripInTransit ? 'pulse-dot' : ''}`} />
                {activeTrip?.status === 'in_transit' ? 'Live on Route' : 'Scheduled'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Vehicle: <strong>{route.vehicleNo}</strong> • Bus Stop: <strong>{assignedStop?.stopName || targetStudent?.busStop}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-sm btn-outline"
            onClick={onSimulateStep}
            title="Test bus movement along route"
          >
            <Play size={13} />
            <span>Test Bus Move</span>
          </button>
        </div>
      </div>

      {/* Live Interactive Map */}
      <div className="fleet-map-container">
        <div style={{ padding: '12px 16px', background: '#fafaf9', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            <Navigation size={14} color="#3B82F6" />
            <span>Live GPS Bus Tracking</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Live GPS updates every 15 seconds
          </span>
        </div>

        <TransportMap
          route={route}
          trip={activeTrip}
          assignedStopName={assignedStop?.stopName || targetStudent?.busStop}
          height="450px"
          showSimControls={false}
          onSimulateStep={onSimulateStep}
        />
      </div>

      {/* Key Commute Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Boarding Safety Status */}
        <div className="fleet-panel-card">
          <div className="fleet-panel-header">
            <h4 className="fleet-panel-title">
              <ShieldCheck size={16} color="#3B82F6" />
              <span>Today's Bus Attendance</span>
            </h4>
          </div>
          <div className="fleet-panel-body">
            <div style={{ marginBottom: '12px' }}>
              {latestEvent ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '12px',
                      background: latestEvent.eventType === 'dropped_off' ? '#dcfce7' : 'var(--color-primary-light, #DBEAFE)',
                      color: latestEvent.eventType === 'dropped_off' ? '#15803d' : 'var(--color-primary-dark, #1D4ED8)',
                    }}
                  >
                    <Check size={13} />
                    {latestEvent.eventType === 'boarded' && 'Boarded Bus'}
                    {latestEvent.eventType === 'dropped_off' && 'Dropped Off'}
                    {latestEvent.eventType === 'not_boarded' && 'Absent'}
                    {latestEvent.eventType === 'exception' && 'Marked with Exception'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    at {latestEvent.timestamp.split('T')[1]?.substring(0, 5) || latestEvent.timestamp}
                  </span>
                </div>
              ) : (
                <span className="badge badge-info">Not yet boarded</span>
              )}
            </div>

            <div className="meta-row">
              <span className="meta-label">Current Trip</span>
              <span className="meta-val">
                {activeTrip?.tripType === 'morning_pickup' ? 'Morning Pickup' : 'Afternoon Drop'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Marked Via</span>
              <span className="meta-val">
                {latestEvent ? latestEvent.verificationMethod.replace('_', ' ') : 'Pending'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Conductor in Charge</span>
              <span className="meta-val">
                {latestEvent ? latestEvent.recordedByName : route.attendantName || 'School Staff'}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Stop & Timings */}
        <div className="fleet-panel-card">
          <div className="fleet-panel-header">
            <h4 className="fleet-panel-title">
              <Clock size={16} color="#3B82F6" />
              <span>Stop & Timings</span>
            </h4>
          </div>
          <div className="fleet-panel-body">
            <div className="meta-row">
              <span className="meta-label">Bus Stop</span>
              <span className="meta-val" style={{ color: '#3B82F6' }}>
                {assignedStop?.stopName || targetStudent?.busStop || 'Main Gate'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Morning Pickup</span>
              <span className="meta-val" style={{ color: '#15803d' }}>
                {pickupTime || '07:15 AM'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Afternoon Drop</span>
              <span className="meta-val" style={{ color: '#0f172a' }}>
                {dropTime || '03:45 PM'}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">School Arrival</span>
              <span className="meta-val">08:15 AM</span>
            </div>
          </div>
        </div>

        {/* Crew & Direct Contacts */}
        <div className="fleet-panel-card">
          <div className="fleet-panel-header">
            <h4 className="fleet-panel-title">
              <Phone size={16} color="#3B82F6" />
              <span>Driver & Support</span>
            </h4>
          </div>
          <div className="fleet-panel-body">
            <div className="meta-row">
              <span className="meta-label">Driver</span>
              <span className="meta-val">
                {route.driverName}{' '}
                <a
                  href={`tel:${route.driverPhone}`}
                  style={{ color: '#3B82F6', textDecoration: 'none', marginLeft: '4px' }}
                >
                  ({route.driverPhone})
                </a>
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Conductor</span>
              <span className="meta-val">
                {route.attendantName || 'Unassigned'}{' '}
                {route.attendantPhone && `(${route.attendantPhone})`}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Transport Office</span>
              <span className="meta-val">+91 80 2345 6789</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">School Security</span>
              <span className="meta-val">+91 80 2345 6790</span>
            </div>
          </div>
        </div>
      </div>

      {/* Route Alerts (if any) */}
      {alerts.length > 0 && (
        <div className="fleet-panel-card">
          <div className="fleet-panel-header">
            <h4 className="fleet-panel-title">
              <Bell size={16} color="#3B82F6" />
              <span>Bus Alerts & Notices</span>
            </h4>
          </div>
          <div className="fleet-panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.slice(0, 3).map(alt => (
                <div
                  key={alt.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: alt.severity === 'urgent' ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${alt.severity === 'urgent' ? '#fecaca' : '#e2e8f0'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                      {alt.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      {alt.message}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {alt.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
