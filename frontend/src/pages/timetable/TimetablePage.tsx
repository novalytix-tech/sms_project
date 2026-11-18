// ==========================================
// Weekly Timetable & Period Schedule
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { timetableService } from '../../services/timetableService';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import { studentService } from '../../services/studentService';
import { DayOfWeek } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useERP } from '../../context/ERPContext';
import { Plus, Trash2, AlertTriangle, User, DoorOpen, GraduationCap } from 'lucide-react';
import { DAYS, PERIOD_SLOTS, LUNCH_BREAK, getSubjectTheme } from '../../utils/timetableConstants';

export const TimetablePage: React.FC = () => {
  const { currentRole, currentUser, selectedChild, parentChildren, setSelectedChildId, addToast } = useERP();
  const classes = useMemo(() => classService.getAll(), []);
  const teachers = useMemo(() => teacherService.getAll(), []);

  // Determine active student for student or parent role
  const currentStudent = useMemo(() => {
    if (currentRole === 'student') {
      return (
        (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
        studentService.getAll().find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
        studentService.getAll()[0]
      );
    }
    if (currentRole === 'parent') {
      return selectedChild || parentChildren[0] || null;
    }
    return null;
  }, [currentRole, currentUser, selectedChild, parentChildren]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (currentStudent?.classId) return currentStudent.classId;
    return classes[0]?.id || 'cls-10a';
  });
  const [selectedSection, setSelectedSection] = useState<string>(() => {
    if (currentStudent?.section) return currentStudent.section;
    return 'A';
  });

  // Sync class selection if currentStudent changes
  useEffect(() => {
    if (currentStudent) {
      if (currentStudent.classId) setSelectedClassId(currentStudent.classId);
      if (currentStudent.section) setSelectedSection(currentStudent.section);
    }
  }, [currentStudent]);

  // Today indicator
  const todayDayName = useMemo<DayOfWeek | ''>(() => {
    const dayIndex = new Date().getDay();
    const map: Record<number, DayOfWeek> = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    };
    return map[dayIndex] || '';
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    day: 'Monday' as DayOfWeek,
    periodNo: 1,
    subject: 'Mathematics',
    teacherId: teachers[0]?.id || 'teach-1',
    roomNo: 'Room 301',
  });
  const [conflictError, setConflictError] = useState('');
  const [conflictWarning, setConflictWarning] = useState('');

  const periods = timetableService.getByClass(selectedClassId, selectedSection);
  const currentClass = classes.find(c => c.id === selectedClassId);

  const isStudentView = currentRole === 'student';
  const isParentView = currentRole === 'parent';

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError('');
    setConflictWarning('');

    const teacher = teachers.find(t => t.id === formData.teacherId);
    const teacherName = teacher ? teacher.fullName : 'Teacher';
    const slot = PERIOD_SLOTS.find(s => s.no === formData.periodNo) || PERIOD_SLOTS[0];

    const res = timetableService.createPeriod({
      classId: selectedClassId,
      className: currentClass ? currentClass.name : 'Class 10',
      section: selectedSection,
      day: formData.day,
      periodNo: formData.periodNo,
      startTime: slot.start,
      endTime: slot.end,
      subject: formData.subject,
      teacherId: formData.teacherId,
      teacherName,
      roomNo: formData.roomNo,
    });

    if (!res.success) {
      setConflictError(res.error || 'Conflict detected');
      return;
    }

    if (res.warning) {
      addToast('warning', 'Room Warning', res.warning);
    } else {
      addToast('success', 'Period Scheduled', `Period ${formData.periodNo} on ${formData.day} allocated.`);
    }

    setIsModalOpen(false);
  };

  const handleDeletePeriod = (id: string) => {
    timetableService.deletePeriod(id);
    addToast('info', 'Period Removed', 'Period deleted from timetable.');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>{isStudentView ? 'My Timetable' : isParentView ? 'Ward Timetable' : 'Timetable'}</h1>
          <p className="page-subtitle">
            {isStudentView
              ? `Weekly class schedule for ${currentStudent?.fullName || 'Student'} • ${currentClass?.name || 'Class 10'} (${selectedSection})`
              : isParentView
              ? `Weekly class schedule for ${currentStudent?.fullName || 'Ward'} • ${currentClass?.name || 'Class 10'} (${selectedSection})`
              : 'Weekly class and teacher schedules'}
          </p>
        </div>

        <div className="page-actions">
          {['school_admin', 'super_admin'].includes(currentRole) && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              <span>Add Period</span>
            </button>
          )}
        </div>
      </div>

      {/* Class Selector Bar / Role Context Bar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          {isStudentView ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#DBEAFE',
                  color: '#3B82F6',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  border: '1px solid #FFDCD8',
                }}
              >
                <GraduationCap size={14} />
                <span>Enrolled Class: {currentClass?.name || currentStudent?.className || 'Class 10'} (Section {selectedSection})</span>
              </span>
            </div>
          ) : isParentView ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {parentChildren.length > 1 && (
                <div className="filter-item">
                  <label className="filter-label">Child:</label>
                  <select
                    className="form-select filter-select filter-select-sm"
                    value={currentStudent?.id || ''}
                    onChange={e => setSelectedChildId(e.target.value)}
                    aria-label="Select Child"
                  >
                    {parentChildren.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.className}-{c.section})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#DBEAFE',
                  color: '#3B82F6',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  border: '1px solid #FFDCD8',
                }}
              >
                <GraduationCap size={14} />
                <span>{currentStudent?.fullName}: {currentClass?.name || currentStudent?.className} (Sec {selectedSection})</span>
              </span>
            </div>
          ) : (
            <>
              <div className="filter-item">
                <label className="filter-label">Class:</label>
                <select
                  className="form-select filter-select filter-select-md"
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value);
                    const c = classes.find(item => item.id === e.target.value);
                    if (c) setSelectedSection(c.section);
                  }}
                  aria-label="Select Class"
                >
                  {classes.map(c => (
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
                  aria-label="Select Section"
                >
                  <option value="A">Sec A</option>
                  <option value="B">Sec B</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DoorOpen size={13} color="#94A3B8" /> Room: <strong>{currentClass?.roomNo || 'Room 301'}</strong> • <User size={13} color="#94A3B8" /> Class Teacher: <strong>{currentClass?.classTeacherName || 'Assigned Faculty'}</strong>
          </span>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="card">
        <div className="card-body" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', minWidth: '1240px', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', maxWidth: '120px', background: '#F8FAFC', padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #E2E8F0', boxSizing: 'border-box' }}>
                    Day of Week
                  </th>
                  {PERIOD_SLOTS.slice(0, 4).map(slot => (
                    <th key={slot.no} style={{ width: '130px', maxWidth: '130px', textAlign: 'center', background: '#F8FAFC', padding: '10px 6px', borderBottom: '2px solid #E2E8F0', boxSizing: 'border-box' }}>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: '#0F172A' }}>
                        Period {slot.no}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 500, color: '#64748B', marginTop: '2px' }}>
                        {slot.start} - {slot.end}
                      </div>
                    </th>
                  ))}
                  <th
                    key="recess-header"
                    style={{
                      textAlign: 'center',
                      width: '80px',
                      maxWidth: '80px',
                      background: '#FFF5F4',
                      padding: '10px 4px',
                      borderBottom: '2px solid #FECACA',
                      borderLeft: '1px dashed #FECACA',
                      borderRight: '1px dashed #FECACA',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#991B1B', letterSpacing: '0.5px' }}>
                      RECESS
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: '#B91C1C', marginTop: '2px' }}>
                      {LUNCH_BREAK.start} - {LUNCH_BREAK.end}
                    </div>
                  </th>
                  {PERIOD_SLOTS.slice(4).map(slot => (
                    <th key={slot.no} style={{ width: '130px', maxWidth: '130px', textAlign: 'center', background: '#F8FAFC', padding: '10px 6px', borderBottom: '2px solid #E2E8F0', boxSizing: 'border-box' }}>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: '#0F172A' }}>
                        Period {slot.no}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 500, color: '#64748B', marginTop: '2px' }}>
                        {slot.start} - {slot.end}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => {
                  const isToday = day === todayDayName;

                  const renderPeriodCell = (slot: (typeof PERIOD_SLOTS)[0]) => {
                    const period = periods.find(p => p.day === day && p.periodNo === slot.no);

                    if (!period) {
                      const isSatAfternoon = day === 'Saturday' && slot.no > 4;
                      return (
                        <td key={slot.no} style={{ width: '130px', maxWidth: '130px', verticalAlign: 'middle', padding: '6px', boxSizing: 'border-box' }}>
                          <div
                            style={{
                              height: '84px',
                              boxSizing: 'border-box',
                              border: '1px dashed #CBD5E1',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94A3B8',
                              fontSize: '11px',
                              background: isSatAfternoon ? '#F8FAFC' : '#FAFAFA',
                              padding: '6px',
                              textAlign: 'center',
                            }}
                          >
                            {isSatAfternoon ? (
                              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Half Day Dispersal</span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Free Slot</span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    const theme = getSubjectTheme(period.subject);

                    return (
                      <td key={slot.no} style={{ width: '130px', maxWidth: '130px', verticalAlign: 'middle', padding: '6px', boxSizing: 'border-box' }}>
                        <div
                          style={{
                            height: '84px',
                            boxSizing: 'border-box',
                            background: theme.bg,
                            border: `1px solid ${theme.border}`,
                            borderLeft: `4px solid ${theme.accent}`,
                            borderRadius: '8px',
                            padding: '7px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            overflow: 'hidden',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '12px',
                                color: theme.text,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                paddingRight: ['school_admin', 'super_admin'].includes(currentRole) ? '18px' : '0',
                                lineHeight: 1.2,
                              }}
                              title={period.subject}
                            >
                              {period.subject}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                color: '#475569',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '3px',
                                lineHeight: 1.2,
                              }}
                              title={period.teacherName}
                            >
                              <User size={11} color="#64748B" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{period.teacherName}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                fontWeight: 600,
                                background: theme.badge,
                                color: theme.text,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <DoorOpen size={10} style={{ flexShrink: 0 }} />
                              <span>{period.roomNo}</span>
                            </span>
                          </div>

                          {['school_admin', 'super_admin'].includes(currentRole) && (
                            <button
                              type="button"
                              onClick={() => handleDeletePeriod(period.id)}
                              style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                color: '#94A3B8',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete period"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  };

                  return (
                    <tr
                      key={day}
                      style={{
                        background: isToday ? '#FFFBFB' : '#FFFFFF',
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      <td
                        style={{
                          width: '120px',
                          maxWidth: '120px',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: isToday ? '#3B82F6' : '#0F172A',
                          background: isToday ? '#DBEAFE' : '#F8FAFC',
                          padding: '10px',
                          borderLeft: isToday ? '4px solid #3B82F6' : '4px solid transparent',
                          verticalAlign: 'middle',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ height: '84px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                          <span>{day}</span>
                          {isToday && (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                background: '#3B82F6',
                                color: '#FFFFFF',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                letterSpacing: '0.5px',
                                width: 'fit-content',
                              }}
                            >
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>

                      {PERIOD_SLOTS.slice(0, 4).map(slot => renderPeriodCell(slot))}

                      <td
                        key="recess-cell"
                        style={{
                          width: '80px',
                          maxWidth: '80px',
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          padding: '6px 4px',
                          background: isToday ? '#FFF5F4' : '#FFFBFB',
                          borderLeft: '1px dashed #FECACA',
                          borderRight: '1px dashed #FECACA',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            height: '84px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            color: '#991B1B',
                          }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>LUNCH</span>
                          <span style={{ fontSize: '9px', fontWeight: 600, color: '#B91C1C' }}>40 MINS</span>
                        </div>
                      </td>

                      {PERIOD_SLOTS.slice(4).map(slot => renderPeriodCell(slot))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Period Modal with Conflict Detection */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Period"
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSavePeriod}>
                Save Period
              </button>
            </>
          }
        >
          <form onSubmit={handleSavePeriod}>
            {conflictError && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{conflictError}</span>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Day of Week</label>
                <select
                  className="form-select"
                  value={formData.day}
                  onChange={e => setFormData({ ...formData, day: e.target.value as DayOfWeek })}
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Period Number</label>
                <select
                  className="form-select"
                  value={formData.periodNo}
                  onChange={e => setFormData({ ...formData, periodNo: Number(e.target.value) })}
                >
                  {PERIOD_SLOTS.map(s => (
                    <option key={s.no} value={s.no}>
                      Period {s.no} ({s.start} - {s.end})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Assigned Teacher</label>
                <select
                  className="form-select"
                  value={formData.teacherId}
                  onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Classroom / Hall Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.roomNo}
                onChange={e => setFormData({ ...formData, roomNo: e.target.value })}
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

