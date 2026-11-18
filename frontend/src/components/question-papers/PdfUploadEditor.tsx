// ==========================================
// Question Paper PDF Upload Editor
// Developed by NTS Novalytix
// Direct Document Attachment with Validation & Preview
// ==========================================

import React, { useState } from 'react';
import { QuestionPaper, QuestionPaperFileAttachment } from '../../types/questionPaper';
import { FileText, UploadCloud, Trash2, AlertCircle, Eye, MessageSquare } from 'lucide-react';

interface PdfUploadEditorProps {
  paper: QuestionPaper;
  onSave: (updated: Partial<QuestionPaper>) => void;
  onSubmitForReview?: (updated: Partial<QuestionPaper>) => void;
  onCancel: () => void;
}

export const PdfUploadEditor: React.FC<PdfUploadEditorProps> = ({
  paper,
  onSave,
  onSubmitForReview,
  onCancel,
}) => {
  const [title, setTitle] = useState(paper.title || '');
  const [paperCode, setPaperCode] = useState(paper.paperCode || '');
  const [subject, setSubject] = useState(paper.subject || '');
  const [className, setClassName] = useState(paper.className || '');
  const [sectionName, setSectionName] = useState(paper.section || 'A');
  const [durationMinutes, setDurationMinutes] = useState(paper.durationMinutes || 180);
  const [maxMarks, setMaxMarks] = useState(paper.maxMarks || 80);

  const [pdfAttachment, setPdfAttachment] = useState<QuestionPaperFileAttachment | undefined>(
    paper.pdfAttachment
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Invalid file format. Please upload a valid PDF document (.pdf).');
      return;
    }

    // 15 MB limit check
    const MAX_SIZE_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 15 MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newAttachment: QuestionPaperFileAttachment = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        dataUrl,
        pageCount: 1,
      };
      setPdfAttachment(newAttachment);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = () => {
    setPdfAttachment(undefined);
    setShowPreview(false);
  };

  const buildPayload = (): Partial<QuestionPaper> => {
    return {
      title,
      paperCode,
      subject,
      className,
      section: sectionName,
      durationMinutes: Number(durationMinutes),
      maxMarks: Number(maxMarks),
      preparationMethod: 'pdf_upload',
      pdfAttachment,
    };
  };

  const handleSaveDraft = () => {
    onSave(buildPayload());
  };

  const handleSubmit = () => {
    if (!pdfAttachment) {
      setUploadError('Please upload a PDF document before submitting for review.');
      return;
    }
    if (onSubmitForReview) {
      onSubmitForReview(buildPayload());
    }
  };

  return (
    <div className="qp-editor-container">
      {/* Header bar */}
      <div className="qp-editor-sticky-header">
        <div className="qp-editor-title-row">
          <div>
            <h2 className="qp-editor-page-heading">PDF Question Paper Submission</h2>
            <div className="qp-editor-meta-sub">
              Code: <strong>{paperCode || 'UNASSIGNED'}</strong> • Subject: <strong>{subject || 'General'}</strong> •
              Author: <strong>{paper.teacherName}</strong>
            </div>
          </div>

          <div className="qp-editor-header-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveDraft}>
              Save Draft
            </button>
            {onSubmitForReview && (
              <button
                type="button"
                className="btn btn-accent btn-sm"
                onClick={handleSubmit}
                disabled={!pdfAttachment}
              >
                Submit for Review
              </button>
            )}
          </div>
        </div>

        {/* Highlighted Warning if Changes Requested previously */}
        {paper.status === 'changes_requested' && paper.reviewComments && (
          <div className="qp-review-feedback-banner">
            <MessageSquare size={18} className="qp-feedback-icon" />
            <div>
              <strong>Principal Reviewer Feedback:</strong>
              <div className="qp-feedback-text">{paper.reviewComments}</div>
            </div>
          </div>
        )}
      </div>

      {/* Basic Paper Parameters */}
      <div className="card qp-editor-card">
        <h3 className="qp-card-title">Paper Header & Assessment Parameters</h3>
        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">Paper Title *</label>
            <input
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Class 10 Physics Mid-Term Examination Paper"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Paper Code *</label>
            <input
              type="text"
              className="form-control"
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
              placeholder="e.g. QP-2026-X-PHY-01"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              type="text"
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Class & Section *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Class 10"
              />
              <input
                type="text"
                className="form-control"
                style={{ width: '80px' }}
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="A"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Duration (Minutes) *</label>
            <input
              type="number"
              className="form-control"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              min={15}
              max={360}
              step={15}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Maximum Marks *</label>
            <input
              type="number"
              className="form-control"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              min={10}
              max={200}
            />
          </div>
        </div>
      </div>

      {/* PDF Upload Card */}
      <div className="card qp-editor-card">
        <h3 className="qp-card-title">Official PDF Question Paper Attachment</h3>
        <p className="qp-card-subtitle">
          Upload a clear, formatted PDF document containing the examination paper. Maximum allowed size is 15 MB.
        </p>

        {uploadError && (
          <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} /> {uploadError}
          </div>
        )}

        {!pdfAttachment ? (
          <div className="qp-upload-dropzone">
            <UploadCloud size={44} className="qp-dropzone-icon" />
            <h4>Select or Drop Question Paper PDF</h4>
            <p>Upload a finalized document prepared in Word / LaTeX / InDesign.</p>
            <label className="btn btn-outline btn-sm qp-file-input-label">
              <span>Browse Computer</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="qp-hidden-file-input"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="qp-attached-file-box">
            <div className="qp-file-info-row">
              <FileText size={36} className="qp-pdf-icon" />
              <div className="qp-file-meta-block">
                <div className="qp-file-name">{pdfAttachment.fileName}</div>
                <div className="qp-file-specs">
                  Size: {(pdfAttachment.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded:{' '}
                  {new Date(pdfAttachment.uploadedAt).toLocaleString()}
                </div>
              </div>
              <div className="qp-file-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye size={15} /> {showPreview ? 'Hide Document' : 'Preview Document'}
                </button>
                <label className="btn btn-outline btn-sm qp-file-input-label" style={{ margin: 0 }}>
                  <span>Replace</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="qp-hidden-file-input"
                    onChange={handleFileChange}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-icon btn-sm text-danger"
                  title="Remove document"
                  onClick={handleRemovePdf}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Document preview if toggled */}
            {showPreview && pdfAttachment.dataUrl && (
              <div className="qp-inline-pdf-viewer">
                <iframe
                  title="PDF Attachment Preview"
                  src={pdfAttachment.dataUrl}
                  className="qp-embedded-pdf-frame"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

