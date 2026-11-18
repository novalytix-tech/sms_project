// ==========================================
// Student / Parent Attendance Portal (Read-Only)
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Student } from '../../types';
import { attendanceService } from '../../services/attendanceService';
import { formatDate } from '../../utils/formatters';
import { CalendarCheck, CheckCircle, Clock, AlertCircle, Filter, Users, CheckSquare } from 'lucide-react';

interface StudentAttendanceViewProps {
  student: Student;
  isParentView?: boolean;
  childrenList?: Student[];
  onSelectChild?: (childId: string) => void;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  student,
  isParentView = false,
  childrenList = [],
  onSelectChild,
}) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    const onUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('nts_erp_storage_updated', onUpdate);
    return () => window.removeEventListener('nts_erp_storage_updated', onUpdate);
  }, []);

  // Attendance stats dynamically calculated from recorded records
  const attStats = useMemo(() => {
    return attendanceService.calculateStudentPercentage(student.id);
  }, [student.id, dataVersion]);

  // Attendance records for this student
  const allRecords = useMemo(() => {
    return attendanceService.getByStudentId(student.id).sort((a, b) => b.date.localeCompare(a.date));
  }, [student.id, dataVersion]);

  // Filter records by selected month if requested
  const filteredRecords = useMemo(() => {
    if (selectedMonth === 'all') return allRecords;
    return allRecords.filter(r => r.date.startsWith(selectedMonth));
  }, [allRecords, selectedMonth]);

  // Month options extracted from records
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allRecords.forEach(r => {
      months.add(r.date.substring(0, 7)); // YYYY-MM
    });
    return Array.from(months).sort().reverse();
  }, [allRecords]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Child Selector */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CalendarCheck size={22} color="#3B82F6" />
            <span>{isParentView ? 'Ward Attendance Record' : 'My Attendance Record'}</span>
          </h1>
          <p className="page-subtitle">
            Official class roll call and morning attendance tracking verified by faculty
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/leave')}>
            <CheckSquare size={15} />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Linked Ward Switcher for Parents */}
      {isParentView && childrenList.length > 1 && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Select Student:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {childrenList.map(child => (
              <button
                key={child.id}
                type="button"
                className={`btn ${student.id === child.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => onSelectChild && onSelectChild(child.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Users size={14} />
                <span>
                  {child.fullName} (Class {child.className || (child as any).grade || '10'}-{child.section || 'A'})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Student Pill Banner */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderLeft: '4px solid #3B82F6',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
            {student.fullName}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Class <strong>{student.className || (student as any).grade || 'Class 10'} ({student.section || 'A'})</strong> • Roll #{student.rollNo} • Adm #{student.admissionNo} • Academic Year {student.academicYear || '2026-2027'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Enrollment Status:</span>
          <span className="badge badge-success">ACTIVE IN CLASS</span>
        </div>
      </div>

      {/* 4 Summary Performance KPIs */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Attendance Rate</span>
            <span className="stat-value">{attStats.isMarked ? `${attStats.percentage}%` : '—'}</span>
            <span className={`stat-subtext ${attStats.isMarked ? 'positive' : ''}`}>
              {attStats.isMarked
                ? `${attStats.present + attStats.late} Attended of ${attStats.total} Sessions`
                : 'No roll calls marked yet'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Present Sessions</span>
            <span className="stat-value">{attStats.present}</span>
            <span className="stat-subtext positive">Full day attendance</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Late Commutes</span>
            <span className="stat-value">{attStats.late}</span>
            <span className="stat-subtext">Recorded with remarks</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Absences & Leave</span>
            <span className="stat-value">{attStats.absent}</span>
            <span className="stat-subtext" style={{ color: attStats.absent > 0 ? '#DC2626' : '#64748B' }}>
              {attStats.excused > 0 ? `${attStats.excused} Excused Leave` : 'Unexcused'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Log Sheet */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Attendance History Sheet</h3>
            <p className="card-subtitle">
              Daily period roll call records entered by class teacher
            </p>
          </div>

          {availableMonths.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={14} color="#64748B" />
              <select
                className="form-select"
                style={{ width: '160px', height: '34px', fontSize: '12px' }}
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                <option value="all">All Recorded Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="card-body" style={{ padding: '0' }}>
          {filteredRecords.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              No attendance records found for this student.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day of Week</th>
                    <th>Attendance Status</th>
                    <th>Class Session</th>
                    <th>Faculty Notes / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(rec => {
                    const dateObj = new Date(rec.date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                    let badgeColor = 'badge-success';
                    let label = 'Present';

                    if (rec.status === 'absent') {
                      badgeColor = 'badge-danger';
                      label = 'Absent';
                    } else if (rec.status === 'late') {
                      badgeColor = 'badge-warning';
                      label = 'Late Commute';
                    } else if (rec.status === 'excused') {
                      badgeColor = 'badge-info';
                      label = 'Excused Leave';
                    }

                    return (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: 600 }}>{formatDate(rec.date)}</td>
                        <td style={{ color: '#64748B' }}>{dayName}</td>
                        <td>
                          <span className={`badge ${badgeColor}`}>{label}</span>
                        </td>
                        <td>Class {rec.classId.toUpperCase()} ({rec.section})</td>
                        <td style={{ color: '#64748B', fontStyle: rec.remarks ? 'normal' : 'italic' }}>
                          {rec.remarks || 'Regular attendance'}
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

