// ==========================================
// Avatar resolver — gender / role aware
// Always returns a lightweight SVG portrait so every
// student, teacher and persona shows a real passport-style image.
// Developed by NTS Novalytix
// ==========================================

import { studentService } from '../services/studentService';
import { teacherService } from '../services/teacherService';
import type { User, UserRole } from '../types';

/**
 * Resolves an avatar image path for any logged-in user:
 *   1. a real uploaded photo (photoUrl), else
 *   2. a gender-based student / teacher portrait, else
 *   3. a role-based profile illustration.
 * The result is always a small SVG (or a URL), so the UI stays light.
 */
export function resolveUserAvatar(
  role: UserRole | undefined,
  user: Partial<User> | null | undefined
): string {
  if (!user) return '/default-student-avatar.svg';
  if (user.photoUrl) return user.photoUrl;

  const name = (user.name || '').toLowerCase();
  const email = (user.email || '').toLowerCase();

  switch (role) {
    case 'student': {
      const student =
        (user.referenceId ? studentService.getById(user.referenceId) : null) ||
        studentService.getAll().find(s => s.fullName.toLowerCase() === name);
      return student ? studentService.getStudentPhoto(student) : '/default-student-avatar.svg';
    }
    case 'teacher': {
      const teacher =
        (user.referenceId ? teacherService.getById(user.referenceId) : null) ||
        teacherService
          .getAll()
          .find(t => t.email.toLowerCase() === email || t.fullName.toLowerCase() === name);
      return teacher ? teacherService.getTeacherPhoto(teacher) : '/teacher-female.svg';
    }
    case 'parent':
      return '/parent-profile.svg';
    case 'school_admin':
      return '/admin-profile.svg';
    case 'super_admin':
      return '/super-admin-profile.svg';
    case 'supplier':
      return '/supplier-profile.svg';
    default:
      return '/default-student-avatar.svg';
  }
}
