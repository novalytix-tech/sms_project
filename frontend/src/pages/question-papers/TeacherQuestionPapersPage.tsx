// ==========================================
// Teacher Question Papers Workspace
// Developed by NTS Novalytix
// Paper Authoring, Multi-Method Ingestion, Submissions & Revisions
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { teacherService } from '../../services/teacherService';
import { QuestionPaperService } from '../../services/questionPaperService';
import { QuestionPaper, QuestionPaperPreparationMethod, QuestionPaperStatus } from '../../types/questionPaper';
import { PrintableQuestionPaper } from '../../components/question-papers/PrintableQuestionPaper';
import './questionPapers.css';
import { QuestionPaperEditor } from '../../components/question-papers/QuestionPaperEditor';
import { PdfUploadEditor } from '../../components/question-papers/PdfUploadEditor';
import { ImageUploadEditor } from '../../components/question-papers/ImageUploadEditor';
import { VersionHistoryModal } from '../../components/question-papers/VersionHistoryModal';
import { SearchInput } from '../../components/common/SearchInput';
import { FileText, Plus, Edit, Trash2, Send, History, AlertCircle, Printer, UploadCloud, Image as ImageIcon, MessageSquare } from 'lucide-react';

export const TeacherQuestionPapersPage: React.FC = () => {
  const { currentUser, currentRole, addToast } = useERP();

  // Resolve teacher entity
  const teacherEntity = useMemo(() => {
    if (currentRole === 'teacher') {
      return (
        (currentUser.referenceId ? teacherService.getById(currentUser.referenceId) : null) ||
        teacherService.getAll().find((t) => t.email.toLowerCase() === (currentUser.email || '').toLowerCase()) ||
        null
      );
    }
    return null;
  }, [currentUser, currentRole]);

  const teacherId = currentUser.referenceId || teacherEntity?.id || currentUser.id;

  // Question papers state
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'in_review' | 'approved_finalized'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Editor States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [printingPaper, setPrintingPaper] = useState<QuestionPaper | null>(null);
  const [historyPaper, setHistoryPaper] = useState<QuestionPaper | null>(null);

  // New Paper Form State
  const [newTitle, setNewTitle] = useState('');
  const [newPaperCode, setNewPaperCode] = useState('');
  const [newSubject, setNewSubject] = useState(teacherEntity?.assignedClasses?.[0]?.subject || 'Mathematics');
  const [newClassId, setNewClassId] = useState(teacherEntity?.assignedClasses?.[0]?.classId || 'cls-10a');
  const [newClassName, setNewClassName] = useState(teacherEntity?.assignedClasses?.[0]?.className || 'Class 10');
  const [newSection, setNewSection] = useState(teacherEntity?.assignedClasses?.[0]?.section || 'A');
  const [newMethod, setNewMethod] = useState<QuestionPaperPreparationMethod>('erp_editor');
  const [newDuration, setNewDuration] = useState(180);
  const [newMaxMarks, setNewMaxMarks] = useState(80);

  // Load teacher papers
  const loadPapers = () => {
    try {
      const data = QuestionPaperService.getPapersForTeacher(teacherId, currentUser);
      setPapers(data);
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Failed to load question papers.');
    }
  };

  useEffect(() => {
    loadPapers();
  }, [teacherId, currentUser]);

  // Tab Filtering
  const filteredPapers = useMemo(() => {
    let result = papers;

    if (activeTab === 'drafts') {
      result = result.filter((p) => p.status === 'draft' || p.status === 'changes_requested');
    } else if (activeTab === 'in_review') {
      result = result.filter((p) => p.status === 'submitted_for_review' || p.status === 'resubmitted');
    } else if (activeTab === 'approved_finalized') {
      result = result.filter((p) => p.status === 'approved' || p.status === 'finalized');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.paperCode.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          p.className.toLowerCase().includes(q)
      );
    }

    return result;
  }, [papers, activeTab, searchQuery]);

  // KPI Metrics
  const stats = useMemo(() => {
    return {
      total: papers.length,
      drafts: papers.filter((p) => p.status === 'draft').length,
      changesRequested: papers.filter((p) => p.status === 'changes_requested').length,
      inReview: papers.filter((p) => p.status === 'submitted_for_review' || p.status === 'resubmitted').length,
      approvedFinalized: papers.filter((p) => p.status === 'approved' || p.status === 'finalized').length,
    };
  }, [papers]);

  // Create New Paper Handler
  const handleCreatePaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPaperCode.trim()) {
      addToast('warning', 'Please enter both Paper Title and Paper Code.');
      return;
    }

    try {
      const created = QuestionPaperService.saveDraft(
        {
          title: newTitle.trim(),
          paperCode: newPaperCode.trim(),
          subject: newSubject,
          classId: newClassId,
          className: newClassName,
          section: newSection,
          preparationMethod: newMethod,
          durationMinutes: Number(newDuration),
          maxMarks: Number(newMaxMarks),
          teacherId,
          teacherName: currentUser.name,
          teacherEmail: currentUser.email,
        },
        currentUser
      );

      setShowCreateModal(false);
      loadPapers();
      setEditingPaper(created);
      addToast('success', `Draft created successfully (${newMethod.replace('_', ' ')}).`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create paper.');
    }
  };

  // Save Draft from Editor
  const handleSaveEditorDraft = (updatedContent: Partial<QuestionPaper>) => {
    if (!editingPaper) return;
    try {
      const saved = QuestionPaperService.saveDraft({ ...editingPaper, ...updatedContent }, currentUser);
      setEditingPaper(saved);
      loadPapers();
      addToast('success', 'Draft changes saved successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save draft.');
    }
  };

  // Submit for Review
  const handleSubmitForReview = (paperId: string, updatedContent?: Partial<QuestionPaper>) => {
    try {
      if (updatedContent && editingPaper) {
        QuestionPaperService.saveDraft({ ...editingPaper, ...updatedContent }, currentUser);
      }

      QuestionPaperService.submitForReview(paperId, currentUser);
      setEditingPaper(null);
      loadPapers();
      addToast('success', 'Question paper submitted to Principal for review.');
    } catch (err: any) {
      addToast('error', err.message || 'Submission failed.');
    }
  };

  // Delete Draft
  const handleDeleteDraft = (paper: QuestionPaper) => {
    if (!window.confirm(`Are you sure you want to delete draft paper "${paper.paperCode}"?`)) {
      return;
    }
    try {
      QuestionPaperService.deleteDraft(paper.id, currentUser);
      loadPapers();
      addToast('info', 'Draft question paper deleted.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete draft.');
    }
  };

  const getStatusBadge = (status: QuestionPaperStatus) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-neutral">Draft</span>;
      case 'submitted_for_review':
        return <span className="badge badge-info">Submitted for Review</span>;
      case 'resubmitted':
        return <span className="badge badge-info">Resubmitted</span>;
      case 'changes_requested':
        return <span className="badge badge-warning">Changes Requested</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'finalized':
        return <span className="badge badge-success" style={{ fontWeight: 700 }}>Finalized (Locked)</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getMethodBadge = (method: QuestionPaperPreparationMethod) => {
    switch (method) {
      case 'erp_editor':
        return (
          <span className="qp-method-tag qp-method-erp">
            <FileText size={12} /> In-App ERP
          </span>
        );
      case 'pdf_upload':
        return (
          <span className="qp-method-tag qp-method-pdf">
            <UploadCloud size={12} /> PDF Document
          </span>
        );
      case 'image_upload':
        return (
          <span className="qp-method-tag qp-method-image">
            <ImageIcon size={12} /> Scanned Pages
          </span>
        );
    }
  };

  return (
    <div className="qp-page-container">
      {/* If editing a paper, render appropriate editor */}
      {editingPaper && (
        <>
          {editingPaper.preparationMethod === 'erp_editor' && (
            <QuestionPaperEditor
              paper={editingPaper}
              onSave={handleSaveEditorDraft}
              onSubmitForReview={(updated) => handleSubmitForReview(editingPaper.id, updated)}
              onCancel={() => {
                setEditingPaper(null);
                loadPapers();
              }}
            />
          )}
          {editingPaper.preparationMethod === 'pdf_upload' && (
            <PdfUploadEditor
              paper={editingPaper}
              onSave={handleSaveEditorDraft}
              onSubmitForReview={(updated) => handleSubmitForReview(editingPaper.id, updated)}
              onCancel={() => {
                setEditingPaper(null);
                loadPapers();
              }}
            />
          )}
          {editingPaper.preparationMethod === 'image_upload' && (
            <ImageUploadEditor
              paper={editingPaper}
              onSave={handleSaveEditorDraft}
              onSubmitForReview={(updated) => handleSubmitForReview(editingPaper.id, updated)}
              onCancel={() => {
                setEditingPaper(null);
                loadPapers();
              }}
            />
          )}
        </>
      )}

      {/* Main Teacher Papers List View */}
      {!editingPaper && (
        <>
          {/* Header */}
          <div className="page-header qp-page-header">
            <div>
              <h1 className="page-title">My Examination Question Papers</h1>
              <p className="page-subtitle">
                Prepare, manage, and submit confidential examination question papers for Principal review.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setNewPaperCode(`QP-2026-${Date.now().toString().slice(-4)}`);
                setNewTitle('');
                setShowCreateModal(true);
              }}
            >
              <Plus size={16} /> Create New Question Paper
            </button>
          </div>

          {/* Revisions Alert Banner if any paper has changes requested */}
          {stats.changesRequested > 0 && (
            <div className="qp-alert-banner-warning">
              <AlertCircle size={20} className="qp-banner-icon" />
              <div className="qp-banner-body">
                <strong>Attention Required:</strong> You have {stats.changesRequested} question paper(s) with revision
                requests from the Principal. Please review the feedback and resubmit.
              </div>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="kpi-grid qp-kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Papers</span>
              <span className="kpi-value">{stats.total}</span>
              <span className="kpi-desc">Across all terms</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Drafts</span>
              <span className="kpi-value">{stats.drafts}</span>
              <span className="kpi-desc">In editing</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Awaiting Principal Review</span>
              <span className="kpi-value text-info">{stats.inReview}</span>
              <span className="kpi-desc">Submitted to Dr. Arvind Swaminathan</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Changes Requested</span>
              <span className="kpi-value text-warning">{stats.changesRequested}</span>
              <span className="kpi-desc">Action needed</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Approved & Finalized</span>
              <span className="kpi-value text-success">{stats.approvedFinalized}</span>
              <span className="kpi-desc">Ready for examination</span>
            </div>
          </div>

          {/* Filter Bar & Tabs */}
          <div className="qp-controls-bar">
            <div className="qp-tabs-group">
              <button
                type="button"
                className={`qp-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Papers ({papers.length})
              </button>
              <button
                type="button"
                className={`qp-tab-btn ${activeTab === 'drafts' ? 'active' : ''}`}
                onClick={() => setActiveTab('drafts')}
              >
                Drafts & Revisions ({stats.drafts + stats.changesRequested})
              </button>
              <button
                type="button"
                className={`qp-tab-btn ${activeTab === 'in_review' ? 'active' : ''}`}
                onClick={() => setActiveTab('in_review')}
              >
                In Review ({stats.inReview})
              </button>
              <button
                type="button"
                className={`qp-tab-btn ${activeTab === 'approved_finalized' ? 'active' : ''}`}
                onClick={() => setActiveTab('approved_finalized')}
              >
                Approved & Finalized ({stats.approvedFinalized})
              </button>
            </div>

            <div className="qp-search-box">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by code, title, subject..."
                ariaLabel="Search question papers"
              />
            </div>
          </div>

          {/* Papers Table */}
          <div className="card qp-table-card">
            {filteredPapers.length === 0 ? (
              <div className="qp-empty-state">
                <FileText size={48} className="qp-empty-icon" />
                <h3>No Question Papers Found</h3>
                <p>You have not created any question papers matching the current filter.</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={14} /> Create Question Paper
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Paper Code</th>
                      <th>Title & Subject</th>
                      <th>Class</th>
                      <th>Method</th>
                      <th>Marks & Time</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPapers.map((p) => {
                      const isEditable = p.status === 'draft' || p.status === 'changes_requested';
                      return (
                        <tr key={p.id}>
                          <td className="font-weight-bold">
                            <span className="qp-code-pill">{p.paperCode}</span>
                          </td>
                          <td>
                            <div className="qp-table-title">{p.title}</div>
                            <div className="qp-table-sub">
                              {p.subject} • {p.examTitle}
                            </div>
                            {p.status === 'changes_requested' && p.reviewComments && (
                              <div className="qp-table-comment-snippet">
                                <MessageSquare size={12} /> "{p.reviewComments}"
                              </div>
                            )}
                          </td>
                          <td>
                            {p.className} ({p.section})
                          </td>
                          <td>{getMethodBadge(p.preparationMethod)}</td>
                          <td>
                            <strong>{p.maxMarks} M</strong>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {p.durationMinutes} mins
                            </div>
                          </td>
                          <td>
                            <span className="qp-ver-badge">v{p.currentVersion}</span>
                          </td>
                          <td>{getStatusBadge(p.status)}</td>
                          <td className="text-muted" style={{ fontSize: '12px' }}>
                            {new Date(p.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="text-right">
                            <div className="btn-group">
                              {isEditable && (
                                <button
                                  type="button"
                                  className="btn btn-icon btn-sm"
                                  title="Edit Paper"
                                  onClick={() => setEditingPaper(p)}
                                >
                                  <Edit size={15} />
                                </button>
                              )}
                              {isEditable && (
                                <button
                                  type="button"
                                  className="btn btn-icon btn-sm text-info"
                                  title="Submit for Review"
                                  onClick={() => handleSubmitForReview(p.id)}
                                >
                                  <Send size={15} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-icon btn-sm"
                                title="Print / Exam Layout Preview"
                                onClick={() => setPrintingPaper(p)}
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-icon btn-sm"
                                title="Version Snapshots & Audit Trail"
                                onClick={() => setHistoryPaper(p)}
                              >
                                <History size={15} />
                              </button>
                              {p.status === 'draft' && (
                                <button
                                  type="button"
                                  className="btn btn-icon btn-sm text-danger"
                                  title="Delete Draft"
                                  onClick={() => handleDeleteDraft(p)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create New Paper Modal */}
      {showCreateModal && (
        <div className="qp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="qp-modal-content qp-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qp-modal-header">
              <div className="qp-modal-title-group">
                <FileText size={20} className="text-primary" />
                <div>
                  <h3>Initiate New Question Paper</h3>
                  <p className="qp-modal-sub">Select preparation method and examination specifications.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreatePaper}>
              <div className="qp-modal-body">
                {/* Method Selection Cards */}
                <div className="form-group">
                  <label className="form-label">Select Preparation Method *</label>
                  <div className="qp-method-picker-grid">
                    <div
                      className={`qp-method-card ${newMethod === 'erp_editor' ? 'selected' : ''}`}
                      onClick={() => setNewMethod('erp_editor')}
                    >
                      <div className="qp-method-icon-box">
                        <FileText size={24} />
                      </div>
                      <div className="qp-method-info">
                        <strong>In-App ERP Editor</strong>
                        <p>Build structured sections, MCQs, right-aligned marks & live balancer.</p>
                      </div>
                    </div>

                    <div
                      className={`qp-method-card ${newMethod === 'pdf_upload' ? 'selected' : ''}`}
                      onClick={() => setNewMethod('pdf_upload')}
                    >
                      <div className="qp-method-icon-box">
                        <UploadCloud size={24} />
                      </div>
                      <div className="qp-method-info">
                        <strong>Upload PDF Document</strong>
                        <p>Upload a formatted question paper PDF (up to 15 MB).</p>
                      </div>
                    </div>

                    <div
                      className={`qp-method-card ${newMethod === 'image_upload' ? 'selected' : ''}`}
                      onClick={() => setNewMethod('image_upload')}
                    >
                      <div className="qp-method-icon-box">
                        <ImageIcon size={24} />
                      </div>
                      <div className="qp-method-info">
                        <strong>Upload Scanned Pages</strong>
                        <p>Upload multi-page high resolution images of handwritten/printed papers.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Paper Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newPaperCode}
                      onChange={(e) => setNewPaperCode(e.target.value)}
                      placeholder="e.g. QP-2026-X-MATH-01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paper Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Class 10 Mathematics Mid-Term Paper"
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class & Section *</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="Class 10"
                        required
                      />
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '70px' }}
                        value={newSection}
                        onChange={(e) => setNewSection(e.target.value)}
                        placeholder="A"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (Mins)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      min={15}
                      max={360}
                      step={15}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Maximum Marks *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newMaxMarks}
                      onChange={(e) => setNewMaxMarks(Number(e.target.value))}
                      min={10}
                      max={200}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned Author Teacher</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`${currentUser.name} (${currentUser.email})`}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="qp-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Proceed to Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formal Printable Examination Paper Preview */}
      {printingPaper && (
        <PrintableQuestionPaper
          paper={printingPaper}
          currentUser={currentUser}
          onClose={() => setPrintingPaper(null)}
        />
      )}

      {/* Version Snapshots & Audit Trail Modal */}
      {historyPaper && (
        <VersionHistoryModal
          paper={historyPaper}
          onClose={() => setHistoryPaper(null)}
        />
      )}
    </div>
  );
};
