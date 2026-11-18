// ==========================================
// Fees & Payments Gateway Page
// Developed by NTS Novalytix
// ==========================================

import React from 'react';
import { useERP } from '../../context/ERPContext';
import { ParentFeePortal } from '../../components/fees/ParentFeePortal';
import { AdminFeePortal } from '../../components/fees/AdminFeePortal';

export const FeesPage: React.FC = () => {
  const { currentRole } = useERP();

  if (currentRole === 'parent' || currentRole === 'student') {
    return <ParentFeePortal />;
  }

  return <AdminFeePortal />;
};
