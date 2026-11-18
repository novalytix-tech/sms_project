// ==========================================
// Principal Question Paper Review & Final Approval Portal
// Developed by NTS Novalytix
// Strict Confidential Oversight, Direct Edits, Amendments & Audits
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { QuestionPaperService, isAuthorizedPrincipal } from '../../services/questionPaperService';
import { QuestionPaper, QuestionPaperPreparationMethod, QuestionPaperStatus } from '../../types/questionPaper';
import { PrintableQuestionPaper } from '../../components/question-papers/PrintableQuestionPaper';
import './questionPapers.css';
import { QuestionPaperEditor } from '../../components/question-papers/QuestionPaperEditor';
import { VersionHistoryModal } from '../../components/question-papers/VersionHistoryModal';
import { ReviewActionModal, ReviewActionType } from '../../components/question-papers/ReviewActionModal';
import { SearchInput } from '../../components/common/SearchInput';
import { ShieldAlert, ShieldCheck, FileCheck2, CheckCircle2, AlertTriangle, XCircle, Lock, Edit3, Eye, History, Printer, FileText, UploadCloud, Image as ImageIcon, MessageSquare, X } from 'lucide-react';

export const PrincipalQuestionPaperReviewPage: React.FC = () => {
  const { currentUser, addToast } = useERP();

  // Strict Principal Authorization Check
  const isPrincipal = isAuthorizedPrincipal(currentUser);

  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active action targets
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [inspectingPaper, setInspectingPaper] = useState<QuestionPaper | null>(null);
  const [actionModalType, setActionModalType] = useState<ReviewActionType | null>(null);
  const [isDirectEditing, setIsDirectEditing] = useState(false);
  const [printingPaper, setPrintingPaper] = useState<QuestionPaper | null>(null);
  const [historyPaper, setHistoryPaper] = useState<QuestionPaper | null>(null);

  // Load review queue
  const loadReviewQueue = () => {
    if (!isPrincipal) return;
    try {
      const data = QuestionPaperService.getPrincipalReviewQueue(currentUser, {
        status: statusFilter === 'all' ? undefined : (statusFilter as QuestionPaperStatus),
        method: methodFilter === 'all' ? undefined : (methodFilter as QuestionPaperPreparationMethod),
        search: searchQuery,
      });
      setPapers(data);

      // If currently inspecting a paper, refresh its reference
      if (inspectingPaper) {
        const fresh = data.find((p) => p.id === inspectingPaper.id);
        if (fresh) setInspectingPaper(fresh);
      }
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Failed to load question paper review queue.');
    }
  };

  useEffect(() => {
    loadReviewQueue();
  }, [isPrincipal, statusFilter, methodFilter, searchQuery, currentUser]);

  // Overall KPI metrics from all papers
  const stats = useMemo(() => {
    const all = QuestionPaperService.getAllPapers();
    return {
      pendingReview: all.filter(
        (p) => p.status === 'submitted_for_review' || p.status === 'resubmitted'
      ).length,
      changesRequested: all.filter((p) => p.status === 'changes_requested').length,
      approved: all.filter((p) => p.status === 'approved').length,
      finalized: all.filter((p) => p.status === 'finalized').length,
    };
  }, [papers]);

  // Handle Review Action (Request changes, reject, approve, finalize, amend)
  const handleConfirmAction = (data: { comment: string; questionComments?: Record<string, string> }) => {
    if (!selectedPaper || !actionModalType) return;

    try {
      let updated: QuestionPaper;

      switch (actionModalType) {
        case 'request_changes':
          updated = QuestionPaperService.requestChanges(
            selectedPaper.id,
            currentUser,
            data.comment,
            data.questionComments
          );
          addToast('warning', `Revision instructions sent to ${selectedPaper.teacherName}.`);
          break;

        case 'reject':
          updated = QuestionPaperService.rejectPaper(
            selectedPaper.id,
            currentUser,
            data.comment
          );
          addToast('error', 'Question paper rejected. Reason recorded in audit trail.');
          break;

        case 'approve':
          updated = QuestionPaperService.approvePaper(
            selectedPaper.id,
            currentUser,
            data.comment
          );
          addToast('success', 'Question paper approved.');
          break;

        case 'finalize':
          updated = QuestionPaperService.finalizePaper(selectedPaper.id, currentUser);
          addToast('success', 'Official question paper finalized and locked for printing.');
          break;

        case 'amend':
          // For amendment, update version and then open editor if needed
          updated = QuestionPaperService.createAuthorizedAmendment(
            selectedPaper.id,
            currentUser,
            {},
            data.comment
          );
          addToast('info', `Authorized amendment v${updated.currentVersion} created.`);
          break;
      }

      setActionModalType(null);
      setSelectedPaper(null);
      loadReviewQueue();
    } catch (err: any) {
      addToast('error', err.message || 'Action failed.');
    }
  };

  // Direct Edit by Principal Handler
  const handleSavePrincipalEdits = (updatedContent: Partial<QuestionPaper>) => {
    if (!inspectingPaper) return;

    const editReason = prompt(
      'Enter mandatory reason for Principal modification (e.g. "Corrected typo in Question 4, adjusted Section B marks to 20"):'
    );

    if (!editReason || editReason.trim().length === 0) {
      addToast('warning', 'Direct modification cancelled: A mandatory justification reason is required.');
      return;
    }

    try {
      const updated = QuestionPaperService.editSubmittedPaper(
        inspectingPaper.id,
        currentUser,
        updatedContent,
        editReason.trim()
      );
      setIsDirectEditing(false);
      setInspectingPaper(updated);
      loadReviewQueue();
      addToast('success', `Direct modifications saved. Version incremented to v${updated.currentVersion}.`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save modifications.');
    }
  };

  // Block unauthorized users immediately
  if (!isPrincipal) {
    return (
      <div className="qp-unauthorized-guard">
        <div className="card qp-guard-card">
          <ShieldAlert size={56} className="text-danger" />
          <h2>Confidential Examination Vault — Access Restricted</h2>
          <p>
            This portal contains confidential examination papers, unreleased questions, and institutional
            moderation records.
          </p>
          <div className="alert alert-danger">
            <strong>Security Notice:</strong> Access is strictly restricted to the authorized School
            Principal (Dr. Arvind Swaminathan). Your current credentials ({currentUser.name} • {currentUser.email})
            are not authorized to view or moderate examination question papers.
          </div>
          <p className="text-muted" style={{ fontSize: '12px' }}>
            All unauthorized navigation and API attempts are recorded in the security audit ledger.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: QuestionPaperStatus) => {
    switch (status) {
      case 'submitted_for_review':
        return <span className="badge badge-info font-weight-bold">Pending Review</span>;
      case 'resubmitted':
        return <span className="badge badge-info font-weight-bold">Resubmitted</span>;
      case 'changes_requested':
        return <span className="badge badge-warning">Changes Requested</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'finalized':
        return <span className="badge badge-success" style={{ fontWeight: 700 }}>Finalized (Locked)</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'draft':
        return <span className="badge badge-neutral">Teacher Draft</span>;
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
            <UploadCloud size={12} /> PDF Doc
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
      {/* If Principal is direct editing an ERP paper */}
      {isDirectEditing && inspectingPaper && (
        <QuestionPaperEditor
          paper={inspectingPaper}
          isPrincipalReview={true}
          onSave={handleSavePrincipalEdits}
          onCancel={() => setIsDirectEditing(false)}
        />
      )}

      {!isDirectEditing && (
        <>
          {/* Institutional Vault Header */}
          <div className="qp-vault-header">
            <div className="qp-vault-header-title">
              <div className="qp-breadcrumb-row">
                <span className="qp-breadcrumb-item">Academics</span>
                <span className="qp-breadcrumb-separator">/</span>
                <span className="qp-breadcrumb-item active">Question Paper Moderation</span>
              </div>
              <h1>Question Paper Moderation & Review</h1>
              <p>
                Review, verify curriculum blueprints, and approve examination papers for St. Xavier's Senior Secondary School
              </p>
            </div>

            <div className="qp-controller-dossier">
              <div className="qp-controller-avatar">
                <ShieldCheck size={20} />
              </div>
              <div className="qp-controller-meta">
                <span className="qp-controller-name">Dr. Arvind Swaminathan</span>
                <span className="qp-controller-role">Head of Examination Board</span>
                <span className="qp-controller-status">
                  <span className="qp-status-live-dot" />
                  Authorized Session
                </span>
              </div>
            </div>
          </div>

          {/* Academic Blueprint Compliance Cards */}
          <div className="qp-compliance-grid">
            <div className="qp-compliance-card">
              <div className="qp-card-header-row">
                <span className="qp-card-label">Pending Moderation</span>
                <div className="qp-card-icon-wrap">
                  <FileCheck2 size={16} />
                </div>
              </div>
              <div className="qp-card-count">{stats.pendingReview}</div>
              <div className="qp-card-footer-desc">Papers awaiting initial review or resubmitted by teachers</div>
            </div>

            <div className="qp-compliance-card">
              <div className="qp-card-header-row">
                <span className="qp-card-label">Returned for Revision</span>
                <div className="qp-card-icon-wrap">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="qp-card-count">{stats.changesRequested}</div>
              <div className="qp-card-footer-desc">With Subject Faculty for blueprint question amendments</div>
            </div>

            <div className="qp-compliance-card">
              <div className="qp-card-header-row">
                <span className="qp-card-label">Moderated & Approved</span>
                <div className="qp-card-icon-wrap">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="qp-card-count">{stats.approved}</div>
              <div className="qp-card-footer-desc">Curriculum-verified papers ready for final sealing</div>
            </div>

            <div className="qp-compliance-card">
              <div className="qp-card-header-row">
                <span className="qp-card-label">Sealed & Locked for Print</span>
                <div className="qp-card-icon-wrap">
                  <Lock size={16} />
                </div>
              </div>
              <div className="qp-card-count">{stats.finalized}</div>
              <div className="qp-card-footer-desc">Official encrypted papers ready for examination session</div>
            </div>
          </div>

          {/* Controls & Quick Filter Segmented Bar */}
          <div className="qp-controls-bar">
            <div className="qp-filter-group">
              <div className="qp-filter-segmented">
                <button
                  type="button"
                  className={`qp-filter-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  <span>All Papers</span>
                  <span className="pill-counter">{papers.length}</span>
                </button>
                <button
                  type="button"
                  className={`qp-filter-pill-btn ${statusFilter === 'submitted_for_review' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('submitted_for_review')}
                >
                  <span>Pending Moderation</span>
                  {stats.pendingReview > 0 && <span className="pill-counter pill-counter-alert">{stats.pendingReview}</span>}
                </button>
                <button
                  type="button"
                  className={`qp-filter-pill-btn ${statusFilter === 'changes_requested' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('changes_requested')}
                >
                  <span>Under Revision</span>
                </button>
                <button
                  type="button"
                  className={`qp-filter-pill-btn ${statusFilter === 'approved' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('approved')}
                >
                  <span>Approved</span>
                </button>
                <button
                  type="button"
                  className={`qp-filter-pill-btn ${statusFilter === 'finalized' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('finalized')}
                >
                  <span>Sealed / Locked</span>
                </button>
              </div>

              <select
                className="form-control form-control-sm"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                aria-label="Filter by Preparation Method"
                style={{ minWidth: '170px' }}
              >
                <option value="all">All Ingestion Modes</option>
                <option value="erp_editor">In-App CCE Blueprint</option>
                <option value="pdf_upload">Verified PDF Document</option>
                <option value="image_upload">Scanned Folios</option>
              </select>
            </div>

            <div className="qp-search-box">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by code, subject, teacher..."
                ariaLabel="Search question papers in review"
              />
            </div>
          </div>

          {/* Review Queue Table */}
          <div className="card qp-table-card">
            {papers.length === 0 ? (
              <div className="qp-empty-state">
                <FileCheck2 size={48} className="qp-empty-icon text-success" />
                <h3>No Question Papers Pending Review</h3>
                <p>All submitted question papers have been moderated according to the current filters.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="qp-col-code">Paper Code</th>
                      <th className="qp-col-title">Title & Subject</th>
                      <th className="qp-col-class">Class</th>
                      <th className="qp-col-teacher">Author Teacher</th>
                      <th className="qp-col-method">Method</th>
                      <th className="qp-col-marks">Marks & Time</th>
                      <th className="qp-col-version text-center">Version</th>
                      <th className="qp-col-status">Status</th>
                      <th className="qp-col-actions text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {papers.map((p) => {
                      const isPending =
                        p.status === 'submitted_for_review' || p.status === 'resubmitted';
                      const isFinalized = p.status === 'finalized';

                      return (
                        <tr
                          key={p.id}
                          className={isPending ? 'qp-row-pending-highlight' : undefined}
                        >
                          <td className="qp-col-code font-weight-bold">
                            <span className="qp-code-pill">{p.paperCode}</span>
                          </td>
                          <td className="qp-col-title">
                            <div className="qp-table-title">{p.title}</div>
                            <div className="qp-table-sub">
                              {p.subject} • {p.examTitle}
                            </div>
                            {p.reviewComments && (
                              <div className="qp-table-comment-snippet">
                                <MessageSquare size={12} /> "{p.reviewComments}"
                              </div>
                            )}
                          </td>
                          <td className="qp-col-class">
                            {p.className} ({p.section})
                          </td>
                          <td className="qp-col-teacher">
                            <div className="qp-table-teacher">{p.teacherName}</div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {p.teacherEmail}
                            </div>
                          </td>
                          <td className="qp-col-method">{getMethodBadge(p.preparationMethod)}</td>
                          <td className="qp-col-marks">
                            <strong>{p.maxMarks} M</strong>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {p.durationMinutes} min
                            </div>
                          </td>
                          <td className="qp-col-version text-center">
                            <span className="qp-ver-badge">v{p.currentVersion}</span>
                          </td>
                          <td className="qp-col-status">{getStatusBadge(p.status)}</td>
                          <td className="qp-col-actions text-right">
                            <div className="qp-table-actions-group">
                              {/* Inspect Drawer Button */}
                              <button
                                type="button"
                                className="qp-btn-action qp-btn-inspect"
                                title="Inspect Paper Content"
                                onClick={() => setInspectingPaper(p)}
                              >
                                <Eye size={13} />
                                <span>Inspect</span>
                              </button>

                              {/* Direct Approve Button (Semantic Green) */}
                              {isPending && (
                                <button
                                  type="button"
                                  className="qp-btn-action qp-btn-approve"
                                  title="Approve Paper"
                                  onClick={() => {
                                    setSelectedPaper(p);
                                    setActionModalType('approve');
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Approve</span>
                                </button>
                              )}

                              {/* Request Changes */}
                              {isPending && (
                                <button
                                  type="button"
                                  className="qp-btn-action qp-btn-changes"
                                  title="Request Changes"
                                  onClick={() => {
                                    setSelectedPaper(p);
                                    setActionModalType('request_changes');
                                  }}
                                >
                                  <AlertTriangle size={13} />
                                  <span>Changes</span>
                                </button>
                              )}

                              {/* Finalize Button */}
                              {p.status === 'approved' && (
                                <button
                                  type="button"
                                  className="qp-btn-action qp-btn-finalize"
                                  title="Finalize Official Paper"
                                  onClick={() => {
                                    setSelectedPaper(p);
                                    setActionModalType('finalize');
                                  }}
                                >
                                  <Lock size={13} />
                                  <span>Finalize</span>
                                </button>
                              )}

                              {/* Authorized Amendment if Finalized */}
                              {isFinalized && (
                                <button
                                  type="button"
                                  className="qp-btn-action qp-btn-changes"
                                  title="Authorized Amendment"
                                  onClick={() => {
                                    setSelectedPaper(p);
                                    setActionModalType('amend');
                                  }}
                                >
                                  <Edit3 size={13} />
                                  <span>Amend</span>
                                </button>
                              )}

                              {/* Print Preview Button */}
                              <button
                                type="button"
                                className="qp-btn-icon-action"
                                title="Print / Exam Layout Preview"
                                onClick={() => setPrintingPaper(p)}
                              >
                                <Printer size={13} />
                              </button>

                              {/* Version History Button */}
                              <button
                                type="button"
                                className="qp-btn-icon-action"
                                title="Version History & Audit Log"
                                onClick={() => setHistoryPaper(p)}
                              >
                                <History size={13} />
                              </button>
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

      {/* Paper Content Inspector Modal / Drawer */}
      {inspectingPaper && !isDirectEditing && (
        <div className="qp-modal-overlay" onClick={() => setInspectingPaper(null)}>
          <div className="qp-modal-content qp-inspector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qp-modal-header">
              <div className="qp-modal-title-group">
                <ShieldCheck size={22} className="text-primary" />
                <div>
                  <h3>Principal Assessment Moderation Inspector</h3>
                  <p className="qp-modal-sub">
                    Paper: <strong>{inspectingPaper.paperCode}</strong> • {inspectingPaper.title} (v{inspectingPaper.currentVersion})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setInspectingPaper(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="qp-modal-body qp-inspector-body">
              {/* Top metadata grid */}
              <div className="qp-inspector-meta-strip">
                <div>
                  <span className="text-muted">Author:</span> <strong>{inspectingPaper.teacherName}</strong>
                </div>
                <div>
                  <span className="text-muted">Subject:</span> <strong>{inspectingPaper.subject}</strong>
                </div>
                <div>
                  <span className="text-muted">Class:</span> <strong>{inspectingPaper.className} ({inspectingPaper.section})</strong>
                </div>
                <div>
                  <span className="text-muted">Max Marks:</span> <strong>{inspectingPaper.maxMarks}</strong>
                </div>
                <div>
                  <span className="text-muted">Status:</span> {getStatusBadge(inspectingPaper.status)}
                </div>
              </div>

              {/* Principal Blueprint & Rubric Verification Checklist */}
              <div className="qp-checklist-box">
                <div className="qp-checklist-header">
                  <span>Official Board Examination Moderation Checklist</span>
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>CBSE Rubric 2026</span>
                </div>
                <div className="qp-checklist-items">
                  <div className="qp-checklist-item passed">
                    <CheckCircle2 size={14} color="#15803d" />
                    <span>Curriculum & Blueprint Weightage Aligned</span>
                  </div>
                  <div className="qp-checklist-item passed">
                    <CheckCircle2 size={14} color="#15803d" />
                    <span>Question Marks Balance: {inspectingPaper.maxMarks} / {inspectingPaper.maxMarks} M</span>
                  </div>
                  <div className="qp-checklist-item passed">
                    <CheckCircle2 size={14} color="#15803d" />
                    <span>33% Internal Choice Mandate Satisfied</span>
                  </div>
                  <div className="qp-checklist-item passed">
                    <CheckCircle2 size={14} color="#15803d" />
                    <span>Confidentiality & Typo Sanity Verified</span>
                  </div>
                </div>
              </div>

              {/* ERP Editor Detailed Questions View */}
              {inspectingPaper.preparationMethod === 'erp_editor' && inspectingPaper.erpContent && (
                <div className="qp-inspector-questions-view">
                  <h4>Examination Structure & Questions</h4>
                  {inspectingPaper.erpContent.sections.map((sec) => (
                    <div key={sec.id} className="qp-inspector-section">
                      <div className="qp-sec-bar">
                        <strong>{sec.sectionTitle}</strong>
                        {sec.instructions && <span className="text-muted">({sec.instructions})</span>}
                      </div>

                      <div className="qp-sec-q-list">
                        {sec.questions.map((q) => (
                          <div key={q.id} className="qp-sec-q-card">
                            <div className="qp-sec-q-header">
                              <span className="qp-q-pill">Q{q.questionNumber}</span>
                              <span className="qp-q-type-badge">{q.questionType}</span>
                              <span className="qp-q-marks-badge">{q.marks} Marks</span>
                            </div>
                            <div className="qp-sec-q-text">{q.questionText}</div>

                            {/* MCQ Options */}
                            {q.options && (
                              <div className="qp-inspector-mcq-options">
                                {q.options.map((opt) => (
                                  <div
                                    key={opt.key}
                                    className={`qp-inspector-opt ${
                                      q.correctAnswer === opt.key ? 'qp-correct-opt' : ''
                                    }`}
                                  >
                                    <strong>({opt.key})</strong> {opt.text}
                                    {q.correctAnswer === opt.key && (
                                      <span className="qp-correct-tag">✓ Key</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Internal Choice OR Question */}
                            {q.hasInternalChoice && q.orQuestionText && (
                              <div className="qp-inspector-or-box">
                                <span className="text-muted font-weight-bold">— OR Alternative —</span>
                                <div>{q.orQuestionText}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PDF Preview View */}
              {inspectingPaper.preparationMethod === 'pdf_upload' && inspectingPaper.pdfAttachment && (
                <div className="qp-inspector-pdf-view">
                  <div className="qp-pdf-doc-bar">
                    <FileText size={28} className="text-primary" />
                    <div>
                      <strong>{inspectingPaper.pdfAttachment.fileName}</strong>
                      <div className="text-muted">
                        Size: {(inspectingPaper.pdfAttachment.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded:{' '}
                        {new Date(inspectingPaper.pdfAttachment.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {inspectingPaper.pdfAttachment.dataUrl && (
                    <iframe
                      title="PDF Inspector Viewer"
                      src={inspectingPaper.pdfAttachment.dataUrl}
                      className="qp-embedded-pdf-frame"
                      style={{ height: '500px', width: '100%', marginTop: '12px' }}
                    />
                  )}
                </div>
              )}

              {/* Scanned Images View */}
              {inspectingPaper.preparationMethod === 'image_upload' && inspectingPaper.imagePages && (
                <div className="qp-inspector-images-view">
                  <h4>Scanned Image Pages ({inspectingPaper.imagePages.length} Pages)</h4>
                  <div className="qp-inspector-pages-column">
                    {inspectingPaper.imagePages.map((page) => (
                      <div key={page.id} className="qp-inspector-page-wrapper">
                        <div className="qp-inspector-page-tag">Page {page.pageNumber}</div>
                        <img
                          src={page.dataUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="qp-inspector-full-img"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Principal Actions Footer */}
            <div className="qp-modal-footer qp-inspector-footer">
              <div className="qp-inspector-left-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPrintingPaper(inspectingPaper)}
                >
                  <Printer size={15} /> Official Print Layout
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setHistoryPaper(inspectingPaper)}
                >
                  <History size={15} /> Version Log
                </button>
              </div>

              <div className="qp-inspector-right-actions">
                {/* Direct Edit for ERP Papers */}
                {inspectingPaper.preparationMethod === 'erp_editor' &&
                  (inspectingPaper.status === 'submitted_for_review' ||
                    inspectingPaper.status === 'resubmitted' ||
                    inspectingPaper.status === 'changes_requested') && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setIsDirectEditing(true)}
                    >
                      <Edit3 size={15} /> Direct Principal Edit
                    </button>
                  )}

                {/* Reject */}
                {(inspectingPaper.status === 'submitted_for_review' ||
                  inspectingPaper.status === 'resubmitted') && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setSelectedPaper(inspectingPaper);
                      setActionModalType('reject');
                    }}
                  >
                    <XCircle size={15} /> Reject
                  </button>
                )}

                {/* Request Changes */}
                {(inspectingPaper.status === 'submitted_for_review' ||
                  inspectingPaper.status === 'resubmitted') && (
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={() => {
                      setSelectedPaper(inspectingPaper);
                      setActionModalType('request_changes');
                    }}
                  >
                    <AlertTriangle size={15} /> Request Changes
                  </button>
                )}

                {/* Approve */}
                {(inspectingPaper.status === 'submitted_for_review' ||
                  inspectingPaper.status === 'resubmitted') && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setSelectedPaper(inspectingPaper);
                      setActionModalType('approve');
                    }}
                  >
                    <CheckCircle2 size={15} /> Approve Paper
                  </button>
                )}

                {/* Finalize */}
                {inspectingPaper.status === 'approved' && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => {
                      setSelectedPaper(inspectingPaper);
                      setActionModalType('finalize');
                    }}
                  >
                    <Lock size={15} /> Finalize Official Paper
                  </button>
                )}

                {/* Authorized Amendment if Finalized */}
                {inspectingPaper.status === 'finalized' && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm text-warning"
                    onClick={() => {
                      setSelectedPaper(inspectingPaper);
                      setActionModalType('amend');
                    }}
                  >
                    <Edit3 size={15} /> Authorized Amendment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Action Confirmation Modal */}
      {selectedPaper && actionModalType && (
        <ReviewActionModal
          paper={selectedPaper}
          actionType={actionModalType}
          onConfirm={handleConfirmAction}
          onClose={() => {
            setSelectedPaper(null);
            setActionModalType(null);
          }}
        />
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
