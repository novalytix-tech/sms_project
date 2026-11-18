// ==========================================
// Main Reusable App Layout Shell
// Developed by NTS Novalytix
// ==========================================

import React, { Suspense, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';

import { Footer } from '../components/layout/Footer';
import { ToastContainer } from '../components/common/ToastContainer';
import { useERP } from '../context/ERPContext';

export const AppLayout: React.FC = () => {
  const { authStatus } = useERP();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (authStatus === 'loading') {
    return <div style={{ padding: 32 }}>Loading…</div>;
  }
  if (authStatus !== 'ready') {
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
          <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
            <Outlet />
          </Suspense>
        </main>

        <Footer />
        <ToastContainer />
      </div>
    </div>
  );
};

