import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Modal } from '../common/Modal';
import { accountService, BulkInviteResult, BulkInviteRow } from '../../services/accountService';
import { parseCSV, pickField } from '../../utils/csv';
import { exportToCSV } from '../../utils/export';

const TEMPLATE_HEADERS = ['first_name', 'last_name', 'email', 'role', 'phone', 'admission_number', 'child_admission_numbers', 'relationship'];
const TEMPLATE_ROWS = [
  ['Anita', 'Verma', 'anita.verma@example.com', 'teacher', '+91 98100 00001', '', '', ''],
  ['Rakesh', 'Gupta', 'rakesh.gupta@example.com', 'parent', '+91 98100 00002', '', 'ADM-2026-0601;ADM-2026-0602', 'Father'],
  ['Pranav', 'Bansal', 'pranav.bansal@example.com', 'student', '', 'ADM-2026-1001', '', ''],
];
const MAX_ROWS_PER_UPLOAD = 500;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}

function toRow(r: Record<string, string>): BulkInviteRow {
  return {
    first_name: pickField(r, 'first_name', 'First Name', 'firstName'),
    last_name: pickField(r, 'last_name', 'Last Name', 'lastName'),
    email: pickField(r, 'email', 'Email', 'Email Address'),
    role: pickField(r, 'role', 'Role').toLowerCase(),
    phone: pickField(r, 'phone', 'Phone', 'Mobile'),
    admission_number: pickField(r, 'admission_number', 'Admission No', 'admissionNo'),
    child_admission_numbers: pickField(r, 'child_admission_numbers', 'Children', 'Child Admission Numbers'),
    relationship: pickField(r, 'relationship', 'Relationship'),
  };
}

/**
 * Upload a CSV of people to give sign-in access. Each person receives a Clerk invitation email
 * and sets their own password. Parents are linked to their children by admission number;
 * student accounts attach to the existing student record by admission number.
 */
export const BulkInviteModal: React.FC<Props> = ({ isOpen, onClose, onDone }) => {
  const [rows, setRows] = useState<BulkInviteRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkInviteResult[] | null>(null);
  const [summary, setSummary] = useState<{ created: number; skipped: number; invitations_failed: number } | null>(null);

  const reset = () => {
    setRows([]);
    setFileName('');
    setError('');
    setResults(null);
    setSummary(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setResults(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const parsed = parseCSV(await file.text()).map(toRow).filter(r => r.email || r.first_name);
    if (!parsed.length) {
      setError('No rows found. Use the template: first_name, last_name, email, role, …');
      setRows([]);
      return;
    }
    if (parsed.length > MAX_ROWS_PER_UPLOAD) {
      setError(`This file has ${parsed.length} rows. Please split it into files of at most ${MAX_ROWS_PER_UPLOAD} rows.`);
      setRows([]);
      return;
    }
    setRows(parsed);
  };

  const submit = async () => {
    if (!rows.length || busy) return;
    setBusy(true);
    const res = await accountService.bulkInvite(rows);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setResults(res.data.results);
    setSummary(res.data);
    onDone();
  };

  const downloadResults = () => {
    if (!results) return;
    exportToCSV(
      'Bulk_Invite_Results',
      ['Row', 'Name', 'Email', 'Role', 'Status', 'Invitation', 'Reason'],
      results.map(r => [r.row, r.name, r.email, r.role, r.status, r.invitation_status || '', r.reason || '']),
    );
  };

  const roleCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.role || '(none)'] = (acc[r.role || '(none)'] || 0) + 1;
    return acc;
  }, {});

  return (
    <Modal isOpen={isOpen} onClose={close} title="Bulk Invite from CSV" size="large">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
        {!results && (
          <>
            <p style={{ margin: 0 }}>
              Each person gets an invitation email and sets their own password. Roles: <code>teacher</code>,{' '}
              <code>parent</code>, <code>student</code>, <code>school_admin</code>, <code>supplier</code>. For parents, list
              children&apos;s admission numbers separated by <code>;</code>. For students, give their admission number.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => exportToCSV('Bulk_Invite_Template', TEMPLATE_HEADERS, TEMPLATE_ROWS)}>
                <Download size={15} />
                <span>Download template</span>
              </button>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <Upload size={15} />
                <span>{fileName || 'Choose CSV file'}</span>
                <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            </div>
            {rows.length > 0 && (
              <div className="card" style={{ padding: 12 }}>
                <strong>{rows.length}</strong> people ready to invite:{' '}
                {Object.entries(roleCounts).map(([role, n]) => `${n} ${role}`).join(', ')}
              </div>
            )}
            {error && <div style={{ color: '#DC2626' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={close}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={!rows.length || busy} onClick={submit}>
                {busy ? 'Sending invitations…' : `Create ${rows.length || ''} accounts & send invites`}
              </button>
            </div>
          </>
        )}

        {results && summary && (
          <>
            <div className="card" style={{ padding: 12 }}>
              <strong>{summary.created}</strong> accounts created and invited, <strong>{summary.skipped}</strong> skipped
              {summary.invitations_failed > 0 && (
                <>
                  , <strong>{summary.invitations_failed}</strong> invitation emails failed (use &quot;Resend Invite&quot;)
                </>
              )}
              .
            </div>
            <div className="table-responsive" style={{ maxHeight: 320, overflow: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.name}</td>
                      <td>{r.email}</td>
                      <td>{r.role}</td>
                      <td style={{ color: r.status === 'created' && !r.reason ? '#059669' : '#B45309' }}>
                        {r.status === 'created' ? (r.reason ? r.reason : 'Invited') : r.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={downloadResults}>
                <Download size={15} />
                <span>Download results</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={close}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
