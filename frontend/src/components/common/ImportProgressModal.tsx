// ==========================================
// ImportProgressModal — circular progress for bulk imports
// Shows a live ring, %, count, elapsed time and estimated time remaining.
// Developed by NTS Novalytix
// ==========================================

import React, { useEffect, useState } from 'react';

export interface ImportProgressState {
  active: boolean;
  done: number;
  total: number;
  startedAt: number;
  label?: string;
  phase?: 'uploading' | 'done';
}

const fmt = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return '—';
  if (sec < 1) return '<1s';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
};

export const ImportProgressModal: React.FC<{ state: ImportProgressState | null }> = ({ state }) => {
  // Live ticker so elapsed / ETA update smoothly between batch updates
  const [, tick] = useState(0);
  useEffect(() => {
    if (!state?.active) return;
    const id = setInterval(() => tick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [state?.active]);

  if (!state) return null;

  const total = Math.max(1, state.total);
  const pct = Math.min(100, Math.round((state.done / total) * 100));
  const elapsed = (Date.now() - state.startedAt) / 1000;
  const rate = state.done > 0 && elapsed > 0 ? state.done / elapsed : 0;
  const remaining = state.phase === 'done' ? 0 : rate > 0 ? (state.total - state.done) / rate : NaN;
  const complete = state.phase === 'done' || state.done >= state.total;

  const R = 54;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);

  return (
    <div className="import-progress-overlay" role="dialog" aria-modal="true" aria-label="Import progress">
      <div className="import-progress-card">
        <div className="ipc-ring-wrap">
          <svg viewBox="0 0 120 120" className="ipc-ring">
            <circle className="ipc-track" cx="60" cy="60" r={R} />
            <circle
              className="ipc-bar"
              cx="60"
              cy="60"
              r={R}
              style={{ strokeDasharray: C, strokeDashoffset: offset }}
            />
          </svg>
          <div className="ipc-center">
            <span className="ipc-pct">{pct}%</span>
            <span className="ipc-sub">{complete ? 'Done' : 'Importing'}</span>
          </div>
        </div>

        <div className="ipc-title">{complete ? 'Import Complete' : state.label || 'Importing Students'}</div>
        <div className="ipc-count">
          <strong>{Math.min(state.done, state.total)}</strong> of <strong>{state.total}</strong> records
          {!complete && ' saved to database…'}
        </div>

        <div className="ipc-meta">
          <div className="ipc-metacell">
            <span className="ipc-metaval">{fmt(elapsed)}</span>
            <span className="ipc-metalbl">Elapsed</span>
          </div>
          <div className="ipc-metacell">
            <span className="ipc-metaval">{complete ? '0s' : fmt(remaining)}</span>
            <span className="ipc-metalbl">Remaining</span>
          </div>
        </div>

        {!complete && (
          <div className="ipc-hint">Generating login IDs &amp; passwords — please keep this tab open.</div>
        )}
      </div>
    </div>
  );
};
