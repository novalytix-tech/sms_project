import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Search, MapPin, Building, CheckCircle2, Trash2, Edit2, X } from 'lucide-react';
import { CompetitionEvent, AwardCategory, AcademicAward } from '../../types/academicAwards';
import { useERP } from '../../context/ERPContext';

interface CompetitionsEventsProps {
  competitions: CompetitionEvent[];
  categories: AwardCategory[];
  awards: AcademicAward[];
  onSaveCompetition: (data: Partial<CompetitionEvent>) => void;
  onDeleteCompetition: (id: string) => void;
}

export const CompetitionsEvents: React.FC<CompetitionsEventsProps> = ({
  competitions,
  categories,
  awards,
  onSaveCompetition,
  onDeleteCompetition,
}) => {
  const { currentRole } = useERP();
  const canManage = currentRole === 'school_admin' || currentRole === 'teacher' || currentRole === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<CompetitionEvent | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [level, setLevel] = useState<any>('School');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [description, setDescription] = useState('');

  const filteredCompetitions = useMemo(() => {
    return competitions.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        c.name.toLowerCase().includes(q) ||
        c.organizer.toLowerCase().includes(q) ||
        c.venue.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [competitions, searchTerm, statusFilter]);

  const openCreateModal = () => {
    setEditingComp(null);
    setName('');
    setCategory(categories[0]?.name || 'Academic Excellence');
    setOrganizer('Inter-School Council');
    setLevel('School');
    setVenue('Campus Auditorium');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setStatus('upcoming');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (comp: CompetitionEvent) => {
    setEditingComp(comp);
    setName(comp.name);
    setCategory(comp.category);
    setOrganizer(comp.organizer);
    setLevel(comp.level);
    setVenue(comp.venue);
    setStartDate(comp.startDate);
    setEndDate(comp.endDate);
    setStatus(comp.status);
    setDescription(comp.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) return;

    onSaveCompetition({
      ...(editingComp ? { id: editingComp.id } : {}),
      name: name.trim(),
      category,
      organizer: organizer.trim(),
      level,
      venue: venue.trim(),
      startDate,
      endDate: endDate || startDate,
      status,
      description: description.trim(),
    });

    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="awards-filter-bar">
        <div className="awards-search-box">
          <Search size={16} className="awards-search-icon" />
          <input
            type="text"
            placeholder="Search competitions, venue, or organizing body..."
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
            <option value="all">All Timelines</option>
            <option value="upcoming">Upcoming Events</option>
            <option value="ongoing">Ongoing Meets</option>
            <option value="completed">Completed Events</option>
          </select>

          {canManage && (
            <button className="awards-btn-primary" onClick={openCreateModal}>
              <Plus size={16} />
              Register Competition / Meet
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredCompetitions.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <Calendar size={40} color="#3B82F6" style={{ margin: '0 auto 1rem auto' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>No events recorded</div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Add inter-school competitions, Olympiads, and athletic meets.
            </p>
          </div>
        ) : (
          filteredCompetitions.map(comp => {
            const linkedAwardsCount = awards.filter(
              a => a.competitionId === comp.id || (a.competitionName && a.competitionName.toLowerCase() === comp.name.toLowerCase())
            ).length;

            return (
              <div key={comp.id} className="awards-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="awards-card-header" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span className={`award-level-badge level-${comp.level.toLowerCase()}`}>
                        {comp.level} Level
                      </span>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          background: comp.status === 'upcoming' ? '#DBEAFE' : comp.status === 'ongoing' ? '#fffbeb' : '#f0fdf4',
                          color: comp.status === 'upcoming' ? '#3B82F6' : comp.status === 'ongoing' ? '#b45309' : '#15803d',
                        }}
                      >
                        {comp.status}
                      </span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                      {comp.name}
                    </h4>
                  </div>

                  {canManage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        className="awards-action-icon-btn"
                        title="Edit Competition"
                        onClick={() => openEditModal(comp)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="awards-action-icon-btn"
                        title="Delete Competition"
                        onClick={() => {
                          if (window.confirm(`Delete competition "${comp.name}"?`)) {
                            onDeleteCompetition(comp.id);
                          }
                        }}
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="awards-card-body" style={{ padding: '1rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem', color: '#475569', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building size={14} color="#94a3b8" />
                      <span>{comp.organizer}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={14} color="#94a3b8" />
                      <span>{comp.venue}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} color="#94a3b8" />
                      <span>
                        {comp.startDate} {comp.endDate && comp.endDate !== comp.startDate ? `to ${comp.endDate}` : ''}
                      </span>
                    </div>
                  </div>

                  {comp.description && (
                    <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem 0', flex: 1, lineHeight: 1.5 }}>
                      {comp.description}
                    </p>
                  )}

                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}
                  >
                    <span>Category: <strong>{comp.category}</strong></span>
                    <span style={{ color: '#3B82F6', fontWeight: 600 }}>
                      🏆 {linkedAwardsCount} award{linkedAwardsCount !== 1 ? 's' : ''} recorded
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box">
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <Calendar size={20} color="#3B82F6" />
                {editingComp ? 'Edit Competition / Event' : 'Register Competition or Tournament'}
              </h3>
              <button className="awards-modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="awards-modal-body">
                <div className="awards-form-grid">
                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">
                      Event / Competition Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. CBSE South Zone Athletics Meet 2026"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="awards-form-group">
                    <label className="awards-form-label">Category</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="awards-form-group">
                    <label className="awards-form-label">Level</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={level}
                      onChange={e => setLevel(e.target.value)}
                    >
                      <option value="School">School Level</option>
                      <option value="Zonal">Zonal Level</option>
                      <option value="District">District Level</option>
                      <option value="State">State Level</option>
                      <option value="National">National Level</option>
                      <option value="International">International Level</option>
                    </select>
                  </div>

                  <div className="awards-form-group">
                    <label className="awards-form-label">Organizing Body</label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. CBSE Sports Council"
                      value={organizer}
                      onChange={e => setOrganizer(e.target.value)}
                      required
                    />
                  </div>

                  <div className="awards-form-group">
                    <label className="awards-form-label">Timeline Status</label>
                    <select
                      className="awards-select"
                      style={{ width: '100%' }}
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                    >
                      <option value="upcoming">Upcoming Event</option>
                      <option value="ongoing">Currently Ongoing</option>
                      <option value="completed">Completed Event</option>
                    </select>
                  </div>

                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Venue / Stadium / City</label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. Sri Kanteerava Outdoor Stadium, Bengaluru"
                      value={venue}
                      onChange={e => setVenue(e.target.value)}
                      required
                    />
                  </div>

                  <div className="awards-form-group">
                    <label className="awards-form-label">Start Date</label>
                    <input
                      type="date"
                      className="awards-input"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="awards-form-group">
                    <label className="awards-form-label">End Date</label>
                    <input
                      type="date"
                      className="awards-input"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Event Scope & Notes</label>
                    <textarea
                      className="awards-textarea"
                      placeholder="Participation criteria, disciplines, or event highlights..."
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
                  Save Competition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

