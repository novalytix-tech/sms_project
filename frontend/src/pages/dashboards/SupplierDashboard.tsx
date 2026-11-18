// ==========================================
// Supplier Procurement Portal Dashboard (Simplified & Clean)
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { supplierService } from '../../services/supplierService';
import { PurchaseOrder } from '../../types';
import { formatCurrencyINR, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { DashboardWelcomeSection } from '../../components/dashboard/DashboardWelcomeSection';
import { QuickActions, QuickAction } from '../../components/dashboard/QuickActions';
import { Package, Bell, Clock, CheckCircle, Truck, MessageSquare } from 'lucide-react';

export const SupplierDashboard: React.FC = () => {
  const { schoolSettings, addToast } = useERP();

  const [orders, setOrders] = useState<PurchaseOrder[]>(() => supplierService.getAllOrders());

  const pendingOrders = orders.filter(o => o.deliveryStatus === 'pending');
  const deliveredOrders = orders.filter(o => o.deliveryStatus === 'delivered');
  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const handleUpdateStatus = (poId: string, status: PurchaseOrder['deliveryStatus']) => {
    const updated = supplierService.updateDeliveryStatus(poId, status);
    if (updated) {
      setOrders(supplierService.getAllOrders());
      addToast('success', 'Delivery Status Updated', `Purchase Order ${updated.poNumber} is now marked ${status}.`);
    }
  };

  const quickActions: QuickAction[] = [
    { label: 'Purchase Orders', icon: Package, to: '/suppliers' },
    { label: 'Messages', icon: MessageSquare, to: '/messages' },
    { label: 'School Notices', icon: Bell, to: '/notices' },
  ];

  return (
    <div>
      {/* Notice Ticker & Welcome Banner */}
      <DashboardWelcomeSection
        eyebrow="SUPPLIER PORTAL"
        subtitle="Institutional purchase orders and consignment deliveries."
      />

      {/* Quick Action Shortcuts */}
      <QuickActions actions={quickActions} />

      {/* Summary KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Purchase Orders</span>
            <span className="stat-value">{orders.length}</span>
            <span className="stat-subtext">Issued by {schoolSettings.schoolName}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Package size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Pending Deliveries</span>
            <span className="stat-value" style={{ color: '#3B82F6' }}>
              {pendingOrders.length}
            </span>
            <span className="stat-subtext">Consignments in fulfillment</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Completed Deliveries</span>
            <span className="stat-value">{deliveredOrders.length}</span>
            <span className="stat-subtext positive">Verified in inventory</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Gross PO Value</span>
            <span className="stat-value">{formatCurrencyINR(totalValue)}</span>
            <span className="stat-subtext">Current financial session</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <Truck size={22} />
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">School Purchase Orders & Consignments</h2>
            <p className="card-subtitle">Track orders, line items, scheduled delivery dates and fulfillment status</p>
          </div>
        </div>

        <div className="card-body" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Category</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Amount</th>
                  <th>Fulfillment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#19191f' }}>{order.poNumber}</div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>{order.items.length} line item(s)</div>
                    </td>
                    <td>{order.category}</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{formatDate(order.expectedDeliveryDate)}</td>
                    <td>
                      <strong style={{ color: '#19191f' }}>{formatCurrencyINR(order.totalAmount)}</strong>
                    </td>
                    <td>
                      <Badge status={order.deliveryStatus} />
                    </td>
                    <td>
                      {order.deliveryStatus === 'pending' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        >
                          Mark Delivered
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#17623e', fontWeight: 600 }}>Fulfilled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
