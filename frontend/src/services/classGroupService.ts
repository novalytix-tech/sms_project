// ==========================================
// Student-Teacher Class Groups & Communications Service
// Developed by NTS Novalytix
// ==========================================

import { ERPStorage } from './storage';
import { classService } from './classService';
import { studentService } from './studentService';

import { notificationService } from './notificationService';
import { ClassGroup, ClassGroupMessage, ClassMessageCategory, ClassMessagePriority, Student, User } from '../types';

export interface CreateClassGroupInput {
  classId: string;
  section: string;
  name?: string;
  description?: string;
}

export interface PostClassMessageInput {
  groupId: string;
  title: string;
  content: string;
  category?: ClassMessageCategory;
  priority?: ClassMessagePriority;
  attachmentName?: string;
}

export const classGroupService = {
  /**
   * Returns all class groups in the ERP
   */
  getAll: (): ClassGroup[] => {
    const store = ERPStorage.get();
    return store.classGroups || [];
  },

  /**
   * Retrieves all class groups accessible to the current user
   */
  getGroupsForUser: (user: User): ClassGroup[] => {
    const allGroups = classGroupService.getAll().filter(g => g.status === 'active');

    // Administrators see all class groups
    if (user.role === 'super_admin' || user.role === 'school_admin') {
      return allGroups;
    }

    // Teacher sees groups for classes they are assigned to / class teacher of
    if (user.role === 'teacher') {
      const classes = classService.getAll();
      const teacherStaffId = user.referenceId || user.id;

      const myAssignedClasses = classes.filter(
        c =>
          c.classTeacherId === user.id ||
          c.classTeacherId === teacherStaffId ||
          c.classTeacherName.toLowerCase() === user.name.toLowerCase()
      );

      const assignedClassIds = new Set(myAssignedClasses.map(c => `${c.id}_${c.section.toLowerCase()}`));

      return allGroups.filter(g =>
        assignedClassIds.has(`${g.classId}_${g.section.toLowerCase()}`) ||
        g.classTeacherId === user.id ||
        g.classTeacherId === teacherStaffId
      );
    }

    // Student sees only the group for their own enrolled class & section
    if (user.role === 'student') {
      const students = studentService.getAll();
      const student =
        (user.referenceId ? studentService.getById(user.referenceId) : null) ||
        students.find(s => s.fullName.toLowerCase() === user.name.toLowerCase()) ||
        students[0];

      if (!student) return [];

      return allGroups.filter(
        g => g.classId === student.classId && g.section.toLowerCase() === student.section.toLowerCase()
      );
    }

    // Parent sees groups for classes their linked children are enrolled in
    if (user.role === 'parent') {
      const parentId = user.referenceId || user.id;
      let parentStudents = studentService
        .getAll()
        .filter(s => s.parentId === parentId || (user.email && s.parentEmail?.toLowerCase() === user.email?.toLowerCase()));
      if (parentStudents.length === 0) {
        parentStudents = studentService.getAll().slice(0, 2);
      }
      const studentClassKeys = new Set(
        parentStudents.map(s => `${s.classId}_${s.section.toLowerCase()}`)
      );

      return allGroups.filter(g =>
        studentClassKeys.has(`${g.classId}_${g.section.toLowerCase()}`)
      );
    }

    // Suppliers have zero access
    return [];
  },

  /**
   * Finds the active class group for a specific class and section
   */
  getClassGroupForClass: (classId: string, section: string): ClassGroup | null => {
    const groups = classGroupService.getAll();
    return (
      groups.find(
        g =>
          g.classId === classId &&
          g.section.toLowerCase() === section.toLowerCase() &&
          g.status === 'active'
      ) || null
    );
  },

  /**
   * Creates a new Class Group (Permitted for designated Class Teacher and Admins)
   */
  createClassGroup: (
    input: CreateClassGroupInput,
    user: User
  ): { success: boolean; group?: ClassGroup; error?: string } => {
    const store = ERPStorage.get();
    const existingGroups = store.classGroups || [];
    const classes = classService.getAll();

    const targetClass = classes.find(
      c => c.id === input.classId && c.section.toLowerCase() === input.section.toLowerCase()
    );

    if (!targetClass) {
      return { success: false, error: 'Target class and section not found in the institution.' };
    }

    // Permission Verification:
    // Students, parents, suppliers CANNOT create class groups
    if (user.role !== 'teacher' && user.role !== 'school_admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'Permission Denied: Only teachers and administrators can create class groups.',
      };
    }

    // Teachers MUST be the designated Class Teacher of this class
    if (user.role === 'teacher') {
      const teacherStaffId = user.referenceId || user.id;
      const isDesignatedClassTeacher =
        targetClass.classTeacherId === user.id ||
        targetClass.classTeacherId === teacherStaffId ||
        targetClass.classTeacherName.toLowerCase() === user.name.toLowerCase();

      if (!isDesignatedClassTeacher) {
        return {
          success: false,
          error: `Permission Denied: Only the designated Class Teacher (${targetClass.classTeacherName}) can create a class group for ${targetClass.name}-${targetClass.section}.`,
        };
      }
    }

    // Check if an active group already exists for this class
    const existing = existingGroups.find(
      g =>
        g.classId === input.classId &&
        g.section.toLowerCase() === input.section.toLowerCase() &&
        g.status === 'active'
    );
    if (existing) {
      return {
        success: false,
        error: `A class group for ${targetClass.name} (${targetClass.section}) already exists.`,
      };
    }

    const now = new Date();
    const formattedTimestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newGroup: ClassGroup = {
      id: `cg-${Date.now()}`,
      classId: targetClass.id,
      className: targetClass.name,
      section: targetClass.section,
      name: input.name?.trim() || `${targetClass.name} (${targetClass.section}) Student Group`,
      description:
        input.description?.trim() ||
        `Official classroom announcements, exam notices, and study updates from ${targetClass.classTeacherName}`,
      classTeacherId: targetClass.classTeacherId,
      classTeacherName: targetClass.classTeacherName,
      academicYear: targetClass.academicYear || '2026-2027',
      createdAt: formattedTimestamp,
      updatedAt: formattedTimestamp,
      status: 'active',
      lastMessageAt: formattedTimestamp,
      lastMessagePreview: 'Class group created. Welcome students!',
      lastMessageSenderName: targetClass.classTeacherName,
    };

    store.classGroups = [newGroup, ...existingGroups];

    // Seed a welcome message
    const welcomeMsg: ClassGroupMessage = {
      id: `cgm-${Date.now()}`,
      groupId: newGroup.id,
      classId: targetClass.id,
      section: targetClass.section,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role === 'teacher' ? 'teacher' : 'school_admin',
      senderTitle: user.role === 'teacher' ? 'Class Teacher' : 'School Administrator',
      title: `Welcome to ${targetClass.name} (${targetClass.section}) Official Group`,
      content: `Welcome students! This is the official class communication channel where all class notices, homework reminders, and examination updates will be shared directly by your Class Teacher.`,
      category: 'announcement',
      priority: 'important',
      timestamp: formattedTimestamp,
      createdAt: formattedTimestamp,
      readBy: [user.id],
    };

    store.classGroupMessages = [welcomeMsg, ...(store.classGroupMessages || [])];
    ERPStorage.set(store);

    // Dispatch welcome notification to eligible students and parents
    const recipients = notificationService.resolveClassGroupRecipients(
      targetClass.id,
      targetClass.section,
      user.id
    );
    notificationService.dispatchToMany({
      institutionId: 'inst-1',
      recipients,
      senderUserId: user.id,
      senderName: user.name,
      senderRole: user.role,
      category: 'class_group',
      priority: 'normal',
      title: `Joined ${newGroup.name}`,
      message: `Official class group created by ${targetClass.classTeacherName}. Announcements and homework updates will appear here.`,
      relatedEntityId: newGroup.id,
      relatedModule: 'class_groups',
      actionUrl: `/class-groups?id=${newGroup.id}`,
    });

    return { success: true, group: newGroup };
  },

  /**
   * Posts a new message / announcement to a class group
   */
  sendMessage: (
    input: PostClassMessageInput,
    user: User
  ): { success: boolean; message?: ClassGroupMessage; error?: string } => {
    if (!input.title.trim()) {
      return { success: false, error: 'Message title is required.' };
    }
    if (!input.content.trim()) {
      return { success: false, error: 'Message content cannot be blank.' };
    }

    const store = ERPStorage.get();
    const group = (store.classGroups || []).find(g => g.id === input.groupId && g.status === 'active');
    if (!group) {
      return { success: false, error: 'Class group not found or has been archived.' };
    }

    // Role verification: Students, parents, suppliers CANNOT post messages to class group
    if (['student', 'parent', 'supplier'].includes(user.role)) {
      return {
        success: false,
        error: 'Only the Class Teacher or School Administrator can post messages to this class group.',
      };
    }

    // If teacher, must be assigned to this class or designated class teacher
    if (user.role === 'teacher') {
      const teacherStaffId = user.referenceId || user.id;
      const isAuthorized =
        group.classTeacherId === user.id ||
        group.classTeacherId === teacherStaffId ||
        group.classTeacherName.toLowerCase() === user.name.toLowerCase();

      if (!isAuthorized) {
        return {
          success: false,
          error: `Permission Denied: Only the assigned Class Teacher (${group.classTeacherName}) can post to this group.`,
        };
      }
    }

    const now = new Date();
    const formattedTimestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: ClassGroupMessage = {
      id: `cgm-${Date.now()}`,
      groupId: group.id,
      classId: group.classId,
      section: group.section,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role === 'teacher' ? 'teacher' : 'school_admin',
      senderTitle: user.role === 'teacher' ? 'Class Teacher' : 'School Administrator',
      title: input.title.trim(),
      content: input.content.trim(),
      category: input.category || 'announcement',
      priority: input.priority || 'normal',
      attachmentName: input.attachmentName?.trim(),
      timestamp: formattedTimestamp,
      createdAt: formattedTimestamp,
      readBy: [user.id],
    };

    // Update group metadata
    group.lastMessageAt = formattedTimestamp;
    group.lastMessagePreview = newMsg.title;
    group.lastMessageSenderName = user.name;
    group.updatedAt = formattedTimestamp;

    store.classGroupMessages = [newMsg, ...(store.classGroupMessages || [])];
    ERPStorage.set(store);

    // Phase 2 Fix: Resolve all eligible group members (students, parents, teachers)
    // and generate in-app notifications for each member (excluding the sender)
    const recipients = notificationService.resolveClassGroupRecipients(
      group.classId,
      group.section,
      user.id
    );

    const notifPriority =
      input.priority === 'urgent' ? 'urgent' : input.priority === 'important' ? 'high' : 'normal';

    notificationService.dispatchToMany({
      institutionId: 'inst-1',
      recipients,
      senderUserId: user.id,
      senderName: user.name,
      senderRole: user.role,
      category: 'class_group',
      priority: notifPriority,
      title: `${group.name}: ${input.title.trim()}`,
      message: `${user.name} (${newMsg.senderTitle}): ${input.content.trim().substring(0, 140)}${input.content.length > 140 ? '...' : ''}`,
      relatedEntityId: group.id,
      relatedModule: 'class_groups',
      actionUrl: `/class-groups?id=${group.id}`,
    });

    return { success: true, message: newMsg };
  },

  /**
   * Retrieves messages for a class group with security boundary check
   */
  getMessages: (groupId: string, user: User): ClassGroupMessage[] => {
    const store = ERPStorage.get();
    const group = (store.classGroups || []).find(g => g.id === groupId);
    if (!group) return [];

    // Verify user authorization to view these messages
    if (user.role === 'student') {
      const students = studentService.getAll();
      const student =
        (user.referenceId ? studentService.getById(user.referenceId) : null) ||
        students.find(s => s.fullName.toLowerCase() === user.name.toLowerCase()) ||
        students[0];

      if (!student || student.classId !== group.classId || student.section.toLowerCase() !== group.section.toLowerCase()) {
        return []; // Block cross-class viewing
      }
    } else if (user.role === 'parent') {
      const parentId = user.referenceId || user.id;
      let parentStudents = studentService
        .getAll()
        .filter(s => s.parentId === parentId || (user.email && s.parentEmail?.toLowerCase() === user.email?.toLowerCase()));
      if (parentStudents.length === 0) {
        parentStudents = studentService.getAll().slice(0, 2);
      }
      const isLinkedToClass = parentStudents.some(
        s => s.classId === group.classId && s.section.toLowerCase() === group.section.toLowerCase()
      );
      if (!isLinkedToClass) return [];
    } else if (user.role === 'supplier') {
      return [];
    }

    const msgs = (store.classGroupMessages || []).filter(m => m.groupId === groupId);
    return msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Mark a message as read by a student or user
   */
  markAsRead: (messageId: string, userId: string): boolean => {
    const store = ERPStorage.get();
    const msg = (store.classGroupMessages || []).find(m => m.id === messageId);
    if (!msg) return false;
    if (!msg.readBy.includes(userId)) {
      msg.readBy.push(userId);
      ERPStorage.set(store);
    }
    return true;
  },

  /**
   * Get unread message count for a specific user in a class group
   */
  getUnreadCount: (groupId: string, userId: string): number => {
    const store = ERPStorage.get();
    const msgs = (store.classGroupMessages || []).filter(m => m.groupId === groupId);
    return msgs.filter(m => !m.readBy.includes(userId)).length;
  },

  /**
   * Returns all active enrolled students receiving messages in this class group
   */
  getStudentsInGroup: (groupId: string): Student[] => {
    const store = ERPStorage.get();
    const group = (store.classGroups || []).find(g => g.id === groupId);
    if (!group) return [];

    return studentService.getByClassAndSection(group.classId, group.section);
  },
};
