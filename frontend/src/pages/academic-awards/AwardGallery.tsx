import React, { useState, useMemo } from 'react';
import { Sparkles, Search, Grid, List, FileCheck, Trophy } from 'lucide-react';
import { AcademicAward, AwardCategory } from '../../types/academicAwards';

interface AwardGalleryProps {
  awards: AcademicAward[];
  categories: AwardCategory[];
  onViewCertificate: (award: AcademicAward) => void;
  onViewAward: (award: AcademicAward) => void;
}

export const AwardGallery: React.FC<AwardGalleryProps> = ({
  awards,
  categories,
  onViewCertificate,
  onViewAward,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Only published awards appear on the public wall of fame
  const publishedAwards = useMemo(() => {
    return awards.filter(a => a.status === 'published');
  }, [awards]);

  const filteredAwards = useMemo(() => {
    return publishedAwards.filter(a => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        a.studentName.toLowerCase().includes(q) ||
        a.awardTitle.toLowerCase().includes(q) ||
        a.admissionNo.toLowerCase().includes(q) ||
        a.categoryName.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'all' || a.categoryId === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [publishedAwards, searchTerm, categoryFilter]);

  return (
    <div>
      {/* Banner / Intro for Hall of Fame */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 60%, #60A5FA 100%)',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 20px rgba(29, 78, 216, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            <Sparkles size={16} />
            Official Hall of Fame
          </div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Student Scholastic & Co-Curricular Honours Wall
          </h2>
          <p style={{ margin: '0.35rem 0 0 0', color: '#DBEAFE', fontSize: '0.9rem', maxWidth: '600px' }}>
            Celebrating high academic, STEM, athletic, and literary accomplishments verified and published by school leadership.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
            {publishedAwards.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#DBEAFE' }}>Published Honours</div>
        </div>
      </div>

      {/* Filter & View Switcher */}
      <div className="awards-filter-bar">
        <div className="awards-search-box">
          <Search size={16} className="awards-search-icon" />
          <input
            type="text"
            placeholder="Search achievers, projects, or honors..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="awards-filter-selects">
          <select
            className="awards-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Honour Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '0.2rem' }}>
            <button
              className="awards-tab-btn"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#3B82F6' : '#64748b',
                boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} />
            </button>
            <button
              className="awards-tab-btn"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#3B82F6' : '#64748b',
                boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {filteredAwards.length === 0 ? (
        <div className="awards-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
          <Trophy size={48} color="#3B82F6" style={{ margin: '0 auto 1.25rem auto' }} />
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>No published achievements found</h3>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem' }}>
            Approved awards will appear here once published by the Principal.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="awards-gallery-grid">
          {filteredAwards.map(award => (
            <div key={award.id} className="awards-gallery-card">
              <div className="awards-gallery-card-top">
                <img
                  src={award.photoUrl || '/student-male.svg'}
                  alt={award.studentName}
                  className="awards-gallery-avatar"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/student-male.svg';
                  }}
                />
                <div className="awards-gallery-meta">
                  <div className="awards-gallery-name">{award.studentName}</div>
                  <div className="awards-gallery-class">
                    {award.className} • Adm: {award.admissionNo}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className={`award-level-badge level-${award.achievementLevel.toLowerCase()}`}>
                      {award.achievementLevel}
                    </span>
                    <span className="position-badge">
                      🏆 {award.position}
                    </span>
                  </div>
                </div>
              </div>

              <div className="awards-gallery-card-body">
                <h4 className="awards-gallery-award-title">{award.awardTitle}</h4>
                <p className="awards-gallery-desc">
                  {award.description || 'Recognized for distinguished competitive achievement and scholastic commitment.'}
                </p>

                <div className="awards-gallery-footer">
                  <div>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{award.categoryName}</span>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{award.awardDate}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="awards-btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => onViewAward(award)}
                    >
                      Details
                    </button>
                    <button
                      className="awards-btn-primary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => onViewCertificate(award)}
                    >
                      <FileCheck size={13} />
                      Certificate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="awards-card">
          <div className="awards-card-body" style={{ padding: 0 }}>
            <div className="awards-table-wrapper">
              <table className="awards-table">
                <thead>
                  <tr>
                    <th>Achiever</th>
                    <th>Award Title</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Position</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Certificate</th>
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
                            <div className="award-recipient-name">{award.studentName}</div>
                            <div className="award-recipient-sub">{award.className} • {award.admissionNo}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{award.awardTitle}</div>
                        {award.competitionName && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{award.competitionName}</div>
                        )}
                      </td>
                      <td>{award.categoryName}</td>
                      <td>
                        <span className={`award-level-badge level-${award.achievementLevel.toLowerCase()}`}>
                          {award.achievementLevel}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{award.position}</td>
                      <td style={{ fontSize: '0.825rem', color: '#64748b' }}>{award.awardDate}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="awards-btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => onViewCertificate(award)}
                        >
                          <FileCheck size={14} />
                          View
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
    </div>
  );
};

