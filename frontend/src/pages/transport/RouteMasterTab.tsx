import React from 'react';
import { TransportRoute } from '../../types';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { formatCurrencyINR } from '../../utils/formatters';
import { Bus, AlertTriangle } from 'lucide-react';

interface RouteMasterTabProps {
  routes: TransportRoute[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const RouteMasterTab: React.FC<RouteMasterTabProps> = ({
  routes,
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div>
      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search by route, driver, or stop name..."
          ariaLabel="Search routes"
          wrapperStyle={{ maxWidth: '420px', width: '100%' }}
        />
      </div>

      {/* Routes Grid */}
      <div className="routes-grid">
        {routes.map(r => {
          const isOverCapacity = (r.assignedStudentsCount || 0) > r.capacity;
          const percentOccupied = Math.round(((r.assignedStudentsCount || 0) / r.capacity) * 100);

          return (
            <div key={r.id} className="route-card">
              <div className="route-card-header">
                <div>
                  <div className="route-card-title">
                    <Bus size={18} color="#3B82F6" />
                    <h3>{r.routeNumber}</h3>
                    <Badge status={r.status} />
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>
                    {r.routeName}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#f1f5f9',
                    color: '#475569',
                  }}
                >
                  {r.vehicleType}
                </span>
              </div>

              <div className="route-card-body">
                {/* Meta details */}
                <div className="meta-row">
                  <span className="meta-label">Bus Number</span>
                  <span className="meta-val">{r.vehicleNo}</span>
                </div>

                <div className="meta-row">
                  <span className="meta-label">Driver</span>
                  <span className="meta-val">
                    {r.driverName}{' '}
                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 400 }}>
                      ({r.driverPhone})
                    </span>
                  </span>
                </div>

                <div className="meta-row">
                  <span className="meta-label">Conductor</span>
                  <span className="meta-val">
                    {r.attendantName || 'Unassigned'}{' '}
                    {r.attendantPhone && (
                      <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 400 }}>
                        ({r.attendantPhone})
                      </span>
                    )}
                  </span>
                </div>

                {/* Capacity Bar */}
                <div className="route-progress-bar-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span className="meta-label">Seating:</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: isOverCapacity ? '#dc2626' : '#0f172a',
                      }}
                    >
                      {r.assignedStudentsCount} of {r.capacity} seats ({percentOccupied}%)
                    </span>
                  </div>
                  <div className="route-progress-bar">
                    <div
                      className="route-progress-fill"
                      style={{
                        width: `${Math.min(100, percentOccupied)}%`,
                        background: isOverCapacity
                          ? '#dc2626'
                          : percentOccupied > 80
                          ? '#f59e0b'
                          : '#16a34a',
                      }}
                    />
                  </div>
                  {isOverCapacity && (
                    <div style={{ color: '#dc2626', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <AlertTriangle size={13} />
                      <span>Route has exceeded maximum seat capacity</span>
                    </div>
                  )}
                </div>

                {/* Stops Summary */}
                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Stops on this Route ({r.stops.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {r.stops.map((stop, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#3B82F6', fontWeight: 700 }}>{sIdx + 1}.</span>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{stop.stopName}</span>
                        </div>
                        <div style={{ color: '#64748b' }}>
                          <span>Pick {stop.pickupTime}</span> • <span>Drop {stop.dropTime}</span>
                          {stop.feePerTerm > 0 && (
                            <span style={{ marginLeft: '8px', color: '#16a34a', fontWeight: 600 }}>
                              {formatCurrencyINR(stop.feePerTerm)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {routes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            No routes matching your search query.
          </div>
        )}
      </div>
    </div>
  );
};
