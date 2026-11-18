// ==========================================
// Notices, Circulars & Announcements
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { noticeService } from '../../services/noticeService';
import { Notice } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge } from '../../components/common/Badge';
import { useERP } from '../../context/ERPContext';
import { formatDate } from '../../utils/formatters';
import { Plus, Trash2, CheckCircle, RotateCcw } from 'lucide-react';

export const NoticesPage: React.FC = () => {
  const { currentRole, currentUser, addToast } = useERP();
  const [notices, setNotices] = useState<Notice[]>(() => noticeService.getAll());

  const [audienceFilter, setAudienceFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent',
    targetAudience: 'all' as any,
  });

  const refreshList = () => {
    setNotices([...noticeService.getAll()]);
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    noticeService.create({
      title: formData.title,
      content: formData.content,
      priority: formData.priority,
      targetAudience: formData.targetAudience,
      authorName: currentUser.name,
      authorRole: currentRole.replace('_', ' ').toUpperCase(),
      publishedDate: new Date().toISOString().split('T')[0],
    });

    addToast('success', 'Notice Published', `"${formData.title}" posted to bulletin board.`);
    setIsModalOpen(false);
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      targetAudience: 'all',
    });
    refreshList();
  };

  const handleMarkAsRead = (id: string) => {
    noticeService.markAsRead(id);
    refreshList();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      noticeService.delete(deleteTarget.id);
      addToast('warning', 'Notice Removed', 'Notice was deleted.');
      setDeleteTarget(null);
      refreshList();
    }
  };

  const filteredNotices = notices.filter(n => {
    if (audienceFilter && n.targetAudience !== audienceFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Notices & Circulars</h1>
          <p className="page-subtitle">
            Campus announcements for staff, parents, and students
          </p>
        </div>

        <div className="page-actions">
          {['school_admin', 'super_admin', 'teacher'].includes(currentRole) && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              <span>Add Notice</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-toolbar">
        <div className="filter-group-left">
          <select
            className="form-select filter-select filter-select-md"
            value={audienceFilter}
            onChange={e => setAudienceFilter(e.target.value)}
            aria-label="Filter Notices Audience"
          >
            <option value="">All Audiences</option>
            <option value="all">All School Community</option>
            <option value="teachers">Teachers & Faculty</option>
            <option value="parents">Parents Only</option>
            <option value="students">Students Only</option>
            <option value="suppliers">Suppliers / Vendors</option>
          </select>

          {audienceFilter && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => setAudienceFilter('')}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="filter-group-right">
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing <strong>{filteredNotices.length}</strong> notices
          </span>
        </div>
      </div>

      {/* Notices Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredNotices.map(notice => (
          <div
            key={notice.id}
            className="card"
            style={{
              borderLeft: notice.priority === 'urgent' ? '5px solid #3B82F6' : notice.priority === 'high' ? '5px solid #d97706' : '1px solid var(--color-border, #E2E8F0)',
            }}
          >
            <div className="card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="card-title">{notice.title}</h3>
                  <Badge status={notice.priority} />
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    To: {notice.targetAudience}
                  </span>
                </div>
                <span className="card-subtitle">
                  Published: <strong>{formatDate(notice.publishedDate)}</strong> by {notice.authorName} ({notice.authorRole})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!notice.isRead && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleMarkAsRead(notice.id)}
                  >
                    <CheckCircle size={13} />
                    <span>Mark Read</span>
                  </button>
                )}

                {['school_admin', 'super_admin'].includes(currentRole) && (
                  <button
                    className="btn btn-secondary btn-icon-only"
                    onClick={() => setDeleteTarget(notice)}
                    title="Delete Notice"
                  >
                    <Trash2 size={13} color="#DC2626" />
                  </button>
                )}
              </div>
            </div>

            <div className="card-body">
              <p style={{ color: '#334155', fontSize: '13px', lineHeight: '1.6' }}>
                {notice.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Notice Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Notice"
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateNotice}>
                Save Notice
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateNotice}>
            <div className="form-group">
              <label className="form-label required">Notice Title / Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Schedule for Annual Science Olympiad"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Priority Level</label>
                <select
                  className="form-select"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="normal">Normal Information</option>
                  <option value="high">High Importance</option>
                  <option value="urgent">Urgent / Immediate Action</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Target Audience</label>
                <select
                  className="form-select"
                  value={formData.targetAudience}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value as any })}
                >
                  <option value="all">All School Community</option>
                  <option value="teachers">Teachers & Staff</option>
                  <option value="parents">Parents Only</option>
                  <option value="students">Students Only</option>
                  <option value="suppliers">Registered Suppliers</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Announcement Body / Content</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Write full circular instructions..."
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
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
          title="Delete Notice"
          message={`Are you sure you want to delete "${deleteTarget.title}"?`}
          isDestructive
          confirmLabel="Delete Notice"
        />
      )}
    </div>
  );
};

