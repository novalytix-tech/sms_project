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

export interface BulkInviteRow {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string;
  admission_number?: string;
  child_admission_numbers?: string;
  relationship?: string;
}

export interface BulkInviteResult {
  row: number;
  email: string;
  name: string;
  role: string;
  status: 'created' | 'skipped';
  reason: string | null;
  invitation_status?: 'invited' | 'invite_failed';
}

export interface LinkedChild {
  student_id: string;
  admission_number: string;
  name: string;
  class_name: string;
  section: string;
  is_primary: boolean;
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
    admissionNumber?: string;
    childAdmissionNumbers?: string;
  }): Promise<Result<UserAccountItem>> => {
    const res = await httpClient.post<UserAccountItem>('/users', {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      admission_number: data.admissionNumber,
      child_admission_numbers: data.childAdmissionNumbers,
    });
    return res.success && res.data ? { success: true, data: res.data } : fail(res, 'Failed to create the account.');
  },

  bulkInvite: async (
    rows: BulkInviteRow[],
  ): Promise<Result<{ created: number; skipped: number; invitations_failed: number; results: BulkInviteResult[] }>> => {
    const res = await httpClient.post<{ created: number; skipped: number; invitations_failed: number; results: BulkInviteResult[] }>(
      '/users/bulk-invite',
      { rows },
    );
    return res.success ? { success: true, data: res.data } : fail(res, 'Bulk invite failed.');
  },

  getChildren: async (userId: string): Promise<Result<LinkedChild[]>> => {
    const res = await httpClient.get<LinkedChild[]>(`/users/${userId}/children`);
    return res.success ? { success: true, data: res.data } : fail(res, 'Could not load linked children.');
  },

  linkChild: async (userId: string, admissionNumber: string): Promise<Result<LinkedChild[]>> => {
    const res = await httpClient.post<LinkedChild[]>(`/users/${userId}/children`, { admission_number: admissionNumber });
    return res.success ? { success: true, data: res.data } : fail(res, 'Could not link the child.');
  },

  unlinkChild: async (userId: string, studentId: string): Promise<Result<LinkedChild[]>> => {
    const res = await httpClient.delete<LinkedChild[]>(`/users/${userId}/children/${studentId}`);
    return res.success ? { success: true, data: res.data } : fail(res, 'Could not unlink the child.');
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
