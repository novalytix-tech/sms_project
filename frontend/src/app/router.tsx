// ==========================================
// Application Routes Configuration
// Developed by NTS Novalytix
// ==========================================

import React, { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { AdmissionEnquiryPage } from '../pages/public/AdmissionEnquiryPage';
const DashboardRouter = lazy(() => import('../pages/dashboards/DashboardRouter').then(m => ({ default: m.DashboardRouter })));
const AdmissionsPage = lazy(() => import('../pages/admissions/AdmissionsPage').then(m => ({ default: m.AdmissionsPage })));
const StudentsPage = lazy(() => import('../pages/students/StudentsPage').then(m => ({ default: m.StudentsPage })));
const TeachersPage = lazy(() => import('../pages/teachers/TeachersPage').then(m => ({ default: m.TeachersPage })));
const ClassesPage = lazy(() => import('../pages/classes/ClassesPage').then(m => ({ default: m.ClassesPage })));
const AttendancePage = lazy(() => import('../pages/attendance/AttendancePage').then(m => ({ default: m.AttendancePage })));
const AssignmentsPage = lazy(() => import('../pages/assignments/AssignmentsPage').then(m => ({ default: m.AssignmentsPage })));
const ExaminationsPage = lazy(() => import('../pages/examinations/ExaminationsPage').then(m => ({ default: m.ExaminationsPage })));
const TeacherQuestionPapersPage = lazy(() => import('../pages/question-papers/TeacherQuestionPapersPage').then(m => ({ default: m.TeacherQuestionPapersPage })));
const PrincipalQuestionPaperReviewPage = lazy(() => import('../pages/question-papers/PrincipalQuestionPaperReviewPage').then(m => ({ default: m.PrincipalQuestionPaperReviewPage })));
const FeesPage = lazy(() => import('../pages/fees/FeesPage').then(m => ({ default: m.FeesPage })));
const TimetablePage = lazy(() => import('../pages/timetable/TimetablePage').then(m => ({ default: m.TimetablePage })));
const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));
const NoticesPage = lazy(() => import('../pages/notices/NoticesPage').then(m => ({ default: m.NoticesPage })));
const MessagesPage = lazy(() => import('../pages/messages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const LeavePage = lazy(() => import('../pages/leave/LeavePage').then(m => ({ default: m.LeavePage })));
const LibraryManagementPage = lazy(() => import('../pages/library/LibraryManagementPage').then(m => ({ default: m.LibraryManagementPage })));
const TransportPage = lazy(() => import('../pages/transport/TransportPage').then(m => ({ default: m.TransportPage })));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const InstitutionsPage = lazy(() => import('../pages/institutions/InstitutionsPage').then(m => ({ default: m.InstitutionsPage })));
const SuppliersPage = lazy(() => import('../pages/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AboutPage = lazy(() => import('../pages/about/AboutPage').then(m => ({ default: m.AboutPage })));
const StaffGroupsPage = lazy(() => import('../pages/staff-groups/StaffGroupsPage').then(m => ({ default: m.StaffGroupsPage })));
const ClassGroupsPage = lazy(() => import('../pages/class-groups/ClassGroupsPage').then(m => ({ default: m.ClassGroupsPage })));
const ServiceEntitlementsPage = lazy(() => import('../pages/service-entitlements/ServiceEntitlementsPage').then(m => ({ default: m.ServiceEntitlementsPage })));
const DigitalMarketingPage = lazy(() => import('../pages/digital-marketing/DigitalMarketingPage').then(m => ({ default: m.DigitalMarketingPage })));
const AcademicAwardsPage = lazy(() => import('../pages/academic-awards/AcademicAwardsPage').then(m => ({ default: m.AcademicAwardsPage })));
const AccountManagementPage = lazy(() => import('../pages/admin/AccountManagementPage').then(m => ({ default: m.AccountManagementPage })));
import { NotFound } from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/login/*',
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

