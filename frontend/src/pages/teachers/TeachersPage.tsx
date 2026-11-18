// ==========================================
// Teacher & Staff Management Directory
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { teacherService } from '../../services/teacherService';
import { classService } from '../../services/classService';
import { Teacher } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { SearchInput } from '../../components/common/SearchInput';
import { PhotoUpload } from '../../components/common/PhotoUpload';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/export';
import { EntityToolbox, ToolboxColumn } from '../../components/common/EntityToolbox';
import { pickField } from '../../utils/csv';
import { Download, Eye, Edit, Trash2, RotateCcw } from 'lucide-react';

export const TeachersPage: React.FC = () => {
  const { currentRole, addToast } = useERP();
  const [teachers, setTeachers] = useState<Teacher[]>(() => teacherService.getAll());
  const classes = useMemo(() => classService.getAll(), []);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, selectedDept]);

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    staffId: '',
    firstName: '',
    lastName: '',
    gender: 'Female' as 'Male' | 'Female' | 'Other',
    email: '',
    phone: '',
    designation: 'PGT Senior Teacher',
    department: 'Mathematics',
    specialization: '',
    qualification: 'M.Sc., B.Ed.',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    photoUrl: '',
  });
  const [formError, setFormError] = useState('');

  const refreshList = () => {
    setTeachers([...teacherService.getAll()]);
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormError('');
    setFormData({
      staffId: `STAFF-${Math.floor(100 + Math.random() * 900)}`,
      firstName: '',
      lastName: '',
      gender: 'Female',
      email: '',
      phone: '',
      designation: 'PGT Teacher',
      department: 'Mathematics',
      specialization: '',
      qualification: 'M.Sc., B.Ed.',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
      photoUrl: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormError('');
    setFormData({
      staffId: t.staffId,
      firstName: t.firstName,
      lastName: t.lastName,
      gender: t.gender,
      email: t.email,
      phone: t.phone,
      designation: t.designation,
      department: t.department,
      specialization: t.specialization,
      qualification: t.qualification,
      joiningDate: t.joiningDate,
      status: t.status,
      photoUrl: t.photoUrl || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError('First and Last names are required.');
      return;
    }
    if (!formData.staffId.trim() || !formData.email.trim()) {
      setFormError('Staff ID and Email are required.');
      return;
    }

    if (editingTeacher) {
      const res = teacherService.update(editingTeacher.id, formData);
      if (!res.success) {
        setFormError(res.error || 'Failed to update teacher.');
        return;
      }
      addToast('success', 'Staff Updated', `${formData.firstName} ${formData.lastName}'s profile was updated.`);
    } else {
      const res = teacherService.create({
        ...formData,
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        assignedClasses: [],
        avatar: `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase(),
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to add staff.');
        return;
      }
      addToast('success', 'Staff Registered', `${formData.firstName} ${formData.lastName} was added to directory.`);
      addToast('info', 'Sign-in access', 'Create a sign-in account for this person in Account Management.');
    }

    setIsFormOpen(false);
    refreshList();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      teacherService.delete(deleteTarget.id);
      addToast('warning', 'Staff Deleted', `${deleteTarget.fullName} was removed.`);
      setDeleteTarget(null);
      refreshList();
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch =
        search === '' ||
        t.fullName.toLowerCase().includes(search.toLowerCase()) ||
        t.staffId.toLowerCase().includes(search.toLowerCase()) ||
        t.specialization.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase());

      const matchDept = selectedDept === '' || t.department === selectedDept;
      return matchSearch && matchDept;
    });
  }, [teachers, search, selectedDept]);

  // Paginated list for table display
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, currentPage, pageSize]);

  const departments = useMemo(() => {
    const set = new Set(teachers.map(t => t.department));
    return Array.from(set);
  }, [teachers]);

  const handleExportCSV = () => {
    const headers = [
      'Staff ID',
      'Name',
      'Designation',
      'Department',
      'Specialization',
      'Qualification',
      'Email',
      'Phone',
      'Joining Date',
      'Status',
    ];
    const rows = filteredTeachers.map(t => [
      t.staffId,
      t.fullName,
      t.designation,
      t.department,
      t.specialization,
      t.qualification,
      t.email,
      t.phone,
      t.joiningDate,
      t.status,
    ]);
    exportToCSV('Faculty_Directory', headers, rows);
    addToast('success', 'Export Complete', `${filteredTeachers.length} staff records exported to CSV.`);
  };

  // ---- Toolbox wiring ----
  const canModify = ['school_admin', 'super_admin'].includes(currentRole);

  const toolboxColumns: ToolboxColumn<Teacher>[] = [
    { header: 'Staff ID', value: t => t.staffId },
    { header: 'Name', value: t => t.fullName },
    { header: 'Designation', value: t => t.designation },
    { header: 'Department', value: t => t.department },
    { header: 'Specialization', value: t => t.specialization },
    { header: 'Qualification', value: t => t.qualification },
    { header: 'Email', value: t => t.email },
    { header: 'Phone', value: t => t.phone },
    { header: 'Gender', value: t => t.gender },
    { header: 'Joining Date', value: t => t.joiningDate },
    { header: 'Status', value: t => t.status },
  ];

  const toggleRow = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleDeleteMany = (ids: string[]) => {
    if (!canModify) return;
    let n = 0;
    ids.forEach(id => {
      if (teacherService.delete(id)) n++;
    });
    addToast('warning', 'Staff Deleted', `${n} staff record(s) removed.`);
    setSelectedIds([]);
    refreshList();
  };

  const handleDuplicateMany = (ids: string[]) => {
    if (!canModify) return;
    let n = 0;
    ids.forEach(id => {
      const t = teachers.find(x => x.id === id);
      if (!t) return;
      const rnd = Math.floor(100 + Math.random() * 900);
      const res = teacherService.create({
        ...t,
        staffId: `${t.staffId}-C${rnd}`,
        fullName: `${t.fullName} (Copy)`,
        assignedClasses: [],
      } as Omit<Teacher, 'id'>);
      if (res.success) n++;
    });
    addToast(n > 0 ? 'success' : 'warning', 'Duplicate', `${n} staff record(s) duplicated.`);
    setSelectedIds([]);
    refreshList();
  };

  const handleImport = (records: Record<string, string>[]) => {
    if (!canModify) {
      addToast('error', 'Access Denied', 'Only administrators can import staff.');
      return;
    }
    let ok = 0;
    let skip = 0;
    const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    records.forEach(r => {
      const name = pickField(r, 'Name', 'Full Name', 'fullName', 'Teacher Name');
      // Only a nameless row is invalid; staff id and the rest are auto-filled.
      if (!name) {
        skip++;
        return;
      }
      const parts = name.split(' ');
      const firstName = parts[0] || name;
      const lastName = parts.slice(1).join(' ') || firstName;
      const staffId = pickField(r, 'Staff ID', 'staffId', 'Staff Id', 'Employee ID') || `STF-${uid()}`;
      const payload = {
        staffId,
        firstName,
        lastName,
        fullName: name,
        email: pickField(r, 'Email') || `${staffId.toLowerCase()}@stxaviers.edu.in`,
        phone: pickField(r, 'Phone', 'Contact', 'Mobile'),
        gender: ((pickField(r, 'Gender') as Teacher['gender']) || 'Female'),
        designation: pickField(r, 'Designation') || 'Teacher',
        department: pickField(r, 'Department') || 'General',
        specialization: pickField(r, 'Specialization'),
        qualification: pickField(r, 'Qualification'),
        joiningDate: pickField(r, 'Joining Date') || new Date().toISOString().split('T')[0],
        status: ((pickField(r, 'Status') as Teacher['status']) || 'active'),
        assignedClasses: [],
        avatar: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
      } as Omit<Teacher, 'id'>;

      let res = teacherService.create(payload);
      let attempts = 0;
      while (!res.success && attempts < 4) {
        const err = (res.error || '').toLowerCase();
        if (err.includes('staff')) payload.staffId = `STF-${uid()}`;
        else break;
        res = teacherService.create(payload);
        attempts++;
      }
      if (res.success) ok++;
      else skip++;
    });
    addToast(
      ok > 0 ? 'success' : 'warning',
      'Import Complete',
      `${ok} imported${skip > 0 ? `, ${skip} skipped (missing name)` : ''}.`
    );
    setSelectedIds([]);
    refreshList();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Teachers</h1>
          <p className="page-subtitle">
            Teaching staff directory and subject allocations
          </p>
        </div>

        {/* Admin actions live in the toolbox above the table; non-admins keep a simple export. */}
        {!canModify && (
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Toolbox */}
      {canModify && (
        <EntityToolbox<Teacher>
          entityLabel="Teacher"
          fileBaseName="Faculty_Directory"
          rows={filteredTeachers}
          columns={toolboxColumns}
          getId={t => t.id}
          selectedIds={selectedIds}
          canModify={canModify}
          onNew={handleOpenAdd}
          onEditOne={id => {
            const t = teachers.find(x => x.id === id);
            if (t) handleOpenEdit(t);
          }}
          onDuplicateMany={handleDuplicateMany}
          onDeleteMany={handleDeleteMany}
          onImport={handleImport}
          onRefresh={refreshList}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search faculty by name, staff ID, subject..."
            ariaLabel="Search faculty"
          />

          <select
            className="form-select filter-select filter-select-md"
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            aria-label="Filter by Department"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {(search || selectedDept) && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                setSearch('');
                setSelectedDept('');
              }}
            >
              <RotateCcw size={13} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing <strong>{filteredTeachers.length}</strong> teachers
          </span>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="card">
        <div className="card-body" style={{ padding: '0' }}>
          {filteredTeachers.length === 0 ? (
            <EmptyState
              title="No teachers found"
              description="No teachers matching your search were found."
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    {canModify && (
                      <th className="tb-select-col">
                        <input
                          type="checkbox"
                          className="tb-head-check"
                          aria-label="Select all on page"
                          checked={
                            paginatedTeachers.length > 0 &&
                            paginatedTeachers.every(t => selectedIds.includes(t.id))
                          }
                          onChange={e => {
                            const pageIds = paginatedTeachers.map(t => t.id);
                            if (e.target.checked)
                              setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
                            else setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
                          }}
                        />
                      </th>
                    )}
                    <th>Staff ID</th>
                    <th>Teacher Name</th>
                    <th>Designation & Dept</th>
                    <th>Specialization</th>
                    <th>Contact Info</th>
                    <th>Assigned Classes</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTeachers.map(t => (
                    <tr key={t.id} className={selectedIds.includes(t.id) ? 'tb-row-selected' : ''}>
                      {canModify && (
                        <td className="tb-select-col">
                          <input
                            type="checkbox"
                            className="tb-row-check"
                            aria-label={`Select ${t.fullName}`}
                            checked={selectedIds.includes(t.id)}
                            onChange={() => toggleRow(t.id)}
                          />
                        </td>
                      )}
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{t.staffId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: '#DBEAFE',
                              color: '#3B82F6',
                              fontWeight: 700,
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            {teacherService.getTeacherPhoto(t) ? (
                              <img
                                src={teacherService.getTeacherPhoto(t)}
                                alt={t.fullName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              t.avatar || t.firstName.charAt(0)
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{t.fullName}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{t.qualification}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.designation}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{t.department}</div>
                      </td>
                      <td>{t.specialization}</td>
                      <td>
                        <div style={{ fontSize: '12px' }}>{t.email}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{t.phone}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(t.assignedClasses || []).map((c, i) => (
                            <span key={i} className="badge badge-info" style={{ fontSize: '10px' }}>
                              {c.className}-{c.section} ({c.subject})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge status={t.status} />
                      </td>
                      <td>
                        <div className="table-action-cell">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingTeacher(t)}
                            title="View Faculty Profile"
                          >
                            <Eye size={13} />
                            <span>Profile</span>
                          </button>

                          {['school_admin', 'super_admin'].includes(currentRole) && (
                            <>
                              <button
                                className="btn btn-secondary btn-icon-only"
                                onClick={() => handleOpenEdit(t)}
                                title="Edit Staff Details"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                className="btn btn-secondary btn-icon-only"
                                onClick={() => setDeleteTarget(t)}
                                title="Delete Staff"
                              >
                                <Trash2 size={13} color="#DC2626" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredTeachers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalRecords={filteredTeachers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageSizeChange={setPageSize}
              itemLabel="teachers"
            />
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingTeacher ? `Edit Teacher: ${editingTeacher.fullName}` : 'Add Teacher'}
          size="large"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingTeacher ? 'Save Changes' : 'Save Teacher'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSave}>
            {formError && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }}>
                Staff Photo (Identity Verification)
              </h3>
              <PhotoUpload
                value={formData.photoUrl}
                onChange={dataUrl => setFormData({ ...formData, photoUrl: dataUrl })}
                label=""
              />
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label required">Staff ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.staffId}
                  onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Designation</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.designation}
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Department</label>
                <select
                  className="form-select"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Languages">Languages</option>
                  <option value="Humanities">Humanities</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Arts & Sports">Arts & Sports</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject Specialization</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Calculus, Mechanics"
                  value={formData.specialization}
                  onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Official Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
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
                <label className="form-label">Qualification</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.qualification}
                  onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Staff Profile Modal */}
      {viewingTeacher && (
        <Modal
          isOpen={Boolean(viewingTeacher)}
          onClose={() => setViewingTeacher(null)}
          title={`Faculty Profile — ${viewingTeacher.fullName}`}
          size="normal"
          footer={
            <button className="btn btn-secondary" onClick={() => setViewingTeacher(null)}>
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '10px',
                  background: '#DBEAFE',
                  color: '#3B82F6',
                  fontWeight: 700,
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid #E2E8F0',
                }}
              >
                {teacherService.getTeacherPhoto(viewingTeacher) ? (
                  <img
                    src={teacherService.getTeacherPhoto(viewingTeacher)}
                    alt={viewingTeacher.fullName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  viewingTeacher.avatar || viewingTeacher.firstName.charAt(0)
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#19191f', margin: 0 }}>{viewingTeacher.fullName}</h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {viewingTeacher.designation} • {viewingTeacher.department}
                </div>
                <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600, marginTop: '2px' }}>
                  Staff ID: {viewingTeacher.staffId} • Joined: {formatDate(viewingTeacher.joiningDate)}
                </div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Email:</strong> {viewingTeacher.email}</div>
              <div><strong>Phone:</strong> {viewingTeacher.phone}</div>
              <div><strong>Qualification:</strong> {viewingTeacher.qualification}</div>
              <div><strong>Specialization:</strong> {viewingTeacher.specialization}</div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#19191f' }}>Class Allocations:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(viewingTeacher.assignedClasses || []).length > 0 ? (
                  viewingTeacher.assignedClasses.map((ac, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#19191f' }}>{ac.className} ({ac.section})</span>
                      <span style={{ color: '#3B82F6', fontWeight: 600 }}>{ac.subject}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No class allocations assigned yet.</div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Teacher"
          message={`Are you sure you want to remove ${deleteTarget.fullName} (${deleteTarget.staffId}) from the teacher register?`}
          isDestructive
          confirmLabel="Delete"
        />
      )}
    </div>
  );
};

