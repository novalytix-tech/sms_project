import React, { useState, useMemo } from 'react';
import { Trophy, Plus, Search, Eye, Edit2, Trash2, Send, FileCheck, Users, CheckCircle2, X } from 'lucide-react';
import { AcademicAward, AwardCategory, AwardAchievementLevel, AwardPosition, TeamMember } from '../../types/academicAwards';
import { studentService } from '../../services/studentService';
import { useERP } from '../../context/ERPContext';
import { todayISO } from '../../utils/date';

interface StudentAwardsProps {
  awards: AcademicAward[];
  categories: AwardCategory[];
  onSaveAward: (data: Partial<AcademicAward>) => void;
  onDeleteAward: (id: string) => void;
  onSubmitAward: (id: string) => void;
  onViewCertificate: (award: AcademicAward) => void;
  onViewAward: (award: AcademicAward) => void;
}

export const StudentAwards: React.FC<StudentAwardsProps> = ({
  awards,
  categories,
  onSaveAward,
  onDeleteAward,
  onSubmitAward,
  onViewCertificate,
  onViewAward,
}) => {
  const { currentRole } = useERP();
  const canManage = currentRole === 'school_admin' || currentRole === 'teacher' || currentRole === 'super_admin';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<AcademicAward | null>(null);

  // Form state
  const [awardTitle, setAwardTitle] = useState('');
  const [awardType, setAwardType] = useState<'individual' | 'team'>('individual');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [achievementLevel, setAchievementLevel] = useState<AwardAchievementLevel>('School');
  const [position, setPosition] = useState<AwardPosition>('1st Place / Gold');
  const [competitionName, setCompetitionName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [awardDate, setAwardDate] = useState(todayISO());
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [awardedBy, setAwardedBy] = useState('Principal & School Board');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // All active students from directory
  const allStudents = useMemo(() => studentService.getAll(), []);

  // Selected student snapshot preview
  const currentSelectedStudent = useMemo(() => {
    return allStudents.find(s => s.id === selectedStudentId);
  }, [allStudents, selectedStudentId]);

  // Filtered list
  const filteredAwards = useMemo(() => {
    return awards.filter(a => {
      const matchesSearch =
        !searchTerm ||
        a.awardTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.categoryName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || a.categoryId === categoryFilter;
      const matchesLevel = levelFilter === 'all' || a.achievementLevel.toLowerCase() === levelFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCategory && matchesLevel;
    });
  }, [awards, searchTerm, statusFilter, categoryFilter, levelFilter]);

  const openCreateModal = () => {
    setEditingAward(null);
    setAwardTitle('');
    setAwardType('individual');
    setSelectedStudentId(allStudents[0]?.id || '');
    setSelectedCategoryId(categories[0]?.id || '');
    setAchievementLevel('School');
    setPosition('1st Place / Gold');
    setCompetitionName('');
    setOrganizer('');
    setAwardDate(todayISO());
    setAcademicYear('2026-2027');
    setAwardedBy('Principal & School Board');
    setDescription('');
    setRemarks('');
    setTeamMembers([]);
    setIsModalOpen(true);
  };

  const openEditModal = (award: AcademicAward) => {
    setEditingAward(award);
    setAwardTitle(award.awardTitle);
    setAwardType(award.awardType);
    setSelectedStudentId(award.studentId);
    setSelectedCategoryId(award.categoryId);
    setAchievementLevel(award.achievementLevel);
    setPosition(award.position);
    setCompetitionName(award.competitionName || '');
    setOrganizer(award.organizer || '');
    setAwardDate(award.awardDate);
    setAcademicYear(award.academicYear);
    setAwardedBy(award.awardedBy);
    setDescription(award.description || '');
    setRemarks(award.remarks || '');
    setTeamMembers(award.teamMembers || []);
    setIsModalOpen(true);
  };

  const handleAddTeamMember = (studentId: string) => {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    if (teamMembers.some(m => m.studentId === student.id)) return;

    setTeamMembers([
      ...teamMembers,
      {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
        className: student.className,
        section: student.section,
        rollNo: student.rollNo,
        photoUrl: student.photoUrl,
      },
    ]);
  };

  const handleRemoveTeamMember = (studentId: string) => {
    setTeamMembers(teamMembers.filter(m => m.studentId !== studentId));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardTitle.trim() || !selectedStudentId || !selectedCategoryId) return;

    const payload: Partial<AcademicAward> = {
      ...(editingAward ? { id: editingAward.id } : {}),
      awardTitle: awardTitle.trim(),
      awardType,
      studentId: selectedStudentId,
      categoryId: selectedCategoryId,
      achievementLevel,
      position,
      competitionName: competitionName.trim() || undefined,
      organizer: organizer.trim() || undefined,
      awardDate,
      academicYear,
      awardedBy: awardedBy.trim(),
      description: description.trim(),
      remarks: remarks.trim(),
      teamMembers: awardType === 'team' ? teamMembers : [],
    };

    onSaveAward(payload);
    setIsModalOpen(false);
  };

  return (
    <div>
      {/* Action / Filter Bar */}
      <div className="awards-filter-bar">
        <div className="awards-search-box">
          <Search size={16} className="awards-search-icon" />
          <input
            type="text"
            placeholder="Search by student name, admission no, or award title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="awards-filter-selects">
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

          {canManage && (
            <button className="awards-btn-primary" onClick={openCreateModal}>
              <Plus size={16} />
              Add Student Award
            </button>
          )}
        </div>
      </div>

      {/* Awards Table Card */}
      <div className="awards-card">
        <div className="awards-card-header">
          <h3 className="awards-card-title">
            <Trophy size={18} color="#3B82F6" />
            Student Awards & Honours Directory ({filteredAwards.length})
          </h3>
        </div>
        <div className="awards-card-body" style={{ padding: 0 }}>
          {filteredAwards.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <Trophy size={40} color="#3B82F6" style={{ margin: '0 auto 1rem auto' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>No awards found</div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Try adjusting your search criteria or register a new achievement.
              </p>
            </div>
          ) : (
            <div className="awards-table-wrapper">
              <table className="awards-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Award Title & Event</th>
                    <th>Category</th>
                    <th>Level & Position</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAwards.map(award => (
                    <tr key={award.id}>
                      <td>
                        <div className="award-recipient-cell">
                          <img
                            src={award.photoUrl || '/student-male.svg'}
                            alt={award.studentName}
                            className="award-avatar-img"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/student-male.svg';
                            }}
                          />
                          <div>
                            <div className="award-recipient-name">
                              {award.studentName}
                              {award.awardType === 'team' && (
                                <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#3B82F6', fontWeight: 600 }}>
                                  (Team)
                                </span>
                              )}
                            </div>
                            <div className="award-recipient-sub">
                              {award.className} • Adm: {award.admissionNo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{award.awardTitle}</div>
                        {award.competitionName && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {award.competitionName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.825rem', color: '#334155' }}>
                          {award.categoryName}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <span className={`award-level-badge level-${award.achievementLevel.toLowerCase()}`}>
                            {award.achievementLevel}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                            {award.position}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`award-status-badge status-${award.status}`}>
                          {award.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {award.awardDate}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            className="awards-action-icon-btn"
                            title="View Details"
                            onClick={() => onViewAward(award)}
                          >
                            <Eye size={16} />
                          </button>

                          {(award.status === 'approved' || award.status === 'published') && (
                            <button
                              className="awards-action-icon-btn"
                              title="View & Print Certificate"
                              onClick={() => onViewCertificate(award)}
                              style={{ color: '#3B82F6' }}
                            >
                              <FileCheck size={16} />
                            </button>
                          )}

                          {canManage && (award.status === 'draft' || award.status === 'rejected') && (
                            <button
                              className="awards-action-icon-btn"
                              title="Submit for Approval"
                              onClick={() => onSubmitAward(award.id)}
                              style={{ color: '#3B82F6' }}
                            >
                              <Send size={16} />
                            </button>
                          )}

                          {canManage && (
                            <button
                              className="awards-action-icon-btn"
                              title="Edit Award"
                              onClick={() => openEditModal(award)}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          {canManage && (
                            <button
                              className="awards-action-icon-btn"
                              title="Delete Award"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the award record "${award.awardTitle}"?`)) {
                                  onDeleteAward(award.id);
                                }
                              }}
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box awards-modal-box-large">
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <Trophy size={20} color="#3B82F6" />
                {editingAward ? 'Edit Academic Award' : 'Register New Student Award'}
              </h3>
              <button
                className="awards-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="awards-modal-body">
                <div className="awards-form-grid">
                  {/* Student Selector */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">
                      Select Student / Candidate <span className="req">*</span>
                    </label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                      required
                    >
                      {allStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.className} - Sec {s.section} | Adm: {s.admissionNo})
                        </option>
                      ))}
                    </select>

                    {/* Auto-Populated Student Profile Preview */}
                    {currentSelectedStudent && (
                      <div className="awards-student-preview-card">
                        <img
                          src={currentSelectedStudent.photoUrl || '/student-male.svg'}
                          alt={currentSelectedStudent.fullName}
                          className="awards-student-preview-img"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/student-male.svg';
                          }}
                        />
                        <div>
                          <div className="awards-student-preview-name">
                            {currentSelectedStudent.fullName}
                          </div>
                          <div className="awards-student-preview-details">
                            Admission No: <strong>{currentSelectedStudent.admissionNo}</strong> • Class: <strong>{currentSelectedStudent.className} ({currentSelectedStudent.section})</strong> • Roll: <strong>{currentSelectedStudent.rollNo || 'N/A'}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Award Title */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">
                      Award Title / Honour Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. 1st Place - National Science & Robotics Olympiad"
                      value={awardTitle}
                      onChange={e => setAwardTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Award Type */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Award Type</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={awardType}
                      onChange={e => setAwardType(e.target.value as any)}
                    >
                      <option value="individual">Individual Achievement</option>
                      <option value="team">Team / Group Achievement</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">
                      Category <span className="req">*</span>
                    </label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={selectedCategoryId}
                      onChange={e => setSelectedCategoryId(e.target.value)}
                      required
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Achievement Level */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Achievement Level</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={achievementLevel}
                      onChange={e => setAchievementLevel(e.target.value as any)}
                    >
                      <option value="School">School Level</option>
                      <option value="Zonal">Zonal Level</option>
                      <option value="District">District Level</option>
                      <option value="State">State Level</option>
                      <option value="National">National Level</option>
                      <option value="International">International Level</option>
                    </select>
                  </div>

                  {/* Position */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Rank / Position</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={position}
                      onChange={e => setPosition(e.target.value as any)}
                    >
                      <option value="1st Place / Gold">1st Place / Gold Medal</option>
                      <option value="2nd Place / Silver">2nd Place / Silver Medal</option>
                      <option value="3rd Place / Bronze">3rd Place / Bronze Medal</option>
                      <option value="Winner">Winner</option>
                      <option value="Runner Up">Runner Up</option>
                      <option value="Special Mention">Special Mention</option>
                      <option value="Participant">Certificate of Participation</option>
                    </select>
                  </div>

                  {/* Competition / Event Name */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Competition / Event Name</label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. Inter-School State Debate Championship"
                      value={competitionName}
                      onChange={e => setCompetitionName(e.target.value)}
                    />
                  </div>

                  {/* Organizer */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Organizing Body</label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. CBSE Sports Council / IIT Madras"
                      value={organizer}
                      onChange={e => setOrganizer(e.target.value)}
                    />
                  </div>

                  {/* Award Date */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Award Date</label>
                    <input
                      type="date"
                      className="awards-input"
                      value={awardDate}
                      onChange={e => setAwardDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Academic Year */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Academic Session</label>
                    <input
                      type="text"
                      className="awards-input"
                      value={academicYear}
                      onChange={e => setAcademicYear(e.target.value)}
                      required
                    />
                  </div>

                  {/* Awarded By */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Presented / Awarded By</label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. Chief Guest Prof. K. VijayRaghavan & Principal"
                      value={awardedBy}
                      onChange={e => setAwardedBy(e.target.value)}
                    />
                  </div>

                  {/* Team Members if Team Award */}
                  {awardType === 'team' && (
                    <div className="awards-form-full awards-form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
                      <label className="awards-form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={16} />
                        Co-Team Members ({teamMembers.length})
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <select
                          className="awards-select"
                          id="teamMemberSelector"
                          style={{ flex: 1 }}
                          defaultValue=""
                        >
                          <option value="" disabled>Select student to add to team...</option>
                          {allStudents
                            .filter(s => s.id !== selectedStudentId && !teamMembers.some(m => m.studentId === s.id))
                            .map(s => (
                              <option key={s.id} value={s.id}>
                                {s.fullName} ({s.className} - {s.section})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className="awards-btn-secondary"
                          onClick={() => {
                            const sel = document.getElementById('teamMemberSelector') as HTMLSelectElement;
                            if (sel && sel.value) {
                              handleAddTeamMember(sel.value);
                              sel.value = '';
                            }
                          }}
                        >
                          Add Member
                        </button>
                      </div>

                      {teamMembers.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {teamMembers.map(m => (
                            <span
                              key={m.studentId}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              {m.studentName} ({m.className})
                              <X
                                size={14}
                                style={{ cursor: 'pointer', color: '#ef4444' }}
                                onClick={() => handleRemoveTeamMember(m.studentId)}
                              />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Citation & Achievement Summary</label>
                    <textarea
                      className="awards-textarea"
                      placeholder="Brief description of the project, performance, or criteria met..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Remarks */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Internal Verification Remarks</label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. Verified with event certificate and scorecard copy"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="awards-modal-footer">
                <button
                  type="button"
                  className="awards-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="awards-btn-primary">
                  <CheckCircle2 size={16} />
                  {editingAward ? 'Save Changes' : 'Record Award'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

