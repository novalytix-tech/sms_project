// ==========================================
// Daily Attendance Management & Roster Marking
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { AttendanceStatus } from '../../types';
import { StaffAttendanceManager } from '../../components/attendance/StaffAttendanceManager';
import { StudentAttendanceView } from '../../components/attendance/StudentAttendanceView';
import { EmptyState } from '../../components/common/EmptyState';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/export';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  Save,
  Download,
  Calendar,
  GraduationCap,
  Briefcase,
  RotateCcw,
} from 'lucide-react';

/**
 * Faculty and Administrative Daily Attendance Roster Marking Sheet
 */
const DailyAttendanceRosterManager: React.FC = () => {
  const { currentRole, currentUser, addToast } = useERP();
  const classes = useMemo(() => classService.getAll(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  // If teacher, restrict selectable classes to assigned classes
  const teacherAssignedClasses = useMemo(() => {
    if (currentRole === 'teacher') {
      const t = currentUser.referenceId
        ? teacherService.getById(currentUser.referenceId)
        : teacherService.getAll().find(item => item.email.toLowerCase() === currentUser.email.toLowerCase());
      const acList = t?.assignedClasses || [];
      if (acList.length > 0) {
        const matched = classes.filter(c => acList.some(ac => ac.classId === c.id));
        if (matched.length > 0) return matched;
      }
      return classes;
    }
    return classes;
  }, [currentRole, currentUser, classes]);

  // Category Tab: Student vs Staff attendance
  const canAccessStaffAttendance = ['school_admin', 'super_admin', 'teacher'].includes(currentRole);
  const tabFromQuery =
    (searchParams.get('category') === 'staff' || searchParams.get('tab') === 'staff') && canAccessStaffAttendance
      ? 'staff'
      : 'student';
  const [attendanceCategory, setAttendanceCategory] = useState<'student' | 'staff'>(tabFromQuery);

  useEffect(() => {
    const q = searchParams.get('category') || searchParams.get('tab');
    if (q === 'staff' && canAccessStaffAttendance) setAttendanceCategory('staff');
    else if (q === 'student') setAttendanceCategory('student');
  }, [searchParams, canAccessStaffAttendance]);

  const handleCategoryChange = (cat: 'student' | 'staff') => {
    setAttendanceCategory(cat);
    setSearchParams({ category: cat });
  };

  const [selectedClassId, setSelectedClassId] = useState<string>(teacherAssignedClasses[0]?.id || 'cls-10a');
  const [selectedSection, setSelectedSection] = useState<string>(teacherAssignedClasses[0]?.section || 'A');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Roster state: studentId -> status ('not_marked' | 'present' | 'absent' | 'late' | 'excused'), remarks
  const [roster, setRoster] = useState<Record<string, { status: AttendanceStatus | 'not_marked'; remarks: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load students for active class
  const classStudents = useMemo(() => {
    return studentService.getByClassAndSection(selectedClassId, selectedSection);
  }, [selectedClassId, selectedSection]);

  // Load existing records for chosen date without defaulting unmarked students to present!
  useEffect(() => {
    const existing = attendanceService.getByClassAndDate(selectedClassId, selectedSection, selectedDate);
    const map: Record<string, { status: AttendanceStatus | 'not_marked'; remarks: string }> = {};

    classStudents.forEach(stud => {
      const rec = existing.find(e => e.studentId === stud.id);
      map[stud.id] = {
        status: rec ? rec.status : 'not_marked', // Honest 'not_marked' when no record exists
        remarks: rec?.remarks || '',
      };
    });

    setRoster(map);
  }, [selectedClassId, selectedSection, selectedDate, classStudents]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus | 'not_marked') => {
    setRoster(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRoster(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    const map: Record<string, { status: AttendanceStatus | 'not_marked'; remarks: string }> = {};
    classStudents.forEach(s => {
      map[s.id] = {
        status: 'present',
        remarks: roster[s.id]?.remarks || '',
      };
    });
    setRoster(map);
    addToast('info', 'Marked All Present', 'All students set to Present. Click Save Attendance to commit.');
  };

  const handleMarkAllAbsent = () => {
    const map: Record<string, { status: AttendanceStatus | 'not_marked'; remarks: string }> = {};
    classStudents.forEach(s => {
      map[s.id] = {
        status: 'absent',
        remarks: roster[s.id]?.remarks || '',
      };
    });
    setRoster(map);
    addToast('info', 'Marked All Absent', 'All students set to Absent. Click Save Attendance to commit.');
  };

  const handleResetNotMarked = () => {
    const map: Record<string, { status: AttendanceStatus | 'not_marked'; remarks: string }> = {};
    classStudents.forEach(s => {
      map[s.id] = {
        status: 'not_marked',
        remarks: '',
      };
    });
    setRoster(map);
    addToast('info', 'Reset Roster', 'All student selections reset to Not Marked.');
  };

  const handleSaveAttendance = () => {
    setIsSaving(true);

    // Guard: teachers can only mark attendance for their assigned classes
    if (currentRole === 'teacher') {
      const isAssigned = teacherAssignedClasses.some(
        c => c.id === selectedClassId && c.section === selectedSection
      );
      if (!isAssigned) {
        setIsSaving(false);
        addToast('error', 'Access Denied', 'You are not assigned to take roll call for this class.');
        return;
      }
    }

    const records = classStudents.map(stud => ({
      studentId: stud.id,
      classId: selectedClassId,
      section: selectedSection,
      date: selectedDate,
      status: roster[stud.id]?.status || ('not_marked' as const),
      remarks: roster[stud.id]?.remarks,
    }));

    const result = attendanceService.saveRosterAttendance(records);
    setIsSaving(false);
    addToast(
      'success',
      'Attendance Recorded',
      `Saved attendance records for ${result.savedCount} marked students on ${formatDate(selectedDate)}.`
    );
  };

  // Stats calculation based only on marked students
  const stats = useMemo(() => {
    const total = classStudents.length;
    if (!total) return { present: 0, absent: 0, late: 0, excused: 0, notMarked: 0, rate: 0, markedTotal: 0 };

    let p = 0;
    let a = 0;
    let l = 0;
    let e = 0;
    let nm = 0;

    Object.values(roster).forEach(r => {
      if (r.status === 'present') p++;
      else if (r.status === 'absent') a++;
      else if (r.status === 'late') l++;
      else if (r.status === 'excused') e++;
      else nm++;
    });

    const markedTotal = p + a + l + e;
    const rate = markedTotal > 0 ? Math.round(((p + l) / markedTotal) * 100) : 0;
    return { present: p, absent: a, late: l, excused: e, notMarked: nm, rate, markedTotal };
  }, [classStudents.length, roster]);

  const handleExportDailyAttendance = () => {
    const headers = ['Roll No', 'Admission No', 'Student Name', 'Class', 'Date', 'Status', 'Remarks'];
    const rows = classStudents.map(stud => {
      const rec = roster[stud.id];
      return [
        stud.rollNo,
        stud.admissionNo,
        stud.fullName,
        `${selectedClassId.toUpperCase()}-${selectedSection}`,
        selectedDate,
        rec ? rec.status.toUpperCase() : 'NOT MARKED',
        rec?.remarks || '',
      ];
    });
    exportToCSV(`Attendance_${selectedClassId}_Sec${selectedSection}`, headers, rows);
    addToast('info', 'Export Successful', 'Daily class attendance downloaded as CSV.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CalendarCheck size={22} color="#3B82F6" />
            <span>Attendance Center</span>
          </h1>
          <p className="page-subtitle">
            Daily student roll call and faculty biometric attendance registry
          </p>
        </div>

        <div className="page-actions">
          {attendanceCategory === 'student' && (
            <>
              {['school_admin', 'super_admin'].includes(currentRole) && (
                <button className="btn btn-secondary" onClick={handleExportDailyAttendance}>
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleSaveAttendance}
                disabled={isSaving}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Records...' : 'Save Attendance'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Category Switcher Tab */}
      {canAccessStaffAttendance && (
        <div className="tabs-nav" style={{ marginBottom: '4px' }}>
          <button
            type="button"
            className={`tab-btn ${attendanceCategory === 'student' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('student')}
          >
            <GraduationCap size={16} />
            <span>Student Class Attendance</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${attendanceCategory === 'staff' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('staff')}
          >
            <Briefcase size={16} />
            <span>{currentRole === 'teacher' ? 'My Staff Attendance' : 'Staff & Faculty Attendance'}</span>
          </button>
        </div>
      )}

      {/* Staff Attendance Subview */}
      {attendanceCategory === 'staff' ? (
        <StaffAttendanceManager />
      ) : currentRole === 'teacher' && teacherAssignedClasses.length === 0 ? (
        <div style={{ padding: '40px 20px' }}>
          <EmptyState
            icon={<GraduationCap size={32} />}
            title="No Classes Assigned"
            description="You are not currently assigned as a class teacher or subject faculty for any active classes. Please contact the school administrator."
          />
        </div>
      ) : (
        <>
          {/* Control Filter Bar */}
          <div className="filter-toolbar">
            <div className="filter-group-left">
              <div className="filter-item">
                <label className="filter-label">Class:</label>
                <select
                  className="form-select filter-select filter-select-md"
                  value={selectedClassId}
                  onChange={e => {
                    const c = teacherAssignedClasses.find(item => item.id === e.target.value);
                    setSelectedClassId(e.target.value);
                    if (c) setSelectedSection(c.section);
                  }}
                  aria-label="Filter by Class"
                >
                  {teacherAssignedClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label">Section:</label>
                <select
                  className="form-select filter-select filter-select-xs"
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  aria-label="Filter by Section"
                >
                  <option value="A">Sec A</option>
                  <option value="B">Sec B</option>
                </select>
              </div>

              <div className="filter-item">
                <Calendar size={15} color="#3B82F6" />
                <input
                  type="date"
                  className="form-input filter-date-input"
                  style={{ width: '150px' }}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  aria-label="Select Date"
                />
              </div>
            </div>

            <div className="filter-group-right" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllPresent}
                title="Mark all listed students as Present"
              >
                <CheckCircle size={14} color="#16A34A" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllAbsent}
                title="Mark all listed students as Absent"
              >
                <XCircle size={14} color="#DC2626" />
                <span>Mark All Absent</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetNotMarked}
                title="Reset all to unrecorded state"
              >
                <RotateCcw size={14} color="#64748B" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Live Attendance Metric Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {stats.present}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>PRESENT</div>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>
                  {stats.markedTotal > 0 ? `${stats.rate}% Rate` : '—'}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {stats.absent}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>ABSENT</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{stats.absent} Students</div>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {stats.late}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>LATE</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{stats.late} Students</div>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {stats.excused}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>EXCUSED</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{stats.excused} Students</div>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {stats.notMarked}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>NOT MARKED</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: stats.notMarked > 0 ? '#D97706' : '#64748B' }}>
                  {stats.notMarked} Pending
                </div>
              </div>
            </div>
          </div>

          {/* Roster Marking Table */}
          <div className="card">
            <div className="card-body" style={{ padding: '0' }}>
              {classStudents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  No students enrolled in this selected class and section.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll #</th>
                        <th>Student Name</th>
                        <th>Admission No</th>
                        <th>Status Selection</th>
                        <th>Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map(stud => {
                        const currentStatus = roster[stud.id]?.status || 'not_marked';
                        const currentRemarks = roster[stud.id]?.remarks || '';

                        return (
                          <tr key={stud.id}>
                            <td style={{ fontWeight: 700 }}>{stud.rollNo}</td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{stud.fullName}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                Parent: {stud.parentName} ({stud.parentPhone})
                              </div>
                            </td>
                            <td style={{ color: '#0f172a', fontWeight: 700 }}>{stud.admissionNo}</td>
                            <td>
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${currentStatus === 'present' ? 'btn-success' : 'btn-secondary'}`}
                                  onClick={() => handleStatusChange(stud.id, 'present')}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${currentStatus === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                                  onClick={() => handleStatusChange(stud.id, 'absent')}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${currentStatus === 'late' ? 'btn-primary' : 'btn-secondary'}`}
                                  style={currentStatus === 'late' ? { background: '#D97706', borderColor: '#D97706' } : {}}
                                  onClick={() => handleStatusChange(stud.id, 'late')}
                                >
                                  Late
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${currentStatus === 'excused' ? 'btn-outline' : 'btn-secondary'}`}
                                  style={currentStatus === 'excused' ? { background: '#E0F2FE', color: '#0284C7', borderColor: '#BAE6FD' } : {}}
                                  onClick={() => handleStatusChange(stud.id, 'excused')}
                                >
                                  Excused
                                </button>
                                {currentStatus === 'not_marked' && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: '#D97706',
                                      background: '#FEF3C7',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      marginLeft: '4px',
                                    }}
                                  >
                                    Not Marked
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{ height: '32px', fontSize: '12px', minWidth: '180px' }}
                                placeholder="Optional reason (e.g. sick leave, bus delay)..."
                                value={currentRemarks}
                                onChange={e => handleRemarksChange(stud.id, e.target.value)}
                              />
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
        </>
      )}
    </div>
  );
};

export const AttendancePage: React.FC = () => {
  const { currentRole, currentUser, selectedChild, parentChildren, setSelectedChildId } = useERP();

  // If active user is student, render dedicated isolated student attendance view
  if (currentRole === 'student') {
    const student =
      (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
      studentService.getAll().find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
      studentService.getAll()[0];

    return <StudentAttendanceView student={student} />;
  }

  // If active user is parent, render dedicated ward attendance view
  if (currentRole === 'parent') {
    const activeStudent = selectedChild || parentChildren[0];
    if (!activeStudent) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
          No linked student records found for this parent account.
        </div>
      );
    }
    return (
      <StudentAttendanceView
        student={activeStudent}
        isParentView
        childrenList={parentChildren}
        onSelectChild={setSelectedChildId}
      />
    );
  }

  return <DailyAttendanceRosterManager />;
};
