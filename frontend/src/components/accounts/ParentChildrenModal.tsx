import React, { useEffect, useState } from 'react';
import { Link2, Unlink } from 'lucide-react';
import { Modal } from '../common/Modal';
import { accountService, LinkedChild, UserAccountItem } from '../../services/accountService';

interface Props {
  parent: UserAccountItem;
  onClose: () => void;
}

/** Link or unlink a parent's children by admission number. Parents only see linked children. */
export const ParentChildrenModal: React.FC<Props> = ({ parent, onClose }) => {
  const [children, setChildren] = useState<LinkedChild[] | null>(null);
  const [admission, setAdmission] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    accountService.getChildren(parent.id).then(res => {
      if (res.success) setChildren(res.data);
      else setError(res.error);
    });
  }, [parent.id]);

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission.trim() || busy) return;
    setBusy(true);
    setError('');
    const res = await accountService.linkChild(parent.id, admission.trim());
    setBusy(false);
    if (res.success) {
      setChildren(res.data);
      setAdmission('');
    } else {
      setError(res.error);
    }
  };

  const unlink = async (child: LinkedChild) => {
    if (!window.confirm(`Remove ${child.name} from ${parent.full_name}'s account?`)) return;
    const res = await accountService.unlinkChild(parent.id, child.student_id);
    if (res.success) setChildren(res.data);
    else setError(res.error);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Children of ${parent.full_name}`} size="normal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
        {children === null && !error && <div>Loading…</div>}
        {children && children.length === 0 && (
          <div style={{ color: '#B45309' }}>
            No children linked yet. This parent will not see any student data until a child is linked.
          </div>
        )}
        {children && children.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                <th>Class</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {children.map(c => (
                <tr key={c.student_id}>
                  <td>{c.name}</td>
                  <td>{c.admission_number}</td>
                  <td>{c.class_name ? `${c.class_name} (${c.section})` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => unlink(c)}>
                      <Unlink size={13} />
                      <span>Unlink</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={link} style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            placeholder="Child's admission number, e.g. ADM-2026-0601"
            value={admission}
            onChange={e => setAdmission(e.target.value)}
            aria-label="Child admission number"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !admission.trim()}>
            <Link2 size={15} />
            <span>Link child</span>
          </button>
        </form>
        {error && <div style={{ color: '#DC2626' }}>{error}</div>}
      </div>
    </Modal>
  );
};
