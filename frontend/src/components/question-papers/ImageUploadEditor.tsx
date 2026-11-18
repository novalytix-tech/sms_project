// ==========================================
// Question Paper Scanned Images Editor
// Developed by NTS Novalytix
// Multi-page Image Ingestion, Ordering & Preview
// ==========================================

import React, { useState } from 'react';
import { QuestionPaper, QuestionPaperImagePage } from '../../types/questionPaper';
import { Image, UploadCloud, Trash2, ArrowUp, ArrowDown, AlertCircle, MessageSquare, ZoomIn } from 'lucide-react';

interface ImageUploadEditorProps {
  paper: QuestionPaper;
  onSave: (updated: Partial<QuestionPaper>) => void;
  onSubmitForReview?: (updated: Partial<QuestionPaper>) => void;
  onCancel: () => void;
}

export const ImageUploadEditor: React.FC<ImageUploadEditorProps> = ({
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

  const [imagePages, setImagePages] = useState<QuestionPaperImagePage[]>(paper.imagePages || []);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewingPage, setPreviewingPage] = useState<QuestionPaperImagePage | null>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit per image
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setUploadError(`File "${file.name}" is not a recognized image.`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setUploadError(`Image "${file.name}" exceeds the 10 MB size limit.`);
        return;
      }
      validFiles.push(file);
    }

    // Process all valid files
    let loadedCount = 0;
    const newPages: QuestionPaperImagePage[] = [];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPages.push({
          id: `img-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          pageNumber: imagePages.length + newPages.length + 1,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          dataUrl: reader.result as string,
        });

        loadedCount++;
        if (loadedCount === validFiles.length) {
          const combined = [...imagePages, ...newPages].map((page, idx) => ({
            ...page,
            pageNumber: idx + 1,
          }));
          setImagePages(combined);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...imagePages];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setImagePages(updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === imagePages.length - 1) return;
    const updated = [...imagePages];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setImagePages(updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 })));
  };

  const handleRemovePage = (pageId: string) => {
    const updated = imagePages
      .filter((p) => p.id !== pageId)
      .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setImagePages(updated);
    if (previewingPage?.id === pageId) {
      setPreviewingPage(null);
    }
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
      preparationMethod: 'image_upload',
      imagePages,
    };
  };

  const handleSaveDraft = () => {
    onSave(buildPayload());
  };

  const handleSubmit = () => {
    if (imagePages.length === 0) {
      setUploadError('Please upload at least one scanned page before submitting for review.');
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
            <h2 className="qp-editor-page-heading">Scanned Question Paper Upload</h2>
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
                disabled={imagePages.length === 0}
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
              placeholder="e.g. Class 10 English Literature Mid-Term Paper"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Paper Code *</label>
            <input
              type="text"
              className="form-control"
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
              placeholder="e.g. QP-2026-X-ENG-01"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              type="text"
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. English Literature"
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

      {/* Scanned Image Pages Card */}
      <div className="card qp-editor-card">
        <div className="qp-card-header-flex">
          <div>
            <h3 className="qp-card-title">Scanned Examination Pages ({imagePages.length} Pages)</h3>
            <p className="qp-card-subtitle">
              Upload clear, sequentially scanned pages of handwritten or typed question papers. You can reorder pages after upload.
            </p>
          </div>
          <label className="btn btn-secondary btn-sm qp-file-input-label" style={{ margin: 0 }}>
            <UploadCloud size={15} />
            <span>Upload More Pages</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="qp-hidden-file-input"
              onChange={handleFilesChange}
            />
          </label>
        </div>

        {uploadError && (
          <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} /> {uploadError}
          </div>
        )}

        {imagePages.length === 0 ? (
          <div className="qp-upload-dropzone">
            <Image size={44} className="qp-dropzone-icon" />
            <h4>Select Scanned Page Images</h4>
            <p>Upload JPG or PNG scans of the physical question paper.</p>
            <label className="btn btn-outline btn-sm qp-file-input-label">
              <span>Browse Scanned Images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="qp-hidden-file-input"
                onChange={handleFilesChange}
              />
            </label>
          </div>
        ) : (
          <div className="qp-image-pages-grid">
            {imagePages.map((page, index) => (
              <div key={page.id} className="qp-image-page-card">
                <div className="qp-image-thumbnail-container" onClick={() => setPreviewingPage(page)}>
                  <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="qp-page-thumb-img" />
                  <div className="qp-thumb-hover-overlay">
                    <ZoomIn size={24} />
                    <span>View Page</span>
                  </div>
                </div>

                <div className="qp-image-page-meta">
                  <div className="qp-image-page-badge">Page {page.pageNumber}</div>
                  <div className="qp-image-file-name" title={page.fileName}>
                    {page.fileName}
                  </div>
                  <div className="qp-image-file-size">
                    {(page.fileSize / 1024).toFixed(0)} KB
                  </div>
                </div>

                <div className="qp-image-page-controls">
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    title="Move earlier"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    title="Move later"
                    disabled={index === imagePages.length - 1}
                    onClick={() => handleMoveDown(index)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon btn-sm text-danger"
                    title="Remove page"
                    onClick={() => handleRemovePage(page.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {previewingPage && (
        <div className="qp-lightbox-overlay" onClick={() => setPreviewingPage(null)}>
          <div className="qp-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="qp-lightbox-header">
              <span>
                Page {previewingPage.pageNumber} of {imagePages.length} — {previewingPage.fileName}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewingPage(null)}
              >
                Close
              </button>
            </div>
            <div className="qp-lightbox-image-wrapper">
              <img
                src={previewingPage.dataUrl}
                alt={`Page ${previewingPage.pageNumber}`}
                className="qp-lightbox-img"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

