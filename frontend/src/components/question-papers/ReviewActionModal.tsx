// ==========================================
// Question Paper Review Action Modal
// Developed by NTS Novalytix
// Principal Decisions: Request Changes, Approve, Reject, Finalize, Amend
// ==========================================

import React, { useState } from 'react';
import { QuestionPaper } from '../../types/questionPaper';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Edit3,
  X,
  MessageSquare,
} from 'lucide-react';

export type ReviewActionType =
  | 'request_changes'
  | 'reject'
  | 'approve'
  | 'finalize'
  | 'amend';

interface ReviewActionModalProps {
  paper: QuestionPaper;
  actionType: ReviewActionType;
  onConfirm: (data: { comment: string; questionComments?: Record<string, string> }) => void;
  onClose: () => void;
}

export const ReviewActionModal: React.FC<ReviewActionModalProps> = ({
  paper,
  actionType,
  onConfirm,
  onClose,
}) => {
  const [comment, setComment] = useState('');
  const [questionComments, setQuestionComments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const isCommentMandatory =
    actionType === 'request_changes' ||
    actionType === 'reject' ||
    actionType === 'amend';

  const getTitle = () => {
    switch (actionType) {
      case 'request_changes':
        return 'Request Changes & Revisions';
      case 'reject':
        return 'Reject Question Paper';
      case 'approve':
        return 'Approve Question Paper';
      case 'finalize':
        return 'Finalize Official Examination Paper';
      case 'amend':
        return 'Create Authorized Amendment';
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case 'request_changes':
        return <AlertTriangle size={20} className="text-warning" />;
      case 'reject':
        return <XCircle size={20} className="text-danger" />;
      case 'approve':
        return <CheckCircle size={20} className="text-success" />;
      case 'finalize':
        return <Lock size={20} className="text-primary" />;
      case 'amend':
        return <Edit3 size={20} className="text-warning" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCommentMandatory && (!comment || comment.trim().length === 0)) {
      setError('Please provide a mandatory justification / comment for this action.');
      return;
    }

    onConfirm({
      comment: comment.trim(),
      questionComments: Object.keys(questionComments).length > 0 ? questionComments : undefined,
    });
  };

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal-content qp-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qp-modal-header">
          <div className="qp-modal-title-group">
            {getIcon()}
            <div>
              <h3>{getTitle()}</h3>
              <p className="qp-modal-sub">
                Paper: <strong>{paper.paperCode}</strong> • {paper.title} (v{paper.currentVersion})
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="qp-modal-body">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}

            {actionType === 'finalize' && (
              <div className="alert alert-info" style={{ marginBottom: '14px' }}>
                <strong>Institutional Confidentiality Note:</strong> Finalizing locks this paper as the
                official examination version. Any future modifications will require an authorized amendment
                with mandatory recorded justification.
              </div>
            )}

            {actionType === 'reject' && (
              <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
                <strong>Notice:</strong> Rejecting will mark this paper as not approved. The author teacher
                will receive your recorded reason.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {actionType === 'request_changes' && 'Principal Revision Instructions *'}
                {actionType === 'reject' && 'Mandatory Rejection Reason *'}
                {actionType === 'amend' && 'Mandatory Amendment Justification *'}
                {actionType === 'approve' && 'Approval Remarks (Optional)'}
                {actionType === 'finalize' && 'Finalization Notes (Optional)'}
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionType === 'request_changes'
                    ? 'State specific revisions needed, e.g. "Adjust marks in Section B to 15, rephrase Question 3..."'
                    : actionType === 'reject'
                    ? 'State specific reasons for rejection...'
                    : actionType === 'amend'
                    ? 'State official reason for post-finalization amendment...'
                    : 'Add any remarks or guidelines...'
                }
                required={isCommentMandatory}
              />
            </div>

            {/* If Requesting Changes on an ERP paper, allow adding question-level specific feedback */}
            {actionType === 'request_changes' && paper.erpContent && (
              <div className="qp-question-specific-comments">
                <div className="qp-subheading">
                  <MessageSquare size={14} /> Optional Question-Level Notes
                </div>
                <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
                  You can specify item-level comments below:
                </p>
                <div className="qp-q-comments-list">
                  {paper.erpContent.sections.flatMap((sec) =>
                    sec.questions.map((q) => (
                      <div key={q.id} className="qp-q-comment-row">
                        <span className="qp-q-pill">Q{q.questionNumber}</span>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder={`Add specific note for Q${q.questionNumber} (optional)`}
                          value={questionComments[q.id] || ''}
                          onChange={(e) =>
                            setQuestionComments({
                              ...questionComments,
                              [q.id]: e.target.value,
                            })
                          }
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="qp-modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-sm ${
                actionType === 'reject'
                  ? 'btn-danger'
                  : actionType === 'request_changes'
                  ? 'btn-warning'
                  : 'btn-primary'
              }`}
            >
              Confirm {getTitle()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

