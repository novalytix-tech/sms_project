// ==========================================
// Reusable Protected Route Component
// Developed by NTS Novalytix
// Role-Based & Service Entitlement Route Guards
// ==========================================

import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types';
import { ServiceIdentifier } from '../../types/serviceEntitlement';
import { serviceEntitlementService } from '../../services/serviceEntitlementService';
import { ERPStorage } from '../../services/storage';
import { ServiceDisabledScreen } from './ServiceDisabledScreen';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
  requiredService?: ServiceIdentifier;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredService,
}) => {
  const { isAuthenticated, authStatus, currentRole, currentUser, addToast } = useERP();
  const location = useLocation();
  const hasNotified = useRef(false);

  const isRoleAuthorized = !allowedRoles || allowedRoles.includes(currentRole);

  useEffect(() => {
    if (isAuthenticated && !isRoleAuthorized && !hasNotified.current) {
      hasNotified.current = true;
      const formattedRole = currentRole.replace('_', ' ');
      addToast(
        'error',
        'Access Restricted',
        `The requested page is not accessible from the ${formattedRole} workspace.`
      );
    }
  }, [isAuthenticated, isRoleAuthorized, currentRole, addToast]);

  // 1. Wait for Clerk + profile; then redirect unauthenticated users to /login
  if (authStatus === 'loading') {
    return null;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. If route is role-restricted and current active role is not permitted
  if (!isRoleAuthorized) {
    return <Navigate to="/" replace />;
  }

  // 3. Service Entitlement Verification (Super Admin bypasses all service guards)
  if (currentRole !== 'super_admin') {
    const schoolId = currentUser.institutionId || 'inst-1';
    if (!schoolId) {
      return (
        <ServiceDisabledScreen
          schoolId="UNASSIGNED"
          serviceId={requiredService || 'core_erp'}
          customMessage="Your user account is not linked to any active school institution. Please contact your system administrator."
        />
      );
    }

    // A. Check overall school account status
    if (!serviceEntitlementService.isSchoolAccountActive(schoolId)) {
      const store = ERPStorage.get();
      const inst = store.institutions.find(i => i.id === schoolId || i.code === schoolId);
      const schoolName = inst?.name || 'Your School';
      return (
        <ServiceDisabledScreen
          schoolId={schoolId}
          serviceId={requiredService || 'core_erp'}
          customMessage={`The institution "${schoolName}" has been deactivated by the Super Administrator. All school services, academic portals, and administrative operations are currently suspended. Please contact your system administrator or platform support.`}
        />
      );
    }

    // B. Check if Core ERP is disabled for a marketing-only subscriber attempting to access standard ERP routes
    if (
      requiredService !== 'digital_marketing' &&
      !serviceEntitlementService.isCoreErpEnabled(schoolId)
    ) {
      return (
        <ServiceDisabledScreen
          schoolId={schoolId}
          serviceId="core_erp"
          customMessage={`Your school (ID: ${schoolId}) is subscribed to Digital Marketing Only. Core ERP modules are disabled. To access student and academic features, please upgrade to the ERP + Digital Marketing package.`}
        />
      );
    }

    // C. Check specific required service
    if (requiredService && !serviceEntitlementService.isServiceEnabled(schoolId, requiredService)) {
      return <ServiceDisabledScreen schoolId={schoolId} serviceId={requiredService} />;
    }
  }

  return children;
};

