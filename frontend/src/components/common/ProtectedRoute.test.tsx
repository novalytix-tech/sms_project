import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { signOutTest } from '../../test/setup';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ERPProvider } from '../../context/ERPContext';

const TestComponent = () => <div>Protected ERP Content</div>;
const LoginComponent = () => <div>Login Screen</div>;
const DashboardComponent = () => <div>Home Dashboard</div>;

describe('ProtectedRoute Access Control & Route Guard', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders protected child component when authenticated and role matches', async () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ERPProvider>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route path="/" element={<DashboardComponent />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute allowedRoles={['school_admin']}>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ERPProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Protected ERP Content')).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', async () => {
    signOutTest();
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ERPProvider>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route path="/" element={<DashboardComponent />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute allowedRoles={['school_admin']}>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ERPProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected ERP Content')).not.toBeInTheDocument();
    expect(await screen.findByText('Login Screen')).toBeInTheDocument();
  });

  it('redirects to root when role is unauthorized for the route', async () => {
    render(
      <MemoryRouter initialEntries={['/super-admin-only']}>
        <ERPProvider>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route path="/" element={<DashboardComponent />} />
            <Route
              path="/super-admin-only"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ERPProvider>
      </MemoryRouter>
    );

    // Initial role is school_admin, which does not match super_admin
    expect(screen.queryByText('Protected ERP Content')).not.toBeInTheDocument();
    expect(await screen.findByText('Home Dashboard')).toBeInTheDocument();
  });
});
