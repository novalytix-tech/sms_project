import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AdmissionApplication } from '../../../types';
import { admissionService } from '../../../services/admissionService';
import { todayISO } from '../../../utils/date';

interface RecordAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AdmissionApplication | null;
  onSuccess: () => void;
}

export const RecordAssessmentModal: React.FC<RecordAssessmentModalProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const [assessmentType, setAssessmentType] = useState<'Written Test' | 'Oral Interview' | 'Interaction / Observation' | 'Parent Interview' | 'Exempted'>('Written Test');
  const [date, setDate] = useState(todayISO());
  const [subject, setSubject] = useState('Mathematics, Science & English');
  const [marks, setMarks] = useState(82);
  const [maxMarks, setMaxMarks] = useState(100);
  const [result, setResult] = useState<'Passed' | 'Shortlisted' | 'Needs Further Review' | 'Exempted' | 'Failed'>('Passed');
  const [evaluator, setEvaluator] = useState('Mrs. Ananya Sharma (Academic Coordinator)');
  const [remarks, setRemarks] = useState('Candidate demonstrated strong conceptual clarity and arithmetic competency.');

  if (!application) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    admissionService.recordAssessment({
      applicationId: application.id,
      candidateName: `${application.firstName} ${application.lastName}`,
      targetClass: application.targetClassName,
      assessmentRequired: assessmentType !== 'Exempted',
      assessmentType,
      assessmentDate: date,
      subjectOrCategory: subject,
      marksObtained: Number(marks),
      maxMarks: Number(maxMarks),
      result,
      evaluatorTeacher: evaluator,
      interactionRemarks: remarks,
      status: 'Completed',
    });

    onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Assessment: ${application.firstName} ${application.lastName}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: '#F6F8FC',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '13px',
        }}>
          Applicant: <strong>{application.firstName} {application.lastName}</strong> • Ref: <code>{application.applicationNo}</code> • Target: <strong>{application.targetClassName}</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Assessment Procedure Type</label>
            <select
              className="form-select"
              value={assessmentType}
              onChange={e => setAssessmentType(e.target.value as any)}
            >
              <option value="Written Test">Written Entrance Examination</option>
              <option value="Oral Interview">Oral Interview & Viva</option>
              <option value="Interaction / Observation">Pre-Primary Interaction / Observation</option>
              <option value="Parent Interview">Parent-Faculty Interactive Session</option>
              <option value="Exempted">Exempted (Direct Transfer / Policy)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Evaluation Date</label>
            <input
              type="date"
              className="form-input"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subject / Assessment Scope</label>
            <input
              type="text"
              className="form-input"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Teacher / Evaluator</label>
            <input
              type="text"
              className="form-input"
              required
              value={evaluator}
              onChange={e => setEvaluator(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Marks Obtained</label>
            <input
              type="number"
              className="form-input"
              min={0}
              max={maxMarks}
              value={marks}
              onChange={e => setMarks(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Maximum Marks</label>
            <input
              type="number"
              className="form-input"
              min={1}
              value={maxMarks}
              onChange={e => setMaxMarks(Number(e.target.value))}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Assessment Recommendation / Result *</label>
            <select
              className="form-select"
              value={result}
              onChange={e => setResult(e.target.value as any)}
            >
              <option value="Passed">Passed (Recommended for Direct Admission)</option>
              <option value="Shortlisted">Shortlisted for Merit Consideration</option>
              <option value="Needs Further Review">Needs Further Academic Review / Retest</option>
              <option value="Exempted">Exempted / Cleared via Transfer Criteria</option>
              <option value="Failed">Failed (Does Not Meet Minimum Academic Threshold)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Interaction Remarks & Qualitative Feedback</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Evaluator remarks on language fluency, mathematical reasoning, social interaction..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Record Assessment Outcome
          </button>
        </div>
      </form>
    </Modal>
  );
};

