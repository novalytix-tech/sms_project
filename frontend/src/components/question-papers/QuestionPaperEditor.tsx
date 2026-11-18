// ==========================================
// Question Paper In-App ERP Editor
// Developed by NTS Novalytix
// Comprehensive Sections, Questions & Mark Balancing
// ==========================================

import React, { useState, useMemo } from 'react';
import { QuestionPaper, ERPQuestionPaperContent, QuestionPaperSection, QuestionPaperItem, QuestionType } from '../../types/questionPaper';
import { calculateErpTotalMarks } from '../../services/questionPaperService';
import { Plus, Trash2, AlertTriangle, CheckCircle, ListPlus, MessageSquare } from 'lucide-react';

interface QuestionPaperEditorProps {
  paper: QuestionPaper;
  isPrincipalReview?: boolean;
  onSave: (updated: Partial<QuestionPaper>) => void;
  onSubmitForReview?: (updated: Partial<QuestionPaper>) => void;
  onCancel: () => void;
}

export const QuestionPaperEditor: React.FC<QuestionPaperEditorProps> = ({
  paper,
  isPrincipalReview = false,
  onSave,
  onSubmitForReview,
  onCancel,
}) => {
  // Local state for basic fields
  const [title, setTitle] = useState(paper.title || '');
  const [paperCode, setPaperCode] = useState(paper.paperCode || '');
  const [subject, setSubject] = useState(paper.subject || '');
  const [className, setClassName] = useState(paper.className || '');
  const [sectionName, setSectionName] = useState(paper.section || 'A');
  const [durationMinutes, setDurationMinutes] = useState(paper.durationMinutes || 180);
  const [maxMarks, setMaxMarks] = useState(paper.maxMarks || 80);

  // Content state
  const [generalInstructions, setGeneralInstructions] = useState<string[]>(
    paper.erpContent?.generalInstructions || [
      'All questions are compulsory.',
      'Read questions carefully before attempting.',
    ]
  );
  const [syllabusTopics, setSyllabusTopics] = useState(paper.erpContent?.syllabusTopics || '');

  const [sections, setSections] = useState<QuestionPaperSection[]>(() => {
    if (paper.erpContent?.sections && paper.erpContent.sections.length > 0) {
      return JSON.parse(JSON.stringify(paper.erpContent.sections));
    }
    // Default initial section
    return [
      {
        id: `sec-${Date.now()}-1`,
        sectionTitle: 'SECTION A — Objective Type Questions',
        instructions: 'Questions 1 to 5 carry 1 mark each.',
        questions: [
          {
            id: `q-${Date.now()}-1`,
            questionNumber: 1,
            questionType: 'mcq',
            questionText: '',
            marks: 1,
            options: [
              { key: 'A', text: '' },
              { key: 'B', text: '' },
              { key: 'C', text: '' },
              { key: 'D', text: '' },
            ],
            correctAnswer: 'A',
          },
        ],
      },
    ];
  });

  // Calculate total marks across all questions
  const totalCalculatedMarks = useMemo(() => {
    return calculateErpTotalMarks({ generalInstructions, syllabusTopics, sections });
  }, [generalInstructions, syllabusTopics, sections]);

  const marksMatch = totalCalculatedMarks === maxMarks;

  // Instruction handlers
  const handleAddInstruction = () => {
    setGeneralInstructions([...generalInstructions, '']);
  };

  const handleUpdateInstruction = (index: number, val: string) => {
    const updated = [...generalInstructions];
    updated[index] = val;
    setGeneralInstructions(updated);
  };

  const handleRemoveInstruction = (index: number) => {
    setGeneralInstructions(generalInstructions.filter((_, idx) => idx !== index));
  };

  // Section handlers
  const handleAddSection = () => {
    const newSection: QuestionPaperSection = {
      id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sectionTitle: `SECTION ${String.fromCharCode(65 + sections.length)}`,
      instructions: '',
      questions: [],
    };
    setSections([...sections, newSection]);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (sections.length <= 1) {
      alert('A question paper must have at least one section.');
      return;
    }
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const handleUpdateSectionTitle = (sectionId: string, titleVal: string) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, sectionTitle: titleVal } : s)));
  };

  const handleUpdateSectionInstructions = (sectionId: string, instVal: string) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, instructions: instVal } : s)));
  };

  // Question numbering recount helper
  const renumberQuestions = (secs: QuestionPaperSection[]): QuestionPaperSection[] => {
    let count = 1;
    return secs.map((s) => ({
      ...s,
      questions: s.questions.map((q) => ({
        ...q,
        questionNumber: count++,
      })),
    }));
  };

  // Question handlers
  const handleAddQuestion = (sectionId: string, type: QuestionType = 'short_answer') => {
    const defaultMarks = type === 'mcq' ? 1 : type === 'short_answer' ? 2 : type === 'long_answer' ? 5 : 4;
    const newQ: QuestionPaperItem = {
      id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      questionNumber: 1,
      questionType: type,
      questionText: '',
      marks: defaultMarks,
      options:
        type === 'mcq'
          ? [
              { key: 'A', text: '' },
              { key: 'B', text: '' },
              { key: 'C', text: '' },
              { key: 'D', text: '' },
            ]
          : undefined,
      correctAnswer: type === 'mcq' ? 'A' : undefined,
    };

    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, questions: [...s.questions, newQ] };
      }
      return s;
    });

    setSections(renumberQuestions(updated));
  };

  const handleRemoveQuestion = (sectionId: string, questionId: string) => {
    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, questions: s.questions.filter((q) => q.id !== questionId) };
      }
      return s;
    });
    setSections(renumberQuestions(updated));
  };

  const handleUpdateQuestion = (sectionId: string, questionId: string, updates: Partial<QuestionPaperItem>) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: s.questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)),
          };
        }
        return s;
      })
    );
  };

  const handleUpdateOption = (
    sectionId: string,
    questionId: string,
    optKey: 'A' | 'B' | 'C' | 'D',
    text: string
  ) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: s.questions.map((q) => {
              if (q.id === questionId && q.options) {
                return {
                  ...q,
                  options: q.options.map((opt) => (opt.key === optKey ? { ...opt, text } : opt)),
                };
              }
              return q;
            }),
          };
        }
        return s;
      })
    );
  };

  const buildPayload = (): Partial<QuestionPaper> => {
    const erpContent: ERPQuestionPaperContent = {
      generalInstructions: generalInstructions.filter((i) => i.trim().length > 0),
      syllabusTopics,
      sections,
    };

    return {
      title,
      paperCode,
      subject,
      className,
      section: sectionName,
      durationMinutes: Number(durationMinutes),
      maxMarks: Number(maxMarks),
      erpContent,
    };
  };

  const handleSaveDraft = () => {
    onSave(buildPayload());
  };

  const handleSubmit = () => {
    if (onSubmitForReview) {
      onSubmitForReview(buildPayload());
    }
  };

  return (
    <div className="qp-editor-container">
      {/* Top Bar with Marks Status */}
      <div className="qp-editor-sticky-header">
        <div className="qp-editor-title-row">
          <div>
            <h2 className="qp-editor-page-heading">
              {isPrincipalReview ? 'Principal Direct Edit / Correction' : 'Examination Question Paper In-App Editor'}
            </h2>
            <div className="qp-editor-meta-sub">
              Code: <strong>{paperCode || 'UNASSIGNED'}</strong> • Subject: <strong>{subject || 'General'}</strong> •
              Author: <strong>{paper.teacherName}</strong>
            </div>
          </div>

          <div className="qp-editor-header-actions">
            {/* Live Marks Balance Pill */}
            <div className={`qp-marks-pill ${marksMatch ? 'qp-marks-matched' : 'qp-marks-mismatched'}`}>
              {marksMatch ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>
                Total Marks: <strong>{totalCalculatedMarks}</strong> / {maxMarks}
              </span>
              {!marksMatch && (
                <span className="qp-marks-diff">
                  ({totalCalculatedMarks > maxMarks ? `+${totalCalculatedMarks - maxMarks}` : totalCalculatedMarks - maxMarks})
                </span>
              )}
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveDraft}>
              {isPrincipalReview ? 'Save Corrections' : 'Save Draft'}
            </button>
            {!isPrincipalReview && onSubmitForReview && (
              <button
                type="button"
                className="btn btn-accent btn-sm"
                onClick={handleSubmit}
                disabled={!marksMatch}
                title={!marksMatch ? 'Total question marks must equal Max Marks before submission' : undefined}
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
              placeholder="e.g. Class 10 Mathematics Mid-Term Summative Paper"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Paper Code *</label>
            <input
              type="text"
              className="form-control"
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
              placeholder="e.g. QP-2026-X-MATH-01"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              type="text"
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
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

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label className="form-label">Syllabus / Prescribed Chapters</label>
          <input
            type="text"
            className="form-control"
            value={syllabusTopics}
            onChange={(e) => setSyllabusTopics(e.target.value)}
            placeholder="e.g. Real Numbers, Polynomials, Linear Equations, Quadratic Equations"
          />
        </div>
      </div>

      {/* General Instructions Builder */}
      <div className="card qp-editor-card">
        <div className="qp-card-header-flex">
          <h3 className="qp-card-title">General Examination Instructions</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddInstruction}>
            <Plus size={14} /> Add Instruction
          </button>
        </div>

        <div className="qp-instructions-editor-list">
          {generalInstructions.map((inst, idx) => (
            <div key={idx} className="qp-instruction-edit-row">
              <span className="qp-instruction-index">{idx + 1}.</span>
              <input
                type="text"
                className="form-control"
                value={inst}
                onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                placeholder="e.g. Section A carries 20 marks."
              />
              <button
                type="button"
                className="btn btn-icon btn-sm"
                title="Remove instruction"
                onClick={() => handleRemoveInstruction(idx)}
              >
                <Trash2 size={15} className="text-danger" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sections and Questions Builder */}
      <div className="qp-sections-wrapper">
        {sections.map((section, sIdx) => {
          const sectionMarks = section.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
          return (
            <div key={section.id} className="card qp-section-card">
              <div className="qp-section-card-header">
                <div className="qp-section-title-inputs">
                  <input
                    type="text"
                    className="form-control qp-section-title-input"
                    value={section.sectionTitle}
                    onChange={(e) => handleUpdateSectionTitle(section.id, e.target.value)}
                    placeholder="e.g. SECTION A — Objective Type Questions"
                  />
                  <input
                    type="text"
                    className="form-control qp-section-inst-input"
                    value={section.instructions || ''}
                    onChange={(e) => handleUpdateSectionInstructions(section.id, e.target.value)}
                    placeholder="Instructions for this section (e.g. Questions 1 to 10 carry 1 mark each)"
                  />
                </div>

                <div className="qp-section-meta-actions">
                  <span className="qp-section-marks-badge">{sectionMarks} Marks</span>
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    title="Delete Section"
                    onClick={() => handleRemoveSection(section.id)}
                  >
                    <Trash2 size={16} className="text-danger" />
                  </button>
                </div>
              </div>

              {/* Questions in Section */}
              <div className="qp-questions-editor-list">
                {section.questions.map((q) => {
                  const questionPrincipalComment = paper.questionComments?.[q.id];

                  return (
                    <div key={q.id} className="qp-question-edit-box">
                      {/* Principal Specific Comment Notice */}
                      {questionPrincipalComment && (
                        <div className="qp-question-feedback-box">
                          <MessageSquare size={14} />
                          <span>
                            <strong>Principal Revision Request:</strong> {questionPrincipalComment}
                          </span>
                        </div>
                      )}

                      <div className="qp-q-edit-top-row">
                        <span className="qp-q-number-pill">Q{q.questionNumber}</span>

                        <div className="qp-q-type-select">
                          <label className="qp-inline-label">Type:</label>
                          <select
                            className="form-control form-control-sm"
                            value={q.questionType}
                            onChange={(e) =>
                              handleUpdateQuestion(section.id, q.id, {
                                questionType: e.target.value as QuestionType,
                                options:
                                  e.target.value === 'mcq'
                                    ? [
                                        { key: 'A', text: '' },
                                        { key: 'B', text: '' },
                                        { key: 'C', text: '' },
                                        { key: 'D', text: '' },
                                      ]
                                    : undefined,
                              })
                            }
                          >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="long_answer">Long Answer</option>
                            <option value="numerical">Numerical / Problem</option>
                            <option value="case_based">Case-Based / Multi-part</option>
                          </select>
                        </div>

                        <div className="qp-q-marks-input">
                          <label className="qp-inline-label">Marks:</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: '64px' }}
                            value={q.marks}
                            onChange={(e) =>
                              handleUpdateQuestion(section.id, q.id, {
                                marks: Number(e.target.value),
                              })
                            }
                            min={1}
                            max={20}
                          />
                        </div>

                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          title="Delete question"
                          onClick={() => handleRemoveQuestion(section.id, q.id)}
                        >
                          <Trash2 size={15} className="text-danger" />
                        </button>
                      </div>

                      {/* Question Text Editor */}
                      <div className="qp-q-textarea-wrapper">
                        <textarea
                          className="form-control"
                          rows={2}
                          value={q.questionText}
                          onChange={(e) =>
                            handleUpdateQuestion(section.id, q.id, {
                              questionText: e.target.value,
                            })
                          }
                          placeholder="Type examination question text here..."
                        />
                      </div>

                      {/* MCQ Options Editor */}
                      {q.questionType === 'mcq' && q.options && (
                        <div className="qp-mcq-options-editor">
                          <div className="qp-options-grid">
                            {q.options.map((opt) => (
                              <div key={opt.key} className="qp-option-input-group">
                                <span className="qp-option-letter-badge">({opt.key})</span>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={opt.text}
                                  onChange={(e) =>
                                    handleUpdateOption(section.id, q.id, opt.key, e.target.value)
                                  }
                                  placeholder={`Option ${opt.key}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="qp-correct-answer-picker">
                            <label className="qp-inline-label">Correct Key (Internal Guide):</label>
                            <select
                              className="form-control form-control-sm"
                              style={{ width: '80px' }}
                              value={q.correctAnswer || 'A'}
                              onChange={(e) =>
                                handleUpdateQuestion(section.id, q.id, {
                                  correctAnswer: e.target.value,
                                })
                              }
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Internal Choice Toggle */}
                      <div className="qp-choice-toggle-row">
                        <label className="qp-checkbox-label">
                          <input
                            type="checkbox"
                            checked={Boolean(q.hasInternalChoice)}
                            onChange={(e) =>
                              handleUpdateQuestion(section.id, q.id, {
                                hasInternalChoice: e.target.checked,
                                orQuestionText: e.target.checked ? q.orQuestionText || '' : undefined,
                              })
                            }
                          />
                          Provide internal alternative choice ("OR" option)
                        </label>
                      </div>

                      {q.hasInternalChoice && (
                        <div className="qp-or-edit-box">
                          <span className="qp-or-badge">— OR —</span>
                          <textarea
                            className="form-control"
                            rows={2}
                            value={q.orQuestionText || ''}
                            onChange={(e) =>
                              handleUpdateQuestion(section.id, q.id, {
                                orQuestionText: e.target.value,
                              })
                            }
                            placeholder="Type alternative question text..."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Question Button in Section */}
                <div className="qp-add-q-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddQuestion(section.id, 'short_answer')}
                  >
                    <Plus size={14} /> Add Question
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleAddQuestion(section.id, 'mcq')}
                  >
                    <Plus size={14} /> Add MCQ
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleAddQuestion(section.id, 'long_answer')}
                  >
                    <Plus size={14} /> Add Long Question
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Section Button */}
        <div className="qp-add-section-row">
          <button type="button" className="btn btn-secondary" onClick={handleAddSection}>
            <ListPlus size={16} /> Add Examination Section
          </button>
        </div>
      </div>
    </div>
  );
};

