import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ERPProvider } from '../../context/ERPContext';
import { LoginPage } from './LoginPage';
import { SignUpPage } from './SignUpPage';
import { signOutTest } from '../../test/setup';

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ERPProvider>
        <Routes>
          <Route path="/login/*" element={<LoginPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/" element={<div>DASHBOARD</div>} />
        </Routes>
      </ERPProvider>
    </MemoryRouter>,
  );

describe('auth pages', () => {
  it('invitation links that land on /login are forwarded to the sign-up page', async () => {
    signOutTest();
    renderAt('/login?__clerk_ticket=abc123&__clerk_status=sign_up');
    expect(await screen.findByText('CLERK_SIGN_UP')).toBeInTheDocument();
  });

  it('a normal /login shows the sign-in form', async () => {
    signOutTest();
    renderAt('/login');
    expect(await screen.findByText('CLERK_SIGN_IN')).toBeInTheDocument();
  });

  it('the sign-up page shows Clerk sign-up for invited (signed-out) people', async () => {
    signOutTest();
    renderAt('/sign-up?__clerk_ticket=abc123');
    expect(await screen.findByText('CLERK_SIGN_UP')).toBeInTheDocument();
  });

  it('signed-in users are sent to the dashboard', async () => {
    renderAt('/sign-up');
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
  });
});
