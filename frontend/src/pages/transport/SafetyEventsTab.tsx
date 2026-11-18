import React from 'react';
import { TransportSafetyEvent } from '../../types';
import {
  Filter,
  RefreshCw,
  Edit,
} from 'lucide-react';

interface SafetyEventsTabProps {
  events: TransportSafetyEvent[];
  filterType: string;
  onFilterChange: (type: string) => void;
  onRefresh: () => void;
  onOpenCorrection: (event: TransportSafetyEvent) => void;
}

export const SafetyEventsTab: React.FC<SafetyEventsTabProps> = ({
  events,
  filterType,
  onFilterChange,
  onRefresh,
  onOpenCorrection,
}) => {
  return (
    <div>
      {/* Top Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="filter-item">
          <Filter size={15} color="#3B82F6" />
          <label className="filter-label">Show:</label>
          <select
            className="form-select filter-select filter-select-md"
            value={filterType}
            onChange={e => onFilterChange(e.target.value)}
            aria-label="Filter Safety Records"
          >
            <option value="all">All Records ({events.length})</option>
            <option value="boarded">Boarded</option>
            <option value="dropped_off">Dropped Off</option>
            <option value="not_boarded">Absent</option>
            <option value="exception">Flagged Exceptions</option>
          </select>
        </div>

        <button className="btn btn-sm btn-outline" onClick={onRefresh}>
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Events Table Card */}
      <div className="transport-table-card">
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Student</th>
                <th>Status</th>
                <th>Bus Stop / Trip</th>
                <th>Method</th>
                <th>Marked By</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(evt => {
                const isException = evt.isExceptionFlagged;

                return (
                  <tr
                    key={evt.id}
                    style={{
                      background: isException ? '#fff5f5' : undefined,
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                        {evt.timestamp.split('T')[1]?.substring(0, 5) || evt.timestamp}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {evt.timestamp.split('T')[0]}
                      </div>
                    </td>

                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '13px' }}>{evt.studentName}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Class {evt.className}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background:
                            evt.eventType === 'boarded'
                              ? '#dcfce7'
                              : evt.eventType === 'dropped_off'
                              ? '#dcfce7'
                              : evt.eventType === 'not_boarded'
                              ? '#f1f5f9'
                              : '#fee2e2',
                          color:
                            evt.eventType === 'boarded'
                              ? '#15803d'
                              : evt.eventType === 'dropped_off'
                              ? '#15803d'
                              : evt.eventType === 'not_boarded'
                              ? '#475569'
                              : '#b91c1c',
                        }}
                      >
                        {evt.eventType === 'boarded' && '✓ Boarded'}
                        {evt.eventType === 'dropped_off' && '✓ Dropped Off'}
                        {evt.eventType === 'not_boarded' && '✕ Absent'}
                        {evt.eventType === 'exception' && '⚠ Exception'}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
                        {evt.stopName || 'Main Campus Gate'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Trip: {evt.tripId}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: '#475569', textTransform: 'capitalize' }}>
                        {evt.verificationMethod.replace('_', ' ')}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', color: '#0f172a' }}>{evt.recordedByName}</div>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', color: isException ? '#b91c1c' : '#334155' }}>
                        {evt.notes || '—'}
                      </div>
                      {evt.correctionHistory && evt.correctionHistory.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#d97706', marginTop: '3px', fontWeight: 600 }}>
                          Corrected by {evt.correctionHistory[0].correctedByName}
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => onOpenCorrection(evt)}
                        title="Edit attendance record"
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {events.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No safety checkpoint records found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
