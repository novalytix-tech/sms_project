// ==========================================
// Main Application Sidebar Component
// Developed by NTS Novalytix
// ==========================================

import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { studentService } from '../../services/studentService';
import { transportService } from '../../services/transportService';
import { isAuthorizedPrincipal } from '../../services/questionPaperService';
import { serviceEntitlementService } from '../../services/serviceEntitlementService';
import { ServiceIdentifier } from '../../types/serviceEntitlement';
import { libraryService } from '../../services/libraryService';
import { getTeacherLibraryAssignment } from '../../utils/permissions';
import { LayoutDashboard, UserPlus, Users, Briefcase, BookOpen, CalendarCheck, FileText, Award, Trophy, IndianRupee, Clock, Calendar, Bell, MessageSquare, BookMarked, Bus, BarChart3, Building2, Package, Settings, Info, ChevronLeft, ChevronRight, CheckSquare, ShieldCheck, Layers, Megaphone, AlertTriangle, X } from 'lucide-react';

const SERVICE_PATH_MAP: Record<string, ServiceIdentifier> = {
  '/admissions': 'admissions',
  '/attendance': 'attendance',
  '/assignments': 'assignments',
  '/examinations': 'examinations',
  '/question-papers': 'question_papers',
  '/question-paper-review': 'question_papers',
  '/fees': 'fees',
  '/timetable': 'timetable',
  '/calendar': 'calendar',
  '/staff-groups': 'staff_groups',
  '/library': 'library',
  '/transport': 'transport',
  '/reports': 'reports',
  '/digital-marketing': 'digital_marketing',
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const {
    currentRole,
    currentUser,
    selectedChild,
    parentChildren,
    unreadNoticesCount,
    unreadMessagesCount,
    pendingLeaveCount,
  } = useERP();

  // Check if active student has opted for the school bus transport facility
  const activeStudent = useMemo(() => {
    if (currentRole !== 'student') return null;
    return (
      (currentUser.referenceId ? studentService.getById(currentUser.referenceId) : null) ||
      studentService.getAll().find(s => s.fullName.toLowerCase() === currentUser.name.toLowerCase()) ||
      null
    );
  }, [currentRole, currentUser]);

  const studentHasTransport = useMemo(() => {
    return activeStudent ? transportService.hasStudentOpted(activeStudent) : false;
  }, [activeStudent]);

  // Check if parent's selected child (or any linked child) has opted for the transport facility
  const parentHasTransport = useMemo(() => {
    if (currentRole !== 'parent') return false;
    if (selectedChild && transportService.hasStudentOpted(selectedChild)) return true;
    return parentChildren.some(c => transportService.hasStudentOpted(c));
  }, [currentRole, selectedChild, parentChildren]);

  // Check if current teacher has an active library staff assignment
  const teacherLibraryAssignment = useMemo(() => {
    if (currentRole !== 'teacher') return null;
    return getTeacherLibraryAssignment(currentUser, libraryService.getAllStaffAssignments());
  }, [currentRole, currentUser]);

  // Role-based Nav Structure
  const getNavGroups = () => {
    switch (currentRole) {
      case 'super_admin':
        return [
          {
            title: 'Platform Management',
            items: [
              { label: 'System Overview', path: '/', icon: LayoutDashboard },
              { label: 'Academic Awards', path: '/academic-awards', icon: Trophy },
              { label: 'Service Entitlements', path: '/service-entitlements', icon: Layers },
              { label: 'Institutions Directory', path: '/institutions', icon: Building2 },
              { label: 'Digital Marketing', path: '/digital-marketing', icon: Megaphone },
              { label: 'Institutional Reports', path: '/reports', icon: BarChart3 },
            ],
          },
          {
            title: 'Platform Configuration',
            items: [
              { label: 'System Settings', path: '/settings', icon: Settings },
              { label: 'About Software', path: '/about', icon: Info },
            ],
          },
        ];

      case 'teacher':
        return [
          {
            title: teacherLibraryAssignment ? 'Classroom & Teaching' : 'Teacher Workspace',
            items: [
              { label: 'Dashboard', path: '/', icon: LayoutDashboard },
              { label: 'My Class Roster', path: '/classes', icon: BookOpen },
              { label: 'Class Group & Messages', path: '/class-groups', icon: MessageSquare },
              { label: 'Class Attendance', path: '/attendance', icon: CalendarCheck },
              { label: 'Homework & Assignments', path: '/assignments', icon: FileText },
              { label: 'Examinations & Marks', path: '/examinations', icon: Award },
              { label: 'Awards & Honours', path: '/academic-awards', icon: Trophy },
              { label: 'My Question Papers', path: '/question-papers', icon: FileText },
              { label: 'Weekly Timetable', path: '/timetable', icon: Clock },
            ],
          },
          ...(teacherLibraryAssignment
            ? [
                {
                  title: 'Library Operations',
                  items: [
                    {
                      label: `${teacherLibraryAssignment.roleTitle} Desk`,
                      path: '/library',
                      icon: BookMarked,
                      badge: 'Desk Active',
                    },
                  ],
                },
              ]
            : [
                {
                  title: 'Library Resources',
                  items: [
                    { label: 'Library Catalogue', path: '/library', icon: BookMarked },
                  ],
                },
              ]),
          {
            title: 'Staff Services',
            items: [
              { label: 'Staff Groups & Messages', path: '/staff-groups', icon: MessageSquare },
              { label: 'Leave Requests', path: '/leave', icon: CheckSquare, badge: pendingLeaveCount },
              { label: 'School Calendar', path: '/calendar', icon: Calendar },
              { label: 'Notices', path: '/notices', icon: Bell, badge: unreadNoticesCount },
              { label: 'Messages', path: '/messages', icon: MessageSquare, badge: unreadMessagesCount },
            ],
          },
        ];

      case 'parent':
        return [
          {
            title: 'Ward Overview',
            items: [
              { label: 'Parent Portal', path: '/', icon: LayoutDashboard },
              { label: 'Student Profile', path: '/students', icon: Users },
              { label: 'Attendance Record', path: '/attendance', icon: CalendarCheck },
              { label: 'Homework & Tasks', path: '/assignments', icon: FileText },
              { label: 'Exams & Results', path: '/examinations', icon: Award },
              { label: 'Honours & Awards', path: '/academic-awards', icon: Trophy },
            ],
          },
          {
            title: 'Accounts & Services',
            items: [
              { label: 'Fees & Payments', path: '/fees', icon: IndianRupee },
              { label: 'Class Timetable', path: '/timetable', icon: Clock },
              { label: 'Class Announcements', path: '/class-groups', icon: MessageSquare },
              ...(parentHasTransport ? [{ label: 'School Bus & Route', path: '/transport', icon: Bus }] : []),
              { label: 'Apply for Leave', path: '/leave', icon: CheckSquare },
              { label: 'Notices', path: '/notices', icon: Bell, badge: unreadNoticesCount },
              { label: 'Teacher Messaging', path: '/messages', icon: MessageSquare, badge: unreadMessagesCount },
            ],
          },
        ];

      case 'student':
        return [
          {
            title: 'Learning Hub',
            items: [
              { label: 'My Dashboard', path: '/', icon: LayoutDashboard },
              { label: 'My Profile', path: '/students', icon: Users },
              { label: 'Class Group & Messages', path: '/class-groups', icon: MessageSquare },
              { label: 'My Attendance', path: '/attendance', icon: CalendarCheck },
              { label: 'Homework & Submissions', path: '/assignments', icon: FileText },
              { label: 'Exams & Report Card', path: '/examinations', icon: Award },
              { label: 'Awards & Honours', path: '/academic-awards', icon: Trophy },
              { label: 'My Timetable', path: '/timetable', icon: Clock },
            ],
          },
          {
            title: 'Campus Life',
            items: [
              { label: 'Library Books', path: '/library', icon: BookMarked },
              ...(studentHasTransport ? [{ label: 'Transport Bus', path: '/transport', icon: Bus }] : []),
              { label: 'School Calendar', path: '/calendar', icon: Calendar },
              { label: 'Leave Requests', path: '/leave', icon: CheckSquare },
              { label: 'Notices & Circulars', path: '/notices', icon: Bell, badge: unreadNoticesCount },
            ],
          },
        ];

      case 'supplier':
        return [
          {
            title: 'Procurement Portal',
            items: [
              { label: 'Supplier Dashboard', path: '/', icon: LayoutDashboard },
              { label: 'Purchase Orders', path: '/suppliers', icon: Package },
              { label: 'School Notices', path: '/notices', icon: Bell, badge: unreadNoticesCount },
              { label: 'Procurement Messages', path: '/messages', icon: MessageSquare, badge: unreadMessagesCount },
            ],
          },
        ];

      case 'school_admin':
      default: {
        const schoolId = currentUser.institutionId || 'inst-1';
        const isCoreErp = serviceEntitlementService.isCoreErpEnabled(schoolId);
        const isMarketing = serviceEntitlementService.isDigitalMarketingEnabled(schoolId);

        if (!isCoreErp) {
          // School is subscribed to Digital Marketing Only or has minimal access
          return [
            ...(isMarketing
              ? [
                  {
                    title: 'Digital Marketing & Growth',
                    items: [
                      { label: 'Marketing Workspace', path: '/digital-marketing', icon: Megaphone },
                    ],
                  },
                ]
              : []),
            {
              title: 'Account & Settings',
              items: [
                { label: 'School Settings', path: '/settings', icon: Settings },
                { label: 'About Software', path: '/about', icon: Info },
              ],
            },
          ];
        }

        return [
          {
            title: 'Core Management',
            items: [
              { label: 'Dashboard', path: '/', icon: LayoutDashboard },
              { label: 'Admissions & Enrollment', path: '/admissions', icon: UserPlus },
              { label: 'Students Directory', path: '/students', icon: Users },
              { label: 'Teachers & Staff', path: '/teachers', icon: Briefcase },
              { label: 'Classes & Sections', path: '/classes', icon: BookOpen },
              { label: 'Daily Attendance', path: '/attendance', icon: CalendarCheck },
            ],
          },
          {
            title: 'Academics & Finance',
            items: [
              { label: 'Class Groups & Messages', path: '/class-groups', icon: MessageSquare },
              { label: 'Homework & Tasks', path: '/assignments', icon: FileText },
              { label: 'Exams & Gradebook', path: '/examinations', icon: Award },
              { label: 'Awards & Achievements', path: '/academic-awards', icon: Trophy },
              ...(isAuthorizedPrincipal(currentUser)
                ? [{ label: 'Question Paper Review', path: '/question-paper-review', icon: ShieldCheck }]
                : []),
              { label: 'Fees & Invoicing', path: '/fees', icon: IndianRupee },
              { label: 'Class Timetables', path: '/timetable', icon: Clock },
            ],
          },
          {
            title: 'Operations',
            items: [
              { label: 'Staff Groups & Messages', path: '/staff-groups', icon: MessageSquare },
              { label: 'School Calendar', path: '/calendar', icon: Calendar },
              { label: 'Notices & Circulars', path: '/notices', icon: Bell, badge: unreadNoticesCount },
              { label: 'Internal Messages', path: '/messages', icon: MessageSquare, badge: unreadMessagesCount },
              { label: 'Leave Approvals', path: '/leave', icon: CheckSquare, badge: pendingLeaveCount },
              { label: 'Library Management', path: '/library', icon: BookMarked },
              { label: 'Transport Management', path: '/transport', icon: Bus },
              { label: 'Suppliers & Orders', path: '/suppliers', icon: Package },
            ],
          },
          ...(isMarketing
            ? [
                {
                  title: 'Digital Marketing & Growth',
                  items: [
                    { label: 'Marketing Workspace', path: '/digital-marketing', icon: Megaphone },
                  ],
                },
              ]
            : []),
          {
            title: 'Analytics & Setup',
            items: [
              { label: 'Reports & Exports', path: '/reports', icon: BarChart3 },
              { label: 'User Accounts & Auth', path: '/accounts', icon: ShieldCheck },
              { label: 'School Settings', path: '/settings', icon: Settings },
              { label: 'About Software', path: '/about', icon: Info },
            ],
          },
        ];
      }
    }
  };

  const rawGroups = getNavGroups();
  const schoolId = currentUser.institutionId || 'inst-1';

  // Filter navigation items by active school service entitlements for non-super-admins
  const navGroups = useMemo(() => {
    if (currentRole === 'super_admin') return rawGroups;

    const isSchoolActive = serviceEntitlementService.isSchoolAccountActive(schoolId);
    if (!isSchoolActive) {
      return [
        {
          title: 'Account Status',
          items: [
            {
              label: 'School Suspended',
              path: '/',
              icon: AlertTriangle,
              badge: 'Suspended',
            },
          ],
        },
      ];
    }

    return rawGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          const serviceKey = SERVICE_PATH_MAP[item.path];
          if (!serviceKey) return true;
          return serviceEntitlementService.isServiceEnabled(schoolId, serviceKey);
        }),
      }))
      .filter(group => group.items.length > 0);
  }, [rawGroups, currentRole, schoolId]);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Main Brand Header */}
        <div className="sidebar-header">
          <NavLink to="/" className="brand-wrapper" onClick={onCloseMobile}>
            <div className="brand-logo-badge">
              <img
                src="/nts-logo.png"
                alt="NTS Novalytix Logo"
                className="brand-logo-img"
              />
            </div>
            {!collapsed && (
              <div className="brand-details">
                <span className="brand-title">School ERP</span>
                <span className="brand-subtitle">School Management System</span>
                <span className="brand-developer-tag">By NTS Novalytix</span>
              </div>
            )}
          </NavLink>

          <button
            className="sidebar-collapse-btn no-mobile"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <button
            type="button"
            className="sidebar-close-btn only-mobile"
            onClick={onCloseMobile}
            title="Close navigation menu"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="sidebar-nav-container">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '16px' }}>
              {!collapsed && <div className="nav-group-title">{group.title}</div>}
              <nav className="nav-list">
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="nav-item-icon" />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed &&
                        item.badge !== undefined &&
                        (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                          <span className="nav-item-badge">{item.badge}</span>
                        )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

