import React from 'react';
import { TransportAlert } from '../../types';
import {
  CheckCircle2,
  Plus,
  Filter,
} from 'lucide-react';

interface AlertsCenterTabProps {
  alerts: TransportAlert[];
  severityFilter: string;
  onSeverityFilterChange: (sev: string) => void;
  onOpenBroadcast: () => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

export const AlertsCenterTab: React.FC<AlertsCenterTabProps> = ({
  alerts,
  severityFilter,
  onSeverityFilterChange,
  onOpenBroadcast,
  onAcknowledgeAlert,
}) => {
  return (
    <div>
      {/* Filter and Broadcast Bar */}
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
          <label className="filter-label">Priority:</label>
          <select
            className="form-select filter-select filter-select-sm"
            value={severityFilter}
            onChange={e => onSeverityFilterChange(e.target.value)}
            aria-label="Filter Alerts Priority"
          >
            <option value="all">All Alerts ({alerts.length})</option>
            <option value="urgent">Urgent</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={onOpenBroadcast}>
          <Plus size={14} />
          <span>Send Alert</span>
        </button>
      </div>

      {/* Alerts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {alerts.map(alt => {
          const isAcknowledged =
            alt.acknowledgedBy &&
            (Array.isArray(alt.acknowledgedBy) ? alt.acknowledgedBy.length > 0 : true);

          return (
            <div key={alt.id} className={`alert-feed-item ${alt.severity}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background:
                        alt.severity === 'urgent'
                          ? '#fee2e2'
                          : alt.severity === 'warning'
                          ? '#fef3c7'
                          : '#f1f5f9',
                      color:
                        alt.severity === 'urgent'
                          ? '#b91c1c'
                          : alt.severity === 'warning'
                          ? '#b45309'
                          : '#475569',
                      textTransform: 'uppercase',
                    }}
                  >
                    {alt.severity}
                  </span>

                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {alt.title}
                  </h4>

                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Route: <strong>{alt.busNumber}</strong> • {alt.timestamp}
                  </span>
                </div>

                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                  {alt.message}
                </p>
              </div>

              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {isAcknowledged ? (
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} />
                    <span>
                      Seen by{' '}
                      {Array.isArray(alt.acknowledgedBy)
                        ? alt.acknowledgedBy.join(', ')
                        : alt.acknowledgedBy}
                    </span>
                  </span>
                ) : (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onAcknowledgeAlert(alt.id)}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div className="card" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
            No alerts found matching this filter.
          </div>
        )}
      </div>
    </div>
  );
};
