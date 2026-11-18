import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  FileSpreadsheet,
  Trophy,
  Award,
  Users,
} from 'lucide-react';
import { AcademicAward, AwardCategory } from '../../types/academicAwards';

interface AwardsReportsProps {
  awards: AcademicAward[];
  categories: AwardCategory[];
}

export const AwardsReports: React.FC<AwardsReportsProps> = ({ awards, categories }) => {
  const [academicYearFilter, setAcademicYearFilter] = useState('2026-2027');
  const [classFilter, setClassFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Distinct classes
  const classesList = useMemo(() => {
    const set = new Set<string>();
    awards.forEach(a => {
      if (a.className) set.add(a.className);
    });
    return Array.from(set);
  }, [awards]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return awards.filter(a => {
      const matchYear = !academicYearFilter || academicYearFilter === 'all' || a.academicYear === academicYearFilter;
      const matchClass = classFilter === 'all' || a.className === classFilter;
      const matchCat = categoryFilter === 'all' || a.categoryId === categoryFilter;
      const matchLevel = levelFilter === 'all' || a.achievementLevel.toLowerCase() === levelFilter.toLowerCase();
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;

      return matchYear && matchClass && matchCat && matchLevel && matchStatus;
    });
  }, [awards, academicYearFilter, classFilter, categoryFilter, levelFilter, statusFilter]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredRows.length;
    const goldCount = filteredRows.filter(r => r.position.includes('Gold') || r.position === 'Winner').length;
    const distinctStudents = new Set(filteredRows.map(r => r.studentId)).size;
    const publishedCount = filteredRows.filter(r => r.status === 'published').length;

    return { total, goldCount, distinctStudents, publishedCount };
  }, [filteredRows]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Award Title',
      'Student Name',
      'Admission No',
      'Class',
      'Category',
      'Level',
      'Position',
      'Competition / Event',
      'Organizer',
      'Award Date',
      'Academic Year',
      'Status',
      'Presented By',
    ];

    const rows = filteredRows.map(a => [
      `"${a.awardTitle.replace(/"/g, '""')}"`,
      `"${a.studentName.replace(/"/g, '""')}"`,
      `"${a.admissionNo}"`,
      `"${a.className} - ${a.section}"`,
      `"${a.categoryName}"`,
      `"${a.achievementLevel}"`,
      `"${a.position}"`,
      `"${(a.competitionName || '').replace(/"/g, '""')}"`,
      `"${(a.organizer || '').replace(/"/g, '""')}"`,
      `"${a.awardDate}"`,
      `"${a.academicYear}"`,
      `"${a.status}"`,
      `"${a.awardedBy}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `academic_awards_report_${academicYearFilter || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Filters Bar */}
      <div className="awards-card">
        <div className="awards-card-header">
          <h3 className="awards-card-title">
            <Filter size={18} color="#3B82F6" />
            Report Criteria & Dimension Filters
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="awards-btn-secondary" onClick={handlePrint} style={{ gap: '0.4rem', fontSize: '0.825rem' }}>
              <Printer size={15} />
              Print Report
            </button>
            <button className="awards-btn-primary" onClick={handleExportCSV} style={{ gap: '0.4rem', fontSize: '0.825rem' }}>
              <Download size={15} />
              Export to CSV
            </button>
          </div>
        </div>

        <div className="awards-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="awards-form-group">
              <label className="awards-form-label">Academic Year</label>
              <select
                className="awards-select"
                value={academicYearFilter}
                onChange={e => setAcademicYearFilter(e.target.value)}
              >
                <option value="all">All Academic Years</option>
                <option value="2026-2027">2026–2027</option>
                <option value="2025-2026">2025–2026</option>
              </select>
            </div>

            <div className="awards-form-group">
              <label className="awards-form-label">Class</label>
              <select
                className="awards-select"
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
              >
                <option value="all">All Classes</option>
                {classesList.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="awards-form-group">
              <label className="awards-form-label">Category</label>
              <select
                className="awards-select"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="awards-form-group">
              <label className="awards-form-label">Level</label>
              <select
                className="awards-select"
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="School">School</option>
                <option value="Zonal">Zonal</option>
                <option value="District">District</option>
                <option value="State">State</option>
                <option value="National">National</option>
                <option value="International">International</option>
              </select>
            </div>

            <div className="awards-form-group">
              <label className="awards-form-label">Approval Status</label>
              <select
                className="awards-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="awards-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="awards-kpi-card">
          <div className="awards-kpi-icon-wrap awards-kpi-icon-red">
            <Trophy size={24} />
          </div>
          <div>
            <div className="awards-kpi-val">{summaryMetrics.total}</div>
            <div className="awards-kpi-label">Filtered Awards</div>
          </div>
        </div>

        <div className="awards-kpi-card">
          <div className="awards-kpi-icon-wrap awards-kpi-icon-amber">
            <Award size={24} />
          </div>
          <div>
            <div className="awards-kpi-val">{summaryMetrics.goldCount}</div>
            <div className="awards-kpi-label">1st / Gold Honours</div>
          </div>
        </div>

        <div className="awards-kpi-card">
          <div className="awards-kpi-icon-wrap awards-kpi-icon-blue">
            <Users size={24} />
          </div>
          <div>
            <div className="awards-kpi-val">{summaryMetrics.distinctStudents}</div>
            <div className="awards-kpi-label">Distinct Achievers</div>
          </div>
        </div>

        <div className="awards-kpi-card">
          <div className="awards-kpi-icon-wrap awards-kpi-icon-purple">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div className="awards-kpi-val">{summaryMetrics.publishedCount}</div>
            <div className="awards-kpi-label">Published to Hall of Fame</div>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="awards-card">
        <div className="awards-card-header">
          <h3 className="awards-card-title">
            <BarChart3 size={18} color="#3B82F6" />
            Consolidated Awards Report Data
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {filteredRows.length} matching rows
          </span>
        </div>
        <div className="awards-card-body" style={{ padding: 0 }}>
          {filteredRows.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
              No awards matched the selected reporting filters.
            </div>
          ) : (
            <div className="awards-table-wrapper">
              <table className="awards-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Adm No</th>
                    <th>Award Title</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Rank / Position</th>
                    <th>Competition / Event</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {row.studentName}
                      </td>
                      <td>{row.className}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.admissionNo}</td>
                      <td>{row.awardTitle}</td>
                      <td>{row.categoryName}</td>
                      <td>
                        <span className={`award-level-badge level-${row.achievementLevel.toLowerCase()}`}>
                          {row.achievementLevel}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.position}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {row.competitionName || '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{row.awardDate}</td>
                      <td>
                        <span className={`award-status-badge status-${row.status}`}>
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

