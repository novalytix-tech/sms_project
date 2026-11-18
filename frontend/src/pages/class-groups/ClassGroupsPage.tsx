// ==========================================
// Student-Teacher Class Groups & Communications
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { classGroupService } from '../../services/classGroupService';
import { classService } from '../../services/classService';

import { ERPStorage } from '../../services/storage';
import { ClassGroup, ClassGroupMessage, ClassMessageCategory, ClassMessagePriority, Teacher, TeacherAssignment } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useERP } from '../../context/ERPContext';

import { MessageSquare, Plus, Send, Users, Bell, FileText, Award, Calendar, AlertCircle, Paperclip, CheckCheck, GraduationCap, User } from 'lucide-react';
import './ClassGroupsPage.css';

export const ClassGroupsPage: React.FC = () => {
  const { currentRole, currentUser, addToast } = useERP();

  // Load groups accessible to current user
  const [groups, setGroups] = useState<ClassGroup[]>(() =>
    classGroupService.getGroupsForUser(currentUser)
  );

  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => groups[0]?.id || '');
  const [messages, setMessages] = useState<ClassGroupMessage[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ClassMessageCategory>('all');

  // Modals
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isStudentListModalOpen, setIsStudentListModalOpen] = useState(false);

  // Compose Message Form
  const [composeForm, setComposeForm] = useState({
    title: '',
    content: '',
    category: 'announcement' as ClassMessageCategory,
    priority: 'normal' as ClassMessagePriority,
    attachmentName: '',
  });
  const [composeError, setComposeError] = useState('');

  // Create Group Form (for Class Teacher)
  const classes = useMemo(() => classService.getAll(), []);
  const teacherAssignedClasses = useMemo(() => {
    if (currentRole !== 'teacher') return classes;
    const staffId = currentUser.referenceId || currentUser.id;
    const directMatches = classes.filter(
      c =>
        c.classTeacherId === currentUser.id ||
        c.classTeacherId === staffId ||
        Boolean(c.classTeacherName && currentUser.name && c.classTeacherName.toLowerCase() === currentUser.name.toLowerCase())
    );
    if (directMatches.length > 0) return directMatches;

    const store = ERPStorage.get();
    const teacher = (store.teachers || []).find(
      (t: Teacher) => t.id === staffId || t.refId === staffId || (t.email && currentUser.email && t.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (teacher && teacher.assignedClasses && teacher.assignedClasses.length > 0) {
      const assigned = classes.filter(c =>
        teacher.assignedClasses.some((ac: TeacherAssignment) => ac.classId === c.id || (ac.className === c.name && ac.section === c.section))
      );
      if (assigned.length > 0) return assigned;
    }

    return classes.length > 0 ? [classes[0]] : [];
  }, [classes, currentRole, currentUser]);

  const [createGroupForm, setCreateGroupForm] = useState({
    classId: teacherAssignedClasses[0]?.id || classes[0]?.id || 'cls-10a',
    section: teacherAssignedClasses[0]?.section || 'A',
    name: '',
    description: '',
  });
  const [createGroupError, setCreateGroupError] = useState('');

  // Refresh groups and messages
  const refreshData = useCallback(() => {
    const updatedGroups = classGroupService.getGroupsForUser(currentUser);
    setGroups(updatedGroups);

    if (updatedGroups.length > 0) {
      const activeId = updatedGroups.some(g => g.id === selectedGroupId)
        ? selectedGroupId
        : updatedGroups[0].id;
      setSelectedGroupId(activeId);
      const msgs = classGroupService.getMessages(activeId, currentUser);
      setMessages(msgs);
    } else {
      setSelectedGroupId('');
      setMessages([]);
    }
  }, [currentUser, selectedGroupId]);

  // Load messages when selected group changes
  useEffect(() => {
    if (selectedGroupId) {
      const msgs = classGroupService.getMessages(selectedGroupId, currentUser);
      setMessages(msgs);

      // Auto-mark as read for student
      if (currentRole === 'student') {
        msgs.forEach(m => {
          if (!m.readBy.includes(currentUser.id)) {
            classGroupService.markAsRead(m.id, currentUser.id);
          }
        });
      }
    }
  }, [selectedGroupId, currentUser, currentRole]);

  const activeGroup = useMemo(
    () => groups.find(g => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const enrolledStudents = useMemo(() => {
    if (!activeGroup) return [];
    return classGroupService.getStudentsInGroup(activeGroup.id);
  }, [activeGroup]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (categoryFilter === 'all') return messages;
    return messages.filter(m => m.category === categoryFilter);
  }, [messages, categoryFilter]);

  // Can current user post messages?
  const canPostMessages = useMemo(() => {
    if (currentRole === 'super_admin' || currentRole === 'school_admin') return true;
    if (currentRole === 'teacher' && activeGroup) {
      const staffId = currentUser.referenceId || currentUser.id;
      return (
        activeGroup.classTeacherId === currentUser.id ||
        activeGroup.classTeacherId === staffId ||
        Boolean(activeGroup.classTeacherName && currentUser.name && activeGroup.classTeacherName.toLowerCase() === currentUser.name.toLowerCase())
      );
    }
    return false;
  }, [currentRole, currentUser, activeGroup]);

  // Can current user create class groups?
  const canCreateGroup = useMemo(() => {
    if (currentRole === 'super_admin' || currentRole === 'school_admin') return true;
    if (currentRole === 'teacher') {
      return teacherAssignedClasses.length > 0;
    }
    return false;
  }, [currentRole, teacherAssignedClasses]);

  // Handle Send Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError('');

    if (!activeGroup) return;

    const res = classGroupService.sendMessage(
      {
        groupId: activeGroup.id,
        title: composeForm.title,
        content: composeForm.content,
        category: composeForm.category,
        priority: composeForm.priority,
        attachmentName: composeForm.attachmentName,
      },
      currentUser
    );

    if (!res.success) {
      setComposeError(res.error || 'Failed to post message.');
      return;
    }

    addToast('success', 'Announcement Published', `Message broadcast to ${activeGroup.name}.`);
    setIsComposeModalOpen(false);
    setComposeForm({
      title: '',
      content: '',
      category: 'announcement',
      priority: 'normal',
      attachmentName: '',
    });
    refreshData();
  };

  // Handle Create Class Group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateGroupError('');

    const targetClass = classes.find(
      c => c.id === createGroupForm.classId && c.section === createGroupForm.section
    );

    const defaultName = targetClass
      ? `${targetClass.name} (${targetClass.section}) Official Group`
      : 'Class Group';

    const res = classGroupService.createClassGroup(
      {
        classId: createGroupForm.classId,
        section: createGroupForm.section,
        name: createGroupForm.name || defaultName,
        description: createGroupForm.description,
      },
      currentUser
    );

    if (!res.success) {
      setCreateGroupError(res.error || 'Failed to create class group.');
      return;
    }

    addToast('success', 'Class Group Created', `Class group activated for ${targetClass?.name} (${targetClass?.section}).`);
    setIsCreateGroupModalOpen(false);
    refreshData();
    if (res.group) {
      setSelectedGroupId(res.group.id);
    }
  };

  const getCategoryIcon = (category: ClassMessageCategory) => {
    switch (category) {
      case 'homework':
        return <FileText size={13} />;
      case 'exam_notice':
        return <Award size={13} />;
      case 'event':
        return <Calendar size={13} />;
      case 'general':
        return <MessageSquare size={13} />;
      case 'announcement':
      default:
        return <Bell size={13} />;
    }
  };

  return (
    <div className="class-groups-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>
            {currentRole === 'student'
              ? 'My Class Messages'
              : currentRole === 'parent'
              ? 'Ward Class Announcements'
              : 'Class Groups & Messages'}
          </h1>
          <p className="page-subtitle">
            {currentRole === 'student'
              ? 'Official announcements, study updates, and notices from your Class Teacher'
              : currentRole === 'parent'
              ? 'Classroom communications and academic updates from your ward’s Class Teacher'
              : 'Classroom broadcast channels and student communications'}
          </p>
        </div>

        <div className="page-actions">
          {canCreateGroup && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setCreateGroupError('');
                setIsCreateGroupModalOpen(true);
              }}
            >
              <Plus size={14} />
              <span>Create Class Group</span>
            </button>
          )}

          {canPostMessages && activeGroup && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setComposeError('');
                setIsComposeModalOpen(true);
              }}
            >
              <Send size={14} />
              <span>Post Announcement</span>
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <EmptyState
            icon={<GraduationCap size={40} color="#3B82F6" />}
            title="No Class Group Available"
            description={
              currentRole === 'student'
                ? 'Your Class Teacher has not activated a class group yet. Notices will appear here once created.'
                : currentRole === 'teacher'
                ? 'You have not created a class group for your assigned section yet. Click Create Class Group to set one up.'
                : 'No active class groups are currently registered.'
            }
            action={
              canCreateGroup ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>Create Class Group</span>
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="class-groups-layout">
          {/* Left Column: Groups List */}
          <div className="class-groups-sidebar">
            <div className="class-groups-sidebar-header">
              <h3 className="class-groups-sidebar-title">
                <Users size={16} color="#3B82F6" />
                <span>Active Class Groups ({groups.length})</span>
              </h3>
            </div>

            <div className="class-groups-list">
              {groups.map(group => {
                const isActive = group.id === selectedGroupId;
                const unread = classGroupService.getUnreadCount(group.id, currentUser.id);

                return (
                  <div
                    key={group.id}
                    className={`class-group-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="class-group-item-header">
                      <div className="class-group-item-name">{group.name}</div>
                      {unread > 0 && (
                        <span
                          style={{
                            background: '#3B82F6',
                            color: '#ffffff',
                            borderRadius: '9999px',
                            padding: '1px 6px',
                            fontSize: '10px',
                            fontWeight: 800,
                          }}
                        >
                          {unread}
                        </span>
                      )}
                    </div>

                    <div className="class-group-item-preview">
                      {group.lastMessagePreview || group.description}
                    </div>

                    <div className="class-group-item-footer">
                      <span>{group.classTeacherName}</span>
                      <span>{group.lastMessageAt?.split(' ')[0] || ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Feed of Messages */}
          {activeGroup ? (
            <div className="class-group-feed-card">
              {/* Feed Header */}
              <div className="class-group-feed-header">
                <div className="class-group-feed-info">
                  <h2 className="class-group-feed-title">
                    <span>{activeGroup.name}</span>
                    <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                      {activeGroup.className} ({activeGroup.section})
                    </span>
                  </h2>
                  <div className="class-group-feed-sub">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} color="#3B82F6" />
                      Class Teacher: <strong>{activeGroup.classTeacherName}</strong>
                    </span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={13} color="#64748B" />
                      Audience: <strong>{enrolledStudents.length} Students</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsStudentListModalOpen(true)}
                  >
                    <Users size={14} />
                    <span>Enrolled Roster ({enrolledStudents.length})</span>
                  </button>

                  {canPostMessages && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setComposeError('');
                        setIsComposeModalOpen(true);
                      }}
                    >
                      <Plus size={14} />
                      <span>Post Announcement</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Bar */}
              <div className="class-group-filter-bar">
                <div className="class-category-pills">
                  <button
                    type="button"
                    className={`class-category-pill ${categoryFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('all')}
                  >
                    All Messages ({messages.length})
                  </button>
                  <button
                    type="button"
                    className={`class-category-pill ${categoryFilter === 'announcement' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('announcement')}
                  >
                    Announcements
                  </button>
                  <button
                    type="button"
                    className={`class-category-pill ${categoryFilter === 'homework' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('homework')}
                  >
                    Homework & Lab
                  </button>
                  <button
                    type="button"
                    className={`class-category-pill ${categoryFilter === 'exam_notice' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('exam_notice')}
                  >
                    Exam Notices
                  </button>
                  <button
                    type="button"
                    className={`class-category-pill ${categoryFilter === 'event' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('event')}
                  >
                    Events & Sports
                  </button>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="class-messages-feed">
                {filteredMessages.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                    <MessageSquare size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>
                      No messages in this category
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Messages posted by the Class Teacher will appear here.
                    </div>
                  </div>
                ) : (
                  filteredMessages.map(msg => {
                    const isReadByMe = msg.readBy.includes(currentUser.id);

                    return (
                      <div
                        key={msg.id}
                        className={`class-message-card ${msg.priority} ${msg.category}`}
                      >
                        <div className="class-message-meta">
                          <div className="class-message-sender-group">
                            <div className="class-message-avatar">
                              {msg.senderName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="class-message-sender-name">
                                {msg.senderName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600 }}>
                                {msg.senderTitle || 'Class Teacher'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`badge-category badge-${msg.category}`}>
                              {getCategoryIcon(msg.category)}
                              <span>{msg.category.replace('_', ' ')}</span>
                            </span>

                            {msg.priority !== 'normal' && (
                              <span className={`badge-category badge-priority-${msg.priority}`}>
                                {msg.priority.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="class-message-title">{msg.title}</h3>

                        <div className="class-message-body">{msg.content}</div>

                        {msg.attachmentName && (
                          <div className="class-message-attachment">
                            <Paperclip size={13} />
                            <span>{msg.attachmentName}</span>
                          </div>
                        )}

                        <div className="class-message-footer">
                          <span>Posted on {msg.timestamp}</span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {canPostMessages ? (
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                Read by {msg.readBy.length} of {enrolledStudents.length} students
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: isReadByMe ? '#16A34A' : '#94A3B8',
                                  fontWeight: 600,
                                }}
                              >
                                <CheckCheck size={14} />
                                <span>{isReadByMe ? 'Read' : 'Delivered'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              Select a class group from the left to view messages.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Post Announcement / Message */}
      {isComposeModalOpen && activeGroup && (
        <Modal
          isOpen={isComposeModalOpen}
          onClose={() => setIsComposeModalOpen(false)}
          title={`Post Announcement to ${activeGroup.name}`}
          size="normal"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setIsComposeModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSendMessage}>
                <Send size={14} />
                <span>Publish Message</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleSendMessage}>
            {composeError && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{composeError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label required">Announcement Title / Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Science Lab Notebook Submission Due This Friday"
                value={composeForm.title}
                onChange={e => setComposeForm({ ...composeForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Message Category</label>
                <select
                  className="form-select"
                  value={composeForm.category}
                  onChange={e =>
                    setComposeForm({
                      ...composeForm,
                      category: e.target.value as ClassMessageCategory,
                    })
                  }
                >
                  <option value="announcement">General Announcement</option>
                  <option value="homework">Homework / Project Task</option>
                  <option value="exam_notice">Examination & Assessment Notice</option>
                  <option value="event">Sports / Campus Event</option>
                  <option value="general">Notice</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Priority Level</label>
                <select
                  className="form-select"
                  value={composeForm.priority}
                  onChange={e =>
                    setComposeForm({
                      ...composeForm,
                      priority: e.target.value as ClassMessagePriority,
                    })
                  }
                >
                  <option value="normal">Normal Priority</option>
                  <option value="important">Important (Highlighted)</option>
                  <option value="urgent">Urgent Attention (High Priority)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Message Content</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Type your message to the class here. All enrolled students will see this in their portal..."
                value={composeForm.content}
                onChange={e => setComposeForm({ ...composeForm, content: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attachment Document Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Term2_Science_Practical_Guidelines.pdf"
                value={composeForm.attachmentName}
                onChange={e => setComposeForm({ ...composeForm, attachmentName: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Create Class Group */}
      {isCreateGroupModalOpen && (
        <Modal
          isOpen={isCreateGroupModalOpen}
          onClose={() => setIsCreateGroupModalOpen(false)}
          title="Create New Class Group"
          size="normal"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setIsCreateGroupModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateGroup}>
                <Plus size={14} />
                <span>Create Group</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateGroup}>
            {createGroupError && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{createGroupError}</span>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Class & Section</label>
                <select
                  className="form-select"
                  value={createGroupForm.classId}
                  onChange={e => {
                    const c = classes.find(item => item.id === e.target.value);
                    setCreateGroupForm({
                      ...createGroupForm,
                      classId: e.target.value,
                      section: c?.section || 'A',
                    });
                  }}
                >
                    {teacherAssignedClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section}) - {c.classTeacherName || c.classTeacher || 'Unassigned'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Section</label>
                <input
                  type="text"
                  className="form-input"
                  value={createGroupForm.section}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Custom Group Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Class 10-A Official Group"
                value={createGroupForm.name}
                onChange={e => setCreateGroupForm({ ...createGroupForm, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Group Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Brief description of the classroom communication channel..."
                value={createGroupForm.description}
                onChange={e =>
                  setCreateGroupForm({ ...createGroupForm, description: e.target.value })
                }
              />
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Enrolled Students List */}
      {isStudentListModalOpen && activeGroup && (
        <Modal
          isOpen={isStudentListModalOpen}
          onClose={() => setIsStudentListModalOpen(false)}
          title={`Enrolled Students in ${activeGroup.name} (${enrolledStudents.length})`}
          size="normal"
          footer={
            <button className="btn btn-secondary" onClick={() => setIsStudentListModalOpen(false)}>
              Close
            </button>
          }
        >
          <div style={{ marginBottom: '12px', fontSize: '13px', color: '#64748B' }}>
            All active students enrolled in {activeGroup.className} ({activeGroup.section}) receive announcements posted to this class group.
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll #</th>
                  <th>Admission #</th>
                  <th>Student Name</th>
                  <th>Parent / Guardian</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: '#3B82F6' }}>{s.rollNo}</td>
                    <td style={{ fontFamily: 'monospace' }}>{s.admissionNo}</td>
                    <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                    <td>{s.parentName}</td>
                    <td style={{ color: '#0f172a' }}>{s.parentPhone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};

