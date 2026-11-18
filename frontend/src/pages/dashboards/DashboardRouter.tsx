// ==========================================
// Dynamic Role-Based Dashboard Router
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { serviceEntitlementService } from '../../services/serviceEntitlementService';
import { ERPStorage } from '../../services/storage';
import { ServiceDisabledScreen } from '../../components/common/ServiceDisabledScreen';
import { SchoolAdminDashboard } from './SchoolAdminDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { ParentDashboard } from './ParentDashboard';
import { StudentDashboard } from './StudentDashboard';
import { SupplierDashboard } from './SupplierDashboard';

export const DashboardRouter: React.FC = () => {
  const { currentRole, currentUser } = useERP();
  const schoolId = currentUser.institutionId || 'inst-1';

  // For non-super admins and non-suppliers: check if school is marketing-only
  if (currentRole !== 'super_admin' && currentRole !== 'supplier') {
    const hasCoreErp = serviceEntitlementService.isCoreErpEnabled(schoolId);
    const hasMarketing = serviceEntitlementService.isDigitalMarketingEnabled(schoolId);

    if (!hasCoreErp && hasMarketing) {
      // Seamlessly land on Digital Marketing Workspace
      return <Navigate to="/digital-marketing" replace />;
    }

    if (!hasCoreErp && !hasMarketing) {
      const store = ERPStorage.get();
      const inst = store.institutions.find(i => i.id === schoolId || i.code === schoolId);
      const schoolName = inst?.name || 'Your School';
      return (
        <ServiceDisabledScreen
          schoolId={schoolId}
          serviceId="core_erp"
          customMessage={`The institution "${schoolName}" has been deactivated by the Super Administrator. All school services, academic portals, and administrative operations are currently suspended. Please contact platform administration.`}
        />
      );
    }
  }

  switch (currentRole) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'parent':
      return <ParentDashboard />;
    case 'student':
      return <StudentDashboard />;
    case 'supplier':
      return <SupplierDashboard />;
    case 'school_admin':
    default:
      return <SchoolAdminDashboard />;
  }
};

