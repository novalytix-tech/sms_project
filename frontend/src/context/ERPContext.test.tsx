import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ERPProvider, useERP } from './ERPContext';

describe('ERPContext & ERPProvider State Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ERPProvider>{children}</ERPProvider>
  );

  it('initializes with default school admin role and demo user', () => {
    const { result } = renderHook(() => useERP(), { wrapper });

    expect(result.current.currentRole).toBe('school_admin');
    expect(result.current.currentUser).toBeDefined();
    expect(result.current.currentUser.name).toBe('Dr. Arvind Swaminathan');
  });

  it('handles role switching cleanly', () => {
    const { result } = renderHook(() => useERP(), { wrapper });

    act(() => {
      result.current.switchRole('teacher');
    });

    expect(result.current.currentRole).toBe('teacher');
    expect(result.current.currentUser.role).toBe('teacher');
    expect(result.current.currentUser.name).toBe('Mrs. Ananya Sharma');
  });

  it('handles login and logout session state', () => {
    const { result } = renderHook(() => useERP(), { wrapper });

    act(() => {
      result.current.login('student');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentRole).toBe('student');
    expect(sessionStorage.getItem('nts_erp_authenticated')).toBe('true');

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem('nts_erp_authenticated')).toBeNull();
    expect(localStorage.getItem('nts_erp_authenticated')).toBe('false');
  });

  it('handles toast addition, auto-id and removal', () => {
    const { result } = renderHook(() => useERP(), { wrapper });

    act(() => {
      result.current.addToast('info', 'Fee Reminder', 'Quarter 3 fees due next week');
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Fee Reminder');
    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts.length).toBe(0);
  });

  it('allows updating school settings', () => {
    const { result } = renderHook(() => useERP(), { wrapper });

    act(() => {
      result.current.updateSchoolSettings({ schoolName: 'National Heritage Academy' });
    });

    expect(result.current.schoolSettings.schoolName).toBe('National Heritage Academy');
  });
});
