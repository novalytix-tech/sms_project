// ==========================================
// EntityToolbox — reusable admin action bar
// (New, Edit, Duplicate, Delete, Copy, Paste,
//  Import, Template, Export, Print, Refresh)
// Developed by NTS Novalytix
// ==========================================

import React, { useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  CopyPlus,
  Trash2,
  Copy,
  ClipboardPaste,
  Upload,
  FileSpreadsheet,
  Download,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ConfirmDialog } from './ConfirmDialog';
import { exportToCSV } from '../../utils/export';
import { parseCSV, toTSV } from '../../utils/csv';

export interface ToolboxColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export interface EntityToolboxProps<T> {
  /** Singular label, e.g. "Student" */
  entityLabel: string;
  /** Base file name for exports, e.g. "Students_Directory" */
  fileBaseName: string;
  /** Currently visible (filtered) rows */
  rows: T[];
  /** Columns used for Export / Template / Print / Copy */
  columns: ToolboxColumn<T>[];
  getId: (row: T) => string;
  selectedIds: string[];
  /** Whether the current user may create/modify records */
  canModify?: boolean;
  onNew?: () => void;
  onEditOne?: (id: string) => void;
  onDuplicateMany?: (ids: string[]) => void;
  onDeleteMany?: (ids: string[]) => void;
  /** Receives parsed CSV rows (from Import or Paste) */
  onImport?: (records: Record<string, string>[]) => void;
  onRefresh?: () => void;
  onClearSelection?: () => void;
}

export function EntityToolbox<T>({
  entityLabel,
  fileBaseName,
  rows,
  columns,
  getId,
  selectedIds,
  canModify = true,
  onNew,
  onEditOne,
  onDuplicateMany,
  onDeleteMany,
  onImport,
  onRefresh,
  onClearSelection,
}: EntityToolboxProps<T>) {
  const { addToast } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const headers = columns.map(c => c.header);
  const selectedRows = rows.filter(r => selectedIds.includes(getId(r)));
  const buildRows = (data: T[]) => data.map(r => columns.map(c => c.value(r)));

  const needModify = (): boolean => {
    if (!canModify) {
      addToast('error', 'Access Denied', `You are not authorized to modify ${entityLabel.toLowerCase()} records.`);
      return false;
    }
    return true;
  };

  const requireSelection = (min: number): boolean => {
    if (selectedIds.length < min) {
      addToast('warning', 'No Selection', `Please select ${min === 1 ? 'a row' : 'at least one row'} first.`);
      return false;
    }
    return true;
  };

  const handleNew = () => {
    if (!needModify()) return;
    onNew?.();
  };

  const handleEdit = () => {
    if (!needModify()) return;
    if (selectedIds.length !== 1) {
      addToast('warning', 'Select One Row', 'Please select exactly one row to edit.');
      return;
    }
    onEditOne?.(selectedIds[0]);
  };

  const handleDuplicate = () => {
    if (!needModify() || !requireSelection(1)) return;
    onDuplicateMany?.(selectedIds);
  };

  const handleDeleteClick = () => {
    if (!needModify() || !requireSelection(1)) return;
    setConfirmDelete(true);
  };

  const handleCopy = async () => {
    if (!requireSelection(1)) return;
    const tsv = toTSV(headers, buildRows(selectedRows));
    try {
      await navigator.clipboard.writeText(tsv);
      addToast('success', 'Copied', `${selectedRows.length} ${entityLabel.toLowerCase()} row(s) copied to clipboard.`);
    } catch {
      addToast('error', 'Copy Failed', 'Clipboard access was blocked by the browser.');
    }
  };

  const handlePaste = async () => {
    if (!needModify()) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        addToast('warning', 'Clipboard Empty', 'Nothing to paste.');
        return;
      }
      const records = parseCSV(text.includes(',') ? text : text.replace(/\t/g, ','));
      if (records.length === 0) {
        addToast('warning', 'Nothing to Paste', 'No valid rows were found on the clipboard.');
        return;
      }
      onImport?.(records);
    } catch {
      addToast('error', 'Paste Failed', 'Clipboard access was blocked by the browser.');
    }
  };

  const handleImportClick = () => {
    if (!needModify()) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const records = parseCSV(String(reader.result || ''));
      if (records.length === 0) {
        addToast('warning', 'Empty File', 'No data rows found in the selected CSV file.');
        return;
      }
      onImport?.(records);
    };
    reader.onerror = () => addToast('error', 'Import Failed', 'Could not read the selected file.');
    reader.readAsText(file);
  };

  const handleTemplate = () => {
    exportToCSV(`${fileBaseName}_Template`, headers, []);
    addToast('success', 'Template Downloaded', `Blank ${entityLabel.toLowerCase()} import template saved.`);
  };

  const handleExport = () => {
    if (rows.length === 0) {
      addToast('warning', 'Nothing to Export', 'There are no records to export.');
      return;
    }
    exportToCSV(fileBaseName, headers, buildRows(rows));
    addToast('success', 'Export Complete', `${rows.length} ${entityLabel.toLowerCase()} record(s) exported to CSV.`);
  };

  const handlePrint = () => {
    const printData = selectedRows.length > 0 ? selectedRows : rows;
    if (printData.length === 0) {
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
    const tbody = printData
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
      <div class="meta">${printData.length} record(s) &bull; Generated ${new Date().toLocaleString()} &bull; School ERP by NTS Novalytix</div>
      <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  const handleRefresh = () => {
    onClearSelection?.();
    onRefresh?.();
    addToast('info', 'Refreshed', `${entityLabel} list reloaded.`);
  };

  const selCount = selectedIds.length;

  return (
    <div className="entity-toolbox" role="toolbar" aria-label={`${entityLabel} actions`}>
      <button className="tb-btn tb-primary" onClick={handleNew} title={`Add new ${entityLabel.toLowerCase()}`}>
        <Plus size={15} /> <span>New</span>
      </button>
      <button className="tb-btn" onClick={handleEdit} title="Edit selected record">
        <Pencil size={15} /> <span>Edit</span>
      </button>
      <button className="tb-btn" onClick={handleDuplicate} title="Duplicate selected record(s)">
        <CopyPlus size={15} /> <span>Duplicate</span>
      </button>
      <button className="tb-btn tb-danger" onClick={handleDeleteClick} title="Delete selected record(s)">
        <Trash2 size={15} /> <span>Delete</span>
      </button>

      <span className="tb-divider" />

      <button className="tb-btn" onClick={handleCopy} title="Copy selected row(s) to clipboard">
        <Copy size={15} /> <span>Copy</span>
      </button>
      <button className="tb-btn" onClick={handlePaste} title="Paste rows from clipboard">
        <ClipboardPaste size={15} /> <span>Paste</span>
      </button>

      <span className="tb-divider" />

      <button className="tb-btn" onClick={handleImportClick} title="Import records from CSV">
        <Upload size={15} /> <span>Import</span>
      </button>
      <button className="tb-btn" onClick={handleTemplate} title="Download a blank import template">
        <FileSpreadsheet size={15} /> <span>Template</span>
      </button>
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

      {selCount > 0 && (
        <span className="tb-selected">
          {selCount} selected
          <button className="tb-clear" onClick={onClearSelection} title="Clear selection" aria-label="Clear selection">
            ×
          </button>
        </span>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDeleteMany?.(selectedIds);
        }}
        title={`Delete ${selCount} ${entityLabel}${selCount > 1 ? 's' : ''}`}
        message={`Are you sure you want to delete the selected ${selCount} ${entityLabel.toLowerCase()}${selCount > 1 ? ' records' : ' record'}? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
