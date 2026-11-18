// ==========================================
// Staff & Teacher Attendance Management Component
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { StaffAttendanceRecord, StaffAttendanceStatus, LeaveRequest } from '../../types';
import { staffAttendanceService } from '../../services/staffAttendanceService';
import { teacherService } from '../../services/teacherService';

import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../common/EmptyState';
import { SearchInput } from '../common/SearchInput';
import { formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/export';
import { CalendarCheck, CheckCircle, Clock, AlertCircle, Save, Download, Calendar, Search, Edit, History, UserCheck, AlertTriangle, Users } from 'lucide-react';
import { todayISO, daysAgoISO } from '../../utils/date';

export const StaffAttendanceManager: React.FC = () => {
  const { currentRole, currentUser, addToast } = useERP();
  const isTeacher = currentRole === 'teacher';
  const isAdmin = currentRole === 'school_admin' || currentRole === 'super_admin';

  // Active Teachers
  const teachers = useMemo(() => teacherService.getAll().filter(t => t.status === 'active'), []);
  const departments = useMemo(() => Array.from(new Set(teachers.map(t => t.department))), [teachers]);

  // Tab: 'roster' | 'history' | 'individual'
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'history' | 'individual'>(
    isTeacher ? 'individual' : 'roster'
  );

  // Selected date for Roster
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [searchRoster, setSearchRoster] = useState<string>('');

  // Daily Roster State: teacherId -> { status, checkInTime, remarks, isOverride }
  const [rosterMap, setRosterMap] = useState<
    Record<string, { status: StaffAttendanceStatus; checkInTime: string; remarks: string; allowOverride: boolean }>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Leave Override Confirmation Dialog State
  const [overrideTarget, setOverrideTarget] = useState<{
    teacherId: string;
    targetStatus: StaffAttendanceStatus;
    leaveInfo: LeaveRequest;
  } | null>(null);

  // History Tab Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyDept, setHistoryDept] = useState('all');
  const [historyStatus, setHistoryStatus] = useState<string>('all');
  const [historyDate, setHistoryDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Individual Drilldown Teacher State
  const defaultTeacherId = useMemo(() => {
    if (isTeacher && currentUser.referenceId) return currentUser.referenceId;
    return teachers[0]?.id || '';
  }, [isTeacher, currentUser.referenceId, teachers]);

  const [selectedIndividualTeacherId, setSelectedIndividualTeacherId] = useState<string>(defaultTeacherId);

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<StaffAttendanceRecord | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    newStatus: 'present' as StaffAttendanceStatus,
    reason: '',
    remarks: '',
  });
  const [correctionError, setCorrectionError] = useState('');

  // Storage sync version
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshTrigger(v => v + 1);
    window.addEventListener('nts_erp_storage_updated', handleUpdate);
    return () => window.removeEventListener('nts_erp_storage_updated', handleUpdate);
  }, []);

  // Load staff attendance from the server: the chosen day, plus recent history once.
  useEffect(() => {
    staffAttendanceService.load({ date: selectedDate });
  }, [selectedDate]);
  useEffect(() => {
    const from = daysAgoISO(90);
    staffAttendanceService.load({ from });
  }, []);

  // Summary statistics for the chosen date
  const dailySummary = useMemo(() => {
    return staffAttendanceService.calculateStaffDailyStats(selectedDate);
  }, [selectedDate, refreshTrigger]);

  // Load roster records for the selected date
  useEffect(() => {
    const existingRecords = staffAttendanceService.getByDate(selectedDate);
    const newMap: Record<
      string,
      { status: StaffAttendanceStatus; checkInTime: string; remarks: string; allowOverride: boolean }
    > = {};

    teachers.forEach(t => {
      const rec = existingRecords.find(r => r.teacherId === t.id);
      const { approvedLeave } = staffAttendanceService.getLeaveForStaffOnDate(t.id, t.fullName, selectedDate);

      let initialStatus: StaffAttendanceStatus = 'present';
      if (rec) {
        initialStatus = rec.status;
      } else if (approvedLeave) {
        initialStatus = 'on_leave';
      }

      newMap[t.id] = {
        status: initialStatus,
        checkInTime: rec?.checkInTime || (initialStatus === 'present' ? '08:15' : ''),
        remarks: rec?.remarks || (approvedLeave ? `On approved ${approvedLeave.leaveType} leave` : ''),
        allowOverride: rec ? !!rec.leaveRequestId && rec.status !== 'on_leave' : false,
      };
    });

    setRosterMap(newMap);
  }, [selectedDate, teachers, refreshTrigger]);

  // Filtered teachers for Roster view
  const filteredRosterTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchDept = deptFilter === 'all' || t.department === deptFilter;
      const matchSearch =
        searchRoster === '' ||
        t.fullName.toLowerCase().includes(searchRoster.toLowerCase()) ||
        t.staffId.toLowerCase().includes(searchRoster.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [teachers, deptFilter, searchRoster]);

  // Filtered history records
  const allHistoryRecords = useMemo(() => {
    return staffAttendanceService.getAll();
  }, [refreshTrigger]);

  const filteredHistory = useMemo(() => {
    return allHistoryRecords.filter(r => {
      const matchSearch =
        historySearch === '' ||
        r.staffName.toLowerCase().includes(historySearch.toLowerCase()) ||
        r.staffId.toLowerCase().includes(historySearch.toLowerCase());
      const matchDept = historyDept === 'all' || r.department === historyDept;
      const matchStatus = historyStatus === 'all' || r.status === historyStatus;
      const matchDate = historyDate === '' || r.date === historyDate;

      // If logged in as teacher, only see own history
      const matchRole = isTeacher ? r.teacherId === currentUser.referenceId : true;

      return matchSearch && matchDept && matchStatus && matchDate && matchRole;
    });
  }, [allHistoryRecords, historySearch, historyDept, historyStatus, historyDate, isTeacher, currentUser.referenceId]);

  // Paginated history
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [historySearch, historyDept, historyStatus, historyDate]);

  // Individual staff stats
  const individualStats = useMemo(() => {
    if (!selectedIndividualTeacherId) return null;
    return staffAttendanceService.calculateIndividualStats(selectedIndividualTeacherId);
  }, [selectedIndividualTeacherId, refreshTrigger]);

  const individualRecords = useMemo(() => {
    if (!selectedIndividualTeacherId) return [];
    return staffAttendanceService
      .getByTeacherId(selectedIndividualTeacherId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedIndividualTeacherId, refreshTrigger]);

  // Status Change in Daily Roster
  const handleRosterStatusSelect = (teacherId: string, status: StaffAttendanceStatus) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    // Check if staff has approved leave on that date and user is selecting Present/Late/HalfDay
    const { approvedLeave } = staffAttendanceService.getLeaveForStaffOnDate(teacher.id, teacher.fullName, selectedDate);
    if (approvedLeave && (status === 'present' || status === 'late' || status === 'half_day')) {
      const currentEntry = rosterMap[teacherId];
      if (!currentEntry?.allowOverride) {
        // Open confirmation dialog
        setOverrideTarget({
          teacherId,
          targetStatus: status,
          leaveInfo: approvedLeave,
        });
        return;
      }
    }

    setRosterMap(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        status,
        checkInTime: status === 'present' && !prev[teacherId]?.checkInTime ? '08:15' : prev[teacherId]?.checkInTime || '',
      },
    }));
  };

  const handleConfirmLeaveOverride = () => {
    if (!overrideTarget) return;
    const { teacherId, targetStatus, leaveInfo } = overrideTarget;

    setRosterMap(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        status: targetStatus,
        allowOverride: true,
        remarks: `[Override Confirmed] Active on campus despite approved ${leaveInfo.leaveType} leave`,
        checkInTime: prev[teacherId]?.checkInTime || '08:15',
      },
    }));

    addToast(
      'warning',
      'Leave Override Permitted',
      'Approved leave override confirmed. Please save the roster to record changes.'
    );
    setOverrideTarget(null);
  };

  // Mark all filtered teachers present (skip those with approved leave)
  const handleMarkAllFilteredPresent = () => {
    let leaveSkippedCount = 0;
    const nextMap = { ...rosterMap };

    filteredRosterTeachers.forEach(t => {
      const { approvedLeave } = staffAttendanceService.getLeaveForStaffOnDate(t.id, t.fullName, selectedDate);
      if (approvedLeave) {
        leaveSkippedCount++;
        nextMap[t.id] = {
          ...nextMap[t.id],
          status: 'on_leave',
          remarks: `On approved ${approvedLeave.leaveType} leave`,
        };
      } else {
        nextMap[t.id] = {
          ...nextMap[t.id],
          status: 'present',
          checkInTime: nextMap[t.id]?.checkInTime || '08:15',
        };
      }
    });

    setRosterMap(nextMap);
    if (leaveSkippedCount > 0) {
      addToast(
        'info',
        'Marked Present with Leave Safeguards',
        `Teachers marked Present. ${leaveSkippedCount} staff on approved leave were preserved as 'On Leave'.`
      );
    } else {
      addToast('success', 'Roster Updated', 'All eligible staff set to Present. Click Save Roster to persist.');
    }
  };

  // Commit daily roster to storage
  const handleSaveRoster = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const recordsToSave = filteredRosterTeachers.map(t => {
      const entry = rosterMap[t.id] || { status: 'present', checkInTime: '08:15', remarks: '', allowOverride: false };
      return {
        teacherId: t.id,
        date: selectedDate,
        status: entry.status,
        checkInTime: entry.checkInTime,
        remarks: entry.remarks,
        allowLeaveOverride: entry.allowOverride,
      };
    });

    const res = await staffAttendanceService.saveDailyStaffRoster(recordsToSave);
    setIsSaving(false);

    if (res.success) {
      addToast(
        'success',
        'Staff Attendance Saved',
        `Attendance successfully recorded for ${res.savedCount} staff members on ${formatDate(selectedDate)}.`
      );
    } else {
      addToast('error', 'Attendance Error', res.errors?.[0] || 'Failed to save staff attendance roster.');
    }
  };

  // Correction Modal Handlers
  const handleOpenCorrection = (record: StaffAttendanceRecord) => {
    setCorrectionTarget(record);
    setCorrectionForm({
      newStatus: record.status,
      reason: record.correctionReason || '',
      remarks: record.remarks || '',
    });
    setCorrectionError('');
  };

  const handleSaveCorrection = async () => {
    if (!correctionTarget) return;
    if (!correctionForm.reason || correctionForm.reason.trim().length < 5) {
      setCorrectionError('Please enter an official audit reason for this correction (at least 5 characters).');
      return;
    }

    const res = await staffAttendanceService.correctAttendance(
      correctionTarget.id,
      correctionForm.newStatus,
      correctionForm.reason,
      correctionForm.remarks
    );

    if (res.success) {
      addToast(
        'success',
        'Record Corrected',
        `Attendance for ${correctionTarget.staffName} on ${formatDate(correctionTarget.date)} updated to ${correctionForm.newStatus}.`
      );
      setCorrectionTarget(null);
    } else {
      setCorrectionError(res.error || 'Failed to correct record.');
    }
  };

  // CSV Export for History
  const handleExportHistoryCSV = () => {
    const headers = [
      'Staff ID',
      'Staff Name',
      'Department',
      'Date',
      'Status',
      'Previous Status',
      'Check In',
      'Check Out',
      'Corrected?',
      'Corrected By',
      'Correction Date',
      'Correction Reason',
      'Remarks',
    ];
    const rows = filteredHistory.map(r => [
      r.staffId,
      r.staffName,
      r.department,
      r.date,
      r.status,
      r.previousStatus || '',
      r.checkInTime || '',
      r.checkOutTime || '',
      r.isCorrected ? 'Yes' : 'No',
      r.correctedBy || '',
      r.correctedAt ? formatDate(r.correctedAt) : '',
      r.correctionReason || '',
      r.remarks || '',
    ]);

    exportToCSV(`Staff_Attendance_Report_${historyDate || 'All'}`, headers, rows);
    addToast('success', 'Export Complete', `${filteredHistory.length} staff attendance records exported.`);
  };

  const getStatusBadge = (status: StaffAttendanceStatus) => {
    switch (status) {
      case 'present':
        return <span className="badge badge-success">Present</span>;
      case 'absent':
        return <span className="badge badge-danger">Absent</span>;
      case 'late':
        return <span className="badge badge-warning">Late</span>;
      case 'half_day':
        return <span className="badge badge-neutral" style={{ background: '#fef3c7', color: '#92400e' }}>Half Day</span>;
      case 'on_leave':
        return <span className="badge badge-neutral" style={{ background: '#ede9fe', color: '#6d28d9' }}>On Leave</span>;
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Sub-Tabs Navigation */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        {isAdmin && (
          <button
            className={`tab-btn ${activeSubTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('roster')}
          >
            <UserCheck size={16} />
            <span>Daily Staff Roll Call</span>
          </button>
        )}
        <button
          className={`tab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          <History size={16} />
          <span>{isTeacher ? 'My Attendance History' : 'Staff Attendance History & Audit'}</span>
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'individual' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('individual')}
        >
          <Users size={16} />
          <span>{isTeacher ? 'My Annual Attendance Stats' : 'Individual Staff Profile'}</span>
        </button>
      </div>

      {/* ========================================================
          SUB-TAB 1: DAILY STAFF ROSTER (ADMIN ONLY)
          ======================================================== */}
      {isAdmin && activeSubTab === 'roster' && (
        <div>
          {/* Daily Summary Cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Total Staff</span>
                <div className="stat-value">{dailySummary.totalStaff}</div>
                <div className="stat-subtext">Active faculty & teachers</div>
              </div>
              <div className="stat-icon" style={{ background: '#DBEAFE', color: '#3B82F6' }}>
                <Users size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Present Today</span>
                <div className="stat-value" style={{ color: '#17623e' }}>
                  {dailySummary.present}
                </div>
                <div className="stat-subtext">On duty on campus</div>
              </div>
              <div className="stat-icon" style={{ background: '#e9f8ef', color: '#17623e' }}>
                <CheckCircle size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Late / Half Day</span>
                <div className="stat-value" style={{ color: '#98440e' }}>
                  {dailySummary.late + dailySummary.halfDay}
                </div>
                <div className="stat-subtext">{dailySummary.late} late • {dailySummary.halfDay} half-day</div>
              </div>
              <div className="stat-icon" style={{ background: '#fff3dd', color: '#98440e' }}>
                <Clock size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">On Approved Leave</span>
                <div className="stat-value" style={{ color: 'var(--color-purple, #702e82)' }}>
                  {dailySummary.onLeave}
                </div>
                <div className="stat-subtext">Sanctioned faculty leave</div>
              </div>
              <div className="stat-icon" style={{ background: 'var(--color-purple-bg, #f9edf9)', color: 'var(--color-purple, #702e82)' }}>
                <CalendarCheck size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Attendance Rate</span>
                <div className="stat-value">{dailySummary.attendanceRate}%</div>
                <div className="stat-subtext">{dailySummary.unmarked} staff unmarked</div>
              </div>
              <div className="stat-icon">
                <Calendar size={20} />
              </div>
            </div>
          </div>

          {/* Roster Controls Toolbar */}
          <div className="filter-toolbar">
            <div className="filter-group-left">
              <div className="filter-item">
                <Calendar size={15} color="#3B82F6" />
                <input
                  type="date"
                  className="form-input filter-date-input"
                  style={{ width: '160px', fontWeight: 600 }}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  aria-label="Attendance Date"
                />
              </div>

              <select
                className="form-select filter-select filter-select-md"
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                aria-label="Department Filter"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <SearchInput
                value={searchRoster}
                onChange={setSearchRoster}
                placeholder="Search faculty name or ID..."
                ariaLabel="Search faculty name or ID"
              />
            </div>

            <div className="filter-group-right" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllFilteredPresent}
                title="Mark all staff present with leave protection"
              >
                <CheckCircle size={14} />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveRoster}
                disabled={isSaving}
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Roster'}</span>
              </button>
            </div>
          </div>

          {/* Staff Roster Table */}
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {filteredRosterTeachers.length === 0 ? (
                <EmptyState
                  title="No staff members found"
                  description="No active teachers match the selected department or search filter."
                />
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '110px' }}>Staff ID</th>
                        <th>Employee Details</th>
                        <th>Department</th>
                        <th style={{ width: '150px' }}>Leave Status</th>
                        <th style={{ minWidth: '280px' }}>Attendance Status</th>
                        <th style={{ width: '110px' }}>Check-In</th>
                        <th>Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRosterTeachers.map(t => {
                        const entry = rosterMap[t.id] || {
                          status: 'present',
                          checkInTime: '08:15',
                          remarks: '',
                          allowOverride: false,
                        };
                        const { approvedLeave, pendingLeave } = staffAttendanceService.getLeaveForStaffOnDate(
                          t.id,
                          t.fullName,
                          selectedDate
                        );

                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 700, color: '#3B82F6' }}>{t.staffId}</td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#19191f' }}>{t.fullName}</div>
                              <div style={{ fontSize: '11px', color: '#71717a' }}>{t.designation}</div>
                            </td>
                            <td>
                              <span className="badge badge-secondary">{t.department}</span>
                            </td>
                            <td>
                              {approvedLeave ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: '#ede9fe',
                                    color: '#6d28d9',
                                    border: '1px solid #ddd6fe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title={`Approved: ${approvedLeave.reason}`}
                                >
                                  <AlertCircle size={11} />
                                  <span>{approvedLeave.leaveType} Leave</span>
                                </span>
                              ) : pendingLeave ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title={`Pending: ${pendingLeave.reason}`}
                                >
                                  <Clock size={11} />
                                  <span>Pending Request</span>
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#958483' }}>No Leave</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap' }}>
                                {(
                                  [
                                    { key: 'present', label: 'Present' },
                                    { key: 'absent', label: 'Absent' },
                                    { key: 'late', label: 'Late' },
                                    { key: 'half_day', label: 'Half Day' },
                                    { key: 'on_leave', label: 'On Leave' },
                                  ] as const
                                ).map(st => {
                                  const isSelected = entry.status === st.key;
                                  return (
                                    <button
                                      key={st.key}
                                      type="button"
                                      className="btn btn-sm"
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        border: isSelected ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                        background: isSelected ? '#3B82F6' : '#ffffff',
                                        color: isSelected ? '#ffffff' : '#282128',
                                      }}
                                      onClick={() => handleRosterStatusSelect(t.id, st.key)}
                                    >
                                      {st.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td>
                              <input
                                type="time"
                                className="form-input"
                                style={{ padding: '3px 6px', fontSize: '11px', height: 'auto', width: '90px' }}
                                value={entry.checkInTime}
                                onChange={e => {
                                  const val = e.target.value;
                                  setRosterMap(prev => ({
                                    ...prev,
                                    [t.id]: {
                                      ...prev[t.id],
                                      checkInTime: val,
                                    },
                                  }));
                                }}
                                disabled={entry.status === 'absent' || entry.status === 'on_leave'}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Add remark..."
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                value={entry.remarks}
                                onChange={e => {
                                  const val = e.target.value;
                                  setRosterMap(prev => ({
                                    ...prev,
                                    [t.id]: {
                                      ...prev[t.id],
                                      remarks: val,
                                    },
                                  }));
                                }}
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
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: ATTENDANCE HISTORY & AUDIT CORRECTIONS
          ======================================================== */}
      {activeSubTab === 'history' && (
        <div>
          {/* History Filters */}
          <div className="filter-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div className="filter-group-left" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div className="filter-search" style={{ minWidth: '220px' }}>
                <Search className="filter-search-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search staff name or ID..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                />
              </div>

              {!isTeacher && (
                <select
                  className="form-select"
                  style={{ width: '160px' }}
                  value={historyDept}
                  onChange={e => setHistoryDept(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="form-select"
                style={{ width: '140px' }}
                value={historyStatus}
                onChange={e => setHistoryStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="on_leave">On Leave</option>
              </select>

              <input
                type="date"
                className="form-input"
                style={{ width: '150px' }}
                value={historyDate}
                onChange={e => setHistoryDate(e.target.value)}
                title="Filter by specific date"
              />

              {(historySearch || historyDept !== 'all' || historyStatus !== 'all' || historyDate) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryDept('all');
                    setHistoryStatus('all');
                    setHistoryDate('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="filter-group-right">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportHistoryCSV}>
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* History Data Table */}
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {filteredHistory.length === 0 ? (
                <EmptyState
                  title="No attendance records found"
                  description="No historical staff records match your selected filters."
                />
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Staff ID</th>
                        <th>Staff Member</th>
                        <th>Department</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Audit Status</th>
                        <th>Remarks</th>
                        {isAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map(rec => (
                        <tr key={rec.id}>
                          <td style={{ fontWeight: 600 }}>{formatDate(rec.date)}</td>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>{rec.staffId}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{rec.staffName}</div>
                          </td>
                          <td>
                            <span className="badge badge-secondary">{rec.department}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{getStatusBadge(rec.status)}</td>
                          <td>{rec.checkInTime || '—'}</td>
                          <td>{rec.checkOutTime || '—'}</td>
                          <td>
                            {rec.isCorrected ? (
                              <div>
                                <span
                                  className="badge badge-warning"
                                  title={`Reason: ${rec.correctionReason || 'Correction logged'}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <AlertTriangle size={10} />
                                  <span>Corrected</span>
                                </span>
                                {rec.previousStatus && (
                                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                                    was: {rec.previousStatus}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#958483' }}>Original</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: '#71717a', maxWidth: '240px' }}>
                            {rec.isCorrected && rec.correctionReason ? (
                              <div>
                                <div style={{ fontWeight: 600, color: '#334155' }}>{rec.correctionReason}</div>
                                {rec.correctedBy && (
                                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>by {rec.correctedBy}</div>
                                )}
                              </div>
                            ) : (
                              rec.remarks || '—'
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                onClick={() => handleOpenCorrection(rec)}
                                title="Audit correct record"
                              >
                                <Edit size={12} />
                                <span>Correct</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredHistory.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalRecords={filteredHistory.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onPageSizeChange={setPageSize}
                  itemLabel="records"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: INDIVIDUAL STAFF ATTENDANCE SUMMARY
          ======================================================== */}
      {activeSubTab === 'individual' && (
        <div>
          {/* Staff Member Selector (Admin only) */}
          {isAdmin && (
            <div className="filter-toolbar" style={{ marginBottom: '16px' }}>
              <div className="filter-group-left" style={{ alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Faculty Member:</span>
                <select
                  className="form-select"
                  style={{ width: '260px' }}
                  value={selectedIndividualTeacherId}
                  onChange={e => setSelectedIndividualTeacherId(e.target.value)}
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.staffId} • {t.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {individualStats && (
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Total Recorded Days</span>
                  <div className="stat-value">{individualStats.totalDays}</div>
                  <div className="stat-subtext">Working sessions logged</div>
                </div>
                <div className="stat-icon">
                  <Calendar size={20} />
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Present Days</span>
                  <div className="stat-value" style={{ color: '#17623e' }}>
                    {individualStats.presentDays}
                  </div>
                  <div className="stat-subtext">Full-day attendance</div>
                </div>
                <div className="stat-icon" style={{ background: '#e9f8ef', color: '#17623e' }}>
                  <CheckCircle size={20} />
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Late / Half Days</span>
                  <div className="stat-value" style={{ color: '#98440e' }}>
                    {individualStats.lateDays + individualStats.halfDays}
                  </div>
                  <div className="stat-subtext">{individualStats.lateDays} late • {individualStats.halfDays} half</div>
                </div>
                <div className="stat-icon" style={{ background: '#fff3dd', color: '#98440e' }}>
                  <Clock size={20} />
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Sanctioned Leave</span>
                  <div className="stat-value" style={{ color: 'var(--color-purple, #702e82)' }}>
                    {individualStats.leaveDays}
                  </div>
                  <div className="stat-subtext">Approved leave days</div>
                </div>
                <div className="stat-icon" style={{ background: 'var(--color-purple-bg, #f9edf9)', color: 'var(--color-purple, #702e82)' }}>
                  <CalendarCheck size={20} />
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Attendance Rate</span>
                  <div className="stat-value">{individualStats.rate}%</div>
                  <div className="stat-subtext">Cumulative rate</div>
                </div>
                <div className="stat-icon">
                  <CalendarCheck size={20} />
                </div>
              </div>
            </div>
          )}

          {/* Individual History Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Attendance Logs & Timestamps</h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {individualRecords.length === 0 ? (
                <EmptyState
                  title="No individual records"
                  description="No attendance records have been registered for this faculty member yet."
                />
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Correction Status</th>
                        <th>Notes / Audit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {individualRecords.map(r => {
                        const dateObj = new Date(r.date);
                        const dayName = isNaN(dateObj.getTime())
                          ? '—'
                          : dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                        return (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 600 }}>{formatDate(r.date)}</td>
                            <td>{dayName}</td>
                            <td style={{ textAlign: 'center' }}>{getStatusBadge(r.status)}</td>
                            <td>{r.checkInTime || '—'}</td>
                            <td>{r.checkOutTime || '—'}</td>
                            <td>
                              {r.isCorrected ? (
                                <span className="badge badge-warning" title={r.correctionReason}>
                                  Corrected
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#958483' }}>Standard</span>
                              )}
                            </td>
                            <td style={{ fontSize: '12px', color: '#71717a' }}>
                              {r.correctionReason ? `Correction: ${r.correctionReason}` : r.remarks || '—'}
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
      )}

      {/* ========================================================
          CONFIRMATION DIALOG FOR APPROVED LEAVE OVERRIDE
          ======================================================== */}
      {overrideTarget && (
        <ConfirmDialog
          isOpen={true}
          title="Confirm Approved Leave Override"
          message={`Faculty member ${
            teachers.find(t => t.id === overrideTarget.teacherId)?.fullName
          } already has an approved ${overrideTarget.leaveInfo.leaveType} leave scheduled for ${formatDate(
            selectedDate
          )} ("${overrideTarget.leaveInfo.reason}"). Are you sure you want to override and mark them as ${
            overrideTarget.targetStatus
          }?`}
          confirmLabel="Confirm Override"
          cancelLabel="Cancel"
          onClose={() => setOverrideTarget(null)}
          onConfirm={handleConfirmLeaveOverride}
        />
      )}

      {/* ========================================================
          AUDIT CORRECTION MODAL (ADMIN ONLY)
          ======================================================== */}
      {correctionTarget && (
        <Modal
          isOpen={true}
          onClose={() => setCorrectionTarget(null)}
          title={`Correct Attendance Record: ${correctionTarget.staffName}`}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setCorrectionTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveCorrection}>
                Save Audit Correction
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: '#F6F8FC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#625459',
              }}
            >
              <div>
                <strong>Staff Member:</strong> {correctionTarget.staffName} ({correctionTarget.staffId})
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong>Date:</strong> {formatDate(correctionTarget.date)} • <strong>Current Status:</strong>{' '}
                {correctionTarget.status}
              </div>
            </div>

            {correctionError && (
              <div
                style={{
                  background: '#DBEAFE',
                  border: '1px solid #fecaca',
                  color: '#a51d29',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                {correctionError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label required">Corrected Status</label>
              <select
                className="form-select"
                value={correctionForm.newStatus}
                onChange={e =>
                  setCorrectionForm(prev => ({
                    ...prev,
                    newStatus: e.target.value as StaffAttendanceStatus,
                  }))
                }
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">
                Official Reason for Correction <span style={{ fontSize: '11px', color: '#958483' }}>(Mandatory)</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="State the verified justification for altering this record (e.g., faculty was deputed for university examination evaluation, biometric device offline)..."
                value={correctionForm.reason}
                onChange={e => setCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Additional Remarks</label>
              <input
                type="text"
                className="form-input"
                placeholder="Optional administrative notes..."
                value={correctionForm.remarks}
                onChange={e => setCorrectionForm(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
