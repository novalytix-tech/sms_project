// ==========================================
// School Calendar & Events Management
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { calendarService } from '../../services/calendarService';
import { SchoolEvent, EventCategory } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge } from '../../components/common/Badge';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, MapPin, RotateCcw } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { currentRole, addToast } = useERP();
  const [events, setEvents] = useState<SchoolEvent[]>(() => calendarService.getAll());

  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolEvent | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic' as EventCategory,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    targetAudience: 'all' as any,
    location: '',
  });

  const refreshList = () => {
    setEvents([...calendarService.getAll()]);
  };

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      category: 'academic',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      targetAudience: 'all',
      location: 'Main Auditorium',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ev: SchoolEvent) => {
    setEditingEvent(ev);
    setFormData({
      title: ev.title,
      description: ev.description,
      category: ev.category,
      startDate: ev.startDate,
      endDate: ev.endDate,
      targetAudience: ev.targetAudience,
      location: ev.location || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingEvent) {
      calendarService.update(editingEvent.id, formData);
      addToast('success', 'Event Updated', `${formData.title} has been updated.`);
    } else {
      calendarService.create(formData);
      addToast('success', 'Event Created', `${formData.title} added to the calendar.`);
    }

    setIsModalOpen(false);
    refreshList();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      calendarService.delete(deleteTarget.id);
      addToast('warning', 'Event Removed', `${deleteTarget.title} was deleted.`);
      setDeleteTarget(null);
      refreshList();
    }
  };

  const filteredEvents = events.filter(e => {
    if (categoryFilter && e.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Calendar & Events</h1>
          <p className="page-subtitle">
            Academic events, holidays, and school activities
          </p>
        </div>

        <div className="page-actions">
          {['school_admin', 'super_admin'].includes(currentRole) && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <select
            className="form-select filter-select filter-select-md"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filter Event Categories"
          >
            <option value="">All Categories</option>
            <option value="holiday">School Holidays</option>
            <option value="exam">Examinations</option>
            <option value="ptm">PTM Meetings</option>
            <option value="sports">Sports Meets</option>
            <option value="academic">Academic & STEM</option>
          </select>

          {categoryFilter && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => setCategoryFilter('')}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing <strong>{filteredEvents.length}</strong> scheduled events
          </span>
        </div>
      </div>

      {/* Events Timeline / Cards Grid */}
      <div className="responsive-cards-grid">
        {filteredEvents.map(ev => (
          <div key={ev.id} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={18} color="#3B82F6" />
                <h3 className="card-title">{ev.title}</h3>
              </div>

              {['school_admin', 'super_admin'].includes(currentRole) && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => handleOpenEdit(ev)}
                    title="Edit Event"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => setDeleteTarget(ev)}
                    title="Delete Event"
                  >
                    <Trash2 size={13} color="#DC2626" />
                  </button>
                </div>
              )}
            </div>

            <div className="card-body">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <Badge status={ev.category} />
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  Audience: {ev.targetAudience}
                </span>
              </div>

              <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', marginBottom: '14px' }}>
                {ev.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <div>
                  <strong>Duration:</strong> {formatDate(ev.startDate)} {ev.startDate !== ev.endDate ? `to ${formatDate(ev.endDate)}` : ''}
                </div>
                {ev.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="#3B82F6" />
                    <span>{ev.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Event Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingEvent ? 'Edit Event' : 'Add Event'}
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save Event
              </button>
            </>
          }
        >
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label required">Event Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Science Fair, Annual Day"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                >
                  <option value="holiday">Holiday</option>
                  <option value="exam">Examination</option>
                  <option value="ptm">PTM (Parent-Teacher)</option>
                  <option value="sports">Sports</option>
                  <option value="academic">Academic & STEM</option>
                  <option value="cultural">Cultural</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Target Audience</label>
                <select
                  className="form-select"
                  value={formData.targetAudience}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value as any })}
                >
                  <option value="all">All School</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="students">Students Only</option>
                  <option value="parents">Parents Only</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Campus Location / Venue</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Main Auditorium, Sports Ground"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Calendar Event"
          message={`Are you sure you want to delete ${deleteTarget.title}?`}
          isDestructive
          confirmLabel="Delete Event"
        />
      )}
    </div>
  );
};

