import React, { useMemo } from 'react';
import {
  Trophy,
  Award,
  Clock,
  CheckCircle2,
  Users,
  Star,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { AcademicAward, AwardsAnalyticsSummary } from '../../types/academicAwards';

interface AwardsDashboardProps {
  analytics: AwardsAnalyticsSummary;
  onNavigateTab: (tab: string) => void;
  onViewAward: (award: AcademicAward) => void;
}

export const AwardsDashboard: React.FC<AwardsDashboardProps> = ({
  analytics,
  onNavigateTab,
  onViewAward,
}) => {
  const maxCategoryCount = useMemo(() => {
    if (!analytics.categoryDistribution.length) return 1;
    return Math.max(...analytics.categoryDistribution.map(c => c.count), 1);
  }, [analytics.categoryDistribution]);

  return (
    <div>
      {/* 1. KPI Cards */}
      <div className="awards-kpi-grid">
        <div className="awards-kpi-card" onClick={() => onNavigateTab('student_awards')} style={{ cursor: 'pointer' }}>
          <div className="awards-kpi-icon-wrap awards-kpi-icon-red">
            <Trophy size={26} />
          </div>
          <div>
            <div className="awards-kpi-val">{analytics.totalAwards}</div>
            <div className="awards-kpi-label">Total Student Awards</div>
          </div>
        </div>

        <div className="awards-kpi-card" onClick={() => onNavigateTab('approvals')} style={{ cursor: 'pointer' }}>
          <div className="awards-kpi-icon-wrap awards-kpi-icon-amber">
            <Clock size={26} />
          </div>
          <div>
            <div className="awards-kpi-val">{analytics.pendingApprovals}</div>
            <div className="awards-kpi-label">Pending Approvals</div>
          </div>
        </div>

        <div className="awards-kpi-card" onClick={() => onNavigateTab('student_awards')} style={{ cursor: 'pointer' }}>
          <div className="awards-kpi-icon-wrap awards-kpi-icon-green">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div className="awards-kpi-val">{analytics.approvedAwards}</div>
            <div className="awards-kpi-label">Approved Honours</div>
          </div>
        </div>

        <div className="awards-kpi-card" onClick={() => onNavigateTab('gallery')} style={{ cursor: 'pointer' }}>
          <div className="awards-kpi-icon-wrap awards-kpi-icon-purple">
            <Sparkles size={26} />
          </div>
          <div>
            <div className="awards-kpi-val">{analytics.publishedWall}</div>
            <div className="awards-kpi-label">Wall of Fame Published</div>
          </div>
        </div>

        <div className="awards-kpi-card" onClick={() => onNavigateTab('staff')} style={{ cursor: 'pointer' }}>
          <div className="awards-kpi-icon-wrap awards-kpi-icon-blue">
            <Users size={26} />
          </div>
          <div>
            <div className="awards-kpi-val">{analytics.totalStaffRecognitions}</div>
            <div className="awards-kpi-label">Faculty Recognitions</div>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Category Distribution & Level Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Category Breakdown */}
        <div className="awards-card" style={{ marginBottom: 0 }}>
          <div className="awards-card-header">
            <h3 className="awards-card-title">
              <Award size={18} color="#3B82F6" />
              Category Distribution
            </h3>
            <button className="awards-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => onNavigateTab('categories')}>
              View Categories
            </button>
          </div>
          <div className="awards-card-body">
            {analytics.categoryDistribution.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', margin: '2rem 0' }}>No category data available yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analytics.categoryDistribution.map(cat => {
                  const pct = Math.round((cat.count / maxCategoryCount) * 100);
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 500 }}>
                        <span>{cat.category}</span>
                        <span style={{ fontWeight: 700, color: '#3B82F6' }}>{cat.count} award{cat.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #3B82F6, #ef4444)',
                            height: '100%',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Level Distribution */}
        <div className="awards-card" style={{ marginBottom: 0 }}>
          <div className="awards-card-header">
            <h3 className="awards-card-title">
              <Star size={18} color="#3B82F6" />
              Achievement Levels
            </h3>
            <button className="awards-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => onNavigateTab('events')}>
              View Events
            </button>
          </div>
          <div className="awards-card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {analytics.levelDistribution.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', width: '100%', margin: '2rem 0' }}>No level breakdown recorded.</p>
              ) : (
                analytics.levelDistribution.map(lvl => (
                  <div
                    key={lvl.level}
                    style={{
                      background: '#F6F8FC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '1rem',
                      flex: '1 1 140px',
                      textAlign: 'center',
                    }}
                  >
                    <span className={`award-level-badge level-${lvl.level.toLowerCase()}`} style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      {lvl.level}
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                      {lvl.count}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Honours</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Achievements List */}
      <div className="awards-card">
        <div className="awards-card-header">
          <h3 className="awards-card-title">
            <Trophy size={18} color="#3B82F6" />
            Recent Scholastic & Co-Curricular Achievements
          </h3>
          <button className="awards-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => onNavigateTab('gallery')}>
            Open Hall of Fame
          </button>
        </div>
        <div className="awards-card-body" style={{ padding: 0 }}>
          {analytics.recentAchievements.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              No recent achievements found. Submit new awards to feature here.
            </div>
          ) : (
            <div className="awards-table-wrapper">
              <table className="awards-table">
                <thead>
                  <tr>
                    <th>Student / Candidate</th>
                    <th>Award & Title</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Position</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentAchievements.map(award => (
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
                            <div className="award-recipient-sub">
                              {award.className} • {award.admissionNo}
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
                        <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>
                          {award.categoryName}
                        </span>
                      </td>
                      <td>
                        <span className={`award-level-badge level-${award.achievementLevel.toLowerCase()}`}>
                          {award.achievementLevel}
                        </span>
                      </td>
                      <td>
                        <span className="position-badge">
                          🥇 {award.position}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.825rem' }}>
                        {award.awardDate}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="awards-btn-secondary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.775rem', gap: '0.35rem' }}
                          onClick={() => onViewAward(award)}
                        >
                          <ExternalLink size={13} />
                          Details
                        </button>
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

