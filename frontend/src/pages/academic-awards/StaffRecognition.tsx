import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, Award, FileCheck, Trash2, CheckCircle2, X } from 'lucide-react';
import { StaffRecognition as StaffRecognitionType } from '../../types/academicAwards';
import { teacherService } from '../../services/teacherService';
import { useERP } from '../../context/ERPContext';
import { todayISO } from '../../utils/date';

interface StaffRecognitionProps {
  recognitions: StaffRecognitionType[];
  onSaveRecognition: (data: Partial<StaffRecognitionType>) => void;
  onDeleteRecognition: (id: string) => void;
  onViewStaffCertificate: (rec: StaffRecognitionType) => void;
}

export const StaffRecognition: React.FC<StaffRecognitionProps> = ({
  recognitions,
  onSaveRecognition,
  onDeleteRecognition,
  onViewStaffCertificate,
}) => {
  const { currentRole } = useERP();
  const canManage = currentRole === 'school_admin' || currentRole === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [awardTitle, setAwardTitle] = useState('');
  const [category, setCategory] = useState('Academic Excellence');
  const [recognitionDate, setRecognitionDate] = useState(todayISO());
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [awardedBy, setAwardedBy] = useState('Board of Trustees & Principal');
  const [description, setDescription] = useState('');

  const allTeachers = useMemo(() => teacherService.getAll(), []);

  const currentTeacher = useMemo(() => {
    return allTeachers.find(t => t.id === selectedTeacherId);
  }, [allTeachers, selectedTeacherId]);

  const filteredRecognitions = useMemo(() => {
    return recognitions.filter(r => {
      const q = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        r.employeeName.toLowerCase().includes(q) ||
        r.awardTitle.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    });
  }, [recognitions, searchTerm]);

  const openModal = () => {
    setSelectedTeacherId(allTeachers[0]?.id || '');
    setAwardTitle('');
    setCategory('Academic Excellence');
    setRecognitionDate(todayISO());
    setAcademicYear('2026-2027');
    setAwardedBy('Board of Trustees & Principal Dr. Arvind Swaminathan');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !awardTitle.trim()) return;

    onSaveRecognition({
      teacherId: selectedTeacherId,
      awardTitle: awardTitle.trim(),
      category,
      recognitionDate,
      academicYear,
      awardedBy: awardedBy.trim(),
      description: description.trim(),
    });

    setIsModalOpen(false);
  };

  return (
    <div>
      {/* Top Filter & Action Bar */}
      <div className="awards-filter-bar">
        <div className="awards-search-box">
          <Search size={16} className="awards-search-icon" />
          <input
            type="text"
            placeholder="Search faculty name, department, or recognition title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {canManage && (
          <button className="awards-btn-primary" onClick={openModal}>
            <Plus size={16} />
            Recognize Faculty Member
          </button>
        )}
      </div>

      {/* List Card */}
      <div className="awards-card">
        <div className="awards-card-header">
          <h3 className="awards-card-title">
            <Users size={18} color="#3B82F6" />
            Distinguished Faculty Honours & Recognition ({filteredRecognitions.length})
          </h3>
        </div>
        <div className="awards-card-body" style={{ padding: 0 }}>
          {filteredRecognitions.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <Award size={40} color="#3B82F6" style={{ margin: '0 auto 1rem auto' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>
                No faculty recognitions found
              </div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Acknowledge outstanding teaching performance and mentorship.
              </p>
            </div>
          ) : (
            <div className="awards-table-wrapper">
              <table className="awards-table">
                <thead>
                  <tr>
                    <th>Faculty Member</th>
                    <th>Recognition & Title</th>
                    <th>Category</th>
                    <th>Date & Session</th>
                    <th>Awarded By</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecognitions.map(rec => (
                    <tr key={rec.id}>
                      <td>
                        <div className="award-recipient-cell">
                          <img
                            src={rec.photoUrl || '/teacher-female.svg'}
                            alt={rec.employeeName}
                            className="award-avatar-img"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/teacher-female.svg';
                            }}
                          />
                          <div>
                            <div className="award-recipient-name">{rec.employeeName}</div>
                            <div className="award-recipient-sub">
                              {rec.designation} • Dept of {rec.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.awardTitle}</div>
                        {rec.description && (
                          <div style={{ fontSize: '0.775rem', color: '#64748b', maxWidth: '340px' }}>
                            {rec.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 500 }}>
                          {rec.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.825rem', color: '#0f172a', fontWeight: 500 }}>
                          {rec.recognitionDate}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {rec.academicYear}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#475569' }}>
                        {rec.awardedBy}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            className="awards-action-icon-btn"
                            title="Generate / View Certificate"
                            onClick={() => onViewStaffCertificate(rec)}
                            style={{ color: '#3B82F6' }}
                          >
                            <FileCheck size={16} />
                          </button>

                          {canManage && (
                            <button
                              className="awards-action-icon-btn"
                              title="Delete Recognition"
                              onClick={() => {
                                if (window.confirm(`Delete recognition for "${rec.employeeName}"?`)) {
                                  onDeleteRecognition(rec.id);
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

      {/* Modal */}
      {isModalOpen && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box">
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <Users size={20} color="#3B82F6" />
                Recognize Faculty Member
              </h3>
              <button className="awards-modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="awards-modal-body">
                <div className="awards-form-grid">
                  {/* Teacher Select */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">
                      Select Teacher / Staff <span className="req">*</span>
                    </label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={selectedTeacherId}
                      onChange={e => setSelectedTeacherId(e.target.value)}
                      required
                    >
                      {allTeachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.designation} - Dept of {t.department})
                        </option>
                      ))}
                    </select>

                    {currentTeacher && (
                      <div className="awards-student-preview-card">
                        <img
                          src={currentTeacher.photoUrl || '/teacher-female.svg'}
                          alt={currentTeacher.fullName}
                          className="awards-student-preview-img"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/teacher-female.svg';
                          }}
                        />
                        <div>
                          <div className="awards-student-preview-name">{currentTeacher.fullName}</div>
                          <div className="awards-student-preview-details">
                            Staff ID: <strong>{currentTeacher.staffId}</strong> • Designation: <strong>{currentTeacher.designation}</strong> • Dept: <strong>{currentTeacher.department}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Award Title */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">
                      Recognition Title <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. Distinguished Educator of the Year"
                      value={awardTitle}
                      onChange={e => setAwardTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Category</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      <option value="Academic Excellence">Academic Excellence</option>
                      <option value="STEM & Innovation">STEM & Innovation</option>
                      <option value="Sports & Athletics Mentorship">Sports Mentorship</option>
                      <option value="Pedagogical Innovation">Pedagogical Innovation</option>
                      <option value="Student Welfare & Guidance">Student Welfare & Guidance</option>
                      <option value="Lifetime Dedication">Lifetime Dedication to Education</option>
                    </select>
                  </div>

                  {/* Recognition Date */}
                  <div className="awards-form-group">
                    <label className="awards-form-label">Recognition Date</label>
                    <input
                      type="date"
                      className="awards-input"
                      value={recognitionDate}
                      onChange={e => setRecognitionDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Awarded By */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Awarded / Bestowed By</label>
                    <input
                      type="text"
                      className="awards-input"
                      value={awardedBy}
                      onChange={e => setAwardedBy(e.target.value)}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Citation & Recognition Details</label>
                    <textarea
                      className="awards-textarea"
                      placeholder="Details of student achievement, board exam results, or leadership shown..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
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
                  Record Recognition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

