// ==========================================
// Configurable Examination Grading Engine Manager
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { GradingScheme, GradeRule } from '../../types';
import { gradingService, GRADING_SCHEME_TEMPLATES } from '../../services/gradingService';
import { classService } from '../../services/classService';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

import { Plus, Edit, Trash2, Sparkles, Check, Calculator } from 'lucide-react';

export const GradingSchemeManager: React.FC = () => {
  const { schoolSettings, addToast } = useERP();
  const classes = useMemo(() => classService.getAll(), []);

  const [schemes, setSchemes] = useState<GradingScheme[]>(() => gradingService.getAll());
  const [editingScheme, setEditingScheme] = useState<GradingScheme | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GradingScheme | null>(null);

  // Scheme Form State
  const [formState, setFormState] = useState<{
    id?: string;
    name: string;
    description: string;
    academicYear: string;
    classScopeMode: 'all' | 'custom';
    selectedClasses: string[];
    passPercentage: number;
    isDefault: boolean;
    rules: GradeRule[];
  }>({
    name: '',
    description: '',
    academicYear: schoolSettings.academicYear || '2026-2027',
    classScopeMode: 'all',
    selectedClasses: [],
    passPercentage: 33,
    isDefault: false,
    rules: [],
  });
  const [validationError, setValidationError] = useState('');

  // Interactive Test Simulator State
  const [simSchemeId, setSimSchemeId] = useState<string>('');
  const [simScore, setSimScore] = useState<string>('72.5');
  const [simMaxMarks, setSimMaxMarks] = useState<string>('80');
  const [simAbsent, setSimAbsent] = useState<boolean>(false);

  const refreshList = () => {
    setSchemes([...gradingService.getAll()]);
  };

  useEffect(() => {
    if (schemes.length > 0 && !simSchemeId) {
      setSimSchemeId(schemes[0].id);
    }
  }, [schemes, simSchemeId]);

  const activeSimScheme = useMemo(() => {
    return schemes.find(s => s.id === simSchemeId) || schemes[0];
  }, [schemes, simSchemeId]);

  const simResult = useMemo(() => {
    if (!activeSimScheme) return null;
    const scoreNum = parseFloat(simScore);
    const maxNum = parseFloat(simMaxMarks) || 80;
    return gradingService.calculateSubjectGrade(
      isNaN(scoreNum) ? undefined : scoreNum,
      maxNum,
      simAbsent,
      activeSimScheme
    );
  }, [activeSimScheme, simScore, simMaxMarks, simAbsent]);

  // Open Add Scheme Modal with default or blank template
  const handleOpenAdd = (templateIdx?: number) => {
    const template = templateIdx !== undefined ? GRADING_SCHEME_TEMPLATES[templateIdx] : GRADING_SCHEME_TEMPLATES[0];

    setEditingScheme(null);
    setValidationError('');
    setFormState({
      name: templateIdx !== undefined ? template.name : 'Custom School Grading Scheme',
      description: template.description,
      academicYear: schoolSettings.academicYear || '2026-2027',
      classScopeMode: 'all',
      selectedClasses: [],
      passPercentage: template.passPercentage,
      isDefault: schemes.length === 0,
      rules: JSON.parse(JSON.stringify(template.rules)),
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: GradingScheme) => {
    setEditingScheme(s);
    setValidationError('');
    setFormState({
      id: s.id,
      name: s.name,
      description: s.description,
      academicYear: s.academicYear,
      classScopeMode: s.classScope === 'all' ? 'all' : 'custom',
      selectedClasses: Array.isArray(s.classScope) ? s.classScope : [],
      passPercentage: s.passPercentage,
      isDefault: !!s.isDefault,
      rules: JSON.parse(JSON.stringify(s.rules)),
    });
    setIsFormOpen(true);
  };

  // Rule Rows Manipulation
  const handleAddRuleRow = () => {
    setFormState(prev => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          grade: 'New',
          minPercentage: 0,
          maxPercentage: 0,
          gradePoint: 0,
          description: 'Qualitative remark',
          isPassing: true,
        },
      ],
    }));
  };

  const handleRemoveRuleRow = (index: number) => {
    if (formState.rules.length <= 1) {
      setValidationError('At least one grade threshold must exist.');
      return;
    }
    setFormState(prev => ({
      ...prev,
      rules: prev.rules.filter((_, idx) => idx !== index),
    }));
  };

  const handleRuleChange = (index: number, field: keyof GradeRule, val: any) => {
    setFormState(prev => {
      const nextRules = [...prev.rules];
      nextRules[index] = {
        ...nextRules[index],
        [field]: val,
      };
      return { ...prev, rules: nextRules };
    });
  };

  // Save Scheme Handler
  const handleSaveScheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      setValidationError('Please enter a scheme name.');
      return;
    }

    const val = gradingService.validateRules(formState.rules);
    if (!val.isValid) {
      setValidationError(val.error || 'Invalid grading rules.');
      return;
    }

    const payload = {
      id: formState.id,
      name: formState.name.trim(),
      description: formState.description.trim(),
      academicYear: formState.academicYear,
      classScope: formState.classScopeMode === 'all' ? ('all' as const) : formState.selectedClasses,
      examTypeScope: 'all' as const,
      passPercentage: Number(formState.passPercentage),
      isDefault: formState.isDefault,
      rules: formState.rules,
    };

    const res = gradingService.saveScheme(payload);
    if (res.success) {
      addToast('success', 'Grading Scheme Saved', `Scheme "${formState.name}" is now active in the grading engine.`);
      setIsFormOpen(false);
      refreshList();
    } else {
      setValidationError(res.error || 'Failed to save scheme.');
    }
  };

  // Delete Scheme Handler
  const handleDeleteScheme = () => {
    if (!deleteTarget) return;
    const res = gradingService.deleteScheme(deleteTarget.id);
    if (res.success) {
      addToast('warning', 'Scheme Removed', `Grading scheme "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      refreshList();
    } else {
      addToast('error', 'Delete Restricted', res.error || 'Could not delete scheme.');
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Header and Template Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#19191f', margin: 0 }}>
            Configurable Grading Engine & Schemes
          </h2>
          <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
            Board-aligned qualitative standards, minimum pass thresholds, grade points, and percentage intervals
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenAdd(0)}
            title="Load standard CBSE Board 9-point secondary scale"
          >
            <Sparkles size={14} color="#3B82F6" />
            <span>Load CBSE 9-Point</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenAdd(1)}
            title="Load higher secondary division-based scale"
          >
            <Sparkles size={14} color="#3B82F6" />
            <span>Load Senior Sec 5-Point</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenAdd()}
          >
            <Plus size={14} />
            <span>New Custom Scheme</span>
          </button>
        </div>
      </div>

      {/* Schemes Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {schemes.map(sch => {
          const sortedRules = [...sch.rules].sort((a, b) => b.minPercentage - a.minPercentage);

          return (
            <div key={sch.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#19191f' }}>{sch.name}</h3>
                    {sch.isDefault && <span className="badge badge-success">Default Engine</span>}
                  </div>
                  <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0 0 0' }}>{sch.description}</p>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => handleOpenEdit(sch)}
                    title="Edit Scheme Parameters"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => setDeleteTarget(sch)}
                    title="Delete Scheme"
                    disabled={sch.isDefault && schemes.length > 1}
                  >
                    <Trash2 size={13} color="#dc2626" />
                  </button>
                </div>
              </div>

              <div className="card-body" style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#625459', flexWrap: 'wrap' }}>
                  <div>
                    <strong>Class Scope:</strong>{' '}
                    {sch.classScope === 'all'
                      ? 'Campus-Wide (All Classes)'
                      : `${sch.classScope.length} Specific Classes`}
                  </div>
                  <div>
                    <strong>Min Pass Threshold:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{sch.passPercentage}%</span>
                  </div>
                </div>

                {/* Rules Threshold Badges */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#958483', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Threshold Intervals & Points:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sortedRules.map((r, rIdx) => (
                      <span
                        key={rIdx}
                        className="badge"
                        style={{
                          background: r.isPassing ? '#DBEAFE' : '#fee2e2',
                          color: r.isPassing ? '#1D4ED8' : '#991b1b',
                          border: '1px solid #E2E8F0',
                          padding: '4px 8px',
                          fontSize: '11px',
                        }}
                        title={`${r.description} • ${r.isPassing ? 'Passing' : 'Failing'}`}
                      >
                        <strong>{r.grade}</strong>: {r.minPercentage}–{r.maxPercentage}%
                        {r.gradePoint !== undefined ? ` (${r.gradePoint} GP)` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Grade Engine Simulator Card */}
      <div className="card" style={{ border: '1px solid #E2E8F0', background: '#fffaf9' }}>
        <div className="card-header" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={18} color="#3B82F6" />
            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#19191f' }}>
              Live Grading Engine Test Simulator
            </h3>
          </div>
          <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0 0 0' }}>
            Verify how raw examination scores, decimal marks, and absent records are evaluated by the configured schemes
          </p>
        </div>

        <div className="card-body" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Active Scheme</label>
              <select
                className="form-select"
                style={{ width: '220px' }}
                value={simSchemeId}
                onChange={e => setSimSchemeId(e.target.value)}
              >
                {schemes.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Raw Score (Allows Decimals)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                style={{ width: '120px' }}
                value={simScore}
                onChange={e => setSimScore(e.target.value)}
                disabled={simAbsent}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Max Total Marks</label>
              <input
                type="number"
                className="form-input"
                style={{ width: '100px' }}
                value={simMaxMarks}
                onChange={e => setSimMaxMarks(e.target.value)}
                disabled={simAbsent}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}>
              <input
                type="checkbox"
                id="simAbsentToggle"
                checked={simAbsent}
                onChange={e => setSimAbsent(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="simAbsentToggle" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                Simulate Absent (AB)
              </label>
            </div>
          </div>

          {/* Simulator Output Preview */}
          {simResult && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                gap: '24px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#958483', textTransform: 'uppercase', fontWeight: 700 }}>
                  Derived Grade
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#3B82F6' }}>
                  {simResult.grade}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#958483', textTransform: 'uppercase', fontWeight: 700 }}>
                  Calculated Percentage
                </span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#19191f' }}>
                  {simResult.percentage !== null ? `${simResult.percentage}%` : 'N/A (Absent)'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#958483', textTransform: 'uppercase', fontWeight: 700 }}>
                  Grade Point
                </span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#19191f' }}>
                  {simResult.gradePoint !== undefined ? `${simResult.gradePoint} / 10.0` : '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#958483', textTransform: 'uppercase', fontWeight: 700 }}>
                  Result Status
                </span>
                <div>
                  <span
                    className={`badge ${
                      simResult.resultStatus === 'Pass'
                        ? 'badge-success'
                        : simResult.resultStatus === 'Absent'
                        ? 'badge-danger'
                        : 'badge-warning'
                    }`}
                  >
                    {simResult.resultStatus}
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '180px' }}>
                <span style={{ fontSize: '11px', color: '#958483', textTransform: 'uppercase', fontWeight: 700 }}>
                  Qualitative Descriptor
                </span>
                <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                  "{simResult.remarks}"
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT GRADING SCHEME
          ======================================================== */}
      {isFormOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsFormOpen(false)}
          title={editingScheme ? `Edit Scheme: ${editingScheme.name}` : 'Configure New Grading Scheme'}
          size="large"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveScheme}>
                Save Grading Scheme
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveScheme}>
            {validationError && (
              <div
                style={{
                  background: '#DBEAFE',
                  border: '1px solid #fecaca',
                  color: '#a51d29',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                {validationError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label required">Scheme Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. CBSE 9-Point Scale (Secondary)"
                    value={formState.name}
                    onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Academic Session</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formState.academicYear}
                    onChange={e => setFormState(prev => ({ ...prev, academicYear: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Board Policy Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Applicable for Grade 9 & 10 annual evaluation..."
                  value={formState.description}
                  onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label required">Class Applicability</label>
                  <select
                    className="form-select"
                    value={formState.classScopeMode}
                    onChange={e =>
                      setFormState(prev => ({
                        ...prev,
                        classScopeMode: e.target.value as any,
                      }))
                    }
                  >
                    <option value="all">Campus-Wide (All Classes)</option>
                    <option value="custom">Specific Selected Classes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Minimum Pass Threshold (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max="100"
                    value={formState.passPercentage}
                    onChange={e => setFormState(prev => ({ ...prev, passPercentage: Number(e.target.value) }))}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formState.isDefault}
                      onChange={e => setFormState(prev => ({ ...prev, isDefault: e.target.checked }))}
                    />
                    <strong>Set as Campus Default</strong>
                  </label>
                </div>
              </div>

              {formState.classScopeMode === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Select Classes Covered by this Scheme</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {classes.map(c => {
                      const isSelected = formState.selectedClasses.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => {
                            setFormState(prev => ({
                              ...prev,
                              selectedClasses: isSelected
                                ? prev.selectedClasses.filter(id => id !== c.id)
                                : [...prev.selectedClasses, c.id],
                            }));
                          }}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Threshold Rules Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label required" style={{ margin: 0 }}>
                    Grade Intervals & Thresholds
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddRuleRow}
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    <Plus size={12} />
                    <span>Add Interval</span>
                  </button>
                </div>

                <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Grade</th>
                        <th style={{ width: '80px' }}>Min %</th>
                        <th style={{ width: '80px' }}>Max %</th>
                        <th style={{ width: '80px' }}>Grade Point</th>
                        <th>Descriptor / Remarks</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Pass?</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formState.rules.map((rule, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: '4px 6px', fontSize: '12px', fontWeight: 700 }}
                              value={rule.grade}
                              onChange={e => handleRuleChange(idx, 'grade', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: '4px 6px', fontSize: '12px' }}
                              value={rule.minPercentage}
                              onChange={e => handleRuleChange(idx, 'minPercentage', Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: '4px 6px', fontSize: '12px' }}
                              value={rule.maxPercentage}
                              onChange={e => handleRuleChange(idx, 'maxPercentage', Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              className="form-input"
                              style={{ padding: '4px 6px', fontSize: '12px' }}
                              value={rule.gradePoint || 0}
                              onChange={e => handleRuleChange(idx, 'gradePoint', Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: '4px 6px', fontSize: '12px' }}
                              value={rule.description}
                              onChange={e => handleRuleChange(idx, 'description', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={rule.isPassing}
                              onChange={e => handleRuleChange(idx, 'isPassing', e.target.checked)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon-only"
                              style={{ padding: '4px' }}
                              onClick={() => handleRemoveRuleRow(idx)}
                              title="Delete Rule"
                            >
                              <Trash2 size={12} color="#dc2626" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete Scheme: ${deleteTarget.name}`}
          message={`Are you sure you want to delete "${deleteTarget.name}"? Past examination grade calculations that used this scheme will fallback to the campus default.`}
          confirmLabel="Delete Scheme"
          cancelLabel="Cancel"
          isDestructive={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteScheme}
        />
      )}
    </div>
  );
};

