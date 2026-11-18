import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ERPProvider, useERP } from './ERPContext';
import { signInAs, signOutTest } from '../test/setup';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <ERPProvider>{children}</ERPProvider>;

describe('ERPContext (Clerk-backed auth)', () => {
  it('loads the signed-in user profile and role from the backend', async () => {
    signInAs('teacher');
    const { result } = renderHook(() => useERP(), { wrapper });
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentRole).toBe('teacher');
    expect(result.current.currentUser.name).toBe('Test User');
  });

  it('is signed out when Clerk has no session and stores nothing in browser storage', async () => {
    signOutTest();
    localStorage.clear();
    sessionStorage.clear();
    const { result } = renderHook(() => useERP(), { wrapper });
    await waitFor(() => expect(result.current.authStatus).toBe('signed_out'));
    expect(result.current.isAuthenticated).toBe(false);
    expect(Object.keys(sessionStorage)).toHaveLength(0);
    expect(Object.keys(localStorage).some(k => /token|auth/i.test(k))).toBe(false);
  });

  it('handles toast addition and removal', async () => {
    const { result } = renderHook(() => useERP(), { wrapper });
    act(() => result.current.addToast('info', 'Fee Reminder', 'Quarter 3 fees due next week'));
    expect(result.current.toasts).toHaveLength(1);
    const id = result.current.toasts[0].id;
    act(() => result.current.removeToast(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('allows updating school settings', () => {
    const { result } = renderHook(() => useERP(), { wrapper });
    act(() => result.current.updateSchoolSettings({ schoolName: 'National Heritage Academy' }));
    expect(result.current.schoolSettings.schoolName).toBe('National Heritage Academy');
  });
});
