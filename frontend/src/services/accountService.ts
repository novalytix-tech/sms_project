// School account management (admin only). Accounts are provisioned here; the
// person then receives a Clerk invitation email and sets up their own sign-in.
// Errors are reported honestly — there are no offline/mock fallbacks.

import { httpClient } from './api/httpClient';
import { UserRole } from '../types';

export interface UserAccountItem {
  id: string;
  login_id: string;
  username: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole | null;
  roles: UserRole[];
  is_active: boolean;
  status: 'active' | 'deactivated';
  sign_in_linked: boolean;
  invitation_status?: 'invited' | 'invite_failed';
  created_at?: string | null;
  last_login_at?: string | null;
}

type Result<T = undefined> = { success: true; data: T } | { success: false; error: string };

const fail = (res: any, fallback: string) =>
  ({ success: false, error: res?.error?.message || res?.message || fallback }) as const;

export const accountService = {
  getAllAccounts: async (params?: { role?: string; status?: string; search?: string }): Promise<Result<UserAccountItem[]>> => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const res = await httpClient.get<UserAccountItem[]>(`/users?${query.toString()}`);
    return res.success && Array.isArray(res.data) ? { success: true, data: res.data } : fail(res, 'Could not load accounts.');
  },

  createAccount: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: UserRole;
  }): Promise<Result<UserAccountItem>> => {
    const res = await httpClient.post<UserAccountItem>('/users', {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
    });
    return res.success && res.data ? { success: true, data: res.data } : fail(res, 'Failed to create the account.');
  },

  toggleAccountStatus: async (userId: string): Promise<Result<UserAccountItem>> => {
    const res = await httpClient.post<UserAccountItem>(`/users/${userId}/toggle-status`);
    return res.success && res.data ? { success: true, data: res.data } : fail(res, 'Failed to update the account.');
  },

  resendInvitation: async (userId: string): Promise<Result> => {
    const res = await httpClient.post(`/users/${userId}/resend-invitation`);
    return res.success ? { success: true, data: undefined } : fail(res, 'Failed to resend the invitation.');
  },
};
