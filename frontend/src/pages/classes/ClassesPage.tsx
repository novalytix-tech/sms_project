// ==========================================
// Class Management, Session Promotion & Roster
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import { studentService } from '../../services/studentService';
import { academicSessionService } from '../../services/academicSessionService';
import { enrollmentService } from '../../services/enrollmentService';
import { promotionService } from '../../services/promotionService';
import { importService, ParsedImportRow } from '../../services/importService';
import { attendanceService } from '../../services/attendanceService';

import { ClassRoom, AcademicSession, StudentEnrollment, PromotionBatch, PromotionDecision, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { useERP } from '../../context/ERPContext';
import { EntityToolbox, ToolboxColumn } from '../../components/common/EntityToolbox';
import { pickField } from '../../utils/csv';
import { SearchInput } from '../../components/common/SearchInput';
import { BookOpen, Plus, Edit, Trash2, Users, Calendar, TrendingUp, UserCheck, UserMinus, ArrowLeftRight, Download, AlertTriangle, CheckCircle2, FileSpreadsheet, History, Sparkles, ShieldCheck, MessageSquare } from 'lucide-react';
import './ClassesPage.css';
import { todayISO } from '../../utils/date';

type AdminTab = 'classes' | 'sessions' | 'promotion' | 'import';

export const ClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, currentUser, schoolSettings, addToast } = useERP();

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('classes');

  // Core Data
  const [classes, setClasses] = useState<ClassRoom[]>(() => classService.getAll());
  const [sessions, setSessions] = useState<AcademicSession[]>(() => academicSessionService.getAll());
  const [teachers] = useState(() => teacherService.getAll());
  const [storeVersion, setStoreVersion] = useState(0);

  // Sync on storage events
  const refreshAll = useCallback(() => {
    setClasses([...classService.getAll()]);
    setSessions([...academicSessionService.getAll()]);
    setStoreVersion(v => v + 1);
  }, []);

  useEffect(() => {
    const handleStorageUpdate = () => refreshAll();
    window.addEventListener('nts_erp_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('nts_erp_storage_updated', handleStorageUpdate);
  }, [refreshAll]);

  // Current session resolution
  const currentSession = useMemo(() => {
    return academicSessionService.getCurrentSession();
  }, [sessions]);

  // Active Session Filter for Admin Class Grid
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>(() => currentSession.id);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // Teacher persona resolution
  const teacherUser = useMemo(() => {
    if (currentRole === 'teacher') {
      return (
        (currentUser.referenceId ? teacherService.getById(currentUser.referenceId) : null) ||
        teacherService.getAll().find(t => t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        null
      );
    }
    return null;
  }, [currentRole, currentUser]);

  // Check if teacher is an explicit Class Teacher
  const teacherAssignedClasses = useMemo(() => {
    if (!teacherUser) return [];
    const directMatches = classes.filter(c =>
      c.classTeacherId === teacherUser.id ||
      c.classTeacherId === teacherUser.staffId ||
      c.classTeacherId === teacherUser.refId ||
      (c.classTeacherName && teacherUser.fullName && c.classTeacherName.toLowerCase() === teacherUser.fullName.toLowerCase())
    );
    if (directMatches.length > 0) return directMatches;

    // Check teacherUser.assignedClasses
    const acList = teacherUser.assignedClasses || [];
    if (acList.length > 0) {
      const assigned = classes.filter(c =>
        acList.some(ac => ac.classId === c.id || (ac.className === c.name && ac.section === c.section))
      );
      if (assigned.length > 0) return assigned;
    }

    return classes.length > 0 ? [classes[0]] : [];
  }, [classes, teacherUser]);

  const isTeacherClassTeacher = teacherAssignedClasses.length > 0;

  // Selected Class for Class Teacher Dashboard
  const [selectedTeacherClassId, setSelectedTeacherClassId] = useState<string>(() => {
    return teacherAssignedClasses[0]?.id || classes[0]?.id || '';
  });

  useEffect(() => {
    if (teacherAssignedClasses.length > 0 && !teacherAssignedClasses.some(c => c.id === selectedTeacherClassId)) {
      setSelectedTeacherClassId(teacherAssignedClasses[0].id);
    }
  }, [teacherAssignedClasses, selectedTeacherClassId]);

  const activeClassTeacherClass = useMemo(() => {
    return classes.find(c => c.id === selectedTeacherClassId) || teacherAssignedClasses[0] || null;
  }, [classes, selectedTeacherClassId, teacherAssignedClasses]);

  // Enrolled students for selected Class Teacher class
  const classTeacherEnrollments = useMemo(() => {
    if (!activeClassTeacherClass) return [];
    return enrollmentService.getAllEnrollmentsForClass(
      activeClassTeacherClass.id,
      activeClassTeacherClass.section,
      currentSession.id
    );
  }, [activeClassTeacherClass, currentSession.id, storeVersion]);

  // Class Metrics for Class Teacher
  const classMetrics = useMemo(() => {
    if (!activeClassTeacherClass) {
      return { active: 0, capacity: 40, withdrawn: 0, transferred: 0, attendanceRate: 94, avgGrade: 'A2' };
    }
    const counts = enrollmentService.getClassCounts(
      activeClassTeacherClass.id,
      activeClassTeacherClass.section,
      currentSession.id
    );

    // Calculate real attendance rate from attendanceService
    const attList = attendanceService.getByClassAndDate(
      activeClassTeacherClass.id,
      todayISO(),
      activeClassTeacherClass.section
    );
    const presentCount = attList.filter(a => a.status === 'present').length;
    const attRate = attList.length > 0 ? Math.round((presentCount / attList.length) * 100) : 95;

    return {
      active: counts.active,
      capacity: activeClassTeacherClass.capacity || 40,
      withdrawn: counts.withdrawn,
      transferred: counts.transferred,
      attendanceRate: attRate,
      avgGrade: 'A2',
    };
  }, [activeClassTeacherClass, currentSession.id, storeVersion]);

  // ==========================================
  // MODAL STATES
  // ==========================================

  // Class Create / Edit Modal (Admin)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [deleteClassTarget, setDeleteClassTarget] = useState<ClassRoom | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [classFormData, setClassFormData] = useState({
    name: 'Class 10',
    grade: 10,
    section: 'A',
    classTeacherId: teachers[0]?.id || 'teach-1',
    roomNo: 'Room 301',
    capacity: 40,
    sessionId: currentSession.id,
    academicYear: currentSession.name,
    subjectsText: 'Mathematics, Science, English Literature, Social Studies, Computer Applications',
  });
  const [classFormError, setClassFormError] = useState('');

  // Academic Session Modal (Admin)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    name: '2027–2028',
    startDate: '2027-04-01',
    endDate: '2028-03-31',
    status: 'planned' as 'planned' | 'active' | 'closed',
    isCurrent: false,
    description: '',
  });
  const [sessionFormError, setSessionFormError] = useState('');

  // Register New Student Modal (Class Teacher & Admin)
  const [isRegisterStudentModalOpen, setIsRegisterStudentModalOpen] = useState(false);
  const [registerFormData, setRegisterFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dob: '2010-06-15',
    bloodGroup: 'B+',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: 'Bengaluru, Karnataka',
    rollNo: '',
    admissionNo: '',
  });
  const [registerFormError, setRegisterFormError] = useState('');

  // Assign Existing Student Modal (Class Teacher & Admin)
  const [isAssignStudentModalOpen, setIsAssignStudentModalOpen] = useState(false);
  const [assignStudentSearch, setAssignStudentSearch] = useState('');
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState<Student | null>(null);
  const [assignRollNo, setAssignRollNo] = useState('');
  const [assignError, setAssignError] = useState('');

  // Transfer Student Modal
  const [transferTarget, setTransferTarget] = useState<StudentEnrollment | null>(null);
  const [transferClassId, setTransferClassId] = useState('');
  const [transferSection, setTransferSection] = useState('B');
  const [transferReason, setTransferReason] = useState('Parent requested section balance');

  // Withdraw Student Modal
  const [withdrawTarget, setWithdrawTarget] = useState<StudentEnrollment | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('Family relocation to another city');

  // View Class Roster Modal (for Admin clicking a class card)
  const [viewRosterClass, setViewRosterClass] = useState<ClassRoom | null>(null);

  // ==========================================
  // PROMOTION ENGINE STATE (Admin)
  // ==========================================
  const [promoSourceSessionId, setPromoSourceSessionId] = useState<string>(() => currentSession.id);
  const [promoDestSessionId, setPromoDestSessionId] = useState<string>(() => {
    const planned = sessions.find(s => s.status === 'planned');
    return planned?.id || 'sess-2027-28';
  });
  const [promoSourceClassId, setPromoSourceClassId] = useState<string>(() => classes[0]?.id || 'cls-10a');
  const [promoDestClassId, setPromoDestClassId] = useState<string>('');
  const [promoDestSection, setPromoDestSection] = useState<string>('A');

  const [promoPreviewData, setPromoPreviewData] = useState<ReturnType<typeof promotionService.getPromotionPreview> | null>(null);
  const [promoDecisions, setPromoDecisions] = useState<PromotionDecision[]>([]);
  const [isExecutingPromo, setIsExecutingPromo] = useState(false);
  const [showPromoConfirm, setShowPromoConfirm] = useState(false);
  const [promoOutcome, setPromoOutcome] = useState<{
    promotedCount: number;
    retainedCount: number;
    graduatedCount: number;
    skippedDuplicates: number;
  } | null>(null);
  const [viewBatchDetails, setViewBatchDetails] = useState<PromotionBatch | null>(null);

  // Trigger Promotion Preview
  const handleGeneratePromoPreview = () => {
    const preview = promotionService.getPromotionPreview(
      promoSourceClassId,
      promoSourceSessionId,
      promoDestSessionId,
      promoDestClassId || undefined,
      promoDestSection
    );
    setPromoPreviewData(preview);
    setPromoDecisions([...preview.decisions]);
    setPromoOutcome(null);
  };

  // Update Decision in Preview
  const handleUpdateDecision = (studentId: string, updates: Partial<PromotionDecision>) => {
    setPromoDecisions(prev =>
      prev.map(d => (d.studentId === studentId ? { ...d, ...updates, isOverridden: true } : d))
    );
  };

  // Execute Confirmed Promotion Batch
  const handleExecutePromotion = () => {
    if (!promoPreviewData) return;
    setIsExecutingPromo(true);

    const res = promotionService.executePromotionBatch({
      sourceSessionId: promoSourceSessionId,
      destinationSessionId: promoDestSessionId,
      sourceClassId: promoSourceClassId,
      destinationClassId: promoDestClassId || promoPreviewData.destinationClass?.id || promoSourceClassId,
      destinationSection: promoDestSection,
      decisions: promoDecisions,
      operator: currentUser,
      notes: `Academic Promotion batch executed from ${promoPreviewData.sourceClass?.name} (${promoPreviewData.sourceSession?.name}) to ${promoPreviewData.destinationSession?.name}`,
    });

    setIsExecutingPromo(false);
    setShowPromoConfirm(false);

    if (!res.success) {
      addToast('error', 'Promotion Failed', res.error);
    } else {
      setPromoOutcome({
        promotedCount: res.promotedCount,
        retainedCount: res.retainedCount,
        graduatedCount: res.graduatedCount,
        skippedDuplicates: res.skippedDuplicates,
      });
      addToast(
        'success',
        'Promotion Executed',
        `Successfully promoted ${res.promotedCount} students to ${promoDestSessionId}.`
      );
      refreshAll();
    }
  };

  // ==========================================
  // BULK IMPORT STATE (Admin)
  // ==========================================
  const [importSessionId, setImportSessionId] = useState<string>(() => currentSession.id);
  const [importFileName, setImportFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof importService.validateImportRows> | null>(null);
  const [isCommittingImport, setIsCommittingImport] = useState(false);
  const [importOutcome, setImportOutcome] = useState<{
    createdStudents: number;
    createdEnrollments: number;
    skippedDuplicates: number;
    failedRows: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSampleCSV = () => {
    const csvContent = importService.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('info', 'Template Downloaded', 'Sample CSV template with required student headers downloaded.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportOutcome(null);

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const { rows } = importService.parseCSV(text);
      const mapped = rows.map((r, idx) => importService.mapRowToStudent(r, idx + 2));
      setParsedRows(mapped);

      // Pre-validate
      const vRes = importService.validateImportRows(mapped, importSessionId);
      setValidationResult(vRes);
    };
    reader.readAsText(file);
  };

  const handleDownloadErrorReport = () => {
    if (!validationResult || validationResult.errors.length === 0) return;
    const csvContent = importService.generateErrorReportCSV(validationResult.errors);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'import_validation_errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCommitImport = () => {
    if (!validationResult || validationResult.validRows.length === 0) return;
    setIsCommittingImport(true);

    const res = importService.commitImport(
      validationResult.validRows,
      importSessionId,
      importFileName,
      currentUser
    );

    setIsCommittingImport(false);

    if (!res.success) {
      addToast('error', 'Import Failed', res.error);
    } else {
      setImportOutcome({
        createdStudents: res.createdStudents,
        createdEnrollments: res.createdEnrollments,
        skippedDuplicates: res.skippedDuplicates,
        failedRows: res.failedRows,
      });
      addToast(
        'success',
        'Import Completed',
        `Successfully imported ${res.createdStudents} students and generated enrollments.`
      );
      setParsedRows([]);
      setValidationResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshAll();
    }
  };

  // Export Class Roster CSV
  const handleExportRosterCSV = () => {
    if (!activeClassTeacherClass) return;
    const enrollments = enrollmentService.getActiveEnrollmentsForClass(
      activeClassTeacherClass.id,
      activeClassTeacherClass.section,
      currentSession.id
    );

    const headers = 'Roll No,Admission No,Student Name,Gender,DOB,Parent Name,Parent Phone,Status\n';
    const lines = enrollments.map(e => {
      const s = studentService.getById(e.studentId);
      return `"${e.rollNo}","${e.admissionNo}","${s?.fullName || ''}","${s?.gender || ''}","${s?.dob || ''}","${s?.parentName || ''}","${s?.parentPhone || ''}","${e.status}"`;
    });

    const csvContent = headers + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeClassTeacherClass.name}_${activeClassTeacherClass.section}_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('info', 'Roster Exported', `Class ${activeClassTeacherClass.name} (${activeClassTeacherClass.section}) roster downloaded.`);
  };

  // ==========================================
  // HANDLERS FOR ADMIN CLASS CRUD
  // ==========================================
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassFormError('');
    setClassFormData({
      name: 'Class 10',
      grade: 10,
      section: 'C',
      classTeacherId: teachers[0]?.id || 'teach-1',
      roomNo: 'Room 303',
      capacity: 40,
      sessionId: selectedSessionFilter,
      academicYear: sessions.find(s => s.id === selectedSessionFilter)?.name || currentSession.name,
      subjectsText: 'Mathematics, Science, English Literature, Social Studies',
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (c: ClassRoom) => {
    setEditingClass(c);
    setClassFormError('');
    setClassFormData({
      name: c.name,
      grade: c.grade,
      section: c.section,
      classTeacherId: c.classTeacherId,
      roomNo: c.roomNo,
      capacity: c.capacity,
      sessionId: c.sessionId || currentSession.id,
      academicYear: c.academicYear,
      subjectsText: c.subjects.join(', '),
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    setClassFormError('');

    const assignedTeacher = teachers.find(t => t.id === classFormData.classTeacherId);
    const classTeacherName = assignedTeacher ? assignedTeacher.fullName : 'Unassigned';
    const subjects = classFormData.subjectsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const targetSession = sessions.find(s => s.id === classFormData.sessionId);

    if (editingClass) {
      const res = classService.update(
        editingClass.id,
        {
          name: classFormData.name,
          grade: Number(classFormData.grade),
          section: classFormData.section.toUpperCase(),
          classTeacherId: classFormData.classTeacherId,
          classTeacherName,
          roomNo: classFormData.roomNo,
          capacity: Number(classFormData.capacity),
          sessionId: classFormData.sessionId,
          academicYear: targetSession?.name || classFormData.academicYear,
          subjects,
        },
        currentUser
      );
      if (!res.success) {
        setClassFormError(res.error || 'Failed to update class.');
        return;
      }
      addToast('success', 'Class Updated', `${classFormData.name} (${classFormData.section}) updated.`);
    } else {
      const res = classService.create(
        {
          name: classFormData.name,
          grade: Number(classFormData.grade),
          section: classFormData.section.toUpperCase(),
          classTeacherId: classFormData.classTeacherId,
          classTeacherName,
          roomNo: classFormData.roomNo,
          capacity: Number(classFormData.capacity),
          sessionId: classFormData.sessionId,
          academicYear: targetSession?.name || classFormData.academicYear,
          subjects,
        },
        currentUser
      );
      if (!res.success) {
        setClassFormError(res.error || 'Failed to create class.');
        return;
      }
      addToast('success', 'Class Created', `${classFormData.name} Section ${classFormData.section} created.`);
    }

    setIsClassModalOpen(false);
    refreshAll();
  };

  const handleDeleteClass = () => {
    if (deleteClassTarget) {
      const res = classService.delete(deleteClassTarget.id, currentUser);
      if (!res.success) {
        addToast('error', 'Cannot Delete Class', res.error);
      } else {
        addToast('warning', 'Class Deleted', `${deleteClassTarget.name} (${deleteClassTarget.section}) was removed.`);
        setDeleteClassTarget(null);
        refreshAll();
      }
    }
  };

  // ==========================================
  // CLASS TOOLBOX (New/Edit/Duplicate/Delete/Copy/Paste/Import/Template/Export/Print/Refresh)
  // ==========================================
  const canModifyClasses = ['school_admin', 'super_admin'].includes(currentRole);

  const filteredClasses = useMemo(() => {
    return classes
      .filter(c => (!selectedSessionFilter ? true : c.sessionId === selectedSessionFilter))
      .filter(c => {
        if (!classSearchQuery.trim()) return true;
        const q = classSearchQuery.toLowerCase();
        return (
          (c.name || '').toLowerCase().includes(q) ||
          (c.section || '').toLowerCase().includes(q) ||
          (c.classTeacherName || c.classTeacher || '').toLowerCase().includes(q)
        );
      });
  }, [classes, selectedSessionFilter, classSearchQuery]);

  const classToolboxColumns: ToolboxColumn<ClassRoom>[] = [
    { header: 'Class Name', value: c => c.name },
    { header: 'Grade', value: c => c.grade },
    { header: 'Section', value: c => c.section },
    { header: 'Class Teacher', value: c => c.classTeacherName || c.classTeacher || 'Unassigned' },
    { header: 'Room No', value: c => c.roomNo },
    { header: 'Capacity', value: c => c.capacity },
    { header: 'Academic Year', value: c => c.academicYear },
    { header: 'Subjects', value: c => (c.subjects || []).join('; ') },
    { header: 'Status', value: c => c.status || 'active' },
  ];

  const toggleRow = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleClassDeleteMany = (ids: string[]) => {
    if (!canModifyClasses) return;
    let n = 0;
    ids.forEach(id => {
      const res = classService.delete(id, currentUser);
      if (res.success) n++;
    });
    addToast('warning', 'Classes Deleted', `${n} class record(s) removed.`);
    setSelectedIds([]);
    refreshAll();
  };

  const handleClassDuplicateMany = (ids: string[]) => {
    if (!canModifyClasses) return;
    let n = 0;
    ids.forEach(id => {
      const c = classes.find(x => x.id === id);
      if (!c) return;
      const res = classService.create(
        {
          name: c.name,
          grade: c.grade,
          section: `${c.section}${Math.floor(Math.random() * 9) + 1}`,
          classTeacherId: c.classTeacherId,
          classTeacherName: c.classTeacherName || c.classTeacher || 'Unassigned',
          classTeacher: c.classTeacher,
          roomNo: c.roomNo,
          capacity: c.capacity,
          academicYear: c.academicYear,
          sessionId: c.sessionId,
          status: c.status,
          subjects: [...(c.subjects || [])],
        } as Omit<ClassRoom, 'id' | 'studentCount'>,
        currentUser
      );
      if (res.success) n++;
    });
    addToast(n > 0 ? 'success' : 'warning', 'Duplicate', `${n} class record(s) duplicated.`);
    setSelectedIds([]);
    refreshAll();
  };

  const handleClassImport = (records: Record<string, string>[]) => {
    if (!canModifyClasses) {
      addToast('error', 'Access Denied', 'Only administrators can import classes.');
      return;
    }
    let ok = 0;
    let skip = 0;
    records.forEach(r => {
      const name = pickField(r, 'Class Name', 'Name', 'className');
      if (!name) {
        skip++;
        return;
      }
      const gradeRaw = pickField(r, 'Grade');
      const grade = Number(gradeRaw) || Number((name.match(/\d+/) || [])[0]) || 1;
      const section = (pickField(r, 'Section') || 'A').trim();
      const teacherName = pickField(r, 'Class Teacher', 'Teacher');
      const matchedTeacher = teachers.find(
        t => t.fullName.toLowerCase() === teacherName.toLowerCase()
      );
      const subjects = pickField(r, 'Subjects')
        .split(/[;,]/)
        .map(s => s.trim())
        .filter(Boolean);
      const payload = {
        name,
        grade,
        section,
        classTeacherId: matchedTeacher?.id || '',
        classTeacherName: matchedTeacher?.fullName || teacherName || 'To Be Assigned',
        roomNo: pickField(r, 'Room No', 'Room'),
        capacity: Number(pickField(r, 'Capacity')) || 40,
        academicYear: pickField(r, 'Academic Year') || currentSession.name,
        sessionId: selectedSessionFilter || currentSession.id,
        status: 'active' as const,
        subjects,
      } as Omit<ClassRoom, 'id' | 'studentCount'>;

      // Create; on duplicate grade+section collision, bump section (B, C, D…) and retry.
      let res = classService.create(payload, currentUser);
      let attempts = 0;
      while (!res.success && attempts < 6) {
        const err = (res.error || '').toLowerCase();
        if (err.includes('already')) {
          const nextCode = (payload.section.charCodeAt(0) || 65) + 1;
          payload.section = String.fromCharCode(nextCode > 90 ? 65 : nextCode) + (nextCode > 90 ? String(attempts + 2) : '');
        } else break;
        res = classService.create(payload, currentUser);
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
    refreshAll();
  };

  // ==========================================
  // HANDLERS FOR ACADEMIC SESSION CRUD
  // ==========================================
  const handleOpenAddSession = () => {
    setSessionFormError('');
    setSessionFormData({
      name: '2027–2028',
      startDate: '2027-04-01',
      endDate: '2028-03-31',
      status: 'planned',
      isCurrent: false,
      description: 'Planned Next Academic Session',
    });
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    setSessionFormError('');

    const res = academicSessionService.create(sessionFormData, currentUser);
    if (!res.success) {
      setSessionFormError(res.error || 'Failed to create session.');
      return;
    }

    addToast('success', 'Academic Session Created', `Session ${sessionFormData.name} added.`);
    setIsSessionModalOpen(false);
    refreshAll();
  };

  const handleSetCurrentSession = (id: string) => {
    const res = academicSessionService.setCurrentSession(id, currentUser);
    if (!res.success) {
      addToast('error', 'Action Denied', res.error);
    } else {
      addToast('success', 'Active Session Updated', 'Current academic year updated school-wide.');
      refreshAll();
    }
  };

  const handleCloseSession = (id: string) => {
    const res = academicSessionService.closeSession(id, currentUser);
    if (!res.success) {
      addToast('error', 'Action Denied', res.error);
    } else {
      addToast('info', 'Session Closed', 'Academic session closed and archived.');
      refreshAll();
    }
  };

  // ==========================================
  // HANDLERS FOR STUDENT ENROLLMENT ACTIONS
  // ==========================================
  const handleRegisterNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterFormError('');

    if (!activeClassTeacherClass) return;

    const res = enrollmentService.registerAndEnrollNewStudent({
      student: {
        admissionNo: registerFormData.admissionNo || undefined,
        firstName: registerFormData.firstName,
        lastName: registerFormData.lastName,
        fullName: `${registerFormData.firstName.trim()} ${registerFormData.lastName.trim()}`,
        gender: registerFormData.gender,
        dob: registerFormData.dob,
        bloodGroup: registerFormData.bloodGroup,
        parentName: registerFormData.parentName,
        parentPhone: registerFormData.parentPhone,
        parentEmail: registerFormData.parentEmail,
        address: registerFormData.address,
        classId: activeClassTeacherClass.id,
        className: activeClassTeacherClass.name,
        section: activeClassTeacherClass.section,
        rollNo: registerFormData.rollNo,
        academicYear: currentSession.name,
        admissionDate: todayISO(),
        status: 'active',
      },
      classId: activeClassTeacherClass.id,
      section: activeClassTeacherClass.section,
      sessionId: currentSession.id,
      rollNo: registerFormData.rollNo,
      operator: currentUser,
    });

    if (!res.success) {
      setRegisterFormError(res.error || 'Failed to register student.');
      return;
    }

    addToast('success', 'Student Enrolled', `${res.student?.fullName} registered and enrolled in ${activeClassTeacherClass.name} (${activeClassTeacherClass.section}).`);
    setIsRegisterStudentModalOpen(false);
    refreshAll();
  };

  const handleAssignExistingStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');

    if (!selectedStudentToAssign || !activeClassTeacherClass) {
      setAssignError('Please select an eligible student to assign.');
      return;
    }

    const res = enrollmentService.enrollExistingStudent({
      studentId: selectedStudentToAssign.id,
      classId: activeClassTeacherClass.id,
      section: activeClassTeacherClass.section,
      sessionId: currentSession.id,
      rollNo: assignRollNo,
      remarks: `Assigned to ${activeClassTeacherClass.name} (${activeClassTeacherClass.section}) by ${currentUser.name}`,
      operator: currentUser,
    });

    if (!res.success) {
      setAssignError(res.error || 'Failed to assign student.');
      return;
    }

    addToast('success', 'Student Assigned', `${selectedStudentToAssign.fullName} enrolled into ${activeClassTeacherClass.name} (${activeClassTeacherClass.section}).`);
    setIsAssignStudentModalOpen(false);
    setSelectedStudentToAssign(null);
    setAssignRollNo('');
    refreshAll();
  };

  const handleTransferStudent = () => {
    if (!transferTarget || !transferClassId) return;

    const res = enrollmentService.transferStudent(
      transferTarget.id,
      transferClassId,
      transferSection,
      transferReason,
      currentUser
    );

    if (!res.success) {
      addToast('error', 'Transfer Failed', res.error);
    } else {
      addToast('success', 'Student Transferred', `Student successfully transferred to new class.`);
      setTransferTarget(null);
      refreshAll();
    }
  };

  const handleWithdrawStudent = () => {
    if (!withdrawTarget) return;

    const res = enrollmentService.withdrawStudent(
      withdrawTarget.id,
      withdrawReason,
      currentUser
    );

    if (!res.success) {
      addToast('error', 'Withdrawal Failed', res.error);
    } else {
      addToast('warning', 'Student Withdrawn', `Student enrollment status set to Withdrawn.`);
      setWithdrawTarget(null);
      refreshAll();
    }
  };

  // Candidates for assigning existing student (excluding already active in this class)
  const assignableStudents = useMemo(() => {
    if (!activeClassTeacherClass) return [];
    const allStudents = studentService.getAll();
    const enrolledIds = new Set(classTeacherEnrollments.filter(e => e.status === 'active').map(e => e.studentId));

    return allStudents.filter(s => {
      if (enrolledIds.has(s.id)) return false;
      if (!assignStudentSearch.trim()) return true;
      const q = assignStudentSearch.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    });
  }, [activeClassTeacherClass, classTeacherEnrollments, assignStudentSearch, storeVersion]);

  // Destination classes for promotion dropdown
  const promoDestinationClasses = useMemo(() => {
    return classService.getBySession(promoDestSessionId);
  }, [promoDestSessionId, classes]);

  // ==========================================
  // RENDER: CLASS TEACHER WORKSPACE
  // ==========================================
  if (currentRole === 'teacher') {
    if (!isTeacherClassTeacher) {
      return (
        <div className="classes-container">
          <div className="page-header">
            <div className="page-title-group">
              <h1>My Teaching Classes</h1>
              <p className="page-subtitle">Faculty timetable and subject allocations</p>
            </div>
          </div>

          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              icon={<BookOpen size={40} />}
              title="No Class Teacher Assignment"
              description="You are currently not allocated as the primary Class Teacher for an academic class. You can review your subject timetable under My Timetable or mark class subject attendance under Attendance."
            />
          </div>
        </div>
      );
    }

    return (
      <div className="classes-container">
        {/* Class Teacher Header & Banner */}
        <div className="class-teacher-banner">
          <div className="class-teacher-banner-left">
            <div className="class-teacher-avatar-circle" style={{ overflow: 'hidden', padding: 0 }}>
              <img
                src={teacherService.getTeacherPhoto(teacherUser)}
                alt={teacherUser?.fullName || 'Class Teacher'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#991b1b', letterSpacing: '0.04em' }}>
                Class Teacher Management Dashboard
              </div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '2px 0', color: '#1e293b' }}>
                {activeClassTeacherClass?.name} ({activeClassTeacherClass?.section}) — {currentSession.name}
              </h1>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Class Teacher: <strong>{teacherUser?.fullName}</strong> • Room: <strong>{activeClassTeacherClass?.roomNo}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {teacherAssignedClasses.length > 1 && (
              <select
                className="form-select"
                style={{ width: '180px' }}
                value={selectedTeacherClassId}
                onChange={e => setSelectedTeacherClassId(e.target.value)}
              >
                {teacherAssignedClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.section})
                  </option>
                ))}
              </select>
            )}

            <button className="btn btn-primary btn-sm" onClick={() => setIsRegisterStudentModalOpen(true)}>
              <Plus size={14} />
              <span>Register Student</span>
            </button>

            <button className="btn btn-outline btn-sm" onClick={() => setIsAssignStudentModalOpen(true)}>
              <Users size={14} />
              <span>Assign Existing</span>
            </button>

            <button className="btn btn-secondary btn-sm" onClick={handleExportRosterCSV}>
              <Download size={14} />
              <span>Export Roster</span>
            </button>

            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/class-groups')}
              title="Open Class Group announcements and student discussions"
            >
              <MessageSquare size={14} />
              <span>Class Messages</span>
            </button>
          </div>
        </div>

        {/* Enrollment & Performance Metrics Bar */}
        <div className="class-metrics-grid">
          <div className="class-metric-card">
            <div className="class-metric-label">
              <Users size={14} color="#3B82F6" />
              <span>Active Students</span>
            </div>
            <div className="class-metric-val">{classMetrics.active}</div>
            <div className="occupancy-bar-container">
              <div
                className={`occupancy-bar-fill ${
                  classMetrics.active >= classMetrics.capacity ? 'danger' : classMetrics.active >= classMetrics.capacity * 0.9 ? 'warning' : ''
                }`}
                style={{ width: `${Math.min(100, (classMetrics.active / classMetrics.capacity) * 100)}%` }}
              />
            </div>
            <div className="class-metric-subtext">Capacity: {classMetrics.capacity} seats</div>
          </div>

          <div className="class-metric-card">
            <div className="class-metric-label">
              <UserMinus size={14} color="#991b1b" />
              <span>Withdrawn</span>
            </div>
            <div className="class-metric-val">{classMetrics.withdrawn}</div>
            <div className="class-metric-subtext">Archived from active roll</div>
          </div>

          <div className="class-metric-card">
            <div className="class-metric-label">
              <ArrowLeftRight size={14} color="#d97706" />
              <span>Transferred</span>
            </div>
            <div className="class-metric-val">{classMetrics.transferred}</div>
            <div className="class-metric-subtext">Section / Class reallocations</div>
          </div>

          <div className="class-metric-card">
            <div className="class-metric-label">
              <UserCheck size={14} color="#16a34a" />
              <span>Weekly Attendance</span>
            </div>
            <div className="class-metric-val" style={{ color: '#166534' }}>{classMetrics.attendanceRate}%</div>
            <div className="class-metric-subtext">Reconciled session records</div>
          </div>

          <div className="class-metric-card">
            <div className="class-metric-label">
              <TrendingUp size={14} color="#4f46e5" />
              <span>Class Avg Grade</span>
            </div>
            <div className="class-metric-val" style={{ color: '#3730a3' }}>{classMetrics.avgGrade}</div>
            <div className="class-metric-subtext">Published examination results</div>
          </div>
        </div>

        {/* Student Roster Section */}
        <div style={{ background: '#ffffff', border: '1px solid var(--color-sidebar-border, #f1e5e4)', borderRadius: '0.625rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Enrolled Student Roster ({classTeacherEnrollments.length})
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Academic Year {currentSession.name} • Filtered to {activeClassTeacherClass?.name} ({activeClassTeacherClass?.section})
              </p>
            </div>
          </div>

          <div className="roster-table-container" style={{ border: 'none', borderRadius: 0 }}>
            {classTeacherEnrollments.length === 0 ? (
              <div style={{ padding: '40px 20px' }}>
                <EmptyState
                  icon={<Users size={32} />}
                  title="No Students Enrolled"
                  description="Click Register Student or Assign Existing to enroll students into this class."
                />
              </div>
            ) : (
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Adm No</th>
                    <th>Student Name</th>
                    <th>Gender</th>
                    <th>Parent Contact</th>
                    <th>Status</th>
                    <th>Enrolled Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classTeacherEnrollments.map(enr => {
                    const student = studentService.getById(enr.studentId);
                    return (
                      <tr key={enr.id}>
                        <td style={{ fontWeight: 700, color: '#3B82F6' }}>{enr.rollNo}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{enr.admissionNo}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{student?.fullName || enr.admissionNo}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>DOB: {student?.dob || '—'}</div>
                        </td>
                        <td>{student?.gender || '—'}</td>
                        <td>
                          <div>{student?.parentName || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{student?.parentPhone || '—'}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${enr.status}`}>{enr.status}</span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{enr.enrollmentDate}</td>
                        <td style={{ textAlign: 'right' }}>
                          {enr.status === 'active' && (
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setTransferTarget(enr);
                                  setTransferClassId(activeClassTeacherClass?.id || '');
                                  setTransferSection(activeClassTeacherClass?.section === 'A' ? 'B' : 'A');
                                }}
                                title="Transfer to another class/section"
                              >
                                <ArrowLeftRight size={13} />
                                <span>Transfer</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setWithdrawTarget(enr)}
                                title="Withdraw student from roll"
                              >
                                <UserMinus size={13} color="#991b1b" />
                                <span>Withdraw</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MODAL: Register New Student */}
        {isRegisterStudentModalOpen && (
          <Modal
            isOpen={isRegisterStudentModalOpen}
            onClose={() => setIsRegisterStudentModalOpen(false)}
            title={`Register Student — ${activeClassTeacherClass?.name} (${activeClassTeacherClass?.section})`}
            size="large"
          >
            <form onSubmit={handleRegisterNewStudent}>
              {registerFormError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {registerFormError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label required">First Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={registerFormData.firstName}
                    onChange={e => setRegisterFormData({ ...registerFormData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label required">Last Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={registerFormData.lastName}
                    onChange={e => setRegisterFormData({ ...registerFormData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label required">Gender</label>
                  <select
                    className="form-select"
                    value={registerFormData.gender}
                    onChange={e => setRegisterFormData({ ...registerFormData, gender: e.target.value as any })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label required">Date of Birth</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={registerFormData.dob}
                    onChange={e => setRegisterFormData({ ...registerFormData, dob: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Blood Group</label>
                  <input
                    type="text"
                    className="form-input"
                    value={registerFormData.bloodGroup}
                    onChange={e => setRegisterFormData({ ...registerFormData, bloodGroup: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label required">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={registerFormData.parentName}
                    onChange={e => setRegisterFormData({ ...registerFormData, parentName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label required">Parent Contact Phone</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    value={registerFormData.parentPhone}
                    onChange={e => setRegisterFormData({ ...registerFormData, parentPhone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label">Admission Number (Optional Auto-Generated)</label>
                  <input
                    type="text"
                    placeholder="e.g. ADM-2026-xxx"
                    className="form-input"
                    value={registerFormData.admissionNo}
                    onChange={e => setRegisterFormData({ ...registerFormData, admissionNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 10A-40"
                    className="form-input"
                    value={registerFormData.rollNo}
                    onChange={e => setRegisterFormData({ ...registerFormData, rollNo: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRegisterStudentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Enroll Student
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: Assign Existing Student */}
        {isAssignStudentModalOpen && (
          <Modal
            isOpen={isAssignStudentModalOpen}
            onClose={() => setIsAssignStudentModalOpen(false)}
            title={`Assign Existing Student to ${activeClassTeacherClass?.name} (${activeClassTeacherClass?.section})`}
            size="large"
          >
            <form onSubmit={handleAssignExistingStudent}>
              {assignError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {assignError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Search Student by Name or Admission No</label>
                <SearchInput
                  value={assignStudentSearch}
                  onChange={setAssignStudentSearch}
                  placeholder="Search unassigned or enrolled students..."
                  ariaLabel="Search students by name or admission number"
                />
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-sidebar-border)', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                {assignableStudents.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    No matching unassigned students found.
                  </div>
                ) : (
                  assignableStudents.map(s => {
                    const isSelected = selectedStudentToAssign?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudentToAssign(s)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isSelected ? '#fff5f5' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong>{s.fullName}</strong> ({s.admissionNo})
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>
                            Current: {s.className} ({s.section})
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 size={16} color="#3B82F6" />}
                      </div>
                    );
                  })
                )}
              </div>

              {selectedStudentToAssign && (
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Selected: <strong>{selectedStudentToAssign.fullName}</strong> ({selectedStudentToAssign.admissionNo}) &rarr; Destination: <strong>{activeClassTeacherClass?.name} ({activeClassTeacherClass?.section})</strong>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Roll Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 10A-41"
                  className="form-input"
                  value={assignRollNo}
                  onChange={e => setAssignRollNo(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAssignStudentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!selectedStudentToAssign}>
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: Transfer Student */}
        {transferTarget && (
          <Modal
            isOpen={Boolean(transferTarget)}
            onClose={() => setTransferTarget(null)}
            title={`Transfer Student — ${studentService.getById(transferTarget.studentId)?.fullName || transferTarget.admissionNo}`}
            size="normal"
          >
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label required">Destination Class</label>
                <select
                  className="form-select"
                  value={transferClassId}
                  onChange={e => setTransferClassId(e.target.value)}
                >
                  {classes
                    .filter(c => c.sessionId === currentSession.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section}) - Teacher: {c.classTeacherName || c.classTeacher || 'Unassigned'}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label required">Destination Section</label>
                <select
                  className="form-select"
                  value={transferSection}
                  onChange={e => setTransferSection(e.target.value)}
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label required">Transfer Justification / Reason</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setTransferTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleTransferStudent}>
                  Execute Transfer
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL: Withdraw Student */}
        {withdrawTarget && (
          <ConfirmDialog
            isOpen={Boolean(withdrawTarget)}
            onClose={() => setWithdrawTarget(null)}
            onConfirm={handleWithdrawStudent}
            title="Withdraw Student from Roll"
            message={`Are you sure you want to withdraw ${studentService.getById(withdrawTarget.studentId)?.fullName} (${withdrawTarget.admissionNo}) from active class enrollment?`}
            confirmLabel="Confirm Withdrawal"
            isDestructive={true}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: SCHOOL ADMIN / SUPER ADMIN WORKSPACE
  // ==========================================
  return (
    <div className="classes-container">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Classes, Sessions & Promotion</h1>
          <p className="page-subtitle">Manage classes, academic sessions, and student promotion.</p>
        </div>

        <div className="page-actions">
          {activeTab === 'sessions' && (
            <button className="btn btn-primary" onClick={handleOpenAddSession}>
              <Calendar size={16} />
              <span>Add Academic Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="classes-tabs">
        <button
          className={`classes-tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          <BookOpen size={16} />
          <span>Classes & Sections</span>
          <span className="badge-pill">{classes.length}</span>
        </button>

        <button
          className={`classes-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Calendar size={16} />
          <span>Academic Sessions</span>
          <span className="badge-pill">{sessions.length}</span>
        </button>

        <button
          className={`classes-tab-btn ${activeTab === 'promotion' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotion')}
        >
          <TrendingUp size={16} />
          <span>Academic Year Promotion</span>
        </button>

        <button
          className={`classes-tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <FileSpreadsheet size={16} />
          <span>Bulk Student Import</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: CLASSES & SECTIONS (Admin)          */}
      {/* ========================================== */}
      {activeTab === 'classes' && (
        <>
          {canModifyClasses && (
            <EntityToolbox<ClassRoom>
              entityLabel="Class"
              fileBaseName="Classes_Directory"
              rows={filteredClasses}
              columns={classToolboxColumns}
              getId={c => c.id}
              selectedIds={selectedIds}
              canModify={canModifyClasses}
              onNew={handleOpenAddClass}
              onEditOne={id => {
                const c = classes.find(x => x.id === id);
                if (c) handleOpenEditClass(c);
              }}
              onDuplicateMany={handleClassDuplicateMany}
              onDeleteMany={handleClassDeleteMany}
              onImport={handleClassImport}
              onRefresh={refreshAll}
              onClearSelection={() => setSelectedIds([])}
            />
          )}

          <div className="filter-toolbar">
            <div className="filter-group-left">
              <select
                className="form-select filter-select filter-select-lg"
                value={selectedSessionFilter}
                onChange={e => setSelectedSessionFilter(e.target.value)}
                aria-label="Filter Academic Sessions"
              >
                <option value="">All Academic Sessions</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isCurrent ? '(Active)' : `(${s.status})`}
                  </option>
                ))}
              </select>

              <SearchInput
                value={classSearchQuery}
                onChange={setClassSearchQuery}
                placeholder="Search class or teacher..."
                ariaLabel="Search classes or teachers"
              />
            </div>

            <div className="filter-group-right">
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Showing {filteredClasses.length} classes
              </span>
            </div>
          </div>

          <div className="responsive-cards-grid">
            {filteredClasses
              .map(c => {
                // Dynamic active enrollments count
                const counts = enrollmentService.getClassCounts(c.id, c.section, c.sessionId);
                const activeCount = counts.active;
                const cap = c.capacity || 40;
                const occupancyPct = Math.min(100, Math.round((activeCount / cap) * 100));

                return (
                  <div key={c.id} className="card class-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header" style={{ paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3B82F6' }}>
                            {c.academicYear}
                          </div>
                          <h3 className="card-title" style={{ fontSize: '1.125rem' }}>
                            {c.name} — Section {c.section}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {canModifyClasses && (
                            <input
                              type="checkbox"
                              className="tb-row-check"
                              aria-label={`Select ${c.name} ${c.section}`}
                              checked={selectedIds.includes(c.id)}
                              onChange={() => toggleRow(c.id)}
                              style={{ marginRight: '2px' }}
                            />
                          )}
                          <button
                            className="btn btn-secondary btn-icon-only btn-sm"
                            onClick={() => handleOpenEditClass(c)}
                            title="Edit Class"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-secondary btn-icon-only btn-sm"
                            onClick={() => setDeleteClassTarget(c)}
                            title="Delete Class"
                          >
                            <Trash2 size={14} color="#3B82F6" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Assigned Class Teacher:</div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.classTeacherName || c.classTeacher || 'Unassigned'}</div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span>Room: <strong>{c.roomNo}</strong></span>
                        <span>Enrolled: <strong>{activeCount} / {cap}</strong></span>
                      </div>

                      <div>
                        <div className="occupancy-bar-container">
                          <div
                            className={`occupancy-bar-fill ${occupancyPct >= 100 ? 'danger' : occupancyPct >= 90 ? 'warning' : ''}`}
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px', textAlign: 'right' }}>
                          {occupancyPct}% capacity
                        </div>
                      </div>

                      {c.subjects && c.subjects.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Subjects:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {c.subjects.slice(0, 3).map((sub, sIdx) => (
                              <span key={sIdx} className="badge badge-subtle" style={{ fontSize: '0.6875rem' }}>
                                {sub}
                              </span>
                            ))}
                            {c.subjects.length > 3 && (
                              <span className="badge badge-subtle" style={{ fontSize: '0.6875rem' }}>
                                +{c.subjects.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="card-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`status-pill ${c.status || 'active'}`}>{c.status || 'active'}</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setViewRosterClass(c)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Users size={13} />
                        <span>View Class Roster</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* MODAL: Class CRUD */}
          {isClassModalOpen && (
            <Modal
              isOpen={isClassModalOpen}
              onClose={() => setIsClassModalOpen(false)}
              title={editingClass ? `Edit Class — ${editingClass.name} (${editingClass.section})` : 'Add New Class & Section'}
              size="normal"
            >
              <form onSubmit={handleSaveClass}>
                {classFormError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {classFormError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label required">Academic Session</label>
                    <select
                      className="form-select"
                      value={classFormData.sessionId}
                      onChange={e => setClassFormData({ ...classFormData, sessionId: e.target.value })}
                    >
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.isCurrent ? '(Active)' : `(${s.status})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label required">Class Grade Number</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      className="form-input"
                      value={classFormData.grade}
                      onChange={e => setClassFormData({ ...classFormData, grade: Number(e.target.value), name: `Class ${e.target.value}` })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label required">Section</label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      className="form-input"
                      value={classFormData.section}
                      onChange={e => setClassFormData({ ...classFormData, section: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className="form-label required">Capacity (Seats)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={60}
                      className="form-input"
                      value={classFormData.capacity}
                      onChange={e => setClassFormData({ ...classFormData, capacity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label required">Assigned Class Teacher</label>
                  <select
                    className="form-select"
                    value={classFormData.classTeacherId}
                    onChange={e => setClassFormData({ ...classFormData, classTeacherId: e.target.value })}
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label required">Classroom / Room No</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={classFormData.roomNo}
                    onChange={e => setClassFormData({ ...classFormData, roomNo: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Taught Subjects (Comma-Separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={classFormData.subjectsText}
                    onChange={e => setClassFormData({ ...classFormData, subjectsText: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsClassModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingClass ? 'Save Class Details' : 'Create Class'}
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* Delete Class Confirmation Dialog */}
          {deleteClassTarget && (
            <ConfirmDialog
              isOpen={Boolean(deleteClassTarget)}
              onClose={() => setDeleteClassTarget(null)}
              onConfirm={handleDeleteClass}
              title="Delete Class & Section"
              message={`Are you sure you want to delete ${deleteClassTarget.name} (${deleteClassTarget.section})? This class must have zero active enrollments.`}
              confirmLabel="Delete Class"
              isDestructive={true}
            />
          )}

          {/* MODAL: View Class Roster (Admin) */}
          {viewRosterClass && (
            <Modal
              isOpen={Boolean(viewRosterClass)}
              onClose={() => setViewRosterClass(null)}
              title={`${viewRosterClass.name} (${viewRosterClass.section}) — Active Student Roster`}
              size="large"
            >
              <div className="roster-table-container">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Adm No</th>
                      <th>Student Name</th>
                      <th>Parent Name</th>
                      <th>Parent Phone</th>
                      <th>Enrollment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentService
                      .getActiveEnrollmentsForClass(viewRosterClass.id, viewRosterClass.section, viewRosterClass.sessionId)
                      .map(enr => {
                        const s = studentService.getById(enr.studentId);
                        return (
                          <tr key={enr.id}>
                            <td style={{ fontWeight: 700, color: '#3B82F6' }}>{enr.rollNo}</td>
                            <td style={{ fontFamily: 'monospace' }}>{enr.admissionNo}</td>
                            <td style={{ fontWeight: 600 }}>{s?.fullName || enr.admissionNo}</td>
                            <td>{s?.parentName || '—'}</td>
                            <td>{s?.parentPhone || '—'}</td>
                            <td><span className={`status-pill ${enr.status}`}>{enr.status}</span></td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Modal>
          )}
        </>
      )}

      {/* ========================================== */}
      {/* TAB 2: ACADEMIC SESSIONS (Admin)           */}
      {/* ========================================== */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--color-sidebar-border, #f1e5e4)', borderRadius: '0.625rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Configured Academic Sessions ({sessions.length})
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Only one session can be currently active. Closing a session archives its records.
              </p>
            </div>

            <div className="roster-table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Session Name</th>
                    <th>Date Range</th>
                    <th>Status</th>
                    <th>Active Session</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b' }}>{s.name}</td>
                      <td>
                        {s.startDate} &rarr; {s.endDate}
                      </td>
                      <td>
                        <span className={`status-pill ${s.status === 'active' ? 'active' : s.status === 'closed' ? 'withdrawn' : 'transferred'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        {s.isCurrent ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 700, fontSize: '0.75rem' }}>
                            <CheckCircle2 size={14} /> Active Current Session
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Inactive</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{s.description || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {!s.isCurrent && s.status !== 'closed' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSetCurrentSession(s.id)}
                            >
                              <span>Set Active</span>
                            </button>
                          )}
                          {s.status !== 'closed' && !s.isCurrent && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCloseSession(s.id)}
                            >
                              <span>Close Session</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Session Modal */}
          {isSessionModalOpen && (
            <Modal
              isOpen={isSessionModalOpen}
              onClose={() => setIsSessionModalOpen(false)}
              title="Add New Academic Session"
              size="normal"
            >
              <form onSubmit={handleSaveSession}>
                {sessionFormError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {sessionFormError}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label required">Session Name (e.g. 2027–2028)</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={sessionFormData.name}
                    onChange={e => setSessionFormData({ ...sessionFormData, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label required">Session Start Date</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={sessionFormData.startDate}
                      onChange={e => setSessionFormData({ ...sessionFormData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label required">Session End Date</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={sessionFormData.endDate}
                      onChange={e => setSessionFormData({ ...sessionFormData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Initial Status</label>
                  <select
                    className="form-select"
                    value={sessionFormData.status}
                    onChange={e => setSessionFormData({ ...sessionFormData, status: e.target.value as any })}
                  >
                    <option value="planned">Planned (Upcoming)</option>
                    <option value="active">Active (Immediate)</option>
                    <option value="closed">Closed (Archived)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Description / Remarks</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={sessionFormData.description}
                    onChange={e => setSessionFormData({ ...sessionFormData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsSessionModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Session
                  </button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: ACADEMIC PROMOTION ENGINE (Admin)   */}
      {/* ========================================== */}
      {activeTab === 'promotion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Promotion Selection Configuration */}
          <div className="promotion-config-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <TrendingUp size={20} color="#3B82F6" />
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                  Automatic Academic Progression & Promotion Engine
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Controlled transition of eligible students from one academic session to the next based on examination results
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label required">1. Source Session</label>
                <select
                  className="form-select"
                  value={promoSourceSessionId}
                  onChange={e => setPromoSourceSessionId(e.target.value)}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isCurrent ? '(Current)' : `(${s.status})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label required">2. Source Class</label>
                <select
                  className="form-select"
                  value={promoSourceClassId}
                  onChange={e => setPromoSourceClassId(e.target.value)}
                >
                  {classes
                    .filter(c => !promoSourceSessionId || c.sessionId === promoSourceSessionId)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section}) - Teacher: {c.classTeacherName || c.classTeacher || 'Unassigned'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label required">3. Destination Session</label>
                <select
                  className="form-select"
                  value={promoDestSessionId}
                  onChange={e => setPromoDestSessionId(e.target.value)}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isCurrent ? '(Active)' : `(${s.status})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label required">4. Destination Class</label>
                <select
                  className="form-select"
                  value={promoDestClassId}
                  onChange={e => setPromoDestClassId(e.target.value)}
                >
                  <option value="">Auto-Resolve Next Grade</option>
                  {promoDestinationClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={handleGeneratePromoPreview}
                >
                  <Sparkles size={15} />
                  <span>Generate Preview</span>
                </button>
              </div>
            </div>
          </div>

          {/* Outcome Banner if Executed */}
          {promoOutcome && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.625rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} color="#16a34a" />
              <div>
                <strong style={{ color: '#166534' }}>Promotion Batch Committed Successfully!</strong>
                <div style={{ fontSize: '0.8125rem', color: '#15803d', marginTop: '2px' }}>
                  Promoted: <strong>{promoOutcome.promotedCount}</strong> • Retained: <strong>{promoOutcome.retainedCount}</strong> • Graduated: <strong>{promoOutcome.graduatedCount}</strong> • Skipped Idempotent Duplicates: <strong>{promoOutcome.skippedDuplicates}</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Promotion Preview Table & Action Controls */}
          {promoPreviewData && (
            <div style={{ background: '#ffffff', border: '1px solid var(--color-sidebar-border, #f1e5e4)', borderRadius: '0.625rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                    Promotion Roster Preview — {promoPreviewData.sourceClass?.name} ({promoPreviewData.sourceClass?.section}) &rarr; {promoDestSessionId}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Review derived academic eligibility. You may override decisions before confirmation.
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setShowPromoConfirm(true)}
                  disabled={promoDecisions.filter(d => d.status !== 'excluded').length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ShieldCheck size={16} />
                  <span>Confirm Promotion Batch ({promoDecisions.filter(d => d.status !== 'excluded').length})</span>
                </button>
              </div>

              {/* Statistics Pill Bar */}
              <div className="promotion-stats-bar" style={{ margin: '1rem', marginBottom: 0 }}>
                <span className="promotion-stat-item">
                  Total Students: <strong>{promoPreviewData.statistics.total}</strong>
                </span>
                <span>•</span>
                <span className="promotion-stat-item" style={{ color: '#16a34a' }}>
                  Eligible for Promotion: <strong>{promoPreviewData.statistics.eligible}</strong>
                </span>
                <span>•</span>
                <span className="promotion-stat-item" style={{ color: '#d97706' }}>
                  Compartment: <strong>{promoPreviewData.statistics.compartment}</strong>
                </span>
                <span>•</span>
                <span className="promotion-stat-item" style={{ color: '#991b1b' }}>
                  Retained: <strong>{promoPreviewData.statistics.retained}</strong>
                </span>
                <span>•</span>
                <span className="promotion-stat-item" style={{ color: '#6b21a8' }}>
                  Graduating: <strong>{promoPreviewData.statistics.graduating}</strong>
                </span>
                {promoPreviewData.statistics.alreadyEnrolled > 0 && (
                  <>
                    <span>•</span>
                    <span className="promotion-stat-item" style={{ color: '#475569' }}>
                      Already Enrolled (Skipped): <strong>{promoPreviewData.statistics.alreadyEnrolled}</strong>
                    </span>
                  </>
                )}
              </div>

              <div className="roster-table-container" style={{ border: 'none', borderRadius: 0, margin: '1rem' }}>
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Adm No</th>
                      <th>Student Name</th>
                      <th>Exam Marks %</th>
                      <th>Overall Grade</th>
                      <th>Eligibility Derived</th>
                      <th>Action Decision</th>
                      <th>Target Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoDecisions.map(d => {
                      return (
                        <tr key={d.studentId} style={d.status === 'excluded' ? { opacity: 0.6, background: '#f8fafc' } : {}}>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>
                            {enrollmentService.getAll().find(e => e.id === d.sourceEnrollmentId)?.rollNo || '—'}
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>{d.admissionNo}</td>
                          <td style={{ fontWeight: 600 }}>{d.studentName}</td>
                          <td>
                            <strong>{d.academicSummary.percentage}%</strong>
                            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                              Passed: {d.academicSummary.passedSubjects}/{d.academicSummary.totalSubjects}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-subtle">{d.academicSummary.overallGrade}</span>
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                d.eligibilityStatus === 'eligible'
                                  ? 'active'
                                  : d.eligibilityStatus === 'compartment'
                                  ? 'transferred'
                                  : d.eligibilityStatus === 'retained'
                                  ? 'withdrawn'
                                  : 'graduated'
                              }`}
                            >
                              {d.eligibilityStatus.replace('_', ' ')}
                            </span>
                            {d.academicSummary.compartmentSubjects.length > 0 && (
                              <div style={{ fontSize: '0.6875rem', color: '#991b1b', marginTop: '2px' }}>
                                Failed: {d.academicSummary.compartmentSubjects.join(', ')}
                              </div>
                            )}
                          </td>
                          <td>
                            <select
                              className="form-select"
                              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.5rem', width: '140px' }}
                              value={d.decision}
                              disabled={d.status === 'excluded'}
                              onChange={e => handleUpdateDecision(d.studentId, { decision: e.target.value as any })}
                            >
                              <option value="promote">Promote</option>
                              <option value="retain">Retain / Repeat</option>
                              <option value="graduate">Graduate</option>
                              <option value="manual_review">Manual Review</option>
                              <option value="withdrawn">Withdrawn</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              maxLength={2}
                              className="form-input"
                              style={{ width: '50px', padding: '0.3rem', textAlign: 'center', fontSize: '0.8125rem' }}
                              value={d.destinationSection}
                              disabled={d.status === 'excluded'}
                              onChange={e => handleUpdateDecision(d.studentId, { destinationSection: e.target.value.toUpperCase() })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit History of Prior Promotion Batches */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-sidebar-border, #f1e5e4)', borderRadius: '0.625rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={17} color="#3B82F6" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Promotion Batches Audit History ({promotionService.getPromotionBatches().length})
              </h3>
            </div>

            <div className="roster-table-container" style={{ border: 'none', borderRadius: 0 }}>
              {promotionService.getPromotionBatches().length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  No historical promotion batches executed yet.
                </div>
              ) : (
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Source Class & Session</th>
                      <th>Destination Session</th>
                      <th>Executed By</th>
                      <th>Date</th>
                      <th>Promoted</th>
                      <th>Retained</th>
                      <th>Graduated</th>
                      <th style={{ textAlign: 'right' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotionService.getPromotionBatches().map(b => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{b.id}</td>
                        <td style={{ fontWeight: 600 }}>{b.sourceClassName} ({b.sourceSection}) — {b.sourceSessionName}</td>
                        <td style={{ color: '#3B82F6', fontWeight: 600 }}>{b.destinationSessionName}</td>
                        <td>{b.executedBy}</td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.executedAt.split('T')[0]}</td>
                        <td style={{ color: '#16a34a', fontWeight: 700 }}>{b.promotedCount}</td>
                        <td style={{ color: '#991b1b', fontWeight: 700 }}>{b.retainedCount}</td>
                        <td style={{ color: '#6b21a8', fontWeight: 700 }}>{b.graduatedCount}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewBatchDetails(b)}
                          >
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Confirmation Modal */}
          {showPromoConfirm && (
            <ConfirmDialog
              isOpen={showPromoConfirm}
              onClose={() => setShowPromoConfirm(false)}
              onConfirm={handleExecutePromotion}
              title="Confirm Academic Promotion Batch"
              message={`Are you ready to commit academic promotion for ${promoDecisions.filter(d => d.status !== 'excluded').length} students from ${promoPreviewData?.sourceClass?.name} into ${promoDestSessionId}? This will generate official next-session enrollment records.`}
              confirmLabel={isExecutingPromo ? 'Executing...' : 'Commit Promotion Batch'}
            />
          )}

          {/* Inspect Batch Details Modal */}
          {viewBatchDetails && (
            <Modal
              isOpen={Boolean(viewBatchDetails)}
              onClose={() => setViewBatchDetails(null)}
              title={`Promotion Batch Audit — ${viewBatchDetails.id}`}
              size="large"
            >
              <div>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <div>Source: <strong>{viewBatchDetails.sourceClassName} ({viewBatchDetails.sourceSection})</strong> • Session: <strong>{viewBatchDetails.sourceSessionName}</strong></div>
                  <div>Destination Session: <strong>{viewBatchDetails.destinationSessionName}</strong> • Operator: <strong>{viewBatchDetails.executedBy}</strong></div>
                  <div style={{ marginTop: '0.5rem', color: '#15803d' }}>
                    Promoted: <strong>{viewBatchDetails.promotedCount}</strong> • Retained: <strong>{viewBatchDetails.retainedCount}</strong> • Graduated: <strong>{viewBatchDetails.graduatedCount}</strong>
                  </div>
                </div>

                <div className="roster-table-container">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>Adm No</th>
                        <th>Student Name</th>
                        <th>Decision</th>
                        <th>Target Class/Section</th>
                        <th>Outcome Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewBatchDetails.decisions.map(d => (
                        <tr key={d.studentId}>
                          <td style={{ fontFamily: 'monospace' }}>{d.admissionNo}</td>
                          <td style={{ fontWeight: 600 }}>{d.studentName}</td>
                          <td><span className={`status-pill ${d.decision === 'promote' ? 'active' : 'withdrawn'}`}>{d.decision}</span></td>
                          <td>{d.destinationClassName} ({d.destinationSection})</td>
                          <td>{d.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: BULK STUDENT IMPORT (Admin)         */}
      {/* ========================================== */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="promotion-config-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FileSpreadsheet size={22} color="#3B82F6" />
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                    Bulk Student Roster Import (Excel / CSV)
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Upload student rosters with pre-validation against duplicate admission numbers and session class assignments
                  </p>
                </div>
              </div>

              <button className="btn btn-secondary" onClick={handleDownloadSampleCSV}>
                <Download size={15} />
                <span>Download Sample CSV Template</span>
              </button>
            </div>
          </div>

          {/* Outcome Banner */}
          {importOutcome && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.625rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} color="#16a34a" />
              <div>
                <strong style={{ color: '#166534' }}>Bulk Import Completed!</strong>
                <div style={{ fontSize: '0.8125rem', color: '#15803d', marginTop: '2px' }}>
                  Created <strong>{importOutcome.createdStudents}</strong> student records and <strong>{importOutcome.createdEnrollments}</strong> active session enrollments.
                  {importOutcome.skippedDuplicates > 0 && ` Skipped ${importOutcome.skippedDuplicates} duplicates.`}
                </div>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          <div style={{ background: '#ffffff', border: '1px solid var(--color-sidebar-border, #f1e5e4)', borderRadius: '0.625rem', padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'center' }}>
              <div>
                <label className="form-label required">Target Academic Session</label>
                <select
                  className="form-select"
                  value={importSessionId}
                  onChange={e => setImportSessionId(e.target.value)}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isCurrent ? '(Active)' : `(${s.status})`}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Enrolls new students into classes belonging to this academic session.
                </div>
              </div>

              <div>
                <label className="form-label required">Upload CSV / Spreadsheet File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="form-input"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>

          {/* Pre-Validation Summary */}
          {validationResult && (
            <div className="import-validation-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                    File Validation Summary: {importFileName}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                    Total Detected Rows: <strong>{validationResult.summary.total}</strong> • Valid for Commit: <strong>{validationResult.summary.valid}</strong> • Invalid / Errors: <strong>{validationResult.summary.invalid}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {validationResult.errors.length > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={handleDownloadErrorReport}>
                      <Download size={14} />
                      <span>Download Error Report ({validationResult.errors.length})</span>
                    </button>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={handleCommitImport}
                    disabled={validationResult.validRows.length === 0 || isCommittingImport}
                  >
                    <CheckCircle2 size={16} />
                    <span>{isCommittingImport ? 'Committing...' : `Commit Import (${validationResult.validRows.length} Students)`}</span>
                  </button>
                </div>
              </div>

              {/* Error Alert Box if any */}
              {validationResult.errors.length > 0 && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#991b1b' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                    <AlertTriangle size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                    {validationResult.errors.length} validation issue(s) detected. Invalid rows will be skipped upon commit.
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {validationResult.errors.slice(0, 5).map((err, eIdx) => (
                      <li key={eIdx}>
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <li>...and {validationResult.errors.length - 5} more errors (download full error report above)</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview of Parsed Rows */}
              <div className="roster-table-container">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Adm No</th>
                      <th>Full Name</th>
                      <th>Gender</th>
                      <th>DOB</th>
                      <th>Grade & Sec</th>
                      <th>Parent Name</th>
                      <th>Parent Phone</th>
                      <th>Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((r, rIdx) => {
                      const isValid = !validationResult.invalidRows.some(inv => inv.rowNumber === r.rowNumber);
                      return (
                        <tr key={rIdx} style={!isValid ? { background: '#fff5f5' } : {}}>
                          <td style={{ fontWeight: 600 }}>#{r.rowNumber}</td>
                          <td style={{ fontFamily: 'monospace' }}>{r.admissionNo || 'Auto'}</td>
                          <td style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</td>
                          <td>{r.gender}</td>
                          <td>{r.dob}</td>
                          <td>Class {r.grade}-{r.section}</td>
                          <td>{r.parentName}</td>
                          <td>{r.parentPhone}</td>
                          <td>
                            {isValid ? (
                              <span className="status-pill active">Ready</span>
                            ) : (
                              <span className="status-pill withdrawn">Invalid</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
