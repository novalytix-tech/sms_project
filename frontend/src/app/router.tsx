// ==========================================
// Application Routes Configuration
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { AdmissionEnquiryPage } from '../pages/public/AdmissionEnquiryPage';
import { DashboardRouter } from '../pages/dashboards/DashboardRouter';
import { AdmissionsPage } from '../pages/admissions/AdmissionsPage';
import { StudentsPage } from '../pages/students/StudentsPage';
import { TeachersPage } from '../pages/teachers/TeachersPage';
import { ClassesPage } from '../pages/classes/ClassesPage';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { AssignmentsPage } from '../pages/assignments/AssignmentsPage';
import { ExaminationsPage } from '../pages/examinations/ExaminationsPage';
import { TeacherQuestionPapersPage } from '../pages/question-papers/TeacherQuestionPapersPage';
import { PrincipalQuestionPaperReviewPage } from '../pages/question-papers/PrincipalQuestionPaperReviewPage';
import { FeesPage } from '../pages/fees/FeesPage';
import { TimetablePage } from '../pages/timetable/TimetablePage';
import { CalendarPage } from '../pages/calendar/CalendarPage';
import { NoticesPage } from '../pages/notices/NoticesPage';
import { MessagesPage } from '../pages/messages/MessagesPage';
import { LeavePage } from '../pages/leave/LeavePage';
import { LibraryManagementPage } from '../pages/library/LibraryManagementPage';
import { TransportPage } from '../pages/transport/TransportPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { InstitutionsPage } from '../pages/institutions/InstitutionsPage';
import { SuppliersPage } from '../pages/suppliers/SuppliersPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { AboutPage } from '../pages/about/AboutPage';
import { StaffGroupsPage } from '../pages/staff-groups/StaffGroupsPage';
import { ClassGroupsPage } from '../pages/class-groups/ClassGroupsPage';
import { ServiceEntitlementsPage } from '../pages/service-entitlements/ServiceEntitlementsPage';
import { DigitalMarketingPage } from '../pages/digital-marketing/DigitalMarketingPage';
import { AcademicAwardsPage } from '../pages/academic-awards/AcademicAwardsPage';
import { AccountManagementPage } from '../pages/admin/AccountManagementPage';
import { NotFound } from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admission-enquiry',
    element: <AdmissionEnquiryPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admissions',
        element: (
          <ProtectedRoute allowedRoles={['school_admin']} requiredService="admissions">
            <AdmissionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'students',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student']}>
            <StudentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teachers',
        element: (
          <ProtectedRoute allowedRoles={['school_admin']}>
            <TeachersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'classes',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher']}>
            <ClassesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'attendance',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student']} requiredService="attendance">
            <AttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'assignments',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student']} requiredService="assignments">
            <AssignmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'examinations',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student']} requiredService="examinations">
            <ExaminationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'question-papers',
        element: (
          <ProtectedRoute allowedRoles={['teacher']} requiredService="question_papers">
            <TeacherQuestionPapersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'question-paper-review',
        element: (
          <ProtectedRoute allowedRoles={['school_admin']} requiredService="question_papers">
            <PrincipalQuestionPaperReviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'fees',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'parent', 'student']} requiredService="fees">
            <FeesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'timetable',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student']} requiredService="timetable">
            <TimetablePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'calendar',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'student']} requiredService="calendar">
            <CalendarPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notices',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student', 'supplier']}>
            <NoticesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'messages',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'supplier']}>
            <MessagesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'staff-groups',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher']} requiredService="staff_groups">
            <StaffGroupsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'class-groups',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student']}>
            <ClassGroupsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'leave',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'parent', 'student']}>
            <LeavePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'library',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'student']} requiredService="library">
            <LibraryManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'transport',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'parent', 'student']} requiredService="transport">
            <TransportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'super_admin']} requiredService="reports">
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'service-entitlements',
        element: (
          <ProtectedRoute allowedRoles={['super_admin']}>
            <ServiceEntitlementsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'digital-marketing',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'super_admin']} requiredService="digital_marketing">
            <DigitalMarketingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'academic-awards',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'student', 'parent', 'super_admin']}>
            <AcademicAwardsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'institutions',
        element: (
          <ProtectedRoute allowedRoles={['super_admin']}>
            <InstitutionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'suppliers',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'supplier']}>
            <SuppliersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'super_admin']}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'accounts',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'super_admin']}>
            <AccountManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'about',
        element: (
          <ProtectedRoute allowedRoles={['school_admin', 'super_admin']}>
            <AboutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

