// ==========================================
// ListToolbar — lightweight read-only action bar
// (Export, Print, Refresh) for non-admin personas.
// Shares the .entity-toolbox styling for a consistent look.
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { exportToCSV } from '../../utils/export';

export interface ListToolbarColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export interface ListToolbarProps<T> {
  entityLabel: string;
  fileBaseName: string;
  rows: T[];
  columns: ListToolbarColumn<T>[];
  onRefresh?: () => void;
}

export function ListToolbar<T>({
  entityLabel,
  fileBaseName,
  rows,
  columns,
  onRefresh,
}: ListToolbarProps<T>) {
  const { addToast } = useERP();
  const headers = columns.map(c => c.header);
  const buildRows = (data: T[]) => data.map(r => columns.map(c => c.value(r)));

  const handleExport = () => {
    if (rows.length === 0) {
      addToast('warning', 'Nothing to Export', 'There are no records to export.');
      return;
    }
    exportToCSV(fileBaseName, headers, buildRows(rows));
    addToast('success', 'Export Complete', `${rows.length} ${entityLabel.toLowerCase()} record(s) exported to CSV.`);
  };

  const handlePrint = () => {
    if (rows.length === 0) {
      addToast('warning', 'Nothing to Print', 'There are no records to print.');
      return;
    }
    const win = window.open('', '_blank', 'width=1024,height=768');
    if (!win) {
      addToast('error', 'Print Blocked', 'Please allow pop-ups to print.');
      return;
    }
    const esc = (v: unknown) =>
      String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const thead = `<tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;
    const tbody = rows
      .map(r => `<tr>${columns.map(c => `<td>${esc(c.value(r))}</td>`).join('')}</tr>`)
      .join('');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(fileBaseName)}</title>
      <style>
        body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1e293b;padding:24px;}
        h2{margin:0 0 4px;color:#1D4ED8;} .meta{color:#64748b;font-size:12px;margin-bottom:16px;}
        table{border-collapse:collapse;width:100%;font-size:12px;}
        th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;}
        thead th{background:#3B82F6;color:#fff;}
        tbody tr:nth-child(even){background:#eff6ff;}
      </style></head><body>
      <h2>${esc(entityLabel)} Records</h2>
      <div class="meta">${rows.length} record(s) &bull; Generated ${new Date().toLocaleString()} &bull; School ERP by NTS Novalytix</div>
      <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  const handleRefresh = () => {
    onRefresh?.();
    addToast('info', 'Refreshed', `${entityLabel} list reloaded.`);
  };

  return (
    <div className="entity-toolbox" role="toolbar" aria-label={`${entityLabel} actions`}>
      <button className="tb-btn" onClick={handleExport} title="Export records to CSV">
        <Download size={15} /> <span>Export</span>
      </button>
      <button className="tb-btn" onClick={handlePrint} title="Print records">
        <Printer size={15} /> <span>Print</span>
      </button>
      <span className="tb-divider" />
      <button className="tb-btn" onClick={handleRefresh} title="Reload the list">
        <RefreshCw size={15} /> <span>Refresh</span>
      </button>
    </div>
  );
}
