// ==========================================
// Supplier & Purchase Orders Service - Mock Implementation
// Developed by NTS Novalytix
// ==========================================

import { PurchaseOrder } from '../types';
import { ERPStorage } from './storage';

export const supplierService = {
  getAllOrders: (): PurchaseOrder[] => {
    return ERPStorage.get().purchaseOrders;
  },

  getOrdersBySupplierId: (supplierId: string): PurchaseOrder[] => {
    return ERPStorage.get().purchaseOrders.filter(p => p.supplierId === supplierId);
  },

  getById: (id: string): PurchaseOrder | undefined => {
    return ERPStorage.get().purchaseOrders.find(p => p.id === id);
  },

  createOrder: (data: Omit<PurchaseOrder, 'id'>): PurchaseOrder => {
    const store = ERPStorage.get();
    const newPO: PurchaseOrder = {
      ...data,
      id: `po-${Date.now()}`,
    };
    store.purchaseOrders = [newPO, ...store.purchaseOrders];
    ERPStorage.set(store);
    return newPO;
  },

  updateDeliveryStatus: (
    id: string,
    status: PurchaseOrder['deliveryStatus']
  ): PurchaseOrder | undefined => {
    const store = ERPStorage.get();
    const po = store.purchaseOrders.find(p => p.id === id);
    if (!po) return undefined;

    po.deliveryStatus = status;
    ERPStorage.set(store);
    return po;
  },
};

