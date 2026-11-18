// ==========================================
// Formal Printable Examination Question Paper
// Official School Board / CBSE Layout
// Black & White, No Internal Comments/Audit Logs
// ==========================================

import React from 'react';
import { QuestionPaper } from '../../types/questionPaper';
import { getPrintablePaperData } from '../../services/questionPaperService';
import { User } from '../../types';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface PrintableQuestionPaperProps {
  paper: QuestionPaper;
  currentUser: User;
  onClose: () => void;
}

export const PrintableQuestionPaper: React.FC<PrintableQuestionPaperProps> = ({
  paper,
  currentUser,
  onClose,
}) => {
  // Use sanitized data stripping all comments and audit trails
  const printableData = getPrintablePaperData(paper.id, currentUser);

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0 && remainingMins > 0) return `${hours} hr ${remainingMins} min`;
    if (hours > 0) return `${hours} Hour${hours > 1 ? 's' : ''}`;
    return `${mins} Minutes`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="qp-print-modal-overlay">
      {/* Top Action Bar (hidden when printing) */}
      <div className="qp-print-action-bar no-print">
        <div className="qp-print-action-info">
          <span className="qp-print-pill">
            <CheckCircle2 size={15} /> Official Examination Layout
          </span>
          <span className="qp-print-code">Code: {printableData.paperCode}</span>
          <span className="qp-print-version">v{printableData.currentVersion}</span>
        </div>
        <div className="qp-print-action-buttons">
          <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={16} /> Print Official Paper
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} /> Close Preview
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="qp-printable-sheet-wrapper">
        <div className="qp-printable-paper" id="examination-question-paper">
          {/* Official Board / School Header */}
          <div className="qp-exam-header">
            <div className="qp-school-title">ST. XAVIER'S SENIOR SECONDARY SCHOOL</div>
            <div className="qp-exam-sub">{printableData.examTitle?.toUpperCase() || 'ANNUAL EXAMINATION'} — {printableData.academicYear}</div>
            
            <div className="qp-exam-meta-bar">
              <div className="qp-exam-meta-item">
                <strong>CLASS:</strong> {printableData.className} ({printableData.section})
              </div>
              <div className="qp-exam-meta-item">
                <strong>SUBJECT:</strong> {printableData.subject?.toUpperCase()}
              </div>
              <div className="qp-exam-meta-item">
                <strong>PAPER CODE:</strong> {printableData.paperCode}
              </div>
            </div>

            <div className="qp-exam-timing-bar">
              <div className="qp-timing-item">
                <strong>Time Allowed:</strong> {formatDuration(printableData.durationMinutes || 180)}
              </div>
              <div className="qp-roll-field">
                <strong>Roll No.:</strong> <span className="qp-roll-box"></span>
              </div>
              <div className="qp-timing-item text-right">
                <strong>Maximum Marks:</strong> {printableData.maxMarks}
              </div>
            </div>
          </div>

          <div className="qp-header-divider"></div>

          {/* General Instructions */}
          {printableData.erpContent?.generalInstructions && printableData.erpContent.generalInstructions.length > 0 && (
            <div className="qp-instructions-block">
              <div className="qp-instructions-title">General Instructions:</div>
              <ol className="qp-instructions-list">
                {printableData.erpContent.generalInstructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          {/* ERP Editor Content Layout */}
          {printableData.preparationMethod === 'erp_editor' && printableData.erpContent && (
            <div className="qp-sections-body">
              {printableData.erpContent.sections.map((section) => (
                <div key={section.id} className="qp-section-container">
                  <div className="qp-section-header">
                    <span className="qp-section-title">{section.sectionTitle}</span>
                  </div>
                  {section.instructions && (
                    <div className="qp-section-instructions">({section.instructions})</div>
                  )}

                  <div className="qp-questions-list">
                    {section.questions.map((q) => (
                      <div key={q.id} className="qp-question-item">
                        <div className="qp-q-row">
                          <span className="qp-q-num">Q{q.questionNumber}.</span>
                          <div className="qp-q-content">
                            <span className="qp-q-text">{q.questionText}</span>
                            
                            {/* MCQ Options */}
                            {q.questionType === 'mcq' && q.options && q.options.length > 0 && (
                              <div className="qp-mcq-grid">
                                {q.options.map((opt) => (
                                  <div key={opt.key} className="qp-mcq-option">
                                    <span className="qp-opt-letter">({opt.key})</span>
                                    <span className="qp-opt-text">{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Sub-questions for Case Study / Multi-part */}
                            {q.subQuestions && q.subQuestions.length > 0 && (
                              <div className="qp-subquestions-list">
                                {q.subQuestions.map((sq) => (
                                  <div key={sq.id} className="qp-subq-row">
                                    <span className="qp-subq-num">({sq.subNumber})</span>
                                    <span className="qp-subq-text">{sq.text}</span>
                                    <span className="qp-subq-marks">[{sq.marks}]</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Internal Choice OR Option */}
                            {q.hasInternalChoice && q.orQuestionText && (
                              <div className="qp-or-block">
                                <div className="qp-or-divider">— OR —</div>
                                <div className="qp-or-text">{q.orQuestionText}</div>
                                {q.orOptions && q.orOptions.length > 0 && (
                                  <div className="qp-mcq-grid">
                                    {q.orOptions.map((opt) => (
                                      <div key={opt.key} className="qp-mcq-option">
                                        <span className="qp-opt-letter">({opt.key})</span>
                                        <span className="qp-opt-text">{opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Marks aligned to right margin */}
                          <div className="qp-q-marks">[{q.marks}]</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PDF Upload Layout */}
          {printableData.preparationMethod === 'pdf_upload' && printableData.pdfAttachment && (
            <div className="qp-pdf-preview-container">
              <div className="qp-pdf-notice-card">
                <FileText size={32} />
                <div className="qp-pdf-notice-details">
                  <h4>Uploaded Examination Document Attached</h4>
                  <p><strong>File Name:</strong> {printableData.pdfAttachment.fileName}</p>
                  <p><strong>File Size:</strong> {(printableData.pdfAttachment.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                  <p className="qp-pdf-helper-text">
                    This question paper was prepared via verified PDF submission.
                    Use your browser's PDF viewer or click below to view the full attachment.
                  </p>
                </div>
              </div>
              {printableData.pdfAttachment.dataUrl ? (
                <iframe
                  title="PDF Attachment Viewer"
                  src={printableData.pdfAttachment.dataUrl}
                  className="qp-embedded-pdf-frame"
                />
              ) : (
                <div className="qp-pdf-placeholder">
                  <em>PDF attachment is securely archived in the institutional examination vault.</em>
                </div>
              )}
            </div>
          )}

          {/* Scanned Images Layout */}
          {printableData.preparationMethod === 'image_upload' && printableData.imagePages && (
            <div className="qp-images-body">
              {printableData.imagePages.map((page, index) => (
                <div key={page.id} className="qp-image-page-container">
                  <div className="qp-image-page-header">
                    <span>Page {index + 1} of {printableData.imagePages?.length}</span>
                    <span className="qp-image-page-title">{printableData.title}</span>
                  </div>
                  <img
                    src={page.dataUrl}
                    alt={`Question Paper Page ${page.pageNumber}`}
                    className="qp-scanned-page-image"
                  />
                  {index < (printableData.imagePages?.length || 1) - 1 && (
                    <div className="qp-page-break-indicator no-print">
                      — Page Break —
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formal Examination Paper Footer */}
          <div className="qp-exam-footer">
            <div className="qp-footer-line">*** END OF QUESTION PAPER ***</div>
            <div className="qp-footer-sub">St. Xavier's Senior Secondary School • Institutional Examination Board</div>
          </div>
        </div>
      </div>
    </div>
  );
};

