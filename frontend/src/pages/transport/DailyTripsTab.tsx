import React from 'react';
import { TransportTrip, TransportRoute } from '../../types';
import {
  Users,
  Play,
  CheckCircle2,
} from 'lucide-react';

interface DailyTripsTabProps {
  trips: TransportTrip[];
  routes: TransportRoute[];
  onOpenCheckIn: (trip: TransportTrip) => void;
  onStartTrip: (tripId: string) => void;
  onEndTrip: (tripId: string) => void;
}

export const DailyTripsTab: React.FC<DailyTripsTabProps> = ({
  trips,
  routes,
  onOpenCheckIn,
  onStartTrip,
  onEndTrip,
}) => {
  return (
    <div className="transport-table-card">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
          Daily Bus Trips
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Today's morning pickup, afternoon drop, and student attendance
        </p>
      </div>

      <div className="table-responsive">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Bus & Route</th>
              <th>Shift</th>
              <th>Driver & Conductor</th>
              <th>Status</th>
              <th>Time</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.map(trip => {
              const r = routes.find(rt => rt.id === trip.routeId);
              const isTripInTransit = trip.status === 'in_transit';

              return (
                <tr key={trip.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                      {trip.id}
                    </span>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{trip.tripDate}</div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                      {trip.routeNumber || trip.vehicleNo}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {r?.routeName || trip.routeId}
                    </div>
                  </td>

                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: trip.tripType === 'morning_pickup' ? '#fff7ed' : '#f0fdf4',
                        color: trip.tripType === 'morning_pickup' ? '#c2410c' : '#15803d',
                      }}
                    >
                      {trip.tripType === 'morning_pickup' ? 'Morning Pickup' : 'Afternoon Drop'}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      {trip.driverName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Conductor: {trip.attendantName || 'Unassigned'}
                    </div>
                  </td>

                  <td>
                    <span className={`status-pill ${trip.status.replace('_', '-')}`}>
                      <span className={`status-dot ${isTripInTransit ? 'pulse-dot' : ''}`} />
                      {trip.status === 'in_transit'
                        ? 'In Transit'
                        : trip.status === 'arrived_at_school'
                        ? 'At Campus'
                        : trip.status === 'scheduled'
                        ? 'Scheduled'
                        : trip.status === 'completed'
                        ? 'Completed'
                        : 'Offline'}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontSize: '13px', color: '#0f172a' }}>
                      <strong>{trip.actualStartTime || trip.scheduledStartTime}</strong>
                      <span style={{ color: '#94a3b8' }}> — </span>
                      <span>{trip.actualEndTime || trip.scheduledEndTime}</span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onOpenCheckIn(trip)}
                        title="Mark Student Attendance"
                      >
                        <Users size={14} />
                        <span>Attendance</span>
                      </button>

                      {trip.status === 'scheduled' && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => onStartTrip(trip.id)}
                        >
                          <Play size={13} />
                          <span>Start</span>
                        </button>
                      )}

                      {trip.status === 'in_transit' && (
                        <button
                          className="btn btn-sm btn-outline"
                          style={{ color: '#16a34a', borderColor: '#16a34a' }}
                          onClick={() => onEndTrip(trip.id)}
                        >
                          <CheckCircle2 size={13} />
                          <span>End</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {trips.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No active or scheduled trips found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
