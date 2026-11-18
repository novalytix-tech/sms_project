// ==========================================
// School-Scoped & Platform-Wide Reporting Center
// Developed by NTS Novalytix
// Strictly enforces Multi-School Isolation & Service Entitlements
// ==========================================

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { institutionService } from '../../services/institutionService';
import { classService } from '../../services/classService';
import { reportService, ReportCategory, ReportFilters } from '../../services/reportService';
import { exportToCSV } from '../../utils/export';
import { formatCurrencyINR, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import './reports.css';
import { BarChart3, Download, Printer, FileSpreadsheet, Users, IndianRupee, CalendarCheck, BookOpen, Briefcase, Bus, Megaphone, Building2, Layers, ShieldCheck, History, AlertCircle, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { todayISO } from '../../utils/date';

export const ReportsPage: React.FC = () => {
  const { currentRole, currentUser, schoolSettings, addToast } = useERP();

  // 1. School Scoping State & Strict Scope Tamper Protection
  const isSuperAdmin = currentRole === 'super_admin';
  const defaultSchoolId = isSuperAdmin ? 'inst-1' : (currentUser.institutionId || '');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(defaultSchoolId);

  // Authoritative scope: Non-super-admins are locked strictly to their own institutionId
  const effectiveSchoolId = useMemo(() => {
    if (isSuperAdmin) return selectedSchoolId;
    return currentUser.institutionId || '';
  }, [isSuperAdmin, selectedSchoolId, currentUser.institutionId]);

  // Available partner schools
  const availableSchools = useMemo(() => {
    return reportService.getAvailableSchools(currentRole, currentUser.institutionId);
  }, [currentRole, currentUser.institutionId]);

  // Current active institution entity
  const currentInstitution = useMemo(() => {
    if (effectiveSchoolId === 'ALL') return null;
    return institutionService.getById(effectiveSchoolId) || null;
  }, [effectiveSchoolId]);

  // 2. Report Category State
  // Single-school tabs vs Platform-wide consolidated tabs
  const isConsolidated = effectiveSchoolId === 'ALL';
  const [reportCategory, setReportCategory] = useState<ReportCategory>(() =>
    isConsolidated ? 'platform_overview' : 'students'
  );

  // When switching between single school and ALL, reset category to appropriate default
  useEffect(() => {
    if (effectiveSchoolId === 'ALL') {
      if (!['platform_overview', 'service_adoption', 'school_comparison', 'audit_trail'].includes(reportCategory)) {
        setReportCategory('platform_overview');
      }
    } else {
      if (['platform_overview', 'service_adoption', 'school_comparison', 'audit_trail'].includes(reportCategory)) {
        setReportCategory('students');
      }
    }
  }, [effectiveSchoolId]);

  // 3. Sub-Filters State
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [reportDate, setReportDate] = useState<string>(() => todayISO());
  const [filterClassId, setFilterClassId] = useState<string>('');

  // Classes available strictly for the selected school (strictly filtered, zero unsafe fallbacks)
  const schoolClasses = useMemo(() => {
    if (effectiveSchoolId === 'ALL') return classService.getAll();
    return classService.getAll().filter(c => c.institutionId === effectiveSchoolId);
  }, [effectiveSchoolId]);

  // Construct active filter object
  const activeFilters: ReportFilters = useMemo(() => ({
    schoolId: effectiveSchoolId,
    academicYear,
    date: reportDate,
    classId: filterClassId,
    reportCategory,
  }), [effectiveSchoolId, academicYear, reportDate, filterClassId, reportCategory]);

  // 4. Data Extraction via reportService (guaranteeing school scoping)
  const studentData = useMemo(() => reportService.getStudentReport(activeFilters), [activeFilters]);
  const admissionData = useMemo(() => reportService.getAdmissionReport(activeFilters), [activeFilters]);
  const feeData = useMemo(() => reportService.getFeeReport(activeFilters), [activeFilters]);
  const attendanceData = useMemo(() => reportService.getAttendanceReport(activeFilters), [activeFilters]);
  const academicData = useMemo(() => reportService.getAcademicReport(activeFilters), [activeFilters]);
  const teacherData = useMemo(() => reportService.getTeacherReport(activeFilters), [activeFilters]);
  const transportData = useMemo(() => reportService.getTransportReport(activeFilters), [activeFilters]);
  const marketingData = useMemo(() => reportService.getMarketingReport(activeFilters), [activeFilters]);

  // Platform-wide consolidated data
  const platformOverviewData = useMemo(() => reportService.getPlatformOverview(), []);
  const serviceAdoptionData = useMemo(() => reportService.getServiceAdoption(), []);
  const comparisonData = useMemo(() => reportService.getCrossSchoolComparison(), []);
  const auditLogs = useMemo(() => reportService.getPlatformAuditTrail(), []);
  const unresolvedAuditData = useMemo(() => reportService.getUnresolvedRecordsReport(), []);

  // 5. Export to CSV Handler (Strictly scoped)
  const handleExportCSV = () => {
    const schoolLabel = currentInstitution
      ? `${currentInstitution.name.replace(/\s+/g, '_')}_${currentInstitution.code}`
      : 'All_Partner_Schools_Consolidated';
    const filename = `${schoolLabel}_${reportCategory.toUpperCase()}_${academicYear}`;

    if (reportCategory === 'students') {
      const headers = ['Admission No', 'Student Name', 'Gender', 'Class', 'Roll', 'Parent Name', 'Phone', 'Email', 'Status', 'School ID'];
      const rows = studentData.rows.map(s => [
        s.admissionNo,
        s.fullName,
        s.gender,
        `${s.className}-${s.section}`,
        s.rollNo,
        s.parentName,
        s.parentPhone,
        s.parentEmail,
        s.status,
        s.institutionId || effectiveSchoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'admissions') {
      const headers = ['Application No', 'Student Name', 'Target Class', 'Stage', 'Source', 'Parent Name', 'Phone', 'Fee Amount', 'Fee Paid', 'School ID'];
      const rows = admissionData.rows.map(a => [
        a.applicationNo,
        `${a.firstName} ${a.lastName}`,
        a.targetClassName,
        a.stage,
        a.source,
        a.parentName,
        a.parentPhone,
        a.admissionFeeAmount,
        a.isFeePaid ? 'YES' : 'NO',
        a.institutionId || effectiveSchoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'fees') {
      const headers = ['Invoice No', 'Student Name', 'Class', 'Category', 'Total Billed (₹)', 'Paid (₹)', 'Due Balance (₹)', 'Due Date', 'Status', 'School ID'];
      const rows = feeData.rows.map(i => [
        i.invoiceNo,
        i.studentName,
        `${i.className}-${i.section}`,
        i.category,
        i.totalAmount,
        i.paidAmount,
        Math.max(0, i.totalAmount - i.paidAmount),
        i.dueDate,
        i.status,
        i.institutionId || effectiveSchoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'outstanding') {
      const headers = ['Invoice No', 'Student Name', 'Class', 'Category', 'Overdue Amount (₹)', 'Due Date', 'Status', 'School ID'];
      const overdueOnly = feeData.rows.filter(i => i.totalAmount > i.paidAmount);
      const rows = overdueOnly.map(i => [
        i.invoiceNo,
        i.studentName,
        `${i.className}-${i.section}`,
        i.category,
        Math.max(0, i.totalAmount - i.paidAmount),
        i.dueDate,
        i.status,
        i.institutionId || effectiveSchoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'attendance') {
      const headers = ['Admission No', 'Student Name', 'Class', 'Section', 'Roll No', 'Report Date', 'Day Status', 'Remarks', 'Cumulative Attendance %', 'School ID'];
      const rows = attendanceData.rows.map(r => [
        r.admissionNo,
        r.fullName,
        r.className,
        r.section,
        r.rollNo,
        reportDate,
        r.status.toUpperCase(),
        r.remarks || '',
        `${r.cumulativePercentage}%`,
        effectiveSchoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'teachers') {
      const headers = ['Staff ID', 'Teacher Name', 'Designation', 'Department', 'Phone', 'Email', 'Status', 'School ID'];
      const rows = teacherData.rows.map(t => [
        t.staffId,
        t.fullName,
        t.designation,
        t.department,
        t.phone,
        t.email,
        t.status,
        t.institutionId || effectiveSchoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'transport') {
      const headers = ['Route No', 'Route Name', 'Vehicle No', 'Driver Name', 'Driver Phone', 'Capacity', 'Assigned Students', 'School ID'];
      const rows = transportData.rows.map(r => [
        r.routeNumber,
        r.routeName,
        r.vehicleNo,
        r.driverName,
        r.driverPhone,
        r.capacity,
        r.assignedStudentsCount,
        r.institutionId || selectedSchoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'marketing') {
      const headers = ['Campaign ID', 'Campaign Name', 'Channel', 'Monthly Budget (₹)', 'Spend to Date (₹)', 'Leads', 'Conversions', 'Status', 'School ID'];
      const rows = marketingData.campaigns.map(c => [
        c.id,
        c.name,
        c.channel,
        c.monthlyBudget,
        c.spendToDate,
        c.leadsGenerated,
        c.conversionsCount || 0,
        c.status,
        c.schoolId,
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'school_comparison') {
      const headers = ['School ID', 'School Name', 'Code', 'Board', 'City', 'Status', 'Plan Package', 'Students', 'Faculty', 'Billed (₹)', 'Collected (₹)', 'Marketing Active'];
      const rows = comparisonData.map(c => [
        c.schoolId,
        c.schoolName,
        c.code,
        c.board,
        c.city,
        c.status,
        c.packageId,
        c.studentCount,
        c.teacherCount,
        c.totalBilled,
        c.totalCollected,
        c.isMarketingEnabled ? 'YES' : 'NO',
      ]);
      exportToCSV(filename, headers, rows);
    } else if (reportCategory === 'service_adoption') {
      const headers = ['School ID', 'School Name', 'Core ERP', 'Digital Marketing', 'Admissions', 'Attendance', 'Fees', 'Examinations', 'Transport'];
      const rows = serviceAdoptionData.schoolConfigs.map(c => [
        c.schoolId,
        c.schoolName,
        c.entitlements.core_erp?.enabled ? 'ENABLED' : 'DISABLED',
        c.entitlements.digital_marketing?.enabled ? 'ENABLED' : 'DISABLED',
        c.entitlements.admissions?.enabled ? 'ENABLED' : 'DISABLED',
        c.entitlements.attendance?.enabled ? 'ENABLED' : 'DISABLED',
        c.entitlements.fees?.enabled ? 'ENABLED' : 'DISABLED',
        c.entitlements.examinations?.enabled ? 'ENABLED' : 'DISABLED',
        c.entitlements.transport?.enabled ? 'ENABLED' : 'DISABLED',
      ]);
      exportToCSV(filename, headers, rows);
    } else {
      addToast('info', 'Report Exported', 'Report records processed.');
      return;
    }

    addToast('success', 'Report Exported', `Scoped CSV generated for ${currentInstitution?.name || 'All Partner Schools'}.`);
  };

  return (
    <div className="reports-container">
      {/* ========================================================
          1. HEADER & SEARCHABLE SCHOOL SCOPE SELECTOR
          ======================================================== */}
      <div className="reports-header-card">
        <div className="reports-header-top">
          <div className="reports-title-area">
            <h1>
              <BarChart3 size={24} color="#3B82F6" />
              <span>Institutional Reports & Analytics</span>
            </h1>
            <p>
              Audited academic records, admissions, financial reconciliations, and platform insights
            </p>

            {/* Scope Indicator Badge */}
            <div>
              {isConsolidated ? (
                <span className="reports-scope-badge consolidated">
                  <Layers size={14} />
                  <span>Report Scope: All Partner Schools (Consolidated Platform Audit)</span>
                </span>
              ) : currentInstitution ? (
                <span className="reports-scope-badge">
                  <Building2 size={14} />
                  <span>
                    Report Scope: {currentInstitution.name} ({currentInstitution.code} • {currentInstitution.board} • {currentInstitution.city})
                  </span>
                </span>
              ) : (
                <span className="reports-scope-badge locked">
                  <Lock size={14} />
                  <span>Report Scope: {schoolSettings.schoolName}</span>
                </span>
              )}
            </div>
          </div>

          {/* School Selector Controls */}
          <div className="reports-scope-controls no-print">
            {isSuperAdmin ? (
              <div className="reports-school-select-box">
                <label htmlFor="school-scope-select">Select Reporting Scope:</label>
                <select
                  id="school-scope-select"
                  className="reports-school-select"
                  value={selectedSchoolId}
                  onChange={e => {
                    setSelectedSchoolId(e.target.value);
                    setFilterClassId(''); // Reset class filter upon switching school
                  }}
                >
                  <optgroup label="Partner Schools (School-Specific)">
                    {availableSchools.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.board} • {inst.code})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Platform Multi-Tenant View">
                    <option value="ALL">🌐 All Partner Schools (Consolidated Report)</option>
                  </optgroup>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                <Lock size={14} />
                <span>Scope locked to {schoolSettings.schoolName}</span>
              </div>
            )}

            {/* Print & Export Actions */}
            <div className="reports-actions-group">
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
                title="Print official letterhead report"
              >
                <Printer size={15} />
                <span>Print Report</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExportCSV}
                title="Export filtered records to CSV"
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. PRINT LETTERHEAD (Displayed only during print)
          ======================================================== */}
      <div className="reports-letterhead">
        <div className="reports-letterhead-header">
          <div>
            <h1 className="reports-letterhead-title">
              {currentInstitution ? currentInstitution.name : 'Novalytix School ERP — Network Operations'}
            </h1>
            <div className="reports-letterhead-meta">
              {currentInstitution ? (
                <>
                  <div>{currentInstitution.address}, {currentInstitution.city}, {currentInstitution.state}</div>
                  <div>Board Affiliation: {currentInstitution.board} • School Code: {currentInstitution.code} • Contact: {currentInstitution.contactEmail}</div>
                </>
              ) : (
                <div>Consolidated Multi-School Network Performance & Governance Audit</div>
              )}
            </div>
          </div>
          <div className="reports-letterhead-stamp">
            Official Institutional Record<br />Confidential
          </div>
        </div>
        <div className="reports-letterhead-scope">
          Report Category: {reportCategory.replace('_', ' ').toUpperCase()} • Academic Year: {academicYear} • As of: {formatDate(reportDate)}
        </div>
      </div>

      {/* ========================================================
          3. NAVIGATION TABS (School-Specific vs Consolidated)
          ======================================================== */}
      <div className="reports-tabs-nav no-print">
        {!isConsolidated ? (
          <>
            <button
              className={`reports-tab-btn ${reportCategory === 'students' ? 'active' : ''}`}
              onClick={() => setReportCategory('students')}
            >
              <Users size={15} />
              <span>Student Enrolment</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'admissions' ? 'active' : ''}`}
              onClick={() => setReportCategory('admissions')}
            >
              <BookOpen size={15} />
              <span>Admissions Pipeline</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'attendance' ? 'active' : ''}`}
              onClick={() => setReportCategory('attendance')}
            >
              <CalendarCheck size={15} />
              <span>Daily Attendance</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'fees' ? 'active' : ''}`}
              onClick={() => setReportCategory('fees')}
            >
              <IndianRupee size={15} />
              <span>Fee Collections</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'outstanding' ? 'active' : ''}`}
              onClick={() => setReportCategory('outstanding')}
            >
              <FileSpreadsheet size={15} />
              <span>Outstanding Dues</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'academics' ? 'active' : ''}`}
              onClick={() => setReportCategory('academics')}
            >
              <ShieldCheck size={15} />
              <span>Exams & Marks</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'teachers' ? 'active' : ''}`}
              onClick={() => setReportCategory('teachers')}
            >
              <Briefcase size={15} />
              <span>Faculty & Staff</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'transport' ? 'active' : ''}`}
              onClick={() => setReportCategory('transport')}
            >
              <Bus size={15} />
              <span>Transport Fleet</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'marketing' ? 'active' : ''}`}
              onClick={() => setReportCategory('marketing')}
            >
              <Megaphone size={15} />
              <span>Digital Marketing</span>
            </button>
          </>
        ) : (
          <>
            <button
              className={`reports-tab-btn ${reportCategory === 'platform_overview' ? 'active' : ''}`}
              onClick={() => setReportCategory('platform_overview')}
            >
              <Building2 size={15} />
              <span>Platform Overview</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'service_adoption' ? 'active' : ''}`}
              onClick={() => setReportCategory('service_adoption')}
            >
              <Layers size={15} />
              <span>Service Entitlements Matrix</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'school_comparison' ? 'active' : ''}`}
              onClick={() => setReportCategory('school_comparison')}
            >
              <BarChart3 size={15} />
              <span>Cross-School Comparison</span>
            </button>

            <button
              className={`reports-tab-btn ${reportCategory === 'audit_trail' ? 'active' : ''}`}
              onClick={() => setReportCategory('audit_trail')}
            >
              <History size={15} />
              <span>Platform Audit Trail</span>
            </button>
          </>
        )}
      </div>

      {/* ========================================================
          4. SUB-FILTERS BAR (Only for applicable reports)
          ======================================================== */}
      {!isConsolidated && (
        <div className="reports-filter-bar no-print">
          <div className="reports-filter-group">
            <div className="reports-filter-item">
              <label htmlFor="rep-academic-year">Academic Year:</label>
              <select
                id="rep-academic-year"
                className="reports-filter-input"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>

            {reportCategory === 'attendance' && (
              <div className="reports-filter-item">
                <label htmlFor="rep-date">Report Date:</label>
                <input
                  id="rep-date"
                  type="date"
                  className="reports-filter-input"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                />
              </div>
            )}

            {['students', 'attendance', 'academics'].includes(reportCategory) && (
              <div className="reports-filter-item">
                <label htmlFor="rep-class">Class & Section:</label>
                <select
                  id="rep-class"
                  className="reports-filter-input"
                  value={filterClassId}
                  onChange={e => setFilterClassId(e.target.value)}
                >
                  <option value="">All Classes ({schoolClasses.length})</option>
                  {schoolClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ fontSize: '11px', color: '#71717a' }}>
            Data strictly isolated to <strong>{currentInstitution?.name || 'Selected School'}</strong> (ID: {selectedSchoolId})
          </div>
        </div>
      )}

      {/* ========================================================
          5. REPORT CONTENT PANELS
          ======================================================== */}
      <div className="card">
        {/* ==================== A. STUDENT ENROLMENT REPORT ==================== */}
        {reportCategory === 'students' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Student Enrolment & Strength Summary</h2>
                <p className="card-subtitle">
                  Academic cohort distribution for {currentInstitution?.name} ({academicYear})
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Total Enrolled</span>
                    <span className="reports-kpi-value">{studentData.totalStudents}</span>
                    <span className="reports-kpi-subtext positive">{studentData.activeCount} Active</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><Users size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Male Students</span>
                    <span className="reports-kpi-value">{studentData.maleCount}</span>
                    <span className="reports-kpi-subtext">
                      {studentData.totalStudents > 0 ? `${Math.round((studentData.maleCount / studentData.totalStudents) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="reports-kpi-icon blue"><Users size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Female Students</span>
                    <span className="reports-kpi-value">{studentData.femaleCount}</span>
                    <span className="reports-kpi-subtext">
                      {studentData.totalStudents > 0 ? `${Math.round((studentData.femaleCount / studentData.totalStudents) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="reports-kpi-icon amber"><Users size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Active Sections</span>
                    <span className="reports-kpi-value">{studentData.classBreakdown.length}</span>
                    <span className="reports-kpi-subtext">Classrooms in session</span>
                  </div>
                  <div className="reports-kpi-icon green"><BookOpen size={20} /></div>
                </div>
              </div>

              {/* Student Directory Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Gender</th>
                      <th>Class & Section</th>
                      <th>Roll #</th>
                      <th>Guardian Name</th>
                      <th>Guardian Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                          No student records found for {currentInstitution?.name} under active filters.
                        </td>
                      </tr>
                    ) : (
                      studentData.rows.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>{s.admissionNo}</td>
                          <td style={{ fontWeight: 700 }}>{s.fullName}</td>
                          <td>{s.gender}</td>
                          <td>{s.className} ({s.section})</td>
                          <td>{s.rollNo}</td>
                          <td>{s.parentName}</td>
                          <td>{s.parentPhone}</td>
                          <td><Badge status={s.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ==================== B. ADMISSIONS PIPELINE REPORT ==================== */}
        {reportCategory === 'admissions' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Admissions & Enquiries Pipeline</h2>
                <p className="card-subtitle">
                  Applicant conversion tracking for {currentInstitution?.name} ({academicYear})
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Total Applications</span>
                    <span className="reports-kpi-value">{admissionData.totalApplications}</span>
                    <span className="reports-kpi-subtext">All channels</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><BookOpen size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Enrolled Students</span>
                    <span className="reports-kpi-value">{admissionData.enrolledCount}</span>
                    <span className="reports-kpi-subtext positive">{admissionData.conversionRate}% Conversion Rate</span>
                  </div>
                  <div className="reports-kpi-icon green"><CheckCircle size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Open Inquiries</span>
                    <span className="reports-kpi-value">{admissionData.inquiryCount}</span>
                    <span className="reports-kpi-subtext">Follow-up needed</span>
                  </div>
                  <div className="reports-kpi-icon amber"><AlertCircle size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Under Review</span>
                    <span className="reports-kpi-value">{admissionData.pendingReviewCount}</span>
                    <span className="reports-kpi-subtext">Principal & Docs</span>
                  </div>
                  <div className="reports-kpi-icon blue"><ShieldCheck size={20} /></div>
                </div>
              </div>

              {/* Admissions Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Application #</th>
                      <th>Applicant Name</th>
                      <th>Target Class</th>
                      <th>Source</th>
                      <th>Guardian</th>
                      <th>Phone</th>
                      <th>Stage</th>
                      <th>Fee Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissionData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                          No admission applications on file for {currentInstitution?.name}.
                        </td>
                      </tr>
                    ) : (
                      admissionData.rows.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>{a.applicationNo}</td>
                          <td style={{ fontWeight: 700 }}>{a.firstName} {a.lastName}</td>
                          <td>{a.targetClassName}</td>
                          <td><span className="badge badge-secondary">{a.source}</span></td>
                          <td>{a.parentName} ({a.parentRelation})</td>
                          <td>{a.parentPhone}</td>
                          <td><Badge status={a.stage} /></td>
                          <td>
                            <span style={{ fontWeight: 700, color: a.isFeePaid ? '#16a34a' : '#d97706' }}>
                              {a.isFeePaid ? 'Cleared (₹' + a.admissionFeeAmount.toLocaleString('en-IN') + ')' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ==================== C. DAILY & CUMULATIVE ATTENDANCE ==================== */}
        {reportCategory === 'attendance' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Daily Attendance & Roll Call Performance</h2>
                <p className="card-subtitle">
                  Session records for {formatDate(reportDate)} at {currentInstitution?.name}
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Attendance Rate</span>
                    <span className="reports-kpi-value" style={{ color: '#16a34a' }}>
                      {attendanceData.recordedCount > 0 ? `${attendanceData.dayAttendanceRate}%` : '—'}
                    </span>
                    <span className="reports-kpi-subtext">Recorded: {attendanceData.recordedCount} / {attendanceData.totalTargetStudents}</span>
                  </div>
                  <div className="reports-kpi-icon green"><CalendarCheck size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Present</span>
                    <span className="reports-kpi-value" style={{ color: '#16a34a' }}>{attendanceData.presentCount}</span>
                    <span className="reports-kpi-subtext positive">In classroom</span>
                  </div>
                  <div className="reports-kpi-icon green"><CheckCircle size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Absent</span>
                    <span className="reports-kpi-value" style={{ color: '#dc2626' }}>{attendanceData.absentCount}</span>
                    <span className="reports-kpi-subtext danger">Unexcused / Leave</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><AlertCircle size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Late Arrivals</span>
                    <span className="reports-kpi-value" style={{ color: '#d97706' }}>{attendanceData.lateCount}</span>
                    <span className="reports-kpi-subtext">Marked late</span>
                  </div>
                  <div className="reports-kpi-icon amber"><History size={20} /></div>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Class & Section</th>
                      <th>Roll #</th>
                      <th>Status ({formatDate(reportDate)})</th>
                      <th>Remarks</th>
                      <th>Cumulative Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                          No students found matching active class filter for {currentInstitution?.name}.
                        </td>
                      </tr>
                    ) : (
                      attendanceData.rows.map(r => (
                        <tr key={r.studentId}>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>{r.admissionNo}</td>
                          <td style={{ fontWeight: 700 }}>{r.fullName}</td>
                          <td>{r.className} ({r.section})</td>
                          <td>{r.rollNo}</td>
                          <td>
                            {r.status === 'unrecorded' ? (
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Not recorded</span>
                            ) : (
                              <Badge status={r.status} />
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>{r.remarks || '—'}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: r.cumulativePercentage >= 75 ? '#16a34a' : '#d97706' }}>
                              {r.cumulativePercentage}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ==================== D. FEE COLLECTIONS & RECONCILIATIONS ==================== */}
        {reportCategory === 'fees' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Institutional Fee Collections & Invoicing</h2>
                <p className="card-subtitle">
                  Financial reconciliations for {currentInstitution?.name} ({academicYear})
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Total Invoiced</span>
                    <span className="reports-kpi-value">{formatCurrencyINR(feeData.totalBilled)}</span>
                    <span className="reports-kpi-subtext">{feeData.rows.length} Total Invoices</span>
                  </div>
                  <div className="reports-kpi-icon blue"><IndianRupee size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Total Collected</span>
                    <span className="reports-kpi-value" style={{ color: '#16a34a' }}>
                      {formatCurrencyINR(feeData.totalCollected)}
                    </span>
                    <span className="reports-kpi-subtext positive">{feeData.collectionRate}% Collection Rate</span>
                  </div>
                  <div className="reports-kpi-icon green"><CheckCircle size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Outstanding Dues</span>
                    <span className="reports-kpi-value" style={{ color: feeData.totalOutstanding > 0 ? '#dc2626' : '#64748b' }}>
                      {formatCurrencyINR(feeData.totalOutstanding)}
                    </span>
                    <span className="reports-kpi-subtext danger">{feeData.overdueInvoicesCount} Overdue Invoices</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><AlertCircle size={20} /></div>
                </div>
              </div>

              {/* Fee Invoices Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Student Name</th>
                      <th>Class & Section</th>
                      <th>Category</th>
                      <th>Billed (₹)</th>
                      <th>Paid (₹)</th>
                      <th>Balance Due (₹)</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                          No fee invoices on file for {currentInstitution?.name}.
                        </td>
                      </tr>
                    ) : (
                      feeData.rows.map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>{inv.invoiceNo}</td>
                          <td style={{ fontWeight: 700 }}>{inv.studentName}</td>
                          <td>{inv.className} ({inv.section})</td>
                          <td>{inv.category}</td>
                          <td style={{ fontWeight: 700 }}>{formatCurrencyINR(inv.totalAmount)}</td>
                          <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatCurrencyINR(inv.paidAmount)}</td>
                          <td style={{ color: inv.totalAmount - inv.paidAmount > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                            {formatCurrencyINR(Math.max(0, inv.totalAmount - inv.paidAmount))}
                          </td>
                          <td>{formatDate(inv.dueDate)}</td>
                          <td><Badge status={inv.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ==================== E. OUTSTANDING DUES REPORT ==================== */}
        {reportCategory === 'outstanding' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Outstanding Fee Dues & Arrears</h2>
                <p className="card-subtitle">
                  Unpaid fee balances requiring recovery for {currentInstitution?.name}
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Total Overdue Dues</span>
                    <span className="reports-kpi-value" style={{ color: '#dc2626' }}>
                      {formatCurrencyINR(feeData.totalOutstanding)}
                    </span>
                    <span className="reports-kpi-subtext danger">Arrears to be collected</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><AlertCircle size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Overdue Student Invoices</span>
                    <span className="reports-kpi-value">{feeData.overdueInvoicesCount}</span>
                    <span className="reports-kpi-subtext">Actionable balances</span>
                  </div>
                  <div className="reports-kpi-icon amber"><FileSpreadsheet size={20} /></div>
                </div>
              </div>

              {/* Overdue Invoices Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Student Name</th>
                      <th>Class & Section</th>
                      <th>Category</th>
                      <th>Overdue Balance (₹)</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeData.rows.filter(i => i.totalAmount > i.paidAmount).length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#16a34a', fontWeight: 600 }}>
                          ✓ Outstanding dues clear. All student invoices for {currentInstitution?.name} are fully paid.
                        </td>
                      </tr>
                    ) : (
                      feeData.rows.filter(i => i.totalAmount > i.paidAmount).map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>{inv.invoiceNo}</td>
                          <td style={{ fontWeight: 700 }}>{inv.studentName}</td>
                          <td>{inv.className} ({inv.section})</td>
                          <td>{inv.category}</td>
                          <td style={{ color: '#dc2626', fontWeight: 800 }}>
                            {formatCurrencyINR(Math.max(0, inv.totalAmount - inv.paidAmount))}
                          </td>
                          <td>{formatDate(inv.dueDate)}</td>
                          <td><Badge status={inv.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ==================== F. ACADEMIC PERFORMANCE & MARKS ==================== */}
        {reportCategory === 'academics' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Academic Examination Performance</h2>
                <p className="card-subtitle">
                  Summative assessments and grade averages for {currentInstitution?.name}
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">School Average Score</span>
                    <span className="reports-kpi-value" style={{ color: '#16a34a' }}>
                      {academicData.averageScorePercentage}%
                    </span>
                    <span className="reports-kpi-subtext positive">{academicData.passRate}% Pass Rate</span>
                  </div>
                  <div className="reports-kpi-icon green"><ShieldCheck size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Evaluations Logged</span>
                    <span className="reports-kpi-value">{academicData.totalSubmissions}</span>
                    <span className="reports-kpi-subtext">Across {academicData.totalExams} examinations</span>
                  </div>
                  <div className="reports-kpi-icon blue"><BookOpen size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">A1 / A2 Merits</span>
                    <span className="reports-kpi-value">
                      {(academicData.gradeDistribution['A1'] || 0) + (academicData.gradeDistribution['A2'] || 0)}
                    </span>
                    <span className="reports-kpi-subtext">Top tier performers</span>
                  </div>
                  <div className="reports-kpi-icon amber"><CheckCircle size={20} /></div>
                </div>
              </div>

              {/* Top Academic Achievers */}
              <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#19191f' }}>
                  Top Academic Achievers — {currentInstitution?.name}
                </h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Admission No</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Cumulative Score %</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academicData.topAchievers.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                            No exam score records on file for {currentInstitution?.name}.
                          </td>
                        </tr>
                      ) : (
                        academicData.topAchievers.map(ach => (
                          <tr key={ach.studentId}>
                            <td style={{ fontWeight: 700, color: '#3B82F6' }}>{ach.admissionNo}</td>
                            <td style={{ fontWeight: 700 }}>{ach.name}</td>
                            <td>{ach.className}</td>
                            <td style={{ fontWeight: 800, color: '#16a34a' }}>{ach.percentage}%</td>
                            <td><Badge status="present" label={ach.grade} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== G. FACULTY & STAFF DIRECTORY ==================== */}
        {reportCategory === 'teachers' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Faculty & Teaching Staff Roster</h2>
                <p className="card-subtitle">
                  Academic personnel assigned to {currentInstitution?.name}
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Teaching Staff</span>
                    <span className="reports-kpi-value">{teacherData.totalTeachers}</span>
                    <span className="reports-kpi-subtext positive">{teacherData.activeCount} Active</span>
                  </div>
                  <div className="reports-kpi-icon green"><Briefcase size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Student-Teacher Ratio</span>
                    <span className="reports-kpi-value">{teacherData.studentTeacherRatio}</span>
                    <span className="reports-kpi-subtext">Classroom coverage</span>
                  </div>
                  <div className="reports-kpi-icon blue"><Users size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Departments</span>
                    <span className="reports-kpi-value">{Object.keys(teacherData.departmentBreakdown).length}</span>
                    <span className="reports-kpi-subtext">Academic faculties</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><BookOpen size={20} /></div>
                </div>
              </div>

              {/* Teachers Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Faculty Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Qualification</th>
                      <th>Contact Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                          No faculty records on file for {currentInstitution?.name}.
                        </td>
                      </tr>
                    ) : (
                      teacherData.rows.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700, color: '#3B82F6' }}>{t.staffId}</td>
                          <td style={{ fontWeight: 700 }}>{t.fullName}</td>
                          <td>{t.designation}</td>
                          <td>{t.department}</td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>{t.qualification}</td>
                          <td>{t.phone}</td>
                          <td><Badge status={t.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ==================== H. TRANSPORT FLEET & BUS ROUTES ==================== */}
        {reportCategory === 'transport' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Transport Fleet & Commute Roster</h2>
                <p className="card-subtitle">
                  Bus routes and student pickup schedules for {currentInstitution?.name}
                </p>
              </div>
            </div>

            <div className="card-body">
              {!transportData.hasTransportConfigured ? (
                <div className="reports-disabled-banner">
                  <div className="reports-disabled-title">
                    <AlertCircle size={20} />
                    <span>No Transport Fleet Configured for {currentInstitution?.name}</span>
                  </div>
                  <p className="reports-disabled-desc">
                    This school does not currently operate an in-house bus fleet, or students commute via private arrangement.
                    No active transport routes are logged in the database.
                  </p>
                </div>
              ) : (
                <>
                  <div className="reports-kpi-grid">
                    <div className="reports-kpi-card">
                      <div className="reports-kpi-info">
                        <span className="reports-kpi-label">Active Routes</span>
                        <span className="reports-kpi-value">{transportData.totalRoutes}</span>
                        <span className="reports-kpi-subtext">{transportData.totalVehicles} Vehicles</span>
                      </div>
                      <div className="reports-kpi-icon crimson"><Bus size={20} /></div>
                    </div>

                    <div className="reports-kpi-card">
                      <div className="reports-kpi-info">
                        <span className="reports-kpi-label">Assigned Students</span>
                        <span className="reports-kpi-value">{transportData.totalAssignedStudents}</span>
                        <span className="reports-kpi-subtext positive">{transportData.capacityUtilization}% Capacity Utilization</span>
                      </div>
                      <div className="reports-kpi-icon green"><Users size={20} /></div>
                    </div>

                    <div className="reports-kpi-card">
                      <div className="reports-kpi-info">
                        <span className="reports-kpi-label">Fleet Capacity</span>
                        <span className="reports-kpi-value">{transportData.totalCapacity}</span>
                        <span className="reports-kpi-subtext">Total bus seats</span>
                      </div>
                      <div className="reports-kpi-icon blue"><ShieldCheck size={20} /></div>
                    </div>
                  </div>

                  {/* Routes Table */}
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Route #</th>
                          <th>Route Name</th>
                          <th>Vehicle #</th>
                          <th>Driver Name</th>
                          <th>Driver Contact</th>
                          <th>Capacity</th>
                          <th>Assigned Students</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transportData.rows.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 700, color: '#3B82F6' }}>{r.routeNumber}</td>
                            <td style={{ fontWeight: 700 }}>{r.routeName}</td>
                            <td>{r.vehicleNo}</td>
                            <td>{r.driverName}</td>
                            <td>{r.driverPhone}</td>
                            <td>{r.capacity} seats</td>
                            <td><strong>{r.assignedStudentsCount}</strong> students</td>
                            <td><Badge status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================== I. DIGITAL MARKETING & ATTRIBUTION ==================== */}
        {reportCategory === 'marketing' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Digital Marketing Campaigns & Lead Attribution</h2>
                <p className="card-subtitle">
                  Enrollment advertising performance for {currentInstitution?.name}
                </p>
              </div>
            </div>

            <div className="card-body">
              {!marketingData.isServiceEnabled ? (
                <div className="reports-disabled-banner">
                  <div className="reports-disabled-title">
                    <AlertCircle size={20} />
                    <span>Digital Marketing Service is Disabled for {currentInstitution?.name}</span>
                  </div>
                  <p className="reports-disabled-desc">
                    {marketingData.disabledReason || 'In accordance with active service entitlements, this school is not subscribed to the Digital Marketing module. Ad campaigns, lead acquisition, and spend reports are unavailable.'}
                  </p>
                  {isSuperAdmin && (
                    <button
                      className="btn btn-primary"
                      onClick={() => window.location.href = '/service-entitlements'}
                      style={{ marginTop: '6px' }}
                    >
                      <Layers size={14} />
                      <span>Configure School Service Entitlements</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="reports-kpi-grid">
                    <div className="reports-kpi-card">
                      <div className="reports-kpi-info">
                        <span className="reports-kpi-label">Total Ad Spend</span>
                        <span className="reports-kpi-value">{formatCurrencyINR(marketingData.totalSpend)}</span>
                        <span className="reports-kpi-subtext">{marketingData.activeCampaignsCount} Active Campaigns</span>
                      </div>
                      <div className="reports-kpi-icon blue"><IndianRupee size={20} /></div>
                    </div>

                    <div className="reports-kpi-card">
                      <div className="reports-kpi-info">
                        <span className="reports-kpi-label">Qualified Leads</span>
                        <span className="reports-kpi-value">{marketingData.qualifiedLeads}</span>
                        <span className="reports-kpi-subtext">CPL: {formatCurrencyINR(marketingData.costPerLead)}</span>
                      </div>
                      <div className="reports-kpi-icon green"><Megaphone size={20} /></div>
                    </div>

                    <div className="reports-kpi-card">
                      <div className="reports-kpi-info">
                        <span className="reports-kpi-label">Attributed Admissions</span>
                        <span className="reports-kpi-value" style={{ color: '#16a34a' }}>
                          {marketingData.attributedAdmissions}
                        </span>
                        <span className="reports-kpi-subtext positive">CPA: {formatCurrencyINR(marketingData.costPerAdmission)}</span>
                      </div>
                      <div className="reports-kpi-icon crimson"><CheckCircle size={20} /></div>
                    </div>
                  </div>

                  {/* Campaigns Table */}
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Campaign Code</th>
                          <th>Campaign Name</th>
                          <th>Channel</th>
                          <th>Daily Budget (₹)</th>
                          <th>Total Spent (₹)</th>
                          <th>Leads</th>
                          <th>Conversions</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketingData.campaigns.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                              No marketing campaigns created yet for {currentInstitution?.name}.
                            </td>
                          </tr>
                        ) : (
                          marketingData.campaigns.map(cmp => (
                            <tr key={cmp.id}>
                              <td style={{ fontWeight: 700, color: '#3B82F6' }}>{cmp.id}</td>
                              <td style={{ fontWeight: 700 }}>{cmp.name}</td>
                              <td><span className="badge badge-secondary">{cmp.channel.replace('_', ' ').toUpperCase()}</span></td>
                              <td>{formatCurrencyINR(cmp.monthlyBudget)}</td>
                              <td style={{ fontWeight: 700 }}>{formatCurrencyINR(cmp.spendToDate)}</td>
                              <td><strong>{cmp.leadsGenerated}</strong></td>
                              <td style={{ fontWeight: 700, color: '#16a34a' }}>{cmp.conversionsCount || 0}</td>
                              <td><Badge status={cmp.status} /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            CONSOLIDATED PLATFORM VIEWS (All Partner Schools)
            ======================================================== */}
        {isConsolidated && reportCategory === 'platform_overview' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Multi-School Network Overview & Enterprise Uptime</h2>
                <p className="card-subtitle">
                  Consolidated partner school infrastructure and platform health
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Partner Schools</span>
                    <span className="reports-kpi-value">{platformOverviewData.totalSchools}</span>
                    <span className="reports-kpi-subtext positive">{platformOverviewData.activeSchools} Active Subscriptions</span>
                  </div>
                  <div className="reports-kpi-icon blue"><Building2 size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Network Students</span>
                    <span className="reports-kpi-value">{platformOverviewData.totalNetworkStudents.toLocaleString('en-IN')}</span>
                    <span className="reports-kpi-subtext">Across all member schools</span>
                  </div>
                  <div className="reports-kpi-icon green"><Users size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Network Faculty</span>
                    <span className="reports-kpi-value">{platformOverviewData.totalNetworkTeachers.toLocaleString('en-IN')}</span>
                    <span className="reports-kpi-subtext">Teaching personnel</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><Briefcase size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Platform SLA Uptime</span>
                    <span className="reports-kpi-value" style={{ color: '#16a34a' }}>
                      {platformOverviewData.platformUptime}
                    </span>
                    <span className="reports-kpi-subtext positive">Core Systems Healthy</span>
                  </div>
                  <div className="reports-kpi-icon amber"><ShieldCheck size={20} /></div>
                </div>
              </div>

              {/* Schools Summary Directory */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Institution Code</th>
                      <th>School Name</th>
                      <th>Board</th>
                      <th>Location</th>
                      <th>Principal</th>
                      <th>Student Strength</th>
                      <th>Faculty Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformOverviewData.schools.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700, color: '#3B82F6' }}>{s.code}</td>
                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                        <td>{s.board}</td>
                        <td>{s.city}, {s.state}</td>
                        <td>{s.principal}</td>
                        <td><strong>{s.studentCount}</strong> students</td>
                        <td>{s.teacherCount} faculty</td>
                        <td><Badge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Unresolved Records & Migration Audit Registry */}
              <div style={{ marginTop: '28px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                      Multi-School Data Isolation & Migration Audit Registry
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                      Strict verification of authoritative school links. Ambiguous records without valid parent relationships are quarantined.
                    </p>
                  </div>
                  <span className="reports-chip default" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldCheck size={13} style={{ color: '#16a34a' }} />
                    Idempotent Verification Active
                  </span>
                </div>

                <div className="reports-kpi-grid" style={{ marginBottom: '16px' }}>
                  <div className="reports-kpi-card" style={{ padding: '12px 14px' }}>
                    <div className="reports-kpi-info">
                      <span className="reports-kpi-label">Scanned Database Records</span>
                      <span className="reports-kpi-value" style={{ fontSize: '20px' }}>
                        {unresolvedAuditData?.totalScanned ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="reports-kpi-card" style={{ padding: '12px 14px' }}>
                    <div className="reports-kpi-info">
                      <span className="reports-kpi-label">Authoritative Verified</span>
                      <span className="reports-kpi-value" style={{ fontSize: '20px', color: '#16a34a' }}>
                        {unresolvedAuditData?.verifiedCount ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="reports-kpi-card" style={{ padding: '12px 14px' }}>
                    <div className="reports-kpi-info">
                      <span className="reports-kpi-label">Relational Resolved</span>
                      <span className="reports-kpi-value" style={{ fontSize: '20px', color: '#0f172a' }}>
                        {unresolvedAuditData?.resolvedCount ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="reports-kpi-card" style={{ padding: '12px 14px' }}>
                    <div className="reports-kpi-info">
                      <span className="reports-kpi-label">Quarantined / Ambiguous</span>
                      <span className="reports-kpi-value" style={{ fontSize: '20px', color: (unresolvedAuditData?.unresolvedCount || 0) > 0 ? '#DC2626' : '#16a34a' }}>
                        {unresolvedAuditData?.unresolvedCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {(!unresolvedAuditData?.unresolvedRecords || unresolvedAuditData.unresolvedRecords.length === 0) ? (
                  <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} />
                    <span><strong>100% Data Integrity Verified:</strong> All active database records possess authoritative school linkage or verified relational parents. Zero unassigned records.</span>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Collection</th>
                          <th>Record ID</th>
                          <th>Record Label</th>
                          <th>Quarantine Reason</th>
                          <th>Detected At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unresolvedAuditData.unresolvedRecords.map((rec, idx) => (
                          <tr key={`${rec.recordId}-${idx}`}>
                            <td><span className="reports-chip default">{rec.collection}</span></td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rec.recordId}</td>
                            <td>{rec.recordName || '—'}</td>
                            <td style={{ color: '#3B82F6', fontSize: '12px' }}>{rec.reason}</td>
                            <td style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{rec.detectedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Consolidated Service Adoption Matrix */}
        {isConsolidated && reportCategory === 'service_adoption' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">School Service Entitlements Adoption Matrix</h2>
                <p className="card-subtitle">
                  Feature licensing and module subscription status per partner school
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="reports-kpi-grid">
                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Core ERP Enabled</span>
                    <span className="reports-kpi-value">{serviceAdoptionData.coreErpEnabledCount} / {serviceAdoptionData.totalSchools}</span>
                    <span className="reports-kpi-subtext">Partner institutions</span>
                  </div>
                  <div className="reports-kpi-icon blue"><Layers size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Digital Marketing</span>
                    <span className="reports-kpi-value">{serviceAdoptionData.digitalMarketingEnabledCount} / {serviceAdoptionData.totalSchools}</span>
                    <span className="reports-kpi-subtext">Active growth subscribers</span>
                  </div>
                  <div className="reports-kpi-icon crimson"><Megaphone size={20} /></div>
                </div>

                <div className="reports-kpi-card">
                  <div className="reports-kpi-info">
                    <span className="reports-kpi-label">Transport Fleet</span>
                    <span className="reports-kpi-value">{serviceAdoptionData.transportEnabledCount} / {serviceAdoptionData.totalSchools}</span>
                    <span className="reports-kpi-subtext">GPS tracking enabled</span>
                  </div>
                  <div className="reports-kpi-icon green"><Bus size={20} /></div>
                </div>
              </div>

              {/* Adoption Matrix Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Package</th>
                      <th>Core ERP</th>
                      <th>Digital Marketing</th>
                      <th>Admissions</th>
                      <th>Attendance</th>
                      <th>Fees</th>
                      <th>Examinations</th>
                      <th>Transport</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceAdoptionData.schoolConfigs.map(c => (
                      <tr key={c.schoolId}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{c.schoolName}</div>
                          <div style={{ fontSize: '11px', color: '#71717a' }}>ID: {c.schoolId}</div>
                        </td>
                        <td><span className="badge badge-secondary">{c.package}</span></td>
                        <td>{c.entitlements.core_erp?.enabled ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>}</td>
                        <td>{c.entitlements.digital_marketing?.enabled ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>}</td>
                        <td>{c.entitlements.admissions?.enabled ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>}</td>
                        <td>{c.entitlements.attendance?.enabled ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>}</td>
                        <td>{c.entitlements.fees?.enabled ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>}</td>
                        <td>{c.entitlements.examinations?.enabled ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>}</td>
                        <td>{c.entitlements.transport?.enabled ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* Consolidated Cross-School Comparative Summary */}
        {isConsolidated && reportCategory === 'school_comparison' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Cross-School Comparative Summary</h2>
                <p className="card-subtitle">
                  Operational and financial benchmark comparison across partner schools
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Board & City</th>
                      <th>Status</th>
                      <th>Students</th>
                      <th>Faculty</th>
                      <th>Billed (₹)</th>
                      <th>Collected (₹)</th>
                      <th>Marketing</th>
                      <th className="no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map(c => (
                      <tr key={c.schoolId}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{c.schoolName}</div>
                          <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 700 }}>{c.code}</div>
                        </td>
                        <td>{c.board} • {c.city}</td>
                        <td><Badge status={c.status} /></td>
                        <td><strong>{c.studentCount}</strong></td>
                        <td>{c.teacherCount}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrencyINR(c.totalBilled)}</td>
                        <td style={{ color: '#16a34a', fontWeight: 700 }}>{formatCurrencyINR(c.totalCollected)}</td>
                        <td>
                          {c.isMarketingEnabled ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>Active ({formatCurrencyINR(c.marketingSpend)})</span>
                          ) : (
                            <span style={{ color: '#71717a' }}>Disabled</span>
                          )}
                        </td>
                        <td className="no-print">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedSchoolId(c.schoolId);
                              setReportCategory('students');
                            }}
                            title="Inspect individual school report"
                          >
                            <span>Inspect</span>
                            <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* Consolidated Platform Audit Trail */}
        {isConsolidated && reportCategory === 'audit_trail' && (
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">Platform Activity & Service Audit Logs</h2>
                <p className="card-subtitle">
                  Immutable administrative log of service toggles and subscription changes
                </p>
              </div>
            </div>

            <div className="card-body">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>School Target</th>
                      <th>Action</th>
                      <th>Change Description</th>
                      <th>Operational Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#71717a' }}>
                          No platform service audit logs recorded.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{log.actorName}</div>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>{log.actorRole}</div>
                          </td>
                          <td><span className="badge badge-secondary">{log.schoolId}</span></td>
                          <td><Badge status="info" label={log.action.replace('_', ' ').toUpperCase()} /></td>
                          <td>
                            {log.serviceId ? (
                              <span>
                                <strong>{log.serviceId}</strong>: {log.previousValue} &rarr; <strong>{log.newValue}</strong>
                              </span>
                            ) : (
                              <span>{log.previousValue} &rarr; {log.newValue}</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>{log.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          6. PRINT LETTERHEAD FOOTER (Only visible in print)
          ======================================================== */}
      <div className="reports-print-footer">
        <div>
          Generated via Novalytix School ERP Reporting Engine • Strictly Confidential • Page 1 of 1
        </div>
        <div className="reports-signatory-box">
          Authorized Signatory / Seal
        </div>
      </div>
    </div>
  );
};
