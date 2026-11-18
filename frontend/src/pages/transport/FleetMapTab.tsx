import React from 'react';
import { TransportRoute, TransportTrip } from '../../types';
import { TransportMap } from '../../components/transport/TransportMap';
import { gpsService } from '../../services/gpsService';
import {
  Bus,
  MapPin,
  Phone,
  Play,
  CheckCircle2,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface FleetMapTabProps {
  routes: TransportRoute[];
  selectedRouteId: string;
  onSelectRouteId: (id: string) => void;
  activeRoute: TransportRoute | null;
  activeTrip: TransportTrip | null;
  onSimulateStep: () => void;
  onStartTrip: (tripId: string) => void;
  onEndTrip: (tripId: string) => void;
  onOpenCheckIn: (trip: TransportTrip) => void;
}

export const FleetMapTab: React.FC<FleetMapTabProps> = ({
  routes,
  selectedRouteId,
  onSelectRouteId,
  activeRoute,
  activeTrip,
  onSimulateStep,
  onStartTrip,
  onEndTrip,
  onOpenCheckIn,
}) => {
  if (!activeRoute) {
    return (
      <div className="card" style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
        No route selected or available.
      </div>
    );
  }

  const busLoc = activeTrip?.lastLocationUpdate;
  const isTripInTransit = activeTrip?.status === 'in_transit';
  const isTripScheduled = activeTrip?.status === 'scheduled';

  return (
    <div className="fleet-split-layout">
      {/* Main Map with Clean Integrated Toolbar */}
      <div className="fleet-map-container">
        <div className="fleet-map-toolbar">
          <div className="fleet-route-select-group">
            <label htmlFor="routeSelect">Route</label>
            <select
              id="routeSelect"
              className="fleet-route-select"
              value={selectedRouteId}
              onChange={e => onSelectRouteId(e.target.value)}
            >
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.routeNumber} — {r.routeName}
                </option>
              ))}
            </select>

            {activeTrip && (
              <span className={`status-pill ${activeTrip.status.replace('_', '-')}`}>
                <span className={`status-dot ${isTripInTransit ? 'pulse-dot' : ''}`} />
                {activeTrip.status === 'in_transit'
                  ? 'In Transit'
                  : activeTrip.status === 'arrived_at_school'
                  ? 'At School'
                  : activeTrip.status === 'scheduled'
                  ? 'Scheduled'
                  : activeTrip.status === 'completed'
                  ? 'Completed'
                  : 'Offline'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={onSimulateStep}
              title="Advance bus coordinates on route"
            >
              <Play size={13} />
              <span>Simulate Move</span>
            </button>

            {isTripScheduled && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onStartTrip(activeTrip.id)}
              >
                <Play size={13} />
                <span>Start Trip</span>
              </button>
            )}

            {isTripInTransit && (
              <button
                className="btn btn-sm btn-outline"
                style={{ borderColor: '#16a34a', color: '#16a34a' }}
                onClick={() => onEndTrip(activeTrip.id)}
              >
                <CheckCircle2 size={13} />
                <span>End Trip</span>
              </button>
            )}

            {activeTrip && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => onOpenCheckIn(activeTrip)}
              >
                <Users size={13} />
                <span>Student Roster</span>
              </button>
            )}
          </div>
        </div>

        {/* Map Canvas */}
        <TransportMap
          route={activeRoute}
          trip={activeTrip}
          height="540px"
          showSimControls={false}
          onSimulateStep={onSimulateStep}
        />
      </div>

      {/* Right Dock: Route Inspector & Real-Time Stop Timeline */}
      <div className="fleet-sidebar">
        {/* Vehicle & Staff Duty Dossier Card */}
        <div className="fleet-panel-card">
          <div className="fleet-panel-header">
            <h4 className="fleet-panel-title">
              <Bus size={15} color="#475569" />
              <span>Vehicle & Driver Assignment</span>
            </h4>
            <span style={{ fontSize: '11px', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
              {activeRoute.vehicleType}
            </span>
          </div>

          <div className="fleet-panel-body">
            <div className="meta-row">
              <span className="meta-label">Bus Registration</span>
              <span className="meta-val font-weight-bold">{activeRoute.vehicleNo}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Assigned Driver</span>
              <span className="meta-val">
                {activeRoute.driverName}{' '}
                <a
                  href={`tel:${activeRoute.driverPhone}`}
                  style={{ color: '#3B82F6', textDecoration: 'none', marginLeft: '6px' }}
                  title="Call Driver"
                >
                  <Phone size={13} style={{ verticalAlign: 'middle' }} />
                </a>
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Conductor / Escort</span>
              <span className="meta-val">
                {activeRoute.attendantName || 'Unassigned'}{' '}
                {activeRoute.attendantPhone && (
                  <a
                    href={`tel:${activeRoute.attendantPhone}`}
                    style={{ color: '#3B82F6', textDecoration: 'none', marginLeft: '6px' }}
                    title="Call Conductor"
                  >
                    <Phone size={13} style={{ verticalAlign: 'middle' }} />
                  </a>
                )}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Safety Clearance</span>
              <span className="meta-val" style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700 }}>
                <ShieldCheck size={14} color="#15803d" /> Police & Breathalyzer Verified
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Capacity Roster</span>
              <span className="meta-val">
                {activeRoute.assignedStudentsCount} / {activeRoute.capacity} students ({Math.round(((activeRoute.assignedStudentsCount || 0) / activeRoute.capacity) * 100)}%)
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Telemetry Speed</span>
              <span className="meta-val">
                <strong style={{ color: (busLoc?.speedKmH || 0) > 40 ? '#dc2626' : '#0f172a' }}>
                  {busLoc?.speedKmH ? `${busLoc.speedKmH} km/h` : 'Stationary (0 km/h)'}
                </strong>{' '}
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>(Limit: 40 km/h)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stop Progression Timeline Card */}
        <div className="fleet-panel-card">
          <div className="fleet-panel-header">
            <h4 className="fleet-panel-title">
              <MapPin size={16} color="#3B82F6" />
              <span>Route Stops & Timings</span>
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {activeRoute.stops.length} stops
            </span>
          </div>

          <div className="fleet-panel-body" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <div className="stops-timeline">
              {activeRoute.stops.map((stop, idx) => {
                const etaMinutes =
                  busLoc && stop.latitude && stop.longitude
                    ? gpsService.estimateEtaMinutes(
                        busLoc.latitude,
                        busLoc.longitude,
                        stop.latitude,
                        stop.longitude,
                        busLoc.speedKmH || 30
                      )
                    : null;

                const isNextStop = etaMinutes !== null && etaMinutes < 10 && etaMinutes > 0;

                return (
                  <div
                    key={stop.id || idx}
                    className={`stop-item ${isNextStop ? 'active' : ''}`}
                  >
                    <div className="stop-node">{idx + 1}</div>
                    <div className="stop-content">
                      <div className="stop-header-line">
                        <span className="stop-name" title={stop.stopName}>
                          {stop.stopName}
                        </span>
                        {etaMinutes !== null && isTripInTransit && (
                          <span className="stop-eta-pill">
                            {etaMinutes} min away
                          </span>
                        )}
                      </div>
                      <div className="stop-times">
                        Pick: <strong>{stop.pickupTime}</strong> • Drop: <strong>{stop.dropTime}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* School arrival node */}
              <div className="stop-item">
                <div className="stop-node" style={{ borderColor: '#15803d', color: '#15803d' }}>
                  🏫
                </div>
                <div className="stop-content">
                  <div className="stop-header-line">
                    <span className="stop-name">School Main Campus</span>
                  </div>
                  <div className="stop-times">
                    Arrival & Drop-off Gate
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
