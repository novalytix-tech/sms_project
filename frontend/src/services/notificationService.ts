// ==========================================
// Centralized Notification & Alert Service
// Developed by NTS Novalytix for SMS ERP
// ==========================================

import { AppNotification, NotificationCategory, NotificationPriority, UserRole } from '../types';
import { ERPStorage } from './storage';
import { studentService } from './studentService';
import { DEMO_USERS } from '../data/seedData';

export interface CreateNotificationInput {
  institutionId?: string;
  recipientUserId: string;
  recipientRole?: UserRole;
  senderUserId?: string;
  senderName?: string;
  senderRole?: UserRole;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedModule?: string;
  actionUrl?: string;
  expiryDate?: string;
}

export interface DispatchToManyInput {
  institutionId?: string;
  recipients: Array<{ userId: string; role?: UserRole }>;
  senderUserId?: string;
  senderName?: string;
  senderRole?: UserRole;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedModule?: string;
  actionUrl?: string;
  expiryDate?: string;
}

export const notificationService = {
  /**
   * Returns all stored notifications across the ERP instance
   */
  getAll: (): AppNotification[] => {
    const store = ERPStorage.get();
    return store.notifications || [];
  },

  /**
   * Retrieves notifications scoped strictly to the given user ID and/or role,
   * sorted in reverse chronological order (newest first).
   */
  getForUser: (userId: string, role?: UserRole): AppNotification[] => {
    const all = notificationService.getAll();
    return all
      .filter(n => n.recipientUserId === userId || (role && n.recipientRole === role && !n.recipientUserId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Calculates the exact unread notification count for an authenticated user.
   */
  getUnreadCount: (userId: string, role?: UserRole): number => {
    const userNotifs = notificationService.getForUser(userId, role);
    return userNotifs.filter(n => !n.isRead).length;
  },

  /**
   * Creates and persists a single in-app notification.
   * Includes duplicate prevention guard (same recipient, title, relatedEntityId within 3 seconds).
   */
  createNotification: (input: CreateNotificationInput): AppNotification => {
    const store = ERPStorage.get();
    const existing = store.notifications || [];

    const now = new Date();
    const createdAtIso = now.toISOString();

    // Duplicate guard: Prevent duplicate alerts created within 3000ms
    const isDuplicate = existing.some(n => {
      if (
        n.recipientUserId === input.recipientUserId &&
        n.title === input.title &&
        n.relatedEntityId === input.relatedEntityId
      ) {
        const timeDiff = Math.abs(now.getTime() - new Date(n.createdAt).getTime());
        return timeDiff < 3000;
      }
      return false;
    });

    if (isDuplicate) {
      return existing.find(
        n =>
          n.recipientUserId === input.recipientUserId &&
          n.title === input.title &&
          n.relatedEntityId === input.relatedEntityId
      )!;
    }

    const newNotification: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      institutionId: input.institutionId || 'inst-1',
      recipientUserId: input.recipientUserId,
      recipientRole: input.recipientRole,
      senderUserId: input.senderUserId,
      senderName: input.senderName,
      senderRole: input.senderRole,
      category: input.category,
      priority: input.priority || 'normal',
      title: input.title.trim(),
      message: input.message.trim(),
      relatedEntityId: input.relatedEntityId,
      relatedModule: input.relatedModule,
      actionUrl: input.actionUrl,
      isRead: false,
      createdAt: createdAtIso,
      expiryDate: input.expiryDate,
    };

    store.notifications = [newNotification, ...existing];
    ERPStorage.set(store);

    // Broadcast real-time event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nts_erp_notification_received', { detail: newNotification }));
      window.dispatchEvent(new Event('nts_erp_storage_updated'));
    }

    return newNotification;
  },

  /**
   * Dispatches notifications in batch to multiple recipients,
   * automatically excluding the sender.
   */
  dispatchToMany: (input: DispatchToManyInput): AppNotification[] => {
    const store = ERPStorage.get();
    const existing = store.notifications || [];
    const now = new Date();
    const formattedTimestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const createdList: AppNotification[] = [];
    const seenRecipients = new Set<string>();

    for (const rec of input.recipients) {
      // Exclude sender from receiving their own notification
      if (rec.userId === input.senderUserId) continue;
      if (seenRecipients.has(rec.userId)) continue;
      seenRecipients.add(rec.userId);

      const notif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        institutionId: input.institutionId || 'inst-1',
        recipientUserId: rec.userId,
        recipientRole: rec.role,
        senderUserId: input.senderUserId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        category: input.category,
        priority: input.priority || 'normal',
        title: input.title.trim(),
        message: input.message.trim(),
        relatedEntityId: input.relatedEntityId,
        relatedModule: input.relatedModule,
        actionUrl: input.actionUrl,
        isRead: false,
        createdAt: formattedTimestamp,
        expiryDate: input.expiryDate,
      };

      createdList.push(notif);
    }

    if (createdList.length > 0) {
      store.notifications = [...createdList, ...existing];
      ERPStorage.set(store);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nts_erp_notification_received', { detail: createdList }));
        window.dispatchEvent(new Event('nts_erp_storage_updated'));
      }
    }

    return createdList;
  },

  /**
   * Marks a specific notification as read by its recipient.
   */
  markAsRead: (notificationId: string, userId: string): boolean => {
    const store = ERPStorage.get();
    const notifs = store.notifications || [];
    const item = notifs.find(n => n.id === notificationId && n.recipientUserId === userId);

    if (item && !item.isRead) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
      ERPStorage.set(store);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nts_erp_storage_updated'));
      }
      return true;
    }
    return false;
  },

  /**
   * Marks all unread notifications for a user as read.
   */
  markAllAsRead: (userId: string, role?: UserRole): number => {
    const store = ERPStorage.get();
    const notifs = store.notifications || [];
    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const item of notifs) {
      if (item.recipientUserId === userId && !item.isRead) {
        item.isRead = true;
        item.readAt = nowIso;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      ERPStorage.set(store);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nts_erp_storage_updated'));
      }
    }
    return updatedCount;
  },

  /**
   * Deletes a notification from user's history.
   */
  deleteNotification: (notificationId: string, userId: string): boolean => {
    const store = ERPStorage.get();
    const notifs = store.notifications || [];
    const initialLen = notifs.length;

    store.notifications = notifs.filter(n => !(n.id === notificationId && n.recipientUserId === userId));

    if (store.notifications.length !== initialLen) {
      ERPStorage.set(store);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nts_erp_storage_updated'));
      }
      return true;
    }
    return false;
  },

  // ==========================================
  // Recipient Resolution Helpers
  // ==========================================

  /**
   * Resolves all eligible group member user accounts for a Class Group
   * (Enrolled students in the class/section + linked parents + designated class teacher).
   */
  resolveClassGroupRecipients: (
    classId: string,
    section: string,
    senderUserId?: string
  ): Array<{ userId: string; role: UserRole; name: string }> => {
    const store = ERPStorage.get();
    const students = studentService.getAll();
    const recipients: Array<{ userId: string; role: UserRole; name: string }> = [];
    const seenUserIds = new Set<string>();

    // 1. Find all students enrolled in this class & section
    const enrolledStudents = students.filter(
      s => s.classId === classId && s.section.toLowerCase() === section.toLowerCase()
    );

    // Map each enrolled student to their user account
    for (const student of enrolledStudents) {
      // Find matching user in DEMO_USERS or dynamic users
      let studentUserId = `user-student-${student.id}`;
      // Check if standard demo user Aarav matches
      if (student.id === 'stud-1' || student.fullName.toLowerCase().includes('aarav')) {
        studentUserId = DEMO_USERS.student.id;
      }

      if (!seenUserIds.has(studentUserId) && studentUserId !== senderUserId) {
        seenUserIds.add(studentUserId);
        recipients.push({
          userId: studentUserId,
          role: 'student',
          name: student.fullName,
        });
      }

      // 2. Resolve linked parent account
      let parentUserId = `user-parent-${student.parentId || student.id}`;
      if (student.parentId === 'parent-patel' || student.parentName?.toLowerCase().includes('patel')) {
        parentUserId = DEMO_USERS.parent.id;
      }

      if (!seenUserIds.has(parentUserId) && parentUserId !== senderUserId) {
        seenUserIds.add(parentUserId);
        recipients.push({
          userId: parentUserId,
          role: 'parent',
          name: student.parentName || `Parent of ${student.fullName}`,
        });
      }
    }

    // 3. Include Class Teacher if sender is not the teacher
    const targetClass = store.classes.find(
      c => c.id === classId && c.section.toLowerCase() === section.toLowerCase()
    );
    if (targetClass?.classTeacherId) {
      let teacherUserId = `user-teacher-${targetClass.classTeacherId}`;
      if (targetClass.classTeacherId === 'teach-1' || targetClass.classTeacherName.toLowerCase().includes('ananya')) {
        teacherUserId = DEMO_USERS.teacher.id;
      }

      if (!seenUserIds.has(teacherUserId) && teacherUserId !== senderUserId) {
        seenUserIds.add(teacherUserId);
        recipients.push({
          userId: teacherUserId,
          role: 'teacher',
          name: targetClass.classTeacherName,
        });
      }
    }

    return recipients;
  },

  /**
   * Resolves staff user accounts for members of a Staff Group.
   */
  resolveStaffGroupRecipients: (
    memberStaffIds: string[],
    senderUserId?: string
  ): Array<{ userId: string; role: UserRole; name: string }> => {
    const store = ERPStorage.get();
    const recipients: Array<{ userId: string; role: UserRole; name: string }> = [];
    const seenUserIds = new Set<string>();

    for (const staffId of memberStaffIds) {
      let resolvedUserId = `user-staff-${staffId}`;
      let role: UserRole = 'teacher';
      let name = staffId;

      if (staffId === 'STAFF-ADM' || staffId === 'user-school-admin') {
        resolvedUserId = DEMO_USERS.school_admin.id;
        role = 'school_admin';
        name = DEMO_USERS.school_admin.name;
      } else if (staffId === 'teach-1' || staffId === 'user-teacher-ananya') {
        resolvedUserId = DEMO_USERS.teacher.id;
        role = 'teacher';
        name = DEMO_USERS.teacher.name;
      } else {
        const teacher = store.teachers.find(t => t.id === staffId || t.staffId === staffId);
        if (teacher) {
          name = teacher.fullName;
          resolvedUserId = `user-teacher-${teacher.id}`;
        }
      }

      if (!seenUserIds.has(resolvedUserId) && resolvedUserId !== senderUserId) {
        seenUserIds.add(resolvedUserId);
        recipients.push({
          userId: resolvedUserId,
          role,
          name,
        });
      }
    }

    return recipients;
  },
};
