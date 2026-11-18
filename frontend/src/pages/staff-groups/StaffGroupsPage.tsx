// ==========================================
// Staff Groups & Common Messaging Page
// Developed by NTS Novalytix
// ==========================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useERP } from '../../context/ERPContext';
import { staffGroupService, resolveStaffId } from '../../services/staffGroupService';
import { classService } from '../../services/classService';
import { StaffGroup, StaffGroupMessage, StaffGroupType, StaffMember } from '../../types';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { isClassTeacher } from '../../utils/permissions';
import { MessageSquare, Users, Plus, Send, Bell, Archive, Info, Check, Layers, AlertTriangle, UserPlus, Trash2 } from 'lucide-react';
import './StaffGroupsPage.css';

export const StaffGroupsPage: React.FC = () => {
  const { currentUser, currentRole, addToast } = useERP();

  // Storage / Data States
  const [groups, setGroups] = useState<StaffGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StaffGroupMessage[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | StaffGroupType | 'archived'>('all');

  // New Message State
  const [messageInput, setMessageInput] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [showHighReachModal, setShowHighReachModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Create Group Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    description: string;
    type: StaffGroupType;
    department: string;
    classId: string;
    section: string;
    memberIds: string[];
  }>({
    name: '',
    description: '',
    type: 'custom',
    department: 'Science',
    classId: '',
    section: '',
    memberIds: [],
  });
  const [createMemberSearch, setCreateMemberSearch] = useState('');
  const [createDeptFilter, setCreateDeptFilter] = useState<string>('all');

  // Members Modal State
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedAddMemberId, setSelectedAddMemberId] = useState<string>('');

  const staffId = resolveStaffId(currentUser);
  const classes = useMemo(() => classService.getAll(), []);
  const userIsClassTeacher = useMemo(() => isClassTeacher(staffId, classes), [staffId, classes]);

  // Load and refresh staff members & groups
  const loadData = useCallback(() => {
    const allStaff = staffGroupService.getAllStaffMembers();
    setStaffMembers(allStaff);

    const userGroups = staffGroupService.getGroupsForUser(currentUser);
    setGroups(userGroups);

    // Auto-select first group if none selected or current is invalid
    if (userGroups.length > 0) {
      setSelectedGroupId(prev => {
        if (prev && userGroups.some(g => g.id === prev)) {
          return prev;
        }
        return userGroups[0].id;
      });
    } else {
      setSelectedGroupId(null);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen to cross-module storage updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      loadData();
    };
    window.addEventListener('nts_erp_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('nts_erp_storage_updated', handleStorageUpdate);
  }, [loadData]);

  // Active selected group
  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Load messages & mark read for active group
  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }
    const msgs = staffGroupService.getMessages(selectedGroupId, currentUser);
    setMessages(msgs);

    // Mark as read
    staffGroupService.markMessagesAsRead(selectedGroupId, currentUser);
  }, [selectedGroupId, currentUser]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      // Type or status filter
      if (activeTypeFilter === 'archived') {
        if (g.status !== 'archived') return false;
      } else {
        if (g.status === 'archived') return false;
        if (activeTypeFilter !== 'all' && g.type !== activeTypeFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name.toLowerCase().includes(q);
        const matchDesc = g.description?.toLowerCase().includes(q);
        const matchDept = g.department?.toLowerCase().includes(q);
        return matchName || matchDesc || matchDept;
      }

      return true;
    });
  }, [groups, activeTypeFilter, searchQuery]);

  // Can the current user create staff groups?
  const canCreateGroups = useMemo(() => {
    return ['super_admin', 'school_admin', 'teacher'].includes(currentRole);
  }, [currentRole]);

  // Can manage current group (archive, edit members)
  const canManageActiveGroup = useMemo(() => {
    if (!activeGroup) return false;
    return (
      currentRole === 'super_admin' ||
      currentRole === 'school_admin' ||
      activeGroup.creatorId === currentUser.id ||
      activeGroup.creatorId === staffId ||
      activeGroup.createdBy === currentUser.id ||
      activeGroup.createdBy === staffId
    );
  }, [activeGroup, currentRole, currentUser.id, staffId]);

  // Can broadcast announcements in current group
  const canSendAnnouncement = useMemo(() => {
    if (!activeGroup) return false;
    return staffGroupService.canSendAnnouncement(activeGroup.id, currentUser);
  }, [activeGroup, currentUser]);

  // Active staff members for member picker
  const activeStaffList = useMemo(() => {
    return staffMembers.filter(s => s.status === 'active');
  }, [staffMembers]);

  // Reset & open create modal
  const handleOpenCreateModal = () => {
    // Default group type based on role
    let defaultType: StaffGroupType = 'custom';
    if (currentRole === 'school_admin' || currentRole === 'super_admin') {
      defaultType = 'custom';
    } else if (userIsClassTeacher) {
      defaultType = 'class_based';
    }

    setCreateForm({
      name: '',
      description: '',
      type: defaultType,
      department: 'Science',
      classId: classes[0]?.id || '',
      section: classes[0]?.section || 'A',
      memberIds: [staffId],
    });
    setCreateMemberSearch('');
    setCreateDeptFilter('all');
    setIsCreateModalOpen(true);
  };

  // Toggle member selection in create modal
  const handleToggleMember = (id: string) => {
    setCreateForm(prev => {
      const exists = prev.memberIds.includes(id);
      if (exists) {
        return { ...prev, memberIds: prev.memberIds.filter(m => m !== id) };
      } else {
        return { ...prev, memberIds: [...prev.memberIds, id] };
      }
    });
  };

  // Select all or clear selection in create modal
  const handleSelectAllMembers = () => {
    const ids = activeStaffList.map(s => s.id);
    setCreateForm(prev => ({ ...prev, memberIds: ids }));
  };

  const handleClearSelectedMembers = () => {
    // Keep creator selected
    setCreateForm(prev => ({ ...prev, memberIds: [staffId] }));
  };

  // Submit Create Group
  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name.trim()) {
      addToast('error', 'Group Name Required', 'Please provide a descriptive name for the group.');
      return;
    }

    const res = staffGroupService.createGroup(
      {
        name: createForm.name,
        description: createForm.description,
        type: createForm.type,
        department: createForm.type === 'department' ? createForm.department : undefined,
        classId: createForm.type === 'class_based' ? createForm.classId : undefined,
        section: createForm.type === 'class_based' ? createForm.section : undefined,
        memberIds: createForm.memberIds,
      },
      currentUser
    );

    if (!res.success || !res.group) {
      addToast('error', 'Creation Failed', res.error || 'Could not create staff group.');
      return;
    }

    addToast('success', 'Group Created', `Staff group "${res.group.name}" is now ready.`);
    setIsCreateModalOpen(false);
    loadData();
    setSelectedGroupId(res.group.id);
  };

  // Send Message Logic
  const handleSendMessage = () => {
    if (!activeGroup || isSending) return;
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    if (trimmed.length > 2000) {
      addToast('error', 'Message Too Long', 'Maximum allowed character limit is 2,000 characters.');
      return;
    }

    // If announcement and high reach (>= 5 members or all_staff), prompt confirmation
    if (isAnnouncement && canSendAnnouncement) {
      const highReach = staffGroupService.checkHighReachAnnouncement(activeGroup.id);
      if (highReach.isHighReach && !showHighReachModal) {
        setShowHighReachModal(true);
        return;
      }
    }

    executeSendMessage();
  };

  const executeSendMessage = () => {
    if (!activeGroup || isSending) return;
    setIsSending(true);
    setShowHighReachModal(false);

    try {
      const res = staffGroupService.sendMessage(
        activeGroup.id,
        messageInput,
        currentUser,
        isAnnouncement && canSendAnnouncement
      );

      if (!res.success || !res.message) {
        addToast('error', 'Send Failed', res.error || 'Failed to dispatch message.');
        setIsSending(false);
        return;
      }

      setMessageInput('');
      setIsAnnouncement(false);
      setMessages(prev => [...prev, res.message!]);
      loadData();
      addToast('success', 'Message Sent', (isAnnouncement && canSendAnnouncement) ? 'Broadcasted as staff announcement.' : 'Dispatched to group.');
    } finally {
      setIsSending(false);
    }
  };

  // Archive / Unarchive toggle
  const handleToggleArchive = () => {
    if (!activeGroup) return;
    if (activeGroup.status === 'archived') {
      const res = staffGroupService.unarchiveGroup(activeGroup.id, currentUser);
      if (res.success) {
        addToast('success', 'Group Restored', `"${activeGroup.name}" has been unarchived.`);
        loadData();
      }
    } else {
      if (confirm(`Are you sure you want to archive "${activeGroup.name}"? It will become read-only while message history is retained.`)) {
        const res = staffGroupService.archiveGroup(activeGroup.id, currentUser);
        if (res.success) {
          addToast('info', 'Group Archived', `"${activeGroup.name}" has been archived.`);
          loadData();
        }
      }
    }
  };

  // Add member to active custom group
  const handleAddMemberToGroup = () => {
    if (!activeGroup || !selectedAddMemberId) return;
    if (activeGroup.memberIds.includes(selectedAddMemberId)) {
      addToast('warning', 'Already Member', 'This staff member is already in the group.');
      return;
    }

    const updated = [...activeGroup.memberIds, selectedAddMemberId];
    const res = staffGroupService.updateMembers(activeGroup.id, updated, currentUser);
    if (res.success) {
      addToast('success', 'Member Added', 'Staff member added to group.');
      setSelectedAddMemberId('');
      loadData();
    } else {
      addToast('error', 'Update Failed', res.error || 'Could not add member.');
    }
  };

  // Remove member from active custom group
  const handleRemoveMemberFromGroup = (memberId: string) => {
    if (!activeGroup) return;
    if (confirm('Remove this staff member from the group?')) {
      const updated = activeGroup.memberIds.filter(id => id !== memberId);
      const res = staffGroupService.updateMembers(activeGroup.id, updated, currentUser);
      if (res.success) {
        addToast('info', 'Member Removed', 'Staff member removed from group.');
        loadData();
      } else {
        addToast('error', 'Update Failed', res.error || 'Could not remove member.');
      }
    }
  };

  // Filtered members for create modal
  const modalFilteredStaff = useMemo(() => {
    return activeStaffList.filter(staff => {
      if (createDeptFilter !== 'all' && staff.department !== createDeptFilter) {
        return false;
      }
      if (createMemberSearch.trim()) {
        const q = createMemberSearch.toLowerCase();
        return (
          staff.name.toLowerCase().includes(q) ||
          staff.email.toLowerCase().includes(q) ||
          staff.designation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeStaffList, createDeptFilter, createMemberSearch]);

  // Current active group members list
  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    if (activeGroup.isDynamicAllStaff) {
      return activeStaffList;
    }
    return staffMembers.filter(s => activeGroup.memberIds.includes(s.id));
  }, [activeGroup, activeStaffList, staffMembers]);

  return (
    <div className="staff-groups-container">
      {/* Top Header */}
      <div className="staff-groups-header">
        <div className="staff-groups-header-left">
          <h1>
            <MessageSquare size={24} style={{ color: 'var(--color-primary)' }} />
            Staff Groups & Common Messaging
          </h1>
          <p>
            Collaborative coordination, department channels, and common staff announcements.
          </p>
        </div>

        <div className="staff-groups-header-actions">
          <div className="demo-mode-pill" title="All staff messages are securely managed in-app">
            <Info size={14} />
            <span>Demo Mode: In-App Simulation</span>
          </div>

          {canCreateGroups && (
            <button
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} />
              Create Group
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="staff-groups-layout">
        {/* Left Column: Groups Directory */}
        <div className="groups-sidebar">
          {/* Search */}
          <div className="groups-sidebar-search">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search staff groups..."
              ariaLabel="Search staff groups"
              wrapperStyle={{ width: '100%', maxWidth: '100%' }}
            />
          </div>

          {/* Filter Pills */}
          <div className="groups-type-filters">
            <button
              className={`type-filter-chip ${activeTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTypeFilter('all')}
            >
              All ({groups.filter(g => g.status !== 'archived').length})
            </button>
            <button
              className={`type-filter-chip ${activeTypeFilter === 'all_staff' ? 'active' : ''}`}
              onClick={() => setActiveTypeFilter('all_staff')}
            >
              All Staff
            </button>
            <button
              className={`type-filter-chip ${activeTypeFilter === 'department' ? 'active' : ''}`}
              onClick={() => setActiveTypeFilter('department')}
            >
              Departments
            </button>
            <button
              className={`type-filter-chip ${activeTypeFilter === 'class_based' ? 'active' : ''}`}
              onClick={() => setActiveTypeFilter('class_based')}
            >
              Class-Based
            </button>
            <button
              className={`type-filter-chip ${activeTypeFilter === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveTypeFilter('custom')}
            >
              Custom
            </button>
            <button
              className={`type-filter-chip ${activeTypeFilter === 'archived' ? 'active' : ''}`}
              onClick={() => setActiveTypeFilter('archived')}
            >
              Archived ({groups.filter(g => g.status === 'archived').length})
            </button>
          </div>

          {/* Groups List */}
          <div className="groups-list">
            {filteredGroups.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <Layers size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>No groups found</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>
                  {searchQuery ? 'Try matching another name or filter' : 'You do not belong to any groups in this category.'}
                </p>
              </div>
            ) : (
              filteredGroups.map(group => {
                const unread = staffGroupService.getUnreadCount(group.id, currentUser);
                const isSelected = group.id === selectedGroupId;
                const memberCount = group.isDynamicAllStaff
                  ? activeStaffList.length
                  : group.memberIds.length;

                return (
                  <div
                    key={group.id}
                    className={`group-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="group-item-top">
                      <h3 className="group-item-title">{group.name}</h3>
                      <span className="group-item-time">
                        {new Date(
                          group.lastMessageAt || group.updatedAt || group.createdAt
                        ).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="group-item-meta">
                      <span className={`group-badge ${group.status === 'archived' ? 'archived' : group.type}`}>
                        {group.status === 'archived'
                          ? 'Archived'
                          : group.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="group-member-count">
                        <Users size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '2px' }} />
                        {memberCount}
                      </span>
                      {unread > 0 && <span className="group-unread-badge">{unread}</span>}
                    </div>

                    <p className="group-preview">{group.lastMessagePreview || 'No messages yet'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Pane */}
        {activeGroup ? (
          <div className="group-chat-pane">
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <h2>
                  {activeGroup.name}
                  <span className={`group-badge ${activeGroup.status === 'archived' ? 'archived' : activeGroup.type}`}>
                    {activeGroup.status === 'archived'
                      ? 'Archived'
                      : activeGroup.type.replace('_', ' ').toUpperCase()}
                  </span>
                </h2>
                <p>
                  {activeGroup.description || 'Staff group for collaborative coordination'} • Created by {activeGroup.creatorName} ({activeGroup.creatorRole})
                </p>
              </div>

              <div className="chat-header-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsMembersModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
                >
                  <Users size={15} />
                  Members ({activeGroup.isDynamicAllStaff ? activeStaffList.length : activeGroup.memberIds.length})
                </button>

                {canManageActiveGroup && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleToggleArchive}
                    title={activeGroup.status === 'archived' ? 'Restore Group' : 'Archive Group'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}
                  >
                    <Archive size={15} />
                    {activeGroup.status === 'archived' ? 'Restore' : 'Archive'}
                  </button>
                )}
              </div>
            </div>

            {/* Messages Feed */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  <MessageSquare size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No messages in this group yet</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem' }}>
                    Be the first to post a common announcement or coordination update.
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOutgoing = msg.senderId === staffId || msg.senderId === currentUser.id;
                  const timeFormatted = new Date(msg.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`message-card ${isOutgoing ? 'outgoing' : ''} ${msg.isAnnouncement ? 'announcement' : ''}`}
                    >
                      {msg.isAnnouncement && (
                        <div className="announcement-banner">
                          <Bell size={13} />
                          Staff Announcement
                        </div>
                      )}

                      <div className="message-meta">
                        <div className="message-sender">
                          <span>{msg.senderName}</span>
                          <span className="sender-role-pill">{msg.senderDesignation}</span>
                        </div>
                        <span className="message-time">{timeFormatted}</span>
                      </div>

                      <p className="message-body">{msg.content}</p>

                      <div className="message-footer">
                        <span className="read-receipt" title={`Read by ${msg.readBy.length} staff members`}>
                          <Check size={13} style={{ color: msg.readBy.length > 1 ? 'var(--color-primary)' : 'inherit' }} />
                          Read by {msg.readBy.length}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="chat-input-area">
              {activeGroup.status === 'archived' ? (
                <div className="archived-banner">
                  <Archive size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
                  This staff group is archived. Conversation history is preserved in read-only mode.
                </div>
              ) : (
                <>
                  <div className="chat-input-wrapper">
                    <textarea
                      className="chat-textarea"
                      placeholder={`Send a message to ${activeGroup.name}... (Press Shift + Enter for new lines)`}
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      maxLength={2000}
                    />
                  </div>

                  <div className="chat-input-controls">
                    <div className="chat-input-left">
                      {canSendAnnouncement ? (
                        <label className="announcement-checkbox-label">
                          <input
                            type="checkbox"
                            checked={isAnnouncement}
                            onChange={e => setIsAnnouncement(e.target.checked)}
                            disabled={isSending}
                          />
                          <Bell size={14} />
                          Send as Announcement
                        </label>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {activeGroup.type === 'all_staff' || activeGroup.type === 'role_based'
                            ? 'Announcements in All Staff channels reserved for Administrators'
                            : 'Standard group messaging'}
                        </span>
                      )}

                      <span
                        className={`char-counter ${
                          messageInput.length > 1800
                            ? 'danger'
                            : messageInput.length > 1500
                            ? 'warning'
                            : ''
                        }`}
                      >
                        {messageInput.length} / 2,000
                      </span>
                    </div>

                    <div className="chat-input-right">
                      <button
                        className="btn btn-primary"
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || messageInput.length > 2000 || isSending}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Send size={15} />
                        {isSending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>

                  <p className="delivery-disclaimer">
                    In-app simulation mode active. Group updates are instantly synchronized across authenticated demo sessions.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
            Select a staff group to view messages
          </div>
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Staff Group"
        size="large"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateGroupSubmit}>
              Create Group
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateGroupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Name & Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Group Name *
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-sidebar-border)' }}
                placeholder="e.g. Science Department, Class 10 Teachers"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Group Type *
              </label>
              <select
                className="form-select"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-sidebar-border)' }}
                value={createForm.type}
                onChange={e => setCreateForm({ ...createForm, type: e.target.value as StaffGroupType })}
              >
                {/* School Admin / Super Admin can pick all */}
                {(currentRole === 'school_admin' || currentRole === 'super_admin') && (
                  <>
                    <option value="all_staff">All Staff (Dynamic All Members)</option>
                    <option value="role_based">Role-Based (e.g., All Teachers)</option>
                    <option value="department">Department</option>
                  </>
                )}

                {/* Class Teachers and Admins can pick Class-Based */}
                {(currentRole === 'school_admin' || currentRole === 'super_admin' || userIsClassTeacher) && (
                  <option value="class_based">Class-Based Coordination</option>
                )}

                {/* All permitted roles can pick Custom */}
                <option value="custom">Custom Coordination Team</option>
              </select>
            </div>
          </div>

          {/* Conditional Department or Class */}
          {createForm.type === 'department' && (
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Department *
              </label>
              <select
                className="form-select"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-sidebar-border)' }}
                value={createForm.department}
                onChange={e => setCreateForm({ ...createForm, department: e.target.value })}
              >
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Humanities">Humanities</option>
                <option value="Languages">Languages</option>
                <option value="Physical Education">Physical Education</option>
                <option value="Administration">Administration</option>
                <option value="Computer Science">Computer Science</option>
              </select>
            </div>
          )}

          {createForm.type === 'class_based' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Target Class *
                </label>
                <select
                  className="form-select"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-sidebar-border)' }}
                  value={createForm.classId}
                  onChange={e => {
                    const c = classes.find(item => item.id === e.target.value);
                    setCreateForm({
                      ...createForm,
                      classId: e.target.value,
                      section: c?.section || 'A',
                    });
                  }}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      Class {c.grade}-{c.section} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Section
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-sidebar-border)' }}
                  value={createForm.section}
                  readOnly
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Description
            </label>
            <textarea
              className="form-textarea"
              style={{ width: '100%', minHeight: '60px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-sidebar-border)' }}
              placeholder="Brief summary of purpose and coordination agenda..."
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>

          {/* Members Selector (Unless All Staff) */}
          {createForm.type === 'all_staff' ? (
            <div
              style={{
                padding: '0.875rem 1rem',
                background: 'var(--color-primary-light)',
                borderRadius: '0.5rem',
                border: '1px solid var(--color-primary-border)',
                fontSize: '0.8125rem',
                color: 'var(--color-primary-dark)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Info size={18} />
              <span>
                All Staff groups automatically include all active faculty and administrative staff members. Membership updates dynamically.
              </span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                  Select Group Members ({createForm.memberIds.length} selected)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={handleSelectAllMembers}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={handleClearSelectedMembers}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Member Search & Dept Filter */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <SearchInput
                  value={createMemberSearch}
                  onChange={setCreateMemberSearch}
                  placeholder="Search staff by name or email..."
                  ariaLabel="Search staff"
                  wrapperStyle={{ width: '100%', maxWidth: '100%' }}
                />

                <select
                  className="form-select filter-select"
                  value={createDeptFilter}
                  onChange={e => setCreateDeptFilter(e.target.value)}
                  aria-label="Filter Staff by Department"
                >
                  <option value="all">All Departments</option>
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Languages">Languages</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>

              {/* Members Checklist */}
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-sidebar-border)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  background: 'var(--color-bg-subtle)',
                }}
              >
                {modalFilteredStaff.map(staff => {
                  const isChecked = createForm.memberIds.includes(staff.id);
                  return (
                    <label
                      key={staff.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '0.25rem',
                        background: isChecked ? 'var(--color-primary-light)' : '#ffffff',
                        border: '1px solid var(--color-sidebar-border)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMember(staff.id)}
                          style={{ accentColor: 'var(--color-primary)' }}
                        />
                        <div>
                          <strong style={{ color: 'var(--color-text-main)' }}>{staff.name}</strong>
                          <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.35rem', fontSize: '0.75rem' }}>
                            ({staff.designation} • {staff.department})
                          </span>
                        </div>
                      </div>

                      {staff.isClassTeacher && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: '#dcfce7',
                            color: '#166534',
                          }}
                        >
                          CT: {staff.assignedClass}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* HIGH-REACH ANNOUNCEMENT CONFIRMATION MODAL */}
      <Modal
        isOpen={showHighReachModal}
        onClose={() => setShowHighReachModal(false)}
        title="Confirm High-Reach Announcement"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowHighReachModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={executeSendMessage}
              disabled={isSending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Bell size={15} />
              {isSending ? 'Broadcasting...' : 'Confirm & Broadcast'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              color: 'var(--color-warning-text)',
            }}
          >
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', fontWeight: 700 }}>
                High-Reach Announcement Notice
              </h4>
              <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.4 }}>
                You are about to broadcast this announcement to{' '}
                <strong>
                  {activeGroup
                    ? staffGroupService.checkHighReachAnnouncement(activeGroup.id).recipientCount
                    : 0}{' '}
                  eligible staff members
                </strong>{' '}
                in <strong>{activeGroup?.name}</strong>.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-sidebar-border)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Message Preview:
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', fontStyle: 'italic' }}>
              &ldquo;{messageInput}&rdquo;
            </div>
          </div>
        </div>
      </Modal>

      {/* MEMBERS ROSTER MODAL */}
      <Modal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        title={`Group Members: ${activeGroup?.name || ''}`}
        size="normal"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setIsMembersModalOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Member add tool for custom groups if admin/creator */}
          {canManageActiveGroup && activeGroup?.type === 'custom' && (
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'var(--color-bg-subtle)',
                borderRadius: '0.5rem',
                border: '1px solid var(--color-sidebar-border)',
              }}
            >
              <select
                className="form-select"
                style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8125rem', borderRadius: '0.375rem', border: '1px solid var(--color-sidebar-border)' }}
                value={selectedAddMemberId}
                onChange={e => setSelectedAddMemberId(e.target.value)}
              >
                <option value="">Select staff member to add...</option>
                {activeStaffList
                  .filter(s => !activeGroup.memberIds.includes(s.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.designation} - {s.department})
                    </option>
                  ))}
              </select>

              <button
                className="btn btn-primary"
                onClick={handleAddMemberToGroup}
                disabled={!selectedAddMemberId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem' }}
              >
                <UserPlus size={14} />
                Add
              </button>
            </div>
          )}

          {/* Members list */}
          <div className="members-list-modal">
            {activeGroupMembers.map(member => (
              <div key={member.id} className="member-card-row">
                <div className="member-info-col">
                  <div className="member-avatar">
                    {member.name
                      .split(' ')
                      .map((p: string) => p[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="member-text-col">
                    <h4>{member.name}</h4>
                    <p>
                      {member.designation} • {member.department}
                      {member.isClassTeacher && ` (CT: ${member.assignedClass})`}
                    </p>
                  </div>
                </div>

                {/* Remove button if custom group, canManage, and not creator */}
                {canManageActiveGroup &&
                  activeGroup?.type === 'custom' &&
                  member.id !== activeGroup.creatorId &&
                  member.id !== activeGroup.createdBy &&
                  member.id !== staffId && (
                    <button
                      className="icon-button"
                      onClick={() => handleRemoveMemberFromGroup(member.id)}
                      title="Remove Member"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
