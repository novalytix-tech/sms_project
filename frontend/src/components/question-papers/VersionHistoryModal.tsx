// ==========================================
// Question Paper Version History & Audit Trail Modal
// Developed by NTS Novalytix
// Complete Snapshot Diffing & Immutable Audit Log
// ==========================================

import React, { useState } from 'react';
import { QuestionPaper, QuestionPaperVersionSnapshot } from '../../types/questionPaper';
import { History, ShieldCheck, FileText, Clock, X } from 'lucide-react';

interface VersionHistoryModalProps {
  paper: QuestionPaper;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ paper, onClose }) => {
  const [activeTab, setActiveTab] = useState<'versions' | 'audit_trail'>('versions');
  const [selectedSnapshot, setSelectedSnapshot] = useState<QuestionPaperVersionSnapshot | null>(
    paper.versionHistory && paper.versionHistory.length > 0
      ? paper.versionHistory[paper.versionHistory.length - 1]
      : null
  );

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal-content qp-version-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qp-modal-header">
          <div className="qp-modal-title-group">
            <History size={20} className="text-primary" />
            <div>
              <h3>Version History & Audit Log</h3>
              <p className="qp-modal-sub">
                Paper: <strong>{paper.paperCode}</strong> • {paper.title} (Current: v{paper.currentVersion})
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="qp-modal-tabs">
          <button
            type="button"
            className={`qp-modal-tab ${activeTab === 'versions' ? 'active' : ''}`}
            onClick={() => setActiveTab('versions')}
          >
            <History size={16} /> Version Snapshots ({paper.versionHistory?.length || 0})
          </button>
          <button
            type="button"
            className={`qp-modal-tab ${activeTab === 'audit_trail' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit_trail')}
          >
            <ShieldCheck size={16} /> Audit Trail ({paper.auditTrail?.length || 0})
          </button>
        </div>

        <div className="qp-modal-body">
          {activeTab === 'versions' && (
            <div className="qp-version-grid">
              {/* Snapshot selector list */}
              <div className="qp-version-list-pane">
                <div className="qp-version-list-header">Snapshots</div>
                {(!paper.versionHistory || paper.versionHistory.length === 0) ? (
                  <div className="qp-empty-message">No historical version snapshots recorded yet.</div>
                ) : (
                  paper.versionHistory.map((snap) => (
                    <div
                      key={snap.versionNumber}
                      className={`qp-version-item-card ${
                        selectedSnapshot?.versionNumber === snap.versionNumber ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedSnapshot(snap)}
                    >
                      <div className="qp-version-item-top">
                        <span className="qp-version-badge">Version {snap.versionNumber}</span>
                        <span className={`badge badge-sm badge-${snap.statusAtSnapshot === 'finalized' ? 'success' : snap.statusAtSnapshot === 'approved' ? 'info' : 'warning'}`}>
                          {snap.statusAtSnapshot.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="qp-version-item-meta">
                        Saved by: <strong>{snap.savedByUserName}</strong>
                      </div>
                      <div className="qp-version-item-time">
                        <Clock size={12} /> {new Date(snap.savedAt).toLocaleString()}
                      </div>
                      {snap.changeSummary && (
                        <div className="qp-version-summary-snippet">"{snap.changeSummary}"</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Selected Snapshot Inspector */}
              <div className="qp-version-detail-pane">
                {selectedSnapshot ? (
                  <div className="qp-snapshot-inspector">
                    <div className="qp-inspector-header">
                      <div>
                        <h4>Snapshot v{selectedSnapshot.versionNumber} Inspection</h4>
                        <span className="text-muted">
                          Saved {new Date(selectedSnapshot.savedAt).toLocaleString()} by {selectedSnapshot.savedByUserName}
                        </span>
                      </div>
                      <span className="badge badge-neutral">Method: {selectedSnapshot.preparationMethod}</span>
                    </div>

                    <div className="qp-inspector-stats">
                      <div className="qp-stat-box">
                        <span className="qp-stat-label">Maximum Marks</span>
                        <span className="qp-stat-val">{selectedSnapshot.maxMarks}</span>
                      </div>
                      <div className="qp-stat-box">
                        <span className="qp-stat-label">Duration</span>
                        <span className="qp-stat-val">{selectedSnapshot.durationMinutes} min</span>
                      </div>
                      <div className="qp-stat-box">
                        <span className="qp-stat-label">Status at Snapshot</span>
                        <span className="qp-stat-val text-capitalize">{selectedSnapshot.statusAtSnapshot}</span>
                      </div>
                    </div>

                    {selectedSnapshot.changeSummary && (
                      <div className="qp-snapshot-note">
                        <strong>Change Summary:</strong> {selectedSnapshot.changeSummary}
                      </div>
                    )}

                    {/* Snapshot Content details */}
                    {selectedSnapshot.erpContent && (
                      <div className="qp-snapshot-sections-view">
                        <h5>Examination Sections ({selectedSnapshot.erpContent.sections.length})</h5>
                        {selectedSnapshot.erpContent.sections.map((sec) => (
                          <div key={sec.id} className="qp-snapshot-sec-item">
                            <div className="qp-snapshot-sec-title">
                              <strong>{sec.sectionTitle}</strong> ({sec.questions.length} Questions)
                            </div>
                            <ol className="qp-snapshot-q-list">
                              {sec.questions.map((q) => (
                                <li key={q.id}>
                                  Q{q.questionNumber}: {q.questionText || '<em>[Empty text]</em>'} — <strong>[{q.marks} Marks]</strong>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedSnapshot.pdfAttachment && (
                      <div className="qp-snapshot-file-view">
                        <FileText size={24} className="text-primary" />
                        <div>
                          <strong>{selectedSnapshot.pdfAttachment.fileName}</strong>
                          <div>Size: {(selectedSnapshot.pdfAttachment.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                      </div>
                    )}

                    {selectedSnapshot.imagePages && (
                      <div className="qp-snapshot-images-view">
                        <strong>Scanned Pages ({selectedSnapshot.imagePages.length} Pages)</strong>
                        <div className="qp-snapshot-thumbs">
                          {selectedSnapshot.imagePages.map((p) => (
                            <img
                              key={p.id}
                              src={p.dataUrl}
                              alt={`Page ${p.pageNumber}`}
                              className="qp-snapshot-thumb"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="qp-empty-message">Select a version snapshot to view its recorded contents.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit_trail' && (
            <div className="qp-audit-timeline">
              {(!paper.auditTrail || paper.auditTrail.length === 0) ? (
                <div className="qp-empty-message">No audit log entries recorded.</div>
              ) : (
                paper.auditTrail.map((ev) => (
                  <div key={ev.id} className="qp-audit-entry">
                    <div className="qp-audit-marker"></div>
                    <div className="qp-audit-content">
                      <div className="qp-audit-top">
                        <span className="qp-audit-action-badge">{ev.action.replace(/_/g, ' ').toUpperCase()}</span>
                        <span className="qp-audit-version">v{ev.versionNumber}</span>
                        <span className="qp-audit-time">{new Date(ev.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="qp-audit-actor">
                        By: <strong>{ev.actorName}</strong> ({ev.actorRole})
                      </div>
                      <div className="qp-audit-details">{ev.details}</div>
                      {ev.reason && (
                        <div className="qp-audit-reason">
                          <em>Mandatory Justification:</em> "{ev.reason}"
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="qp-modal-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

