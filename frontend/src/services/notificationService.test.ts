import { describe, it, expect, beforeEach } from 'vitest';
import { notificationService } from './notificationService';
import { classGroupService } from './classGroupService';
import { staffGroupService } from './staffGroupService';
import { ERPStorage } from './storage';
import { DEMO_USERS } from '../data/seedData';

describe('notificationService Centralized Notification & Alert System', () => {
  beforeEach(() => {
    localStorage.clear();
    ERPStorage.reset();
  });

  it('retrieves user-specific notifications and unread counts', () => {
    const studentUser = DEMO_USERS.student;
    const initialNotifs = notificationService.getForUser(studentUser.id);
    expect(Array.isArray(initialNotifs)).toBe(true);

    const unreadCount = notificationService.getUnreadCount(studentUser.id);
    expect(typeof unreadCount).toBe('number');
  });

  it('marks individual and all notifications as read', () => {
    const studentUser = DEMO_USERS.student;

    // Create unread test notification
    const notif = notificationService.createNotification({
      recipientUserId: studentUser.id,
      recipientRole: 'student',
      category: 'system',
      title: 'Test Alert',
      message: 'This is a test notification',
    });

    expect(notif.isRead).toBe(false);

    // Mark single notification as read
    const marked = notificationService.markAsRead(notif.id, studentUser.id);
    expect(marked).toBe(true);

    const refreshed = notificationService.getForUser(studentUser.id).find(n => n.id === notif.id);
    expect(refreshed?.isRead).toBe(true);

    // Mark all as read
    const updatedCount = notificationService.markAllAsRead(studentUser.id);
    expect(typeof updatedCount).toBe('number');
    expect(notificationService.getUnreadCount(studentUser.id)).toBe(0);
  });

  it('deletes notification for authorized user', () => {
    const studentUser = DEMO_USERS.student;
    const notif = notificationService.createNotification({
      recipientUserId: studentUser.id,
      category: 'notice',
      title: 'Dismissible Notice',
      message: 'Can be deleted',
    });

    const deleted = notificationService.deleteNotification(notif.id, studentUser.id);
    expect(deleted).toBe(true);

    const exists = notificationService.getForUser(studentUser.id).some(n => n.id === notif.id);
    expect(exists).toBe(false);
  });

  it('prevents duplicate notification creation within 3000ms', () => {
    const studentUser = DEMO_USERS.student;
    const n1 = notificationService.createNotification({
      recipientUserId: studentUser.id,
      category: 'fee',
      title: 'Fee Due',
      message: 'Please clear fees',
      relatedEntityId: 'inv-dup-1',
    });

    const n2 = notificationService.createNotification({
      recipientUserId: studentUser.id,
      category: 'fee',
      title: 'Fee Due',
      message: 'Please clear fees',
      relatedEntityId: 'inv-dup-1',
    });

    expect(n1.id).toBe(n2.id);
  });

  // ==========================================
  // Phase 2 Defect Verification: Class Group Messaging
  // ==========================================

  it('delivers notifications to eligible students and parents when teacher posts Class Group message', () => {
    const teacherUser = DEMO_USERS.teacher;
    const studentUser = DEMO_USERS.student;
    const parentUser = DEMO_USERS.parent;

    const initialStudentNotifs = notificationService.getForUser(studentUser.id);
    const initialParentNotifs = notificationService.getForUser(parentUser.id);
    const initialTeacherNotifs = notificationService.getForUser(teacherUser.id);

    // Teacher sends announcement in Class 10-A
    const res = classGroupService.sendMessage(
      {
        groupId: 'cg-10a',
        title: "Tomorrow's Mathematics Chapter 4 & 5 Test",
        content: 'Please bring your geometry instruments and revised formula sheet.',
        category: 'exam_notice',
        priority: 'urgent',
      },
      teacherUser
    );

    expect(res.success).toBe(true);
    expect(res.message).toBeDefined();

    // 1. Verify eligible student Aarav Patel received the notification
    const updatedStudentNotifs = notificationService.getForUser(studentUser.id);
    expect(updatedStudentNotifs.length).toBeGreaterThan(initialStudentNotifs.length);

    const studentAlert = updatedStudentNotifs.find(n =>
      n.title.includes("Tomorrow's Mathematics Chapter 4 & 5 Test")
    );
    expect(studentAlert).toBeDefined();
    expect(studentAlert?.category).toBe('class_group');
    expect(studentAlert?.priority).toBe('urgent');
    expect(studentAlert?.actionUrl).toBe('/class-groups?id=cg-10a');
    expect(studentAlert?.senderUserId).toBe(teacherUser.id);
    expect(studentAlert?.isRead).toBe(false);

    // 2. Verify linked parent Vikram Patel received the notification
    const updatedParentNotifs = notificationService.getForUser(parentUser.id);
    expect(updatedParentNotifs.length).toBeGreaterThan(initialParentNotifs.length);

    const parentAlert = updatedParentNotifs.find(n =>
      n.title.includes("Tomorrow's Mathematics Chapter 4 & 5 Test")
    );
    expect(parentAlert).toBeDefined();
    expect(parentAlert?.actionUrl).toBe('/class-groups?id=cg-10a');

    // 3. Verify sender (teacher Ananya Sharma) did NOT receive their own notification
    const updatedTeacherNotifs = notificationService.getForUser(teacherUser.id);
    const teacherSelfAlert = updatedTeacherNotifs.find(n =>
      n.title.includes("Tomorrow's Mathematics Chapter 4 & 5 Test")
    );
    expect(teacherSelfAlert).toBeUndefined();
  });

  it('delivers notifications to staff members when message is posted in Staff Group', () => {
    const adminUser = DEMO_USERS.school_admin;
    const teacherUser = DEMO_USERS.teacher;

    const initialTeacherNotifs = notificationService.getForUser(teacherUser.id);

    // School Admin broadcasts in staff group
    const res = staffGroupService.sendMessage(
      'grp-all-staff',
      'Urgent faculty meeting today at 4:00 PM in the Main Auditorium.',
      adminUser,
      true
    );

    expect(res.success).toBe(true);

    // Teacher received staff notification
    const updatedTeacherNotifs = notificationService.getForUser(teacherUser.id);
    expect(updatedTeacherNotifs.length).toBeGreaterThan(initialTeacherNotifs.length);

    const staffAlert = updatedTeacherNotifs.find(n =>
      n.message.includes('Urgent faculty meeting today')
    );
    expect(staffAlert).toBeDefined();
    expect(staffAlert?.category).toBe('staff_group');
    expect(staffAlert?.actionUrl).toBe('/staff-groups?id=grp-all-staff');

    // Sender (admin) excluded from self-notification
    const adminNotifs = notificationService.getForUser(adminUser.id);
    const adminSelfAlert = adminNotifs.find(n => n.message.includes('Urgent faculty meeting today'));
    expect(adminSelfAlert).toBeUndefined();
  });
});
