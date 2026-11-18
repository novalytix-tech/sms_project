import React, { useState } from 'react';
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import { AwardCategory, AcademicAward } from '../../types/academicAwards';
import { useERP } from '../../context/ERPContext';

interface AwardCategoriesProps {
  categories: AwardCategory[];
  awards: AcademicAward[];
  onSaveCategory: (data: Partial<AwardCategory>) => void;
  onDeleteCategory: (id: string) => void;
}

export const AwardCategories: React.FC<AwardCategoriesProps> = ({
  categories,
  awards,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const { currentRole } = useERP();
  const canManage = currentRole === 'school_admin' || currentRole === 'super_admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AwardCategory | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setCode('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: AwardCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setCode(cat.code);
    setDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    onSaveCategory({
      ...(editingCategory ? { id: editingCategory.id } : {}),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
    });

    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="awards-filter-bar">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
            Award Classification Categories
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            System standard and institution-defined categories for scholastic & co-curricular recognition.
          </p>
        </div>

        {canManage && (
          <button className="awards-btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add Custom Category
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {categories.map(cat => {
          const awardCount = awards.filter(a => a.categoryId === cat.id).length;
          return (
            <div key={cat.id} className="awards-card" style={{ marginBottom: 0 }}>
              <div className="awards-card-header" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#DBEAFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3B82F6',
                    }}
                  >
                    <Award size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 700, color: '#0f172a' }}>
                      {cat.name}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: '#3B82F6',
                        background: '#fef2f2',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        border: '1px solid #fecaca',
                      }}
                    >
                      {cat.code}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {canManage && (
                    <button
                      className="awards-action-icon-btn"
                      title="Edit Category"
                      onClick={() => openEditModal(cat)}
                    >
                      <Edit2 size={15} />
                    </button>
                  )}
                  {canManage && cat.isCustom && (
                    <button
                      className="awards-action-icon-btn"
                      title="Delete Category"
                      onClick={() => {
                        if (window.confirm(`Delete category "${cat.name}"?`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="awards-card-body" style={{ padding: '1rem 1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#475569', minHeight: '44px', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                  {cat.description || 'Standard scholastic criteria for honour roll and competitive achievements.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#64748b',
                  }}
                >
                  <span>
                    Linked Awards: <strong style={{ color: '#0f172a' }}>{awardCount}</strong>
                  </span>
                  <span>{cat.isCustom ? 'Custom' : 'System Standard'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="awards-modal-overlay">
          <div className="awards-modal-box">
            <div className="awards-modal-header">
              <h3 className="awards-modal-title">
                <Layers size={20} color="#3B82F6" />
                {editingCategory ? 'Edit Award Category' : 'Create Custom Category'}
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
                      Category Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. Environmental Action & Sustainability"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">
                      Category Code <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="awards-input"
                      placeholder="e.g. ECO / ROBOT / MUN"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="awards-form-full awards-form-group">
                    <label className="awards-form-label">Description & Scope</label>
                    <textarea
                      className="awards-textarea"
                      placeholder="Provide guidelines for what accomplishments belong in this category..."
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
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

