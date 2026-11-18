// ==========================================
// Staff Groups & Messaging Service
// Developed by NTS Novalytix
// ==========================================

import { ERPStorage } from './storage';
import { classService } from './classService';
import { notificationService } from './notificationService';
import { StaffGroup, StaffGroupMessage, StaffMember, StaffGroupType, User } from '../types';
import { isClassTeacher } from '../utils/permissions';

export interface CreateGroupInput {
  name: string;
  description?: string;
  type: StaffGroupType;
  department?: string;
  classId?: string;
  section?: string;
  memberIds: string[];
}

export const resolveStaffId = (user: User): string => {
  if (user.role === 'teacher' && user.referenceId) {
    return user.referenceId;
  }
  return user.id;
};

export const staffGroupService = {
  /**
   * Returns all active and inactive staff members (teachers + administration)
   */
  getAllStaffMembers: (): StaffMember[] => {
    const store = ERPStorage.get();
    const classes = classService.getAll();

    // Map all teachers
    const staffMembers: StaffMember[] = store.teachers.map(teacher => {
      const isCT = isClassTeacher(teacher.id, classes);
      const assignedClassObj = classes.find(c => c.classTeacherId === teacher.id);
      const assignedClassStr = assignedClassObj
        ? `${assignedClassObj.grade}-${assignedClassObj.section}`
        : undefined;

      return {
        id: teacher.id,
        staffId: teacher.staffId,
        fullName: teacher.fullName,
        name: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        role: 'teacher' as const,
        roleTitle: teacher.designation || 'Teacher',
        designation: teacher.designation || 'Teacher',
        department: teacher.department,
        isClassTeacher: isCT,
        assignedClass: assignedClassStr,
        assignedSection: assignedClassObj?.section,
        status: teacher.status === 'active' ? ('active' as const) : ('inactive' as const),
      };
    });

    // Add School Principal / Admin
    staffMembers.unshift({
      id: 'user-school-admin',
      userId: 'user-school-admin',
      staffId: 'STAFF-ADM',
      fullName: 'Dr. Arvind Swaminathan',
      name: 'Dr. Arvind Swaminathan',
      email: 'principal@stxaviers.edu.in',
      phone: '+91 98450 12345',
      role: 'school_admin' as const,
      roleTitle: 'Principal & School Administrator',
      designation: 'Principal & School Administrator',
      department: 'Administration',
      isClassTeacher: false,
      status: 'active' as const,
    });

    return staffMembers;
  },

  /**
   * Returns active staff members only (eligible for group inclusion)
   */
  getActiveStaffMembers: (): StaffMember[] => {
    return staffGroupService.getAllStaffMembers().filter(s => s.status === 'active');
  },

  /**
   * Retrieves all groups visible to the specified user based on role, institution, and membership
   */
  getGroupsForUser: (user: User): StaffGroup[] => {
    // Non-staff roles have ZERO access
    if (['student', 'parent', 'supplier'].includes(user.role)) {
      return [];
    }

    const store = ERPStorage.get();
    const staffId = resolveStaffId(user);

    // Inactive staff members cannot access staff groups
    if (user.role === 'teacher') {
      const teacherRecord = store.teachers.find(t => t.id === staffId || t.id === user.referenceId);
      if (teacherRecord && teacherRecord.status !== 'active') {
        return [];
      }
    }

    let groups = store.staffGroups || [];

    // Institution boundary check
    if (user.role !== 'super_admin' && user.institutionId) {
      groups = groups.filter(g => !g.institutionId || g.institutionId === user.institutionId);
    }

    // Super Admin and School Admin can see all groups within institution
    if (user.role === 'super_admin' || user.role === 'school_admin') {
      return [...groups].sort(
        (a, b) =>
          new Date(b.lastMessageAt || b.updatedAt).getTime() -
          new Date(a.lastMessageAt || a.updatedAt).getTime()
      );
    }

    // Teachers can see groups they belong to, created, or dynamic all_staff groups
    const filtered = groups.filter(g => {
      if (g.isDynamicAllStaff) return true;
      if (
        g.creatorId === user.id ||
        g.creatorId === staffId ||
        g.createdBy === user.id ||
        g.createdBy === staffId
      ) {
        return true;
      }
      return g.memberIds.includes(staffId) || g.memberIds.includes(user.id);
    });

    return filtered.sort(
      (a, b) =>
        new Date(b.lastMessageAt || b.updatedAt).getTime() -
        new Date(a.lastMessageAt || a.updatedAt).getTime()
    );
  },

  /**
   * Get single group by ID with RBAC and institution check
   */
  getGroupById: (groupId: string, user: User): StaffGroup | null => {
    if (['student', 'parent', 'supplier'].includes(user.role)) {
      return null;
    }

    const store = ERPStorage.get();
    const group = (store.staffGroups || []).find(g => g.id === groupId);
    if (!group) return null;

    const staffId = resolveStaffId(user);

    // Inactive staff cannot access groups
    if (user.role === 'teacher') {
      const teacherRecord = store.teachers.find(t => t.id === staffId || t.id === user.referenceId);
      if (teacherRecord && teacherRecord.status !== 'active') {
        return null;
      }
    }

    // Institution boundary check
    if (user.role !== 'super_admin' && user.institutionId && group.institutionId) {
      if (group.institutionId !== user.institutionId) {
        return null;
      }
    }

    if (user.role === 'super_admin' || user.role === 'school_admin') {
      return group;
    }

    const hasAccess =
      group.isDynamicAllStaff ||
      group.creatorId === user.id ||
      group.creatorId === staffId ||
      group.createdBy === user.id ||
      group.createdBy === staffId ||
      group.memberIds.includes(staffId) ||
      group.memberIds.includes(user.id);

    return hasAccess ? group : null;
  },

  /**
   * Evaluates whether a user is authorized to broadcast announcements in a specific group
   */
  canSendAnnouncement: (groupId: string, user: User): boolean => {
    if (['student', 'parent', 'supplier'].includes(user.role)) return false;
    if (user.role === 'super_admin' || user.role === 'school_admin') return true;

    const store = ERPStorage.get();
    const group = (store.staffGroups || []).find(g => g.id === groupId);
    if (!group) return false;

    const staffId = resolveStaffId(user);

    // Inactive staff cannot send announcements
    if (user.role === 'teacher') {
      const teacherRecord = store.teachers.find(t => t.id === staffId || t.id === user.referenceId);
      if (teacherRecord && teacherRecord.status !== 'active') return false;
    }

    // All Staff & Role-Based channels: Reserved exclusively for School Administrators
    if (group.type === 'all_staff' || group.type === 'role_based') {
      return false;
    }

    // Class-based groups: Assigned Class Teacher can broadcast to their assigned class group
    if (group.type === 'class_based') {
      const classes = classService.getAll();
      return (
        isClassTeacher(staffId, classes) &&
        classes.some(c => c.id === group.classId && c.classTeacherId === staffId)
      );
    }

    // Department & Custom groups: Group creator can broadcast announcements
    return (
      group.creatorId === user.id ||
      group.creatorId === staffId ||
      group.createdBy === user.id ||
      group.createdBy === staffId
    );
  },

  /**
   * Creates a new staff group with validation and permission checks
   */
  createGroup: (
    data: CreateGroupInput,
    user: User
  ): { success: boolean; group?: StaffGroup; error?: string } => {
    // 1. Role validation
    if (['student', 'parent', 'supplier'].includes(user.role)) {
      return { success: false, error: 'Access denied: Only school staff can create groups.' };
    }

    const store = ERPStorage.get();
    const existingGroups = store.staffGroups || [];
    const staffId = resolveStaffId(user);
    const classes = classService.getAll();
    const userIsClassTeacher = isClassTeacher(staffId, classes);

    // Inactive staff cannot create groups
    if (user.role === 'teacher') {
      const teacherRecord = store.teachers.find(t => t.id === staffId || t.id === user.referenceId);
      if (teacherRecord && teacherRecord.status !== 'active') {
        return { success: false, error: 'Access denied: Inactive staff members cannot create groups.' };
      }
    }

    // 2. Name validation
    const trimmedName = data.name.trim();
    if (!trimmedName || trimmedName.length < 3) {
      return { success: false, error: 'Group name must be at least 3 characters long.' };
    }

    const duplicateName = existingGroups.some(
      g => g.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      return { success: false, error: `A group named "${trimmedName}" already exists.` };
    }

    // 3. Permission checks by group type
    if (data.type === 'all_staff') {
      if (user.role !== 'school_admin' && user.role !== 'super_admin') {
        return { success: false, error: 'Permission denied: Only School Administrators can create "All Staff" groups.' };
      }
    } else if (data.type === 'role_based' || data.type === 'department') {
      if (user.role !== 'school_admin' && user.role !== 'super_admin') {
        return { success: false, error: `Permission denied: Only School Administrators can create ${data.type.replace('_', ' ')} groups.` };
      }
    } else if (data.type === 'class_based') {
      if (user.role !== 'school_admin' && user.role !== 'super_admin') {
        if (!userIsClassTeacher) {
          return { success: false, error: 'Permission denied: Only School Administrators and assigned Class Teachers can create class-based groups.' };
        }
        if (!data.classId) {
          return { success: false, error: 'A target class must be selected for class-based groups.' };
        }
        const isAssigned = classes.some(c => c.id === data.classId && c.classTeacherId === staffId);
        if (!isAssigned) {
          return { success: false, error: 'Permission denied: Class Teachers can only create class-based groups for their assigned classes.' };
        }
      }
    }

    // 4. Validate member eligibility
    const activeStaff = staffGroupService.getActiveStaffMembers();
    const activeStaffIdSet = new Set(activeStaff.map(s => s.id));

    let finalMemberIds: string[] = [];

    if (data.type === 'all_staff') {
      // Dynamic: include all active staff IDs
      finalMemberIds = activeStaff.map(s => s.id);
    } else {
      // Filter provided members - only allow valid active staff IDs
      const rawMemberIds = data.memberIds || [];
      const invalidMembers = rawMemberIds.filter(id => !activeStaffIdSet.has(id));
      if (invalidMembers.length > 0) {
        return {
          success: false,
          error: `Invalid group members: IDs [${invalidMembers.join(', ')}] are not active staff members. Non-staff, inactive staff, parents, and students cannot be added.`,
        };
      }
      finalMemberIds = Array.from(new Set(rawMemberIds));

      // Always ensure the creator is a member of the group
      if (!finalMemberIds.includes(staffId)) {
        finalMemberIds.push(staffId);
      }
    }

    if (finalMemberIds.length === 0) {
      return { success: false, error: 'A staff group must have at least one active member.' };
    }

    let userInstitutionId = user.institutionId;
    if (!userInstitutionId) {
      const store = ERPStorage.get();
      if (user.referenceId) {
        const teacher = store.teachers?.find(t => t.id === user.referenceId);
        if (teacher?.institutionId) {
          userInstitutionId = teacher.institutionId;
        }
      }
      if (!userInstitutionId && (user.id === 'user-school-admin' || user.id === 'user-teacher-ananya')) {
        userInstitutionId = 'inst-1';
      }
    }

    if (!userInstitutionId) {
      return { success: false, error: 'User must belong to an institution to create a staff group.' };
    }

    const newGroup: StaffGroup = {
      id: `grp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      description: data.description?.trim() || '',
      type: data.type,
      institutionId: userInstitutionId,
      department: data.department,
      classId: data.classId,
      section: data.section,
      isDynamicAllStaff: data.type === 'all_staff',
      creatorId: user.id,
      createdBy: user.id,
      creatorName: user.name,
      creatorRole: user.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberIds: finalMemberIds,
      status: 'active',
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: 'Group created',
    };

    store.staffGroups = [newGroup, ...existingGroups];
    ERPStorage.set(store);

    return { success: true, group: newGroup };
  },

  /**
   * Updates members of a custom or department group
   */
  updateMembers: (
    groupId: string,
    newMemberIds: string[],
    user: User
  ): { success: boolean; group?: StaffGroup; error?: string } => {
    const store = ERPStorage.get();
    const group = (store.staffGroups || []).find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    const staffId = resolveStaffId(user);
    const canManage =
      user.role === 'super_admin' ||
      user.role === 'school_admin' ||
      group.creatorId === user.id ||
      group.creatorId === staffId ||
      group.createdBy === user.id ||
      group.createdBy === staffId;

    if (!canManage) {
      return { success: false, error: 'Permission denied: Only group creators and School Admins can manage members.' };
    }

    if (group.isDynamicAllStaff) {
      return { success: false, error: 'All Staff groups dynamically include all active staff members.' };
    }

    const activeStaff = staffGroupService.getActiveStaffMembers();
    const activeStaffIdSet = new Set(activeStaff.map(s => s.id));
    const invalid = newMemberIds.filter(id => !activeStaffIdSet.has(id));
    if (invalid.length > 0) {
      return { success: false, error: `Invalid member IDs: ${invalid.join(', ')}.` };
    }

    group.memberIds = Array.from(new Set(newMemberIds));
    group.updatedAt = new Date().toISOString();
    ERPStorage.set(store);

    return { success: true, group };
  },

  /**
   * Archives a group. Preserves message history.
   */
  archiveGroup: (
    groupId: string,
    user: User
  ): { success: boolean; group?: StaffGroup; error?: string } => {
    const store = ERPStorage.get();
    const group = (store.staffGroups || []).find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    // All Staff & Role-Based channels: Reserved exclusively for School Administrators
    if (group.type === 'all_staff' || group.type === 'role_based') {
      if (user.role !== 'super_admin' && user.role !== 'school_admin') {
        return { success: false, error: 'Permission denied: Only School Administrators can archive All Staff or Role-Based groups.' };
      }
    }

    const staffId = resolveStaffId(user);
    const canArchive =
      user.role === 'super_admin' ||
      user.role === 'school_admin' ||
      group.creatorId === user.id ||
      group.creatorId === staffId ||
      group.createdBy === user.id ||
      group.createdBy === staffId;

    if (!canArchive) {
      return { success: false, error: 'Permission denied: Only group creators and School Admins can archive groups.' };
    }

    group.status = 'archived';
    group.updatedAt = new Date().toISOString();
    ERPStorage.set(store);

    return { success: true, group };
  },

  /**
   * Unarchives an archived group
   */
  unarchiveGroup: (
    groupId: string,
    user: User
  ): { success: boolean; group?: StaffGroup; error?: string } => {
    const store = ERPStorage.get();
    const group = (store.staffGroups || []).find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    if (group.type === 'all_staff' || group.type === 'role_based') {
      if (user.role !== 'super_admin' && user.role !== 'school_admin') {
        return { success: false, error: 'Permission denied: Only School Administrators can restore All Staff or Role-Based groups.' };
      }
    }

    const staffId = resolveStaffId(user);
    const canUnarchive =
      user.role === 'super_admin' ||
      user.role === 'school_admin' ||
      group.creatorId === user.id ||
      group.creatorId === staffId ||
      group.createdBy === user.id ||
      group.createdBy === staffId;

    if (!canUnarchive) {
      return { success: false, error: 'Permission denied.' };
    }

    group.status = 'active';
    group.updatedAt = new Date().toISOString();
    ERPStorage.set(store);

    return { success: true, group };
  },

  /**
   * Retrieves messages for a group with RBAC verification
   */
  getMessages: (groupId: string, user: User): StaffGroupMessage[] => {
    const group = staffGroupService.getGroupById(groupId, user);
    if (!group) return [];

    const store = ERPStorage.get();
    const messages = (store.staffGroupMessages || []).filter(m => m.groupId === groupId);
    return [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  },

  /**
   * Sends a message to a staff group
   */
  sendMessage: (
    groupId: string,
    content: string,
    user: User,
    isAnnouncement: boolean = false
  ): { success: boolean; message?: StaffGroupMessage; error?: string } => {
    const store = ERPStorage.get();
    const group = (store.staffGroups || []).find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    if (group.status === 'archived') {
      return { success: false, error: 'This group is archived. Messages cannot be sent to archived groups.' };
    }

    // Verify user membership
    const staffId = resolveStaffId(user);

    // Inactive staff members cannot send messages
    if (user.role === 'teacher') {
      const teacherRecord = store.teachers.find(t => t.id === staffId || t.id === user.referenceId);
      if (teacherRecord && teacherRecord.status !== 'active') {
        return { success: false, error: 'Access denied: Inactive staff members cannot send messages.' };
      }
    }

    const isMember =
      user.role === 'super_admin' ||
      user.role === 'school_admin' ||
      group.isDynamicAllStaff ||
      group.memberIds.includes(staffId) ||
      group.memberIds.includes(user.id);

    if (!isMember) {
      return { success: false, error: 'Permission denied: You are not a member of this group.' };
    }

    // Check announcement privileges
    if (isAnnouncement) {
      const allowedAnnouncement = staffGroupService.canSendAnnouncement(groupId, user);
      if (!allowedAnnouncement) {
        return {
          success: false,
          error:
            group.type === 'all_staff' || group.type === 'role_based'
              ? 'Permission denied: School-wide announcements in this channel are restricted to School Administrators.'
              : 'Permission denied: You do not have permission to broadcast announcements in this group.',
        };
      }
    }

    // Validate message content
    const trimmed = content.trim();
    if (!trimmed || trimmed.length === 0) {
      return { success: false, error: 'Message cannot be empty.' };
    }
    if (trimmed.length > 2000) {
      return { success: false, error: `Message exceeds maximum limit of 2,000 characters (current: ${trimmed.length}).` };
    }

    // Duplicate message guard (anti-double-click within 2000ms)
    const recentMessages = store.staffGroupMessages || [];
    const isDuplicate = recentMessages.some(m => {
      if (m.groupId !== groupId || m.senderId !== staffId || m.content !== trimmed) return false;
      const timeDiff = Math.abs(Date.now() - new Date(m.timestamp).getTime());
      return timeDiff < 2000;
    });

    if (isDuplicate) {
      return { success: false, error: 'Duplicate message detected. Please wait a moment before resending.' };
    }

    const allStaff = staffGroupService.getAllStaffMembers();
    const staffMember = allStaff.find(s => s.id === staffId || s.userId === user.id);
    const designation =
      staffMember?.designation ||
      (user.role === 'school_admin'
        ? 'School Administrator'
        : user.role === 'super_admin'
        ? 'Super Administrator'
        : 'Teacher');

    const newMessage: StaffGroupMessage = {
      id: `stf-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      groupId,
      senderId: staffId,
      senderName: user.name,
      senderRole: user.role,
      senderDesignation: designation,
      senderAvatar: user.avatar,
      content: trimmed,
      timestamp: new Date().toISOString(),
      isAnnouncement: Boolean(isAnnouncement),
      readBy: [staffId],
    };

    store.staffGroupMessages = [...(store.staffGroupMessages || []), newMessage];

    // Update group preview and last active timestamp
    group.lastMessageAt = newMessage.timestamp;
    group.lastMessagePreview = trimmed.length > 70 ? `${trimmed.substring(0, 67)}...` : trimmed;
    group.updatedAt = newMessage.timestamp;

    ERPStorage.set(store);

    // Resolve staff recipients and dispatch notifications (excluding sender)
    const membersToNotify = group.isDynamicAllStaff
      ? staffGroupService.getAllStaffMembers().map(s => s.id)
      : group.memberIds || [];
    const recipients = notificationService.resolveStaffGroupRecipients(membersToNotify, user.id);

    notificationService.dispatchToMany({
      institutionId: 'inst-1',
      recipients,
      senderUserId: user.id,
      senderName: user.name,
      senderRole: user.role,
      category: 'staff_group',
      priority: isAnnouncement ? 'high' : 'normal',
      title: `${group.name}: ${isAnnouncement ? 'Announcement' : 'New Message'}`,
      message: `${user.name} (${designation}): ${trimmed.substring(0, 140)}${trimmed.length > 140 ? '...' : ''}`,
      relatedEntityId: group.id,
      relatedModule: 'staff_groups',
      actionUrl: `/staff-groups?id=${group.id}`,
    });

    return { success: true, message: newMessage };
  },

  /**
   * Marks unread messages in a group as read by the current user
   */
  markMessagesAsRead: (groupId: string, user: User): void => {
    const group = staffGroupService.getGroupById(groupId, user);
    if (!group) return;

    const store = ERPStorage.get();
    const staffId = resolveStaffId(user);
    let updated = false;

    const messages = store.staffGroupMessages || [];
    for (const msg of messages) {
      if (msg.groupId === groupId && !msg.readBy.includes(staffId)) {
        msg.readBy.push(staffId);
        updated = true;
      }
    }

    if (updated) {
      ERPStorage.set(store);
    }
  },

  /**
   * Returns count of unread messages for this user in a group
   */
  getUnreadCount: (groupId: string, user: User): number => {
    const group = staffGroupService.getGroupById(groupId, user);
    if (!group) return 0;

    const store = ERPStorage.get();
    const staffId = resolveStaffId(user);
    const messages = store.staffGroupMessages || [];
    return messages.filter(m => m.groupId === groupId && !m.readBy.includes(staffId)).length;
  },

  /**
   * Checks whether sending an announcement to this group constitutes high reach (>= 5 members or all_staff)
   */
  checkHighReachAnnouncement: (
    groupId: string
  ): { isHighReach: boolean; recipientCount: number; groupName: string } => {
    const store = ERPStorage.get();
    const group = (store.staffGroups || []).find(g => g.id === groupId);
    if (!group) return { isHighReach: false, recipientCount: 0, groupName: '' };

    const activeStaff = staffGroupService.getActiveStaffMembers();
    const activeStaffIdSet = new Set(activeStaff.map(s => s.id));
    const recipientCount = group.isDynamicAllStaff
      ? activeStaff.length
      : group.memberIds.filter(id => activeStaffIdSet.has(id)).length;
    const isHighReach = group.isDynamicAllStaff || recipientCount >= 5;

    return {
      isHighReach,
      recipientCount,
      groupName: group.name,
    };
  },
};
