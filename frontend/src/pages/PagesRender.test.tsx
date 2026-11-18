import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ERPProvider } from '../context/ERPContext';

import { StudentProfileView } from '../components/students/StudentProfileView';
import { AdmissionsPage } from './admissions/AdmissionsPage';
import { StudentsPage } from './students/StudentsPage';
import { TeachersPage } from './teachers/TeachersPage';
import { ClassesPage } from './classes/ClassesPage';
import { AttendancePage } from './attendance/AttendancePage';
import { AssignmentsPage } from './assignments/AssignmentsPage';
import { ExaminationsPage } from './examinations/ExaminationsPage';
import { TeacherQuestionPapersPage } from './question-papers/TeacherQuestionPapersPage';
import { PrincipalQuestionPaperReviewPage } from './question-papers/PrincipalQuestionPaperReviewPage';
import { FeesPage } from './fees/FeesPage';
import { TimetablePage } from './timetable/TimetablePage';
import { CalendarPage } from './calendar/CalendarPage';
import { NoticesPage } from './notices/NoticesPage';
import { MessagesPage } from './messages/MessagesPage';
import { LeavePage } from './leave/LeavePage';
import { LibraryManagementPage } from './library/LibraryManagementPage';
import { TransportPage } from './transport/TransportPage';
import { ReportsPage } from './reports/ReportsPage';
import { InstitutionsPage } from './institutions/InstitutionsPage';
import { SuppliersPage } from './suppliers/SuppliersPage';
import { SettingsPage } from './settings/SettingsPage';
import { AboutPage } from './about/AboutPage';
import { StaffGroupsPage } from './staff-groups/StaffGroupsPage';
import { ClassGroupsPage } from './class-groups/ClassGroupsPage';
import { ServiceEntitlementsPage } from './service-entitlements/ServiceEntitlementsPage';
import { DigitalMarketingPage } from './digital-marketing/DigitalMarketingPage';
import { AcademicAwardsPage } from './academic-awards/AcademicAwardsPage';
import { ParentDashboard } from './dashboards/ParentDashboard';
import { StudentDashboard } from './dashboards/StudentDashboard';
import { TeacherDashboard } from './dashboards/TeacherDashboard';
import { SchoolAdminDashboard } from './dashboards/SchoolAdminDashboard';
import { SuperAdminDashboard } from './dashboards/SuperAdminDashboard';
import { SupplierDashboard } from './dashboards/SupplierDashboard';

describe('Render All ERP Pages', () => {
  const pages = [
    { name: 'AdmissionsPage', Component: AdmissionsPage },
    { name: 'StudentsPage', Component: StudentsPage },
    { name: 'TeachersPage', Component: TeachersPage },
    { name: 'ClassesPage', Component: ClassesPage },
    { name: 'AttendancePage', Component: AttendancePage },
    { name: 'AssignmentsPage', Component: AssignmentsPage },
    { name: 'ExaminationsPage', Component: ExaminationsPage },
    { name: 'TeacherQuestionPapersPage', Component: TeacherQuestionPapersPage },
    { name: 'PrincipalQuestionPaperReviewPage', Component: PrincipalQuestionPaperReviewPage },
    { name: 'FeesPage', Component: FeesPage },
    { name: 'TimetablePage', Component: TimetablePage },
    { name: 'CalendarPage', Component: CalendarPage },
    { name: 'NoticesPage', Component: NoticesPage },
    { name: 'MessagesPage', Component: MessagesPage },
    { name: 'LeavePage', Component: LeavePage },
    { name: 'LibraryManagementPage', Component: LibraryManagementPage },
    { name: 'TransportPage', Component: TransportPage },
    { name: 'ReportsPage', Component: ReportsPage },
    { name: 'InstitutionsPage', Component: InstitutionsPage },
    { name: 'SuppliersPage', Component: SuppliersPage },
    { name: 'SettingsPage', Component: SettingsPage },
    { name: 'AboutPage', Component: AboutPage },
    { name: 'StaffGroupsPage', Component: StaffGroupsPage },
    { name: 'ClassGroupsPage', Component: ClassGroupsPage },
    { name: 'ServiceEntitlementsPage', Component: ServiceEntitlementsPage },
    { name: 'DigitalMarketingPage', Component: DigitalMarketingPage },
    { name: 'AcademicAwardsPage', Component: AcademicAwardsPage },
    { name: 'SchoolAdminDashboard', Component: SchoolAdminDashboard },
    { name: 'SuperAdminDashboard', Component: SuperAdminDashboard },
    { name: 'TeacherDashboard', Component: TeacherDashboard },
    { name: 'StudentDashboard', Component: StudentDashboard },
    { name: 'ParentDashboard', Component: ParentDashboard },
    { name: 'SupplierDashboard', Component: SupplierDashboard },
  ];

  pages.forEach(({ name, Component }) => {
    it(`renders ${name} without throwing error`, () => {
      expect(() => {
        render(
          <ERPProvider>
            <MemoryRouter>
              <Component />
            </MemoryRouter>
          </ERPProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Parent Role Navigation & Page Render', () => {
    const parentPages = [
      { name: 'ParentDashboard', Component: ParentDashboard },
      { name: 'StudentsPage', Component: StudentsPage },
      { name: 'AttendancePage', Component: AttendancePage },
      { name: 'AssignmentsPage', Component: AssignmentsPage },
      { name: 'ExaminationsPage', Component: ExaminationsPage },
      { name: 'FeesPage', Component: FeesPage },
      { name: 'TimetablePage', Component: TimetablePage },
      { name: 'NoticesPage', Component: NoticesPage },
      { name: 'MessagesPage', Component: MessagesPage },
      { name: 'LeavePage', Component: LeavePage },
      { name: 'TransportPage', Component: TransportPage },
      { name: 'ClassGroupsPage', Component: ClassGroupsPage },
      { name: 'AcademicAwardsPage', Component: AcademicAwardsPage },
    ];

    parentPages.forEach(({ name, Component }) => {
      it(`renders ${name} cleanly as authenticated Parent`, () => {
        localStorage.setItem('nts_erp_active_role', 'parent');
        sessionStorage.setItem('nts_erp_authenticated', 'true');
        expect(() => {
          render(
            <ERPProvider>
              <MemoryRouter>
                <Component />
              </MemoryRouter>
            </ERPProvider>
          );
        }).not.toThrow();
      });
    });
  });

  describe('Student Role Navigation & Page Render', () => {
    const studentPages = [
      { name: 'StudentDashboard', Component: StudentDashboard },
      { name: 'StudentsPage', Component: StudentsPage },
      { name: 'AttendancePage', Component: AttendancePage },
      { name: 'AssignmentsPage', Component: AssignmentsPage },
      { name: 'ExaminationsPage', Component: ExaminationsPage },
      { name: 'FeesPage', Component: FeesPage },
      { name: 'TimetablePage', Component: TimetablePage },
      { name: 'CalendarPage', Component: CalendarPage },
      { name: 'NoticesPage', Component: NoticesPage },
      { name: 'LeavePage', Component: LeavePage },
      { name: 'LibraryManagementPage', Component: LibraryManagementPage },
      { name: 'TransportPage', Component: TransportPage },
      { name: 'ClassGroupsPage', Component: ClassGroupsPage },
      { name: 'AcademicAwardsPage', Component: AcademicAwardsPage },
    ];

    studentPages.forEach(({ name, Component }) => {
      it(`renders ${name} cleanly as authenticated Student`, () => {
        localStorage.setItem('nts_erp_active_role', 'student');
        sessionStorage.setItem('nts_erp_authenticated', 'true');
        expect(() => {
          render(
            <ERPProvider>
              <MemoryRouter>
                <Component />
              </MemoryRouter>
            </ERPProvider>
          );
        }).not.toThrow();
      });
    });
  });

  describe('StudentProfileView Resilience', () => {
    it('renders cleanly with standard student record', () => {
      const stud: any = {
        id: 'stud-test-1',
        admissionNo: 'ADM-2026-999',
        fullName: 'Test Student',
        className: 'Class 10',
        section: 'A',
        rollNo: '12',
        academicYear: '2026-2027',
        status: 'active',
      };
      expect(() => {
        render(
          <ERPProvider>
            <MemoryRouter>
              <StudentProfileView student={stud} />
            </MemoryRouter>
          </ERPProvider>
        );
      }).not.toThrow();
    });

    it('renders cleanly when student.className is missing or undefined', () => {
      const studWithoutClass: any = {
        id: 'stud-test-2',
        admissionNo: 'ADM-2026-998',
        fullName: 'Missing Class Student',
        section: 'B',
        grade: 'Class 8',
        status: 'active',
      };
      expect(() => {
        render(
          <ERPProvider>
            <MemoryRouter>
              <StudentProfileView student={studWithoutClass} />
            </MemoryRouter>
          </ERPProvider>
        );
      }).not.toThrow();
    });

    it('renders cleanly when student is undefined', () => {
      expect(() => {
        render(
          <ERPProvider>
            <MemoryRouter>
              <StudentProfileView student={undefined as any} />
            </MemoryRouter>
          </ERPProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Teacher Role Navigation & Page Render', () => {
    const teacherPages = [
      { name: 'TeacherDashboard', Component: TeacherDashboard },
      { name: 'ClassesPage', Component: ClassesPage },
      { name: 'ClassGroupsPage', Component: ClassGroupsPage },
      { name: 'AttendancePage', Component: AttendancePage },
      { name: 'AssignmentsPage', Component: AssignmentsPage },
      { name: 'ExaminationsPage', Component: ExaminationsPage },
      { name: 'TeacherQuestionPapersPage', Component: TeacherQuestionPapersPage },
      { name: 'StudentsPage', Component: StudentsPage },
      { name: 'TeachersPage', Component: TeachersPage },
      { name: 'TimetablePage', Component: TimetablePage },
      { name: 'StaffGroupsPage', Component: StaffGroupsPage },
      { name: 'LeavePage', Component: LeavePage },
      { name: 'CalendarPage', Component: CalendarPage },
      { name: 'NoticesPage', Component: NoticesPage },
      { name: 'MessagesPage', Component: MessagesPage },
      { name: 'LibraryManagementPage', Component: LibraryManagementPage },
      { name: 'AcademicAwardsPage', Component: AcademicAwardsPage },
    ];

    teacherPages.forEach(({ name, Component }) => {
      it(`renders ${name} cleanly as authenticated Teacher`, () => {
        localStorage.setItem('nts_erp_active_role', 'teacher');
        sessionStorage.setItem('nts_erp_authenticated', 'true');
        expect(() => {
          render(
            <ERPProvider>
              <MemoryRouter>
                <Component />
              </MemoryRouter>
            </ERPProvider>
          );
        }).not.toThrow();
      });
    });
  });
});
