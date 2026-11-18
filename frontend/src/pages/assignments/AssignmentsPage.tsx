// ==========================================
// Homework & Assignments Management & Submission Workflow
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { assignmentService } from '../../services/assignmentService';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import { studentService } from '../../services/studentService';
import { Assignment, AssignmentSubmission, SubmissionAttachmentMeta, SubmissionStatus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchInput } from '../../components/common/SearchInput';
import { useERP } from '../../context/ERPContext';
import { ListToolbar } from '../../components/common/ListToolbar';
import { formatDate } from '../../utils/formatters';
import { FileText, Plus, Edit, Trash2, Calendar, CheckCircle, Clock, Send, Award, AlertCircle, Paperclip, Save, RotateCcw, Eye, X } from 'lucide-react';
import './AssignmentsPage.css';

export const AssignmentsPage: React.FC = () => {
  const { currentRole, currentUser, selectedChild, addToast } = useERP();
  const [assignments, setAssignments] = useState<Assignment[]>(() => assignmentService.getAll());
  const classes = useMemo(() => classService.getAll(), []);

  // Teacher Tab State: 'tasks' | 'review_queue'
  const [activeTeacherTab, setActiveTeacherTab] = useState<'tasks' | 'review_queue'>('tasks');

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

  // Student persona resolution
  const currentStudent = useMemo(() => {
    if (currentRole === 'student') {
      const studentId = currentUser.referenceId || 'stud-1';
      return studentService.getById(studentId) || null;
    }
    return null;
  }, [currentRole, currentUser]);

  // Allowed classes for teacher
  const allowedClasses = useMemo(() => {
    if (currentRole === 'teacher' && teacherUser) {
      const acList = teacherUser.assignedClasses || [];
      if (acList.length > 0) {
        const matched = classes.filter(c => acList.some(ac => ac.classId === c.id));
        if (matched.length > 0) return matched;
      }
      return classes;
    }
    return classes;
  }, [classes, currentRole, teacherUser]);

  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('all');
  const [studentFilter, setStudentFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  // Student Submission Modal
  const [submitModalTarget, setSubmitModalTarget] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentMeta, setAttachmentMeta] = useState<SubmissionAttachmentMeta | undefined>(undefined);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student View Submission / Feedback Details Modal
  const [viewDetailsTarget, setViewDetailsTarget] = useState<{
    assignment: Assignment;
    submission: AssignmentSubmission;
  } | null>(null);

  // Teacher Grade / Evaluation Modal
  const [gradingTarget, setGradingTarget] = useState<{
    assignment: Assignment;
    submission: AssignmentSubmission;
  } | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  // Form for creating/editing assignment
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: allowedClasses[0]?.id || 'cls-10a',
    section: allowedClasses[0]?.section || 'A',
    subject: 'Mathematics',
    assignedDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    maxScore: 25,
    status: 'active' as 'active' | 'closed',
    allowLateSubmissions: true,
  });

  const refreshList = useCallback(() => {
    setAssignments([...assignmentService.getAll()]);
  }, []);

  useEffect(() => {
    const handleStorageUpdate = () => {
      refreshList();
    };
    window.addEventListener('nts_erp_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('nts_erp_storage_updated', handleStorageUpdate);
  }, [refreshList]);

  // Scoped assignments based on active role
  const scopedAssignments = useMemo(() => {
    if (currentRole === 'student' && currentStudent) {
      return assignments.filter(
        a => a.classId === currentStudent.classId && a.section.toLowerCase() === currentStudent.section.toLowerCase()
      );
    }

    if (currentRole === 'parent' && selectedChild) {
      return assignments.filter(
        a => a.classId === selectedChild.classId && a.section.toLowerCase() === selectedChild.section.toLowerCase()
      );
    }

    if (currentRole === 'teacher' && teacherUser) {
      return assignments.filter(a => {
        const acList = teacherUser.assignedClasses || [];
        const isAssigned = acList.length > 0
          ? acList.some(
              ac => (ac.classId === a.classId || !a.classId) &&
                    (!ac.section || !a.section || (ac.section || '').toLowerCase() === (a.section || '').toLowerCase())
            )
          : true;
        const matchClass = selectedClassFilter === '' || a.classId === selectedClassFilter;
        return isAssigned && matchClass;
      });
    }

    // School admin / Super admin
    if (selectedClassFilter) {
      return assignments.filter(a => a.classId === selectedClassFilter);
    }
    return assignments;
  }, [assignments, currentRole, currentStudent, selectedChild, teacherUser, selectedClassFilter]);

  // Student metrics for filter tabs
  const studentCounts = useMemo(() => {
    if (currentRole !== 'student') return { all: 0, pending: 0, submitted: 0, graded: 0 };
    const studentId = currentUser.referenceId || 'stud-1';
    let pending = 0;
    let submitted = 0;
    let graded = 0;

    scopedAssignments.forEach(asg => {
      const sub = asg.submissions.find(s => s.studentId === studentId);
      const status = sub?.status || 'not_submitted';
      if (['not_submitted', 'draft', 'returned_for_revision'].includes(status)) pending++;
      else if (['submitted', 'late_submitted'].includes(status)) submitted++;
      else if (status === 'graded') graded++;
    });

    return { all: scopedAssignments.length, pending, submitted, graded };
  }, [currentRole, currentUser, scopedAssignments]);

  // Filtered assignments to display based on student filter tabs
  const displayedAssignments = useMemo(() => {
    if (currentRole !== 'student') return scopedAssignments;
    if (studentFilter === 'all') return scopedAssignments;

    const studentId = currentUser.referenceId || 'stud-1';
    return scopedAssignments.filter(asg => {
      const sub = asg.submissions.find(s => s.studentId === studentId);
      const status = sub?.status || 'not_submitted';

      if (studentFilter === 'pending') {
        return ['not_submitted', 'draft', 'returned_for_revision'].includes(status);
      }
      if (studentFilter === 'submitted') {
        return ['submitted', 'late_submitted'].includes(status);
      }
      if (studentFilter === 'graded') {
        return status === 'graded';
      }
      return true;
    });
  }, [currentRole, currentUser, scopedAssignments, studentFilter]);

  // Review Queue items for teachers and administrators
  const reviewQueueItems = useMemo(() => {
    if (!['teacher', 'school_admin', 'super_admin'].includes(currentRole)) {
      return [];
    }

    const queue = assignmentService.getReviewQueue(currentUser);

    return queue.filter(item => {
      if (selectedClassFilter && item.assignment.classId !== selectedClassFilter) {
        return false;
      }

      if (reviewStatusFilter !== 'all') {
        if (reviewStatusFilter === 'pending') {
          if (!['submitted', 'late_submitted'].includes(item.submission.status)) return false;
        } else if (item.submission.status !== reviewStatusFilter) {
          return false;
        }
      }

      if (reviewSearchQuery.trim()) {
        const q = reviewSearchQuery.toLowerCase();
        const matchStudent = item.submission.studentName.toLowerCase().includes(q);
        const matchTitle = item.assignment.title.toLowerCase().includes(q);
        const matchSubject = item.assignment.subject.toLowerCase().includes(q);
        return matchStudent || matchTitle || matchSubject;
      }

      return true;
    });
  }, [currentRole, currentUser, selectedClassFilter, reviewStatusFilter, reviewSearchQuery, assignments]);

  // Pending count for tab badge
  const pendingReviewCount = useMemo(() => {
    if (!['teacher', 'school_admin', 'super_admin'].includes(currentRole)) return 0;
    const queue = assignmentService.getReviewQueue(currentUser);
    return queue.filter(q => ['submitted', 'late_submitted'].includes(q.submission.status)).length;
  }, [currentRole, currentUser, assignments]);

  // Handle open create assignment
  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setFormData({
      title: '',
      description: '',
      classId: allowedClasses[0]?.id || 'cls-10a',
      section: allowedClasses[0]?.section || 'A',
      subject: 'Mathematics',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      maxScore: 25,
      status: 'active',
      allowLateSubmissions: true,
    });
    setIsCreateOpen(true);
  };

  // Handle open edit assignment
  const handleOpenEdit = (asg: Assignment) => {
    setEditingAssignment(asg);
    setFormData({
      title: asg.title,
      description: asg.description,
      classId: asg.classId,
      section: asg.section,
      subject: asg.subject,
      assignedDate: asg.assignedDate,
      dueDate: asg.dueDate,
      maxScore: asg.maxScore,
      status: asg.status,
      allowLateSubmissions: asg.allowLateSubmissions ?? true,
    });
    setIsCreateOpen(true);
  };

  // Save new / edited assignment
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const targetClass = classes.find(c => c.id === formData.classId);
    const className = targetClass ? targetClass.name : 'Class 10';

    if (editingAssignment) {
      const res = assignmentService.update(editingAssignment.id, {
        ...formData,
        className,
      }, currentUser);

      if (!res.success) {
        addToast('error', 'Update Failed', res.error);
        return;
      }
      addToast('success', 'Assignment Updated', `${formData.title} has been updated.`);
    } else {
      const res = assignmentService.create({
        ...formData,
        className,
        teacherId: currentUser.referenceId || 'teach-1',
        teacherName: currentUser.name,
      }, currentUser);

      if (!res.success) {
        addToast('error', 'Creation Failed', res.error);
        return;
      }
      addToast('success', 'Assignment Published', `${formData.title} assigned to ${className} (${formData.section}).`);
    }

    setIsCreateOpen(false);
    refreshList();
  };

  const handleDeleteAssignment = () => {
    if (deleteTarget) {
      assignmentService.delete(deleteTarget.id, currentUser);
      addToast('warning', 'Assignment Deleted', `${deleteTarget.title} was removed.`);
      setDeleteTarget(null);
      refreshList();
    }
  };

  // Student: Open Submit Homework Modal
  const handleOpenStudentSubmit = (asg: Assignment) => {
    const studentId = currentUser.referenceId || 'stud-1';
    const existing = asg.submissions.find(s => s.studentId === studentId);

    setSubmitModalTarget(asg);
    setSubmissionText(existing?.submissionText || '');
    setAttachmentMeta(existing?.attachmentMeta);
    setShowSubmitConfirm(false);
  };

  // Student: Save Draft
  const handleSaveDraft = () => {
    if (!submitModalTarget || isSubmitting) return;
    const studentId = currentUser.referenceId || 'stud-1';

    setIsSubmitting(true);
    try {
      const res = assignmentService.saveDraft(
        submitModalTarget.id,
        { id: studentId, name: currentUser.name },
        submissionText,
        attachmentMeta
      );

      if (!res.success) {
        addToast('error', 'Draft Save Failed', res.error);
        return;
      }

      addToast('info', 'Draft Saved', 'Your work has been saved locally as a draft. You can continue anytime before the deadline.');
      setSubmitModalTarget(null);
      refreshList();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Student: Execute Final Submission
  const handleFinalSubmit = () => {
    if (!submitModalTarget || isSubmitting) return;
    const studentId = currentUser.referenceId || 'stud-1';

    setIsSubmitting(true);
    try {
      const res = assignmentService.submitStudentWork(
        submitModalTarget.id,
        { id: studentId, name: currentUser.name },
        submissionText,
        attachmentMeta
      );

      if (!res.success) {
        addToast('error', 'Submission Failed', res.error);
        setShowSubmitConfirm(false);
        return;
      }

      addToast(
        'success',
        'Homework Turned In',
        `Your homework solution has been successfully delivered to ${submitModalTarget.teacherName} for review.`
      );
      setSubmitModalTarget(null);
      setShowSubmitConfirm(false);
      refreshList();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Attachment Selection Handler (Demo Mode Metadata capture)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'File Too Large', 'Maximum attachment size is 10 MB.');
      return;
    }

    setAttachmentMeta({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      selectedAt: new Date().toISOString(),
    });

    addToast('info', 'Attachment Attached', `${file.name} (${(file.size / 1024).toFixed(1)} KB) selected.`);
  };

  // Teacher: Open Review & Grade Modal
  const handleOpenGrading = (asg: Assignment, sub: AssignmentSubmission) => {
    setGradingTarget({ assignment: asg, submission: sub });
    setGradeScore(sub.score !== undefined ? sub.score : (sub.reviewDraft?.score ?? asg.maxScore));
    setGradeFeedback(sub.feedback || sub.reviewDraft?.feedback || '');
  };

  // Teacher: Execute Review Action (Publish, Draft, Return)
  const handleExecuteReview = (action: 'publish' | 'draft_review' | 'return_for_revision') => {
    if (!gradingTarget || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = assignmentService.reviewSubmission({
        assignmentId: gradingTarget.assignment.id,
        studentId: gradingTarget.submission.studentId,
        reviewer: currentUser,
        action,
        score: gradeScore,
        feedback: gradeFeedback,
      });

      if (!res.success) {
        addToast('error', 'Review Failed', res.error);
        return;
      }

      if (action === 'publish') {
        addToast('success', 'Grade Published', `Score of ${gradeScore}/${gradingTarget.assignment.maxScore} published to student portal.`);
      } else if (action === 'draft_review') {
        addToast('info', 'Draft Review Saved', 'Evaluation saved as draft. Grade is not yet visible to the student.');
      } else if (action === 'return_for_revision') {
        addToast('warning', 'Returned for Revision', `Homework returned to ${gradingTarget.submission.studentName} with revision instructions.`);
      }

      setGradingTarget(null);
      refreshList();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status: SubmissionStatus | 'not_submitted') => {
    switch (status) {
      case 'graded':
        return <span className="status-badge-custom graded"><CheckCircle size={12} /> Graded</span>;
      case 'submitted':
        return <span className="status-badge-custom submitted"><Clock size={12} /> Submitted</span>;
      case 'late_submitted':
        return <span className="status-badge-custom late_submitted"><Clock size={12} /> Late Submitted</span>;
      case 'returned_for_revision':
        return <span className="status-badge-custom returned_for_revision"><RotateCcw size={12} /> Revision Needed</span>;
      case 'draft':
        return <span className="status-badge-custom draft"><Edit size={12} /> Draft Saved</span>;
      case 'closed':
        return <span className="status-badge-custom closed"><AlertCircle size={12} /> Closed</span>;
      case 'not_submitted':
      default:
        return <span className="status-badge-custom not_submitted"><AlertCircle size={12} /> Not Submitted</span>;
    }
  };

  return (
    <div className="assignments-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>
            <FileText size={24} style={{ color: 'var(--color-primary)' }} />
            Homework & Assignments
          </h1>
          <p className="page-subtitle">
            {currentRole === 'student' && currentStudent && `Assigned homework for ${currentStudent.className} (${currentStudent.section})`}
            {currentRole === 'parent' && selectedChild && `Homework overview for ${selectedChild.fullName} • ${selectedChild.className} (${selectedChild.section})`}
            {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && 'Manage class assignments, view submissions, and grade student homework'}
          </p>
        </div>

        <div className="page-actions">
          {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Add Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Lite toolbar for students & parents (export / print / refresh homework list) */}
      {['student', 'parent'].includes(currentRole) && (
        <ListToolbar<Assignment>
          entityLabel="Assignment"
          fileBaseName="Homework_Assignments"
          rows={scopedAssignments}
          columns={[
            { header: 'Title', value: a => a.title },
            { header: 'Subject', value: a => a.subject },
            { header: 'Class', value: a => a.className },
            { header: 'Section', value: a => a.section },
            { header: 'Assigned', value: a => a.assignedDate },
            { header: 'Due Date', value: a => a.dueDate },
            { header: 'Max Score', value: a => a.maxScore },
            { header: 'Teacher', value: a => a.teacherName },
            { header: 'Status', value: a => a.status },
          ]}
          onRefresh={refreshList}
        />
      )}

      {/* Tabs for Teachers and Admins */}
      {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && (
        <div className="assignments-tabs">
          <button
            className={`assignments-tab-btn ${activeTeacherTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTeacherTab('tasks')}
          >
            <FileText size={16} />
            <span>Homework Tasks</span>
            <span className="tab-badge">{scopedAssignments.length}</span>
          </button>
          <button
            className={`assignments-tab-btn ${activeTeacherTab === 'review_queue' ? 'active' : ''}`}
            onClick={() => setActiveTeacherTab('review_queue')}
          >
            <Award size={16} />
            <span>Submission Review Queue</span>
            {pendingReviewCount > 0 && (
              <span className="tab-badge" style={{ background: '#ffedd5', color: '#c2410c' }}>
                {pendingReviewCount} pending
              </span>
            )}
          </button>
        </div>
      )}

      {/* STUDENT WELCOME & HELPFUL SUBMISSION BANNER */}
      {currentRole === 'student' && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '0.625rem',
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#3B82F6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#881337' }}>
                Student Homework & Submissions Portal
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#9f1239', marginTop: '2px' }}>
                Welcome, <strong>{currentStudent ? currentStudent.fullName : 'Student'}</strong> (Class {currentStudent?.classId.replace('cls-', '')}-{currentStudent?.section}). You have{' '}
                <strong>{studentCounts.pending} assignment{studentCounts.pending !== 1 ? 's' : ''}</strong> waiting to be submitted. Click{' '}
                <strong style={{ textDecoration: 'underline' }}>&ldquo;Submit Homework&rdquo;</strong> on any card to type your answers and turn them in.
              </div>
            </div>
          </div>
          {studentCounts.pending > 0 && studentFilter !== 'pending' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setStudentFilter('pending')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              <Send size={14} />
              <span>Show {studentCounts.pending} Due Assignments</span>
            </button>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          {currentRole === 'student' && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${studentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStudentFilter('all')}
              >
                All Assignments ({studentCounts.all})
              </button>
              <button
                className={`btn btn-sm ${studentFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStudentFilter('pending')}
                style={studentFilter === 'pending' ? {} : { borderColor: '#3B82F6', color: '#3B82F6' }}
              >
                <Send size={13} style={{ marginRight: '4px' }} />
                To Submit / Due ({studentCounts.pending})
              </button>
              <button
                className={`btn btn-sm ${studentFilter === 'submitted' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStudentFilter('submitted')}
              >
                Submitted ({studentCounts.submitted})
              </button>
              <button
                className={`btn btn-sm ${studentFilter === 'graded' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStudentFilter('graded')}
              >
                Graded ({studentCounts.graded})
              </button>
            </div>
          )}

          {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && (
            <select
              className="form-select filter-select filter-select-lg"
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              aria-label="Filter Academic Classes"
            >
              <option value="">All Academic Classes</option>
              {allowedClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.section})
                </option>
              ))}
            </select>
          )}

          {activeTeacherTab === 'review_queue' && (
            <>
              <SearchInput
                value={reviewSearchQuery}
                onChange={setReviewSearchQuery}
                placeholder="Search by student or title..."
                ariaLabel="Search submissions"
              />

              <select
                className="form-select filter-select filter-select-md"
                value={reviewStatusFilter}
                onChange={e => setReviewStatusFilter(e.target.value)}
                aria-label="Filter by Submission Status"
              >
                <option value="all">All Submissions</option>
                <option value="pending">Pending Review</option>
                <option value="returned_for_revision">Revision Needed</option>
                <option value="graded">Graded</option>
              </select>
            </>
          )}
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {activeTeacherTab === 'review_queue'
              ? `Showing ${reviewQueueItems.length} submissions`
              : `Showing ${displayedAssignments.length} assignments`}
          </span>
        </div>
      </div>

      {/* TAB 1: ASSIGNMENTS LIST (Used by Students, Parents, and Teachers/Admins) */}
      {(currentRole === 'student' || currentRole === 'parent' || activeTeacherTab === 'tasks') && (
        <>
          {displayedAssignments.length === 0 ? (
            <div style={{ padding: '40px 20px' }}>
              <EmptyState
                icon={<FileText size={36} />}
                title="No assignments found"
                description={
                  currentRole === 'student' && studentFilter === 'pending'
                    ? 'All current homework assignments for your class have been submitted!'
                    : currentRole === 'teacher' && allowedClasses.length === 0
                    ? 'You have no assigned classes to create or view homework for.'
                    : 'There are currently no active or historical homework tasks matching this filter.'
                }
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displayedAssignments.map(asg => {
                // Determine active student ID
                const studentId =
                  currentRole === 'student'
                    ? currentUser.referenceId || 'stud-1'
                    : currentRole === 'parent'
                    ? selectedChild?.id || 'stud-1'
                    : null;

                const mySubmission = studentId ? asg.submissions.find(s => s.studentId === studentId) : null;
                const submissionStatus: SubmissionStatus | 'not_submitted' = mySubmission ? mySubmission.status : 'not_submitted';

                const now = new Date();
                const deadline = new Date(`${asg.dueDate}T23:59:59`);
                const isPastDeadline = now.getTime() > deadline.getTime();
                const isClosed = asg.status === 'closed' || (isPastDeadline && asg.allowLateSubmissions === false);

                return (
                  <div key={asg.id} className="assignment-card">
                    {/* Header */}
                    <div className="assignment-card-header">
                      <div className="assignment-title-group">
                        <h3>
                          {asg.title}
                          {asg.status === 'closed' && (
                            <span className="status-badge-custom closed">Closed</span>
                          )}
                        </h3>
                        <div className="assignment-meta-subtitle">
                          <span>
                            Class: <strong>{asg.className} ({asg.section})</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Subject: <strong>{asg.subject}</strong>
                          </span>
                          <span>•</span>
                          <span>Teacher: {asg.teacherName}</span>
                        </div>
                      </div>

                      <div className="assignment-header-badges">
                        <span className={`meta-pill ${isPastDeadline ? 'due-warning' : ''}`}>
                          <Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                          Due: {formatDate(asg.dueDate)}
                        </span>
                        <span className="meta-pill">
                          <Award size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                          Max: {asg.maxScore} Pts
                        </span>

                        {/* Teacher/Admin actions */}
                        {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && (
                          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
                            <button
                              className="btn btn-secondary btn-icon-only"
                              onClick={() => handleOpenEdit(asg)}
                              title="Edit Assignment"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-secondary btn-icon-only"
                              onClick={() => setDeleteTarget(asg)}
                              title="Delete Assignment"
                            >
                              <Trash2 size={14} color="#3B82F6" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instructions */}
                    <p className="assignment-instructions">{asg.description}</p>

                    {/* TEACHER/ADMIN SUMMARY ROW */}
                    {['teacher', 'school_admin', 'super_admin'].includes(currentRole) ? (
                      <div
                        style={{
                          background: 'var(--color-bg-subtle)',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--color-sidebar-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem' }}>
                          <span>
                            Total Submissions: <strong>{asg.submissions.length}</strong>
                          </span>
                          <span>
                            Pending Grading:{' '}
                            <strong style={{ color: '#c2410c' }}>
                              {asg.submissions.filter(s => ['submitted', 'late_submitted'].includes(s.status)).length}
                            </strong>
                          </span>
                          <span>
                            Graded:{' '}
                            <strong style={{ color: '#166534' }}>
                              {asg.submissions.filter(s => s.status === 'graded').length}
                            </strong>
                          </span>
                        </div>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveTeacherTab('review_queue');
                            setSelectedClassFilter(asg.classId);
                            setReviewSearchQuery(asg.title);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Award size={14} />
                          <span>View Class Submissions</span>
                        </button>
                      </div>
                    ) : (
                      /* STUDENT & PARENT SUBMISSION STATUS BOX */
                      <div className="student-submission-box">
                        <div className="submission-status-info">
                          <div className="submission-status-header">
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                              Your Status:
                            </span>
                            {renderStatusBadge(submissionStatus)}

                            {mySubmission?.submittedAt && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Turned in {formatDate(mySubmission.submittedAt)}
                              </span>
                            )}
                          </div>

                          {/* Snippet / Notes */}
                          {mySubmission?.submissionText && (
                            <p className="submission-snippet">
                              &ldquo;{mySubmission.submissionText}&rdquo;
                            </p>
                          )}

                          {/* Published Evaluation */}
                          {mySubmission?.status === 'graded' && mySubmission.isPublished && (
                            <div>
                              <div className="submission-score-row">
                                <Award size={15} />
                                <span>Awarded Score: {mySubmission.score} / {asg.maxScore} Marks</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                  ({Math.round(((mySubmission.score || 0) / asg.maxScore) * 100)}%)
                                </span>
                              </div>
                              {mySubmission.feedback && (
                                <p className="submission-feedback-row">
                                  Teacher Feedback: &ldquo;{mySubmission.feedback}&rdquo;
                                </p>
                              )}
                            </div>
                          )}

                          {/* Returned for Revision Warning */}
                          {mySubmission?.status === 'returned_for_revision' && (
                            <div className="submission-return-banner">
                              <strong>Teacher Remarks:</strong> {mySubmission.returnRemarks || mySubmission.feedback || 'Please review your solutions and resubmit.'}
                            </div>
                          )}

                          {/* Closed notice */}
                          {!mySubmission && isClosed && (
                            <div style={{ fontSize: '0.75rem', color: '#991b1b', fontStyle: 'italic' }}>
                              Submissions are closed. The deadline passed on {formatDate(asg.dueDate)}.
                            </div>
                          )}
                        </div>

                        {/* Action Buttons for Student */}
                        {currentRole === 'student' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {/* Not Submitted */}
                            {(!mySubmission || mySubmission.status === 'not_submitted') && !isClosed && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenStudentSubmit(asg)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Send size={14} />
                                <span>Submit Homework</span>
                              </button>
                            )}

                            {/* Draft */}
                            {mySubmission?.status === 'draft' && !isClosed && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenStudentSubmit(asg)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Edit size={14} />
                                <span>Continue Submission</span>
                              </button>
                            )}

                            {/* Returned for revision */}
                            {mySubmission?.status === 'returned_for_revision' && !isClosed && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenStudentSubmit(asg)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <RotateCcw size={14} />
                                <span>Resubmit Homework</span>
                              </button>
                            )}

                            {/* Submitted / Late Submitted: Allow student to edit / update their work before grading */}
                            {mySubmission && ['submitted', 'late_submitted'].includes(mySubmission.status) && !isClosed && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenStudentSubmit(asg)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                title="Edit or update your submitted homework answer"
                              >
                                <Edit size={14} />
                                <span>Edit Submission</span>
                              </button>
                            )}

                            {/* Submitted / Graded: View Submission Details */}
                            {mySubmission && ['submitted', 'late_submitted', 'graded', 'returned_for_revision'].includes(mySubmission.status) && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setViewDetailsTarget({ assignment: asg, submission: mySubmission })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Eye size={14} />
                                <span>{mySubmission.status === 'graded' ? 'View Feedback' : 'View Submission'}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Action Buttons for Parent (Read Only) */}
                        {currentRole === 'parent' && mySubmission && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewDetailsTarget({ assignment: asg, submission: mySubmission })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Eye size={14} />
                            <span>View Ward's Work</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: TEACHER REVIEW QUEUE */}
      {['teacher', 'school_admin', 'super_admin'].includes(currentRole) && activeTeacherTab === 'review_queue' && (
        <div className="review-queue-card">
          {reviewQueueItems.length === 0 ? (
            <div style={{ padding: '40px 20px' }}>
              <EmptyState
                icon={<Award size={36} />}
                title="No submissions in review queue"
                description="All submitted student homework tasks for your assigned classes have been reviewed and graded."
              />
            </div>
          ) : (
            <div className="review-table-container">
              <table className="review-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Assignment Title</th>
                    <th>Class / Section</th>
                    <th>Submitted On</th>
                    <th>Status</th>
                    <th>Marks</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueueItems.map((item, idx) => {
                    const isGraded = item.submission.status === 'graded';
                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => {
                              const studentObj = studentService.getById(item.submission.studentId);
                              const photo = studentObj ? studentService.getStudentPhoto(studentObj) : '/student-male.svg';
                              return (
                                <img
                                  src={photo}
                                  alt={item.submission.studentName}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }}
                                  onError={e => { (e.target as HTMLImageElement).src = '/student-male.svg'; }}
                                />
                              );
                            })()}
                            <strong>{item.submission.studentName}</strong>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.assignment.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {item.assignment.subject}
                          </div>
                        </td>
                        <td>
                          {item.assignment.className} ({item.assignment.section})
                        </td>
                        <td>
                          {formatDate(item.submission.submittedAt || item.submission.submissionDate)}
                          {item.submission.status === 'late_submitted' && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '0.6875rem',
                                color: '#c2410c',
                                fontWeight: 700,
                              }}
                            >
                              (Late)
                            </span>
                          )}
                        </td>
                        <td>{renderStatusBadge(item.submission.status)}</td>
                        <td>
                          {isGraded && item.submission.score !== undefined ? (
                            <strong style={{ color: '#166534' }}>
                              {item.submission.score} / {item.assignment.maxScore}
                            </strong>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>— / {item.assignment.maxScore}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenGrading(item.assignment, item.submission)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Award size={14} />
                            <span>{isGraded ? 'Update Grade' : 'Score & Review'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STUDENT SUBMISSION MODAL */}
      {submitModalTarget && (
        <Modal
          isOpen={Boolean(submitModalTarget)}
          onClose={() => {
            if (!isSubmitting) setSubmitModalTarget(null);
          }}
          title={
            submitModalTarget.submissions.some(s => s.studentId === (currentUser.referenceId || 'stud-1') && s.status === 'returned_for_revision')
              ? `Resubmit Homework: ${submitModalTarget.title}`
              : `Submit Homework: ${submitModalTarget.title}`
          }
          size="normal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={15} />
                <span>Save Draft</span>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSubmitModalTarget(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!submissionText.trim() && !attachmentMeta) {
                      addToast('error', 'Content Required', 'Please enter your solution answer or attach a file.');
                      return;
                    }
                    setShowSubmitConfirm(true);
                  }}
                  disabled={isSubmitting || (!submissionText.trim() && !attachmentMeta)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={15} />
                  <span>Submit Homework</span>
                </button>
              </div>
            </div>
          }
        >
          <div>
            {/* Meta panel */}
            <div className="modal-info-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  Due Date: <strong>{formatDate(submitModalTarget.dueDate)}</strong>
                </span>
                <span>
                  Maximum Score: <strong>{submitModalTarget.maxScore} Points</strong>
                </span>
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                Policy:{' '}
                {submitModalTarget.allowLateSubmissions
                  ? 'Late submissions accepted with late timestamp'
                  : 'Strict deadline: No late submissions'}
              </div>
            </div>

            {/* Revision notice if returned */}
            {submitModalTarget.submissions.some(
              s => s.studentId === (currentUser.referenceId || 'stud-1') && s.status === 'returned_for_revision'
            ) && (
              <div
                style={{
                  background: '#fdf2f8',
                  border: '1px solid #fbcfe8',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.8125rem',
                  color: '#9d174d',
                }}
              >
                <strong>Revision Instructions:</strong>{' '}
                {submitModalTarget.submissions.find(s => s.studentId === (currentUser.referenceId || 'stud-1'))?.returnRemarks ||
                  'Please review the feedback and improve your answers.'}
              </div>
            )}

            {/* Assignment Problem Statement */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Instructions / Problem Statement</label>
              <div
                style={{
                  background: 'var(--color-bg-subtle)',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--color-sidebar-border)',
                }}
              >
                {submitModalTarget.description}
              </div>
            </div>

            {/* Answer Field */}
            <div className="form-group">
              <label className="form-label required">Your Solution / Answer Notes</label>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="Write your complete solution notes, step-by-step derivations, or essay answers here..."
                value={submissionText}
                onChange={e => setSubmissionText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {submissionText.length} characters
              </div>
            </div>

            {/* Attachment Field */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Paperclip size={14} />
                <span>Supporting Attachment (Optional Demo File Preview)</span>
              </label>

              {attachmentMeta ? (
                <div className="attachment-preview-box">
                  <div>
                    <strong>{attachmentMeta.name}</strong>{' '}
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      ({(attachmentMeta.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setAttachmentMeta(undefined)}
                    title="Remove attachment"
                  >
                    <X size={15} color="#3B82F6" />
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  className="form-input"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
              )}

              <span className="form-helper" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', display: 'block' }}>
                ℹ️ Demo Note: Attachment metadata (filename, size) will be recorded. Large base64 files are not stored in LocalStorage.
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* FINAL SUBMISSION CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleFinalSubmit}
        title="Confirm Final Submission"
        message={`Are you ready to submit your homework for "${submitModalTarget?.title}"? Your solution will be delivered to ${submitModalTarget?.teacherName} for review.`}
        confirmLabel={isSubmitting ? 'Submitting...' : 'Yes, Turn In Homework'}
      />

      {/* STUDENT / PARENT VIEW SUBMISSION DETAILS MODAL */}
      {viewDetailsTarget && (
        <Modal
          isOpen={Boolean(viewDetailsTarget)}
          onClose={() => setViewDetailsTarget(null)}
          title={`Submission Details — ${viewDetailsTarget.assignment.title}`}
          size="normal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {currentRole === 'student' && viewDetailsTarget.submission.status === 'returned_for_revision' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const asg = viewDetailsTarget.assignment;
                    setViewDetailsTarget(null);
                    handleOpenStudentSubmit(asg);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <RotateCcw size={15} />
                  <span>Resubmit Homework</span>
                </button>
              )}
              {currentRole === 'student' && ['submitted', 'late_submitted'].includes(viewDetailsTarget.submission.status) && (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    const asg = viewDetailsTarget.assignment;
                    setViewDetailsTarget(null);
                    handleOpenStudentSubmit(asg);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Edit size={15} />
                  <span>Edit Submission</span>
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setViewDetailsTarget(null)}>
                Close
              </button>
            </div>
          }
        >
          <div>
            {/* Status and timestamp */}
            <div className="modal-info-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  Status: {renderStatusBadge(viewDetailsTarget.submission.status)}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Submitted: {formatDate(viewDetailsTarget.submission.submittedAt || viewDetailsTarget.submission.submissionDate)}
                </span>
              </div>
              <div>
                Subject: <strong>{viewDetailsTarget.assignment.subject}</strong> • Teacher:{' '}
                <strong>{viewDetailsTarget.assignment.teacherName}</strong>
              </div>
            </div>

            {/* Published Evaluation if graded */}
            {viewDetailsTarget.submission.status === 'graded' && viewDetailsTarget.submission.isPublished && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: '#166534' }}>
                  <Award size={18} />
                  <span>Awarded Score: {viewDetailsTarget.submission.score} / {viewDetailsTarget.assignment.maxScore} Marks</span>
                </div>
                {viewDetailsTarget.submission.feedback && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#15803d', fontStyle: 'italic' }}>
                    Teacher Feedback: &ldquo;{viewDetailsTarget.submission.feedback}&rdquo;
                  </p>
                )}
                {viewDetailsTarget.submission.reviewedAt && (
                  <div style={{ fontSize: '0.75rem', color: '#65a30d', marginTop: '0.5rem' }}>
                    Reviewed on {formatDate(viewDetailsTarget.submission.reviewedAt)} by {viewDetailsTarget.submission.reviewerName || viewDetailsTarget.assignment.teacherName}
                  </div>
                )}
              </div>
            )}

            {/* Student's Solution */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Your Submitted Work</label>
              <div
                style={{
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-sidebar-border)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewDetailsTarget.submission.submissionText}
              </div>
            </div>

            {/* Attachment preview if exists */}
            {viewDetailsTarget.submission.attachmentMeta && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Attached Solution File</label>
                <div className="attachment-preview-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Paperclip size={15} style={{ color: 'var(--color-primary)' }} />
                    <span>
                      {viewDetailsTarget.submission.attachmentMeta.name} ({(viewDetailsTarget.submission.attachmentMeta.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Local Demo File</span>
                </div>
              </div>
            )}

            {/* Revision History */}
            {viewDetailsTarget.submission.revisions && viewDetailsTarget.submission.revisions.length > 0 && (
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Previous Submission Revisions</label>
                <div className="revision-history-panel">
                  {viewDetailsTarget.submission.revisions.map((rev, rIdx) => (
                    <div key={rIdx} className="revision-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>Revision #{rev.revisionNumber}</span>
                        <span>{formatDate(rev.submittedAt)}</span>
                      </div>
                      <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                        &ldquo;{rev.submissionText.slice(0, 100)}...&rdquo;
                      </div>
                      {rev.previousFeedback && (
                        <div style={{ color: '#9d174d', marginTop: '0.25rem' }}>
                          Prior Teacher Feedback: {rev.previousFeedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* TEACHER EVALUATION & GRADING MODAL */}
      {gradingTarget && (
        <Modal
          isOpen={Boolean(gradingTarget)}
          onClose={() => {
            if (!isSubmitting) setGradingTarget(null);
          }}
          title={`Review Submission — ${gradingTarget.submission.studentName}`}
          size="large"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleExecuteReview('return_for_revision')}
                disabled={isSubmitting || !gradeFeedback.trim()}
                title="Return homework to student with revision notes"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#9d174d' }}
              >
                <RotateCcw size={14} />
                <span>Return for Revision</span>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleExecuteReview('draft_review')}
                  disabled={isSubmitting}
                >
                  Save Draft Review
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleExecuteReview('publish')}
                  disabled={isSubmitting || gradeScore < 0 || gradeScore > gradingTarget.assignment.maxScore}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Award size={15} />
                  <span>Publish Grade & Feedback</span>
                </button>
              </div>
            </div>
          }
        >
          <div>
            {/* Header info */}
            <div className="modal-info-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  Assignment: <strong>{gradingTarget.assignment.title}</strong> ({gradingTarget.assignment.subject})
                </span>
                <span>
                  Max Marks: <strong>{gradingTarget.assignment.maxScore}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  Student: <strong>{gradingTarget.submission.studentName}</strong> • {gradingTarget.assignment.className} ({gradingTarget.assignment.section})
                </span>
                <span>
                  Submitted: {formatDate(gradingTarget.submission.submittedAt || gradingTarget.submission.submissionDate)}
                </span>
              </div>
            </div>

            {/* Student's solution box */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Student's Submitted Solution</label>
              <div
                style={{
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-sidebar-border)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {gradingTarget.submission.submissionText}
              </div>
            </div>

            {/* Attachment preview if any */}
            {gradingTarget.submission.attachmentMeta && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Attached File</label>
                <div className="attachment-preview-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Paperclip size={15} style={{ color: 'var(--color-primary)' }} />
                    <span>
                      {gradingTarget.submission.attachmentMeta.name} ({(gradingTarget.submission.attachmentMeta.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Verified Client File</span>
                </div>
              </div>
            )}

            {/* Revision history if any */}
            {gradingTarget.submission.revisions && gradingTarget.submission.revisions.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Submission Revision History ({gradingTarget.submission.revisions.length} previous)</label>
                <div className="revision-history-panel">
                  {gradingTarget.submission.revisions.map((rev, rIdx) => (
                    <div key={rIdx} className="revision-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>Attempt #{rev.revisionNumber}</span>
                        <span>{formatDate(rev.submittedAt)}</span>
                      </div>
                      <p style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>&ldquo;{rev.submissionText}&rdquo;</p>
                      {rev.previousFeedback && (
                        <div style={{ color: '#9d174d' }}>Prior Feedback: {rev.previousFeedback}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scoring & Feedback */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label required">
                  Score (Max: {gradingTarget.assignment.maxScore})
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max={gradingTarget.assignment.maxScore}
                  value={gradeScore}
                  onChange={e => setGradeScore(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Constructive Feedback / Remarks</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Provide detailed feedback on solution correctness, structure, or areas for improvement..."
                  value={gradeFeedback}
                  onChange={e => setGradeFeedback(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE / EDIT ASSIGNMENT MODAL */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title={editingAssignment ? 'Edit Homework Assignment' : 'Add Homework Assignment'}
          size="normal"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveAssignment}>
                {editingAssignment ? 'Save Changes' : 'Publish Assignment'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveAssignment}>
            <div className="form-group">
              <label className="form-label required">Assignment Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Chapter 4 Trigonometry Problem Set"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Target Class</label>
                <select
                  className="form-select"
                  value={formData.classId}
                  onChange={e => {
                    const c = allowedClasses.find(item => item.id === e.target.value);
                    setFormData({
                      ...formData,
                      classId: e.target.value,
                      section: c ? c.section : 'A',
                    });
                  }}
                >
                  {allowedClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Maximum Score (Marks)</label>
                <input
                  type="number"
                  className="form-input"
                  min="5"
                  max="100"
                  value={formData.maxScore}
                  onChange={e => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.allowLateSubmissions}
                  onChange={e => setFormData({ ...formData, allowLateSubmissions: e.target.checked })}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span>Allow late submissions after due date (will be labeled Late)</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label required">Instructions & Problem Statement</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Enter homework instructions, problem numbers, or reference guidelines..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteAssignment}
          title="Delete Assignment"
          message={`Are you sure you want to delete "${deleteTarget.title}"?`}
          isDestructive
          confirmLabel="Delete Assignment"
        />
      )}
    </div>
  );
};
