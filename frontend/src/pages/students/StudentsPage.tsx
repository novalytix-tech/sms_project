// ==========================================
// Student Directory & Student 360 View
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { classService } from '../../services/classService';
import { transportService } from '../../services/transportService';
import { attendanceService } from '../../services/attendanceService';
import { feeService } from '../../services/feeService';
import { examService } from '../../services/examService';
import { assignmentService } from '../../services/assignmentService';
import { Student } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { StudentProfileView } from '../../components/students/StudentProfileView';
import { SearchInput } from '../../components/common/SearchInput';
import { PhotoUpload } from '../../components/common/PhotoUpload';
import { useERP } from '../../context/ERPContext';
import { formatDate, formatCurrencyINR } from '../../utils/formatters';
import { EntityToolbox, ToolboxColumn } from '../../components/common/EntityToolbox';
import { ListToolbar } from '../../components/common/ListToolbar';
import { pickField } from '../../utils/csv';
import { exportToCSV } from '../../utils/export';
import { httpClient } from '../../services/api/httpClient';
import { ImportProgressModal, ImportProgressState } from '../../components/common/ImportProgressModal';
import { ImportSummaryModal, ImportSummary, ImportRowError } from '../../components/common/ImportSummaryModal';
import { Eye, Edit, Trash2, Power, RotateCcw } from 'lucide-react';
import { todayISO } from '../../utils/date';

/**
 * Faculty & Administrative Student Directory Manager
 */
const StudentDirectoryManager: React.FC = () => {
  const { currentRole, currentUser, addToast } = useERP();
  const [students, setStudents] = useState<Student[]>(() => studentService.getAll());
  const classes = useMemo(() => classService.getAll(), []);
  const routes = useMemo(() => transportService.getAllRoutes(), []);

  // Filter for teacher assigned classes
  const teacher = useMemo(() => {
    if (currentRole === 'teacher') {
      return (
        (currentUser.referenceId ? teacherService.getById(currentUser.referenceId) : null) ||
        teacherService.getAll().find(t => t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        null
      );
    }
    return null;
  }, [currentRole, currentUser]);

  const teacherAssignedClassIds = useMemo(() => {
    return teacher ? (teacher.assignedClasses || []).map(a => a.classId) : [];
  }, [teacher]);

  const availableClasses = useMemo(() => {
    if (currentRole === 'teacher' && teacherAssignedClassIds.length > 0) {
      return classes.filter(c => teacherAssignedClassIds.includes(c.id));
    }
    return classes;
  }, [currentRole, teacherAssignedClassIds, classes]);

  // Scoped student roster: teachers only see students in their assigned classes
  const roleScopedStudents = useMemo(() => {
    if (currentRole === 'teacher' && teacherAssignedClassIds.length > 0) {
      return students.filter(s => teacherAssignedClassIds.includes(s.classId));
    }
    return students;
  }, [currentRole, teacherAssignedClassIds, students]);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Distinct class levels (PG → 12) by grade order, and section options (A, B, C…)
  const classLevels = useMemo(() => {
    const byName = new Map<string, number>();
    availableClasses.forEach(c => {
      if (!byName.has(c.name)) byName.set(c.name, Number(c.grade));
    });
    return Array.from(byName.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([name]) => name);
  }, [availableClasses]);

  const sectionOptions = useMemo(() => {
    const set = new Set(availableClasses.map(c => (c.section || '').toUpperCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [availableClasses]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [downloadCredsFn, setDownloadCredsFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, selectedClass, selectedSection, selectedStatus]);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    admissionNo: '',
    firstName: '',
    lastName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dob: '2010-01-01',
    bloodGroup: 'B+',
    classId: classes[0]?.id || 'cls-10a',
    section: 'A',
    rollNo: '',
    academicYear: '2026-2027',
    admissionDate: todayISO(),
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    transportRouteId: '',
    busStop: '',
    status: 'active' as 'active' | 'inactive',
    photoUrl: '',
  });
  const [formError, setFormError] = useState('');

  const refreshList = () => {
    setStudents([...studentService.getAll()]);
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormError('');
    const defaultClassId = classes[0]?.id || 'cls-6a';
    const nextRoll = studentService.getNextRollNo(defaultClassId, 'A');
    setFormData({
      admissionNo: `ADM-2026-${Math.floor(100 + Math.random() * 900)}`,
      firstName: '',
      lastName: '',
      gender: 'Male',
      dob: '2015-05-15',
      bloodGroup: 'O+',
      classId: defaultClassId,
      section: 'A',
      rollNo: nextRoll,
      academicYear: '2026-2027',
      admissionDate: todayISO(),
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      address: '',
      transportRouteId: routes[0]?.id || '',
      busStop: routes[0]?.stops[0]?.stopName || '',
      status: 'active',
      photoUrl: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (stud: Student) => {
    setEditingStudent(stud);
    setFormError('');
    setFormData({
      admissionNo: stud.admissionNo,
      firstName: stud.firstName,
      lastName: stud.lastName,
      gender: stud.gender,
      dob: stud.dob,
      bloodGroup: stud.bloodGroup || 'O+',
      classId: stud.classId,
      section: stud.section,
      rollNo: stud.rollNo,
      academicYear: stud.academicYear,
      admissionDate: stud.admissionDate,
      parentName: stud.parentName,
      parentPhone: stud.parentPhone,
      parentEmail: stud.parentEmail,
      address: stud.address,
      transportRouteId: stud.transportRouteId || '',
      busStop: stud.busStop || '',
      status: stud.status,
      photoUrl: stud.photoUrl || '',
    });
    setIsFormOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError('First Name and Last Name are required.');
      return;
    }
    if (!formData.admissionNo.trim()) {
      setFormError('Admission Number is required.');
      return;
    }
    if (!formData.parentName.trim() || !formData.parentPhone.trim()) {
      setFormError('Parent Guardian Name and Contact Phone are required.');
      return;
    }

    const targetClass = classes.find(c => c.id === formData.classId);
    const className = targetClass ? targetClass.name : 'Class 10';

    if (editingStudent) {
      const res = studentService.update(editingStudent.id, {
        ...formData,
        className,
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to update student.');
        return;
      }
      addToast('success', 'Student Updated', `${formData.firstName} ${formData.lastName}'s profile was updated.`);
    } else {
      const res = studentService.create({
        ...formData,
        className,
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        avatar: `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase(),
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to add student.');
        return;
      }
      addToast('success', 'Student Admitted', `${formData.firstName} ${formData.lastName} was registered successfully.`);
      addToast('info', 'Sign-in access', 'Create a sign-in account for this person in Account Management.');
    }

    setIsFormOpen(false);
    refreshList();
  };

  const handleToggleStatus = (stud: Student) => {
    if (!['school_admin', 'super_admin'].includes(currentRole)) return;
    const updated = studentService.toggleStatus(stud.id);
    if (updated) {
      addToast('info', 'Status Changed', `${stud.fullName} is now ${updated.status}.`);
      refreshList();
    }
  };

  const handleDelete = () => {
    if (!['school_admin', 'super_admin'].includes(currentRole)) return;
    if (deleteTarget) {
      studentService.delete(deleteTarget.id);
      addToast('warning', 'Student Deleted', `${deleteTarget.fullName} was removed from the directory.`);
      setDeleteTarget(null);
      refreshList();
    }
  };

  // ---- Toolbox (New/Edit/Duplicate/Delete/Copy/Paste/Import/Template/Export/Print/Refresh) ----
  const canModify = ['school_admin', 'super_admin'].includes(currentRole);

  const toolboxColumns: ToolboxColumn<Student>[] = [
    { header: 'Admission No', value: s => s.admissionNo },
    { header: 'Full Name', value: s => s.fullName },
    { header: 'Gender', value: s => s.gender },
    { header: 'DOB', value: s => s.dob },
    { header: 'Blood Group', value: s => s.bloodGroup || '' },
    { header: 'Class', value: s => s.className },
    { header: 'Section', value: s => s.section },
    { header: 'Roll No', value: s => s.rollNo },
    { header: 'Parent Name', value: s => s.parentName },
    { header: 'Parent Phone', value: s => s.parentPhone },
    { header: 'Parent Email', value: s => s.parentEmail },
    { header: 'Address', value: s => s.address },
    { header: 'Status', value: s => s.status },
  ];

  const toggleRow = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleDeleteMany = (ids: string[]) => {
    if (!canModify) return;
    let n = 0;
    ids.forEach(id => {
      if (studentService.delete(id)) n++;
    });
    addToast('warning', 'Students Deleted', `${n} student record(s) removed from the directory.`);
    setSelectedIds([]);
    refreshList();
  };

  const handleDuplicateMany = (ids: string[]) => {
    if (!canModify) return;
    let n = 0;
    ids.forEach(id => {
      const s = students.find(st => st.id === id);
      if (!s) return;
      const rnd = Math.floor(100 + Math.random() * 900);
      const res = studentService.create({
        ...s,
        admissionNo: `${s.admissionNo}-C${rnd}`,
        rollNo: studentService.getNextRollNo(s.classId, s.section),
        fullName: `${s.fullName} (Copy)`,
      } as Omit<Student, 'id'>);
      if (res.success) n++;
    });
    addToast(n > 0 ? 'success' : 'warning', 'Duplicate', `${n} student record(s) duplicated.`);
    setSelectedIds([]);
    refreshList();
  };

  const handleImport = async (records: Record<string, string>[]) => {
    if (!canModify) {
      addToast('error', 'Access Denied', 'Only administrators can import students.');
      return;
    }
    // Build rows for the backend bulk import (only a Name is mandatory).
    const rows = records
      .map(r => {
        const fullName = pickField(r, 'Full Name', 'fullName', 'Name', 'Student Name');
        if (!fullName) return null;
        const className = pickField(r, 'Class', 'className', 'Class Name');
        const cls = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
        return {
          fullName,
          admissionNo: pickField(r, 'Admission No', 'admissionNo', 'Admission Number', 'Adm No'),
          gender: pickField(r, 'Gender') || 'Male',
          dob: pickField(r, 'DOB', 'Date of Birth'),
          bloodGroup: pickField(r, 'Blood Group'),
          classId: cls?.id || '',
          className: cls?.name || className,
          section: pickField(r, 'Section', 'section') || 'A',
          rollNo: pickField(r, 'Roll No', 'Roll Number'),
          parentName: pickField(r, 'Parent Name', 'Guardian Name'),
          parentPhone: pickField(r, 'Parent Phone', 'Phone', 'Contact', 'Mobile'),
          parentEmail: pickField(r, 'Parent Email', 'Email'),
          address: pickField(r, 'Address'),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (rows.length === 0) {
      addToast('warning', 'Nothing to Import', 'No valid rows found (each student needs a Name).');
      return;
    }

    // Larger batches mean fewer server round-trips; the ring still advances per batch.
    const BATCH = 100;
    const started = Date.now();
    setImportProgress({ active: true, done: 0, total: rows.length, startedAt: started, label: 'Importing Students' });

    const allCreated: Student[] = [];
    const allErrors: ImportRowError[] = [];
    let imported = 0;
    let skipped = 0;
    let errorMsg = '';

    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const res = await httpClient.post<{
          created: Student[];
          errors: ImportRowError[];
          imported: number;
          skipped: number;
        }>('/students/bulk-import', { students: chunk, rowOffset: i });
        if (!res?.success || !res.data) {
          throw new Error(res?.error?.message || res?.message || 'Import failed.');
        }
        allCreated.push(...(res.data.created || []));
        allErrors.push(...(res.data.errors || []));
        imported += res.data.imported || 0;
        skipped += res.data.skipped || 0;
        setImportProgress(p => (p ? { ...p, done: Math.min(i + BATCH, rows.length) } : p));
      }
      setImportProgress(p => (p ? { ...p, done: rows.length, phase: 'done' } : p));
    } catch (err) {
      errorMsg = (err instanceof Error && err.message) || 'Could not reach the server.';
    }

    // Finalize with whatever succeeded (completed batches are already saved in the DB).
    if (allCreated.length > 0) {
      studentService.addLocalBatch(allCreated);
      setStudents([...studentService.getAll()]);
    }

    // Close the progress ring, then show the full summary report.
    setTimeout(() => {
      setImportProgress(null);
      setImportSummary({
        imported,
        skipped,
        credentials: 0,
        errors: allErrors,
        durationSec: (Date.now() - started) / 1000,
        failure: errorMsg || undefined,
      });
    }, errorMsg ? 250 : 800);

    setSelectedIds([]);
  };

  // Filtered list (strictly scoped to permitted student roster)
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roleScopedStudents.filter(s => {
      const matchSearch =
        q === '' ||
        [
          s.fullName,
          s.admissionNo,
          s.rollNo,
          s.dob,
          s.address,
          s.parentName,
          s.parentPhone,
          s.parentEmail,
          s.className,
          s.section,
        ].some(v => (v ?? '').toString().toLowerCase().includes(q));

      const matchClass = selectedClass === '' || s.className === selectedClass;
      const matchSection =
        selectedSection === '' || (s.section || '').toUpperCase() === selectedSection.toUpperCase();
      const matchStatus = selectedStatus === '' || s.status === selectedStatus;

      return matchSearch && matchClass && matchSection && matchStatus;
    });
  }, [roleScopedStudents, search, selectedClass, selectedSection, selectedStatus]);

  // Paginated list for table display
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Student 360 data
  const student360Data = useMemo(() => {
    if (!viewingStudent) return null;
    const att = attendanceService.calculateStudentPercentage(viewingStudent.id);
    const invoices = feeService.getInvoicesByStudentId(viewingStudent.id);
    const totalFee = invoices.reduce((a, b) => a + b.totalAmount, 0);
    const paidFee = invoices.reduce((a, b) => a + b.paidAmount, 0);
    const dueFee = Math.max(0, totalFee - paidFee);
    const marks = examService.getMarksForStudent(viewingStudent.id);
    const classAssignments = assignmentService.getByClass(viewingStudent.classId, viewingStudent.section);

    return { att, invoices, totalFee, paidFee, dueFee, marks, classAssignments };
  }, [viewingStudent]);

  return (
    <div>
      <ImportProgressModal state={importProgress} />
      <ImportSummaryModal
        summary={importSummary}
        onClose={() => {
          setImportSummary(null);
          setDownloadCredsFn(null);
        }}
        onDownloadCredentials={downloadCredsFn || undefined}
      />

      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>{currentRole === 'teacher' ? 'Class Student Roster' : 'Students'}</h1>
          <p className="page-subtitle">
            {currentRole === 'teacher'
              ? 'Student profiles and academic records for your assigned classes'
              : 'Student directory and admission records'}
          </p>
        </div>

        {/* Admin actions live in the toolbox above the table; header stays clean. */}
      </div>

      {/* Admin Toolbox */}
      {canModify && (
        <EntityToolbox<Student>
          entityLabel="Student"
          fileBaseName="Students_Directory"
          rows={filteredStudents}
          columns={toolboxColumns}
          getId={s => s.id}
          selectedIds={selectedIds}
          canModify={canModify}
          onNew={handleOpenAdd}
          onEditOne={id => {
            const s = students.find(st => st.id === id);
            if (s) handleOpenEdit(s);
          }}
          onDuplicateMany={handleDuplicateMany}
          onDeleteMany={handleDeleteMany}
          onImport={handleImport}
          onRefresh={refreshList}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Lite toolbar for non-admins (e.g. teachers viewing their class roster) */}
      {!canModify && (
        <ListToolbar<Student>
          entityLabel="Student"
          fileBaseName="Class_Roster"
          rows={filteredStudents}
          columns={toolboxColumns}
          onRefresh={refreshList}
        />
      )}

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, admission #, roll no, DOB, parent, phone, address..."
            ariaLabel="Search students"
          />

          <select
            className="form-select filter-select filter-select-md"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            aria-label="Filter by Class"
          >
            <option value="">{currentRole === 'teacher' ? 'All Assigned Classes' : 'All Classes'}</option>
            {classLevels.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="form-select filter-select filter-select-sm"
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            aria-label="Filter by Section"
          >
            <option value="">All Sections</option>
            {sectionOptions.map(sec => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </select>

          <select
            className="form-select filter-select filter-select-sm"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {(search || selectedClass || selectedSection || selectedStatus) && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                setSearch('');
                setSelectedClass('');
                setSelectedSection('');
                setSelectedStatus('');
              }}
            >
              <RotateCcw size={13} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> students
          </span>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="card">
        <div className="card-body" style={{ padding: '0' }}>
          {filteredStudents.length === 0 ? (
            <EmptyState
              title="No students match criteria"
              description="No enrolled students match your active filters. Try searching by a different term."
              action={
                <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setSelectedClass(''); setSelectedSection(''); setSelectedStatus(''); }}>
                  Reset Filters
                </button>
              }
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
                            paginatedStudents.length > 0 &&
                            paginatedStudents.every(s => selectedIds.includes(s.id))
                          }
                          onChange={e => {
                            const pageIds = paginatedStudents.map(s => s.id);
                            if (e.target.checked)
                              setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
                            else setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
                          }}
                        />
                      </th>
                    )}
                    <th>Admission #</th>
                    <th>Student Name</th>
                    <th>Class / Section</th>
                    <th>Roll No</th>
                    <th>Guardian Details</th>
                    <th>Contact Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map(stud => (
                    <tr key={stud.id} className={selectedIds.includes(stud.id) ? 'tb-row-selected' : ''}>
                      {canModify && (
                        <td className="tb-select-col">
                          <input
                            type="checkbox"
                            className="tb-row-check"
                            aria-label={`Select ${stud.fullName}`}
                            checked={selectedIds.includes(stud.id)}
                            onChange={() => toggleRow(stud.id)}
                          />
                        </td>
                      )}
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{stud.admissionNo}</td>
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
                            {studentService.getStudentPhoto(stud) ? (
                              <img
                                src={studentService.getStudentPhoto(stud)}
                                alt={stud.fullName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              stud.avatar || stud.firstName.charAt(0)
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{stud.fullName}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {stud.gender} • DOB: {formatDate(stud.dob)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{stud.className}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '4px' }}>
                          ({stud.section})
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{stud.rollNo}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{stud.parentName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{stud.parentEmail}</div>
                      </td>
                      <td>{stud.parentPhone}</td>
                      <td>
                        <Badge status={stud.status} />
                      </td>
                      <td>
                        <div className="table-action-cell">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingStudent(stud)}
                            title="View Student Profile"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          {['school_admin', 'super_admin'].includes(currentRole) && (
                            <>
                              <button
                                className="btn btn-secondary btn-icon-only"
                                onClick={() => handleOpenEdit(stud)}
                                title="Edit Student Record"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                className="btn btn-secondary btn-icon-only"
                                onClick={() => handleToggleStatus(stud)}
                                title={stud.status === 'active' ? 'Deactivate Student' : 'Activate Student'}
                              >
                                <Power size={13} color={stud.status === 'active' ? '#DC2626' : '#16A34A'} />
                              </button>
                              <button
                                className="btn btn-secondary btn-icon-only"
                                onClick={() => setDeleteTarget(stud)}
                                title="Delete Student"
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

          {filteredStudents.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalRecords={filteredStudents.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageSizeChange={setPageSize}
              itemLabel="students"
            />
          )}
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'Add Student'}
          size="large"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveStudent}>
                {editingStudent ? 'Save Changes' : 'Save Student'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveStudent}>
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
                Student Photo (Identity Verification)
              </h3>
              <PhotoUpload
                value={formData.photoUrl}
                onChange={dataUrl => setFormData({ ...formData, photoUrl: dataUrl })}
                label=""
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                1. Academic & Identification Information
              </h3>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label required">Admission Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.admissionNo}
                    onChange={e => setFormData({ ...formData, admissionNo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Class Grade</label>
                  <select
                    className="form-select"
                    value={formData.classId}
                    onChange={e => {
                      const newClassId = e.target.value;
                      const newRoll = !editingStudent
                        ? studentService.getNextRollNo(newClassId, formData.section || 'A')
                        : formData.rollNo;
                      setFormData({ ...formData, classId: newClassId, rollNo: newRoll });
                    }}
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Section & Roll No</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Sec"
                      style={{ width: '60px' }}
                      value={formData.section}
                      onChange={e => {
                        const newSec = e.target.value;
                        const newRoll = !editingStudent
                          ? studentService.getNextRollNo(formData.classId, newSec || 'A')
                          : formData.rollNo;
                        setFormData({ ...formData, section: newSec, rollNo: newRoll });
                      }}
                      required
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Roll No"
                      value={formData.rollNo}
                      onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                2. Personal Demographics
              </h3>
              <div className="form-grid-3">
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
                  <label className="form-label required">Gender</label>
                  <select
                    className="form-select"
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., B+, O+, AB+"
                    value={formData.bloodGroup}
                    onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Admission Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.admissionDate}
                    onChange={e => setFormData({ ...formData, admissionDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                3. Guardian Details & Communication
              </h3>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label required">Parent / Guardian Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.parentName}
                    onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Contact Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98XXX XXXXX"
                    value={formData.parentPhone}
                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="parent@example.com"
                    value={formData.parentEmail}
                    onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                4. Transport Assignment
              </h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Bus Route</label>
                  <select
                    className="form-select"
                    value={formData.transportRouteId}
                    onChange={e => setFormData({ ...formData, transportRouteId: e.target.value })}
                  >
                    <option value="">None (Self Commute)</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.routeNumber} — {r.routeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Designated Stop</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Metro Station, Circle"
                    value={formData.busStop}
                    onChange={e => setFormData({ ...formData, busStop: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Student Profile Modal */}
      {viewingStudent && student360Data && (
        <Modal
          isOpen={Boolean(viewingStudent)}
          onClose={() => setViewingStudent(null)}
          title={`Student Profile — ${viewingStudent.fullName}`}
          size="large"
          footer={
            <button className="btn btn-secondary" onClick={() => setViewingStudent(null)}>
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Student Header Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}
            >
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
                {studentService.getStudentPhoto(viewingStudent) ? (
                  <img
                    src={studentService.getStudentPhoto(viewingStudent)}
                    alt={viewingStudent.fullName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  viewingStudent.avatar || (viewingStudent.firstName ? viewingStudent.firstName.charAt(0) : 'S')
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{viewingStudent.fullName}</h3>
                  <Badge status={viewingStudent.status} />
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Admission #{viewingStudent.admissionNo} • Roll: {viewingStudent.rollNo} • {viewingStudent.className || viewingStudent.grade || 'Class 10'} ({viewingStudent.section || 'A'})
                </div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                  Parent: <strong>{viewingStudent.parentName || 'Parent Guardian'}</strong> ({viewingStudent.parentPhone || '—'}) • Address: {viewingStudent.address || 'Delhi'}
                </div>
              </div>
            </div>

            {/* 4 Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Attendance %
                </span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>
                  {student360Data.att.percentage}%
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  {student360Data.att.present} of {student360Data.att.total} days present
                </span>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Fee Balance
                </span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: student360Data.dueFee > 0 ? '#DC2626' : '#16A34A', marginTop: '4px' }}>
                  {formatCurrencyINR(student360Data.dueFee)}
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Paid: {formatCurrencyINR(student360Data.paidFee)}
                </span>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Exam Records
                </span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {student360Data.marks.length} Scores
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Mid-Term Assessment
                </span>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Commute
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
                  {viewingStudent.busStop || 'Self Commute'}
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Bus Stop
                </span>
              </div>
            </div>

            {/* Exam Results Tabular */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                Exam Assessment Performance
              </h4>
              {student360Data.marks.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#64748B' }}>No examination scores recorded yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Schedule ID</th>
                        <th>Marks Scored</th>
                        <th>Attendance</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student360Data.marks.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>Assessment Paper #{i + 1}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{m.marksObtained}</td>
                          <td>
                            <Badge status={m.isAbsent ? 'absent' : 'present'} />
                          </td>
                          <td>{m.remarks || 'Satisfactory'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Student Record"
          message={`Are you sure you want to permanently delete ${deleteTarget.fullName} (${deleteTarget.admissionNo})? This will remove all associated attendance, fee and exam history.`}
          isDestructive
          confirmLabel="Delete Student"
        />
      )}
    </div>
  );
};

export const StudentsPage: React.FC = () => {
  const { currentRole, currentUser, selectedChild, parentChildren, setSelectedChildId } = useERP();

  // If active role is student: isolated personal profile view (strictly own record)
  if (currentRole === 'student') {
    const all = studentService.getAll();
    const student =
      (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
      (currentUser.email ? all.find(s => (s as any).email?.toLowerCase() === currentUser.email?.toLowerCase()) : null) ||
      all.find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
      all[0];

    return <StudentProfileView student={student} />;
  }

  // If active role is parent: ward profile view with linked child switcher (strictly linked children)
  if (currentRole === 'parent') {
    const activeStudent = selectedChild || parentChildren[0];
    if (!activeStudent) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
          No linked student records found for this parent account.
        </div>
      );
    }
    return (
      <StudentProfileView
        student={activeStudent}
        isParentView
        linkedChildren={parentChildren}
        onSelectChild={setSelectedChildId}
      />
    );
  }

  return <StudentDirectoryManager />;
};

