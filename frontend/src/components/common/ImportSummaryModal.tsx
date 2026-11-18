// ==========================================
// ImportSummaryModal — post-import report
// Shows records loaded, skipped rows with reasons, and lets the
// admin re-download the generated login credentials.
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { CheckCircle2, AlertTriangle, Download, X } from 'lucide-react';

export interface ImportRowError {
  row: number;
  name: string;
  reason: string;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  credentials: number;
  errors: ImportRowError[];
  durationSec: number;
  failure?: string;
}

export const ImportSummaryModal: React.FC<{
  summary: ImportSummary | null;
  onClose: () => void;
  onDownloadCredentials?: () => void;
}> = ({ summary, onClose, onDownloadCredentials }) => {
  if (!summary) return null;
  const clean = summary.skipped === 0 && !summary.failure;
  const total = summary.imported + summary.skipped;

  return (
    <div className="import-summary-overlay" role="dialog" aria-modal="true" aria-label="Import summary">
      <div className="import-summary-card">
        <button className="ism-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className={`ism-badge ${clean ? 'ok' : 'warn'}`}>
          {clean ? <CheckCircle2 size={30} /> : <AlertTriangle size={30} />}
        </div>

        <h3 className="ism-title">{clean ? 'Import Successful' : 'Import Finished with Issues'}</h3>
        <p className="ism-sub">
          {total} row{total === 1 ? '' : 's'} processed in {summary.durationSec.toFixed(1)}s
        </p>

        <div className="ism-stats">
          <div className="ism-stat ok">
            <span className="ism-num">{summary.imported}</span>
            <span className="ism-lbl">Records loaded</span>
          </div>
          <div className={`ism-stat ${summary.skipped > 0 ? 'warn' : ''}`}>
            <span className="ism-num">{summary.skipped}</span>
            <span className="ism-lbl">Skipped</span>
          </div>
          <div className="ism-stat">
            <span className="ism-num">{summary.credentials}</span>
            <span className="ism-lbl">Logins created</span>
          </div>
        </div>

        {summary.failure && (
          <div className="ism-failure">
            <strong>Stopped early:</strong> {summary.failure}
          </div>
        )}

        {summary.errors.length > 0 && (
          <div className="ism-errors">
            <div className="ism-errors-head">
              Skipped rows ({summary.errors.length})
            </div>
            <div className="ism-errors-list">
              {summary.errors.slice(0, 200).map((e, i) => (
                <div className="ism-err" key={`${e.row}-${i}`}>
                  <span className="ism-err-row">Row {e.row}</span>
                  <span className="ism-err-name">{e.name || '—'}</span>
                  <span className="ism-err-reason">{e.reason}</span>
                </div>
              ))}
              {summary.errors.length > 200 && (
                <div className="ism-err ism-more">+ {summary.errors.length - 200} more…</div>
              )}
            </div>
          </div>
        )}

        <div className="ism-actions">
          {summary.credentials > 0 && onDownloadCredentials && (
            <button className="btn btn-secondary" onClick={onDownloadCredentials}>
              <Download size={15} />
              <span>Download credentials again</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
