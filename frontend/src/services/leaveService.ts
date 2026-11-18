// ==========================================
// Leave Management Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { LeaveRequest, LeaveStatus } from '../types';
import { ERPStorage } from './storage';

export const leaveService = {
  getAll: (): LeaveRequest[] => {
    return ERPStorage.get().leaveRequests;
  },

  getByApplicantId: (applicantId: string): LeaveRequest[] => {
    return ERPStorage.get().leaveRequests.filter(l => l.applicantId === applicantId);
  },

  submitRequest: (data: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>): LeaveRequest => {
    const store = ERPStorage.get();
    const newRequest: LeaveRequest = {
      ...data,
      id: `lvr-${Date.now()}`,
      status: 'pending',
      appliedOn: new Date().toISOString().split('T')[0],
    };
    store.leaveRequests = [newRequest, ...store.leaveRequests];
    ERPStorage.set(store);
    return newRequest;
  },

  updateStatus: (
    id: string,
    status: LeaveStatus,
    reviewedBy: string,
    remarks?: string
  ): LeaveRequest | undefined => {
    const store = ERPStorage.get();
    const request = store.leaveRequests.find(l => l.id === id);
    if (!request) return undefined;

    request.status = status;
    request.reviewedBy = reviewedBy;
    request.reviewRemarks = remarks;

    ERPStorage.set(store);
    return request;
  },
};

