import React, { useState, useMemo } from 'react';
import { AdmissionApplication } from '../../../types';
import { classService } from '../../../services/classService';
import { SearchInput } from '../../../components/common/SearchInput';
import { EmptyState } from '../../../components/common/EmptyState';

import { Award, CheckCircle, Clock, RotateCcw, Edit } from 'lucide-react';

interface AssessmentTabProps {
  applications: AdmissionApplication[];
  classes: ReturnType<typeof classService.getAll>;
  onRecordAssessment: (app: AdmissionApplication) => void;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({
  applications,
  classes,
  onRecordAssessment,
}) => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        search === '' ||
        app.applicationNo.toLowerCase().includes(q) ||
        `${app.firstName} ${app.lastName}`.toLowerCase().includes(q);

      const matchClass = classFilter === 'all' || app.targetClassId === classFilter;

      const hasAssessment = Boolean(app.assessment || app.checklist?.interactionCompleted);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && hasAssessment) ||
        (statusFilter === 'pending' && !hasAssessment);

      return matchSearch && matchClass && matchStatus;
    });
  }, [applications, search, classFilter, statusFilter]);

  const completedCount = applications.filter(a => a.assessment || a.checklist?.interactionCompleted).length;
  const pendingCount = applications.length - completedCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Assessment Metrics Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="adm-kpi-card">
          <div>
            <div className="adm-kpi-label">Total Pipeline Candidates</div>
            <div className="adm-kpi-val">{applications.length}</div>
            <div className="adm-kpi-sub">Applicants requiring readiness review</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: 'var(--color-primary-light, #DBEAFE)', color: 'var(--color-primary, #3B82F6)' }}>
            <Award size={20} />
          </div>
        </div>

        <div className="adm-kpi-card">
          <div>
            <div className="adm-kpi-label">Evaluations Completed</div>
            <div className="adm-kpi-val" style={{ color: '#15803d' }}>{completedCount}</div>
            <div className="adm-kpi-sub">Assessed by academic committee</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="adm-kpi-card">
          <div>
            <div className="adm-kpi-label">Awaiting Assessment</div>
            <div className="adm-kpi-val" style={{ color: '#c2410c' }}>{pendingCount}</div>
            <div className="adm-kpi-sub">Scheduled tests & parent interviews</div>
          </div>
          <div className="adm-kpi-icon" style={{ background: '#fff7ed', color: '#c2410c' }}>
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search candidate name or reference number..."
            ariaLabel="Search applicants"
          />

          <select
            className="form-select filter-select filter-select-md"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Evaluation States</option>
            <option value="pending">Awaiting Assessment</option>
            <option value="completed">Completed Evaluations</option>
          </select>

          <select
            className="form-select filter-select filter-select-sm"
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {(search || classFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                setSearch('');
                setClassFilter('all');
                setStatusFilter('all');
              }}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Assessment Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filteredApps.length === 0 ? (
            <EmptyState
              title="No candidates found"
              description="No applicant assessment records match the active filters."
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Class</th>
                    <th>Assessment Scope</th>
                    <th>Procedure Type</th>
                    <th>Score / Marks</th>
                    <th>Result Outcome</th>
                    <th>Evaluator</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map(app => {
                    const asm = app.assessment;
                    const hasAsm = Boolean(asm || app.checklist?.interactionCompleted);

                    return (
                      <tr key={app.id}>
                        <td>
                          <strong>{app.firstName} {app.lastName}</strong>
                          <div style={{ fontSize: '11.5px', color: '#71717a' }}>{app.applicationNo}</div>
                        </td>
                        <td>
                          <strong>{app.targetClassName}</strong>
                        </td>
                        <td>
                          {asm?.subjectOrCategory || (app.targetClassName.includes('Class 10') || app.targetClassName.includes('Class 9') ? 'Math & Science Test' : 'Oral Interaction')}
                        </td>
                        <td>
                          <span className="badge badge-secondary">
                            {asm?.assessmentType || (app.targetClassName.includes('Class 1') ? 'Observation' : 'Written Test')}
                          </span>
                        </td>
                        <td>
                          {asm?.marksObtained !== undefined ? (
                            <strong style={{ color: '#1f2937' }}>
                              {asm.marksObtained} / {asm.maxMarks} ({Math.round((asm.marksObtained / (asm.maxMarks || 100)) * 100)}%)
                            </strong>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>—</span>
                          )}
                        </td>
                        <td>
                          {asm?.result ? (
                            <span className={`badge ${asm.result === 'Failed' ? 'badge-danger' : 'badge-success'}`}>
                              {asm.result}
                            </span>
                          ) : hasAsm ? (
                            <span className="badge badge-success">Completed</span>
                          ) : (
                            <span className="badge badge-warning">Pending</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#4b5563' }}>
                          {asm?.evaluatorTeacher || 'Academic Coordinator'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onRecordAssessment(app)}
                          >
                            <Edit size={13} />
                            <span>{hasAsm ? 'Update Result' : 'Record Score'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

