// ==========================================
// Main Reusable App Layout Shell
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';

import { Footer } from '../components/layout/Footer';
import { ToastContainer } from '../components/common/ToastContainer';
import { useERP } from '../context/ERPContext';

export const AppLayout: React.FC = () => {
  const { isAuthenticated } = useERP();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // If there is no active demo session, redirect to the Workspace Login / Landing page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={`app-main-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} />

        <main className="app-main-content">
          <Outlet />
        </main>

        <Footer />
        <ToastContainer />
      </div>
    </div>
  );
};

