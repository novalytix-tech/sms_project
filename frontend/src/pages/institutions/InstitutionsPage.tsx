// ==========================================
// Institution Directory & Multi-School Governance
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useEffect } from 'react';
import { institutionService } from '../../services/institutionService';
import { Institution } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { Plus, Power, Edit, Eye } from 'lucide-react';

export const InstitutionsPage: React.FC = () => {
  const { addToast } = useERP();
  const [institutions, setInstitutions] = useState<Institution[]>(() => institutionService.getAll());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleUpdate = () => {
      setInstitutions([...institutionService.getAll()]);
    };
    window.addEventListener('nts_erp_storage_updated', handleUpdate);
    return () => {
      window.removeEventListener('nts_erp_storage_updated', handleUpdate);
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [viewingInst, setViewingInst] = useState<Institution | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    board: 'CBSE',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '',
    contactEmail: '',
    phone: '',
    principal: '',
    studentCount: 1200,
    teacherCount: 75,
    plan: 'Enterprise' as any,
    planExpiry: '2027-03-31',
    status: 'active' as any,
  });
  const [formError, setFormError] = useState('');

  const refreshList = () => {
    setInstitutions([...institutionService.getAll()]);
  };

  const handleOpenAdd = () => {
    setEditingInst(null);
    setFormError('');
    setFormData({
      name: '',
      code: `SCH-${Math.floor(100 + Math.random() * 900)}`,
      board: 'CBSE',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: '',
      contactEmail: '',
      phone: '',
      principal: '',
      studentCount: 850,
      teacherCount: 55,
      plan: 'Enterprise',
      planExpiry: '2027-03-31',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inst: Institution) => {
    setEditingInst(inst);
    setFormError('');
    setFormData({
      name: inst.name,
      code: inst.code,
      board: inst.board,
      city: inst.city,
      state: inst.state,
      address: inst.address,
      contactEmail: inst.contactEmail,
      phone: inst.phone,
      principal: inst.principal,
      studentCount: inst.studentCount,
      teacherCount: inst.teacherCount,
      plan: inst.plan,
      planExpiry: inst.planExpiry,
      status: inst.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Institution Name and Code are required.');
      return;
    }

    if (editingInst) {
      institutionService.update(editingInst.id, formData);
      addToast('success', 'Institution Updated', `${formData.name} record saved.`);
    } else {
      const res = institutionService.create(formData);
      if (!res.success) {
        setFormError(res.error || 'Failed to create institution.');
        return;
      }
      addToast('success', 'Institution Enrolled', `${formData.name} registered successfully.`);
    }

    setIsModalOpen(false);
    refreshList();
  };

  const handleToggleStatus = (id: string, name: string) => {
    const updated = institutionService.toggleStatus(id);
    if (updated) {
      addToast('info', 'Status Changed', `${name} is now ${updated.status}.`);
      refreshList();
    }
  };

  const filtered = institutions.filter(
    i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.city.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.board.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Schools & Institutions</h1>
          <p className="page-subtitle">
            School directory and franchise network
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add School</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search school name, city, board, code..."
            ariaLabel="Search school institutions"
          />
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing <strong>{filtered.length}</strong> registered school institutions
          </span>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="card">
        <div className="card-body" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>School Name</th>
                  <th>Board & Location</th>
                  <th>Head / Principal</th>
                  <th>Students / Staff</th>
                  <th>Subscription Tier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inst => (
                  <tr key={inst.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{inst.code}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{inst.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{inst.contactEmail}</div>
                    </td>
                    <td>
                      <div>{inst.city}, {inst.state}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Board: {inst.board}</div>
                    </td>
                    <td>{inst.principal}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inst.studentCount} Students</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{inst.teacherCount} Faculty</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{inst.plan}</span>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                        Exp: {formatDate(inst.planExpiry)}
                      </div>
                    </td>
                    <td><Badge status={inst.status} /></td>
                    <td>
                      <div className="table-action-cell">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewingInst(inst)}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-icon-only"
                          onClick={() => handleOpenEdit(inst)}
                          title="Edit Institution"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-icon-only"
                          onClick={() => handleToggleStatus(inst.id, inst.name)}
                          title="Toggle Status"
                        >
                          <Power size={13} color={inst.status === 'active' ? '#DC2626' : '#16A34A'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Institution Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingInst ? `Edit School: ${editingInst.name}` : 'Add School'}
          size="large"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save School
              </button>
            </>
          }
        >
          <form onSubmit={handleSave}>
            {formError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label required">School Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Greenwood Academy"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Institution Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. GWA-BLR"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">School Board</label>
                <select
                  className="form-select"
                  value={formData.board}
                  onChange={e => setFormData({ ...formData, board: e.target.value })}
                >
                  <option value="CBSE">CBSE (Central Board)</option>
                  <option value="ICSE">ICSE / ISC</option>
                  <option value="State Board">State Board</option>
                  <option value="IB / Cambridge">IB / Cambridge International</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Principal / Head</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. K. Raman"
                  value={formData.principal}
                  onChange={e => setFormData({ ...formData, principal: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">City</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">State</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.contactEmail}
                  onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Phone Contact</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Subscription Plan</label>
                <select
                  className="form-select"
                  value={formData.plan}
                  onChange={e => setFormData({ ...formData, plan: e.target.value as any })}
                >
                  <option value="Basic">Basic Tier</option>
                  <option value="Standard">Standard Tier</option>
                  <option value="Enterprise">Enterprise Tier</option>
                  <option value="Premium">Premium Campus Suite</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Campus Address</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Details View Modal */}
      {viewingInst && (
        <Modal
          isOpen={Boolean(viewingInst)}
          onClose={() => setViewingInst(null)}
          title={`Institution Profile — ${viewingInst.name}`}
          size="normal"
          footer={
            <button className="btn btn-secondary" onClick={() => setViewingInst(null)}>
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>{viewingInst.name}</div>
              <div style={{ color: '#3B82F6', fontWeight: 600 }}>Code: {viewingInst.code} • Board: {viewingInst.board}</div>
              <div style={{ color: '#64748B', marginTop: '4px' }}>Principal: {viewingInst.principal}</div>
              <div style={{ color: '#64748B' }}>{viewingInst.address}, {viewingInst.city}, {viewingInst.state}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ padding: '10px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                <div style={{ color: '#64748B', fontSize: '11px' }}>STUDENT ENROLLMENT</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{viewingInst.studentCount}</div>
              </div>
              <div style={{ padding: '10px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                <div style={{ color: '#64748B', fontSize: '11px' }}>FACULTY STRENGTH</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{viewingInst.teacherCount}</div>
              </div>
              <div style={{ padding: '10px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                <div style={{ color: '#64748B', fontSize: '11px' }}>SUBSCRIPTION PLAN</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{viewingInst.plan} Tier</div>
              </div>
              <div style={{ padding: '10px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                <div style={{ color: '#64748B', fontSize: '11px' }}>SUBSCRIPTION EXPIRY</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{formatDate(viewingInst.planExpiry)}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

