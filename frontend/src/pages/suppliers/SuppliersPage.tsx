// ==========================================
// Procurement & Purchase Orders Management
// Developed by NTS Novalytix
// ==========================================

import React, { useState } from 'react';
import { supplierService } from '../../services/supplierService';
import { PurchaseOrder } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useERP } from '../../context/ERPContext';
import { ListToolbar, ListToolbarColumn } from '../../components/common/ListToolbar';
import { formatCurrencyINR, formatDate } from '../../utils/formatters';
import { Plus, Eye } from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const { currentRole, addToast } = useERP();
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => supplierService.getAllOrders());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const [newOrderForm, setNewOrderForm] = useState({
    supplierName: 'Apex Educational Supplies',
    category: 'Lab Equipment' as any,
    expectedDeliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    itemDesc: 'Optical Prism & Refraction Slabs',
    qty: 25,
    unitPrice: 650,
    notes: 'Urgent consignment for secondary science practicals',
  });

  const refreshList = () => {
    setOrders([...supplierService.getAllOrders()]);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const lineTotal = newOrderForm.qty * newOrderForm.unitPrice;

    supplierService.createOrder({
      poNumber,
      supplierId: 'supp-1',
      supplierName: newOrderForm.supplierName,
      category: newOrderForm.category,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: newOrderForm.expectedDeliveryDate,
      deliveryStatus: 'pending',
      items: [
        {
          itemDescription: newOrderForm.itemDesc,
          quantity: Number(newOrderForm.qty),
          unit: 'Units',
          unitPrice: Number(newOrderForm.unitPrice),
          total: lineTotal,
        },
      ],
      totalAmount: lineTotal,
      notes: newOrderForm.notes,
    });

    addToast('success', 'Purchase Order Issued', `${poNumber} generated for ${newOrderForm.supplierName}.`);
    setIsCreateOpen(false);
    refreshList();
  };

  const handleUpdateStatus = (poId: string, status: PurchaseOrder['deliveryStatus']) => {
    supplierService.updateDeliveryStatus(poId, status);
    addToast('info', 'Status Updated', `PO status changed to ${status}.`);
    refreshList();
    if (selectedOrder && selectedOrder.id === poId) {
      setSelectedOrder(supplierService.getById(poId) || null);
    }
  };

  const toolbarColumns: ListToolbarColumn<PurchaseOrder>[] = [
    { header: 'PO Number', value: po => po.poNumber },
    { header: 'Supplier', value: po => po.supplierName },
    { header: 'Category', value: po => po.category },
    { header: 'Order Date', value: po => po.orderDate },
    { header: 'Expected Delivery', value: po => po.expectedDeliveryDate },
    { header: 'Items', value: po => (po.items || []).length },
    { header: 'Total Amount', value: po => po.totalAmount },
    { header: 'Delivery Status', value: po => po.deliveryStatus },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Suppliers & Procurement</h1>
          <p className="page-subtitle">
            Vendor directory and purchase orders
          </p>
        </div>

        <div className="page-actions">
          {['school_admin', 'super_admin'].includes(currentRole) && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              <span>Create Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Lite toolbar — export / print / refresh purchase orders */}
      <ListToolbar<PurchaseOrder>
        entityLabel="Purchase Order"
        fileBaseName="Purchase_Orders"
        rows={orders}
        columns={toolbarColumns}
        onRefresh={refreshList}
      />

      {/* PO Table */}
      <div className="card">
        <div className="card-body" style={{ padding: '0' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Vendor / Supplier</th>
                  <th>Category</th>
                  <th>Date Issued</th>
                  <th>Expected Delivery</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Delivery Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(po => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{po.poNumber}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{po.supplierName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Verified Vendor</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{po.category}</span>
                    </td>
                    <td>{formatDate(po.orderDate)}</td>
                    <td style={{ fontWeight: 600 }}>{formatDate(po.expectedDeliveryDate)}</td>
                    <td>{po.items.length} line item(s)</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrencyINR(po.totalAmount)}</td>
                    <td><Badge status={po.deliveryStatus} /></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedOrder(po)}
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create PO Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Purchase Order"
          size="normal"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateOrder}>
                Save Order
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateOrder}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Vendor / Supplier</label>
                <input
                  type="text"
                  className="form-input"
                  value={newOrderForm.supplierName}
                  onChange={e => setNewOrderForm({ ...newOrderForm, supplierName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Category</label>
                <select
                  className="form-select"
                  value={newOrderForm.category}
                  onChange={e => setNewOrderForm({ ...newOrderForm, category: e.target.value as any })}
                >
                  <option value="Lab Equipment">Lab Equipment & Chemicals</option>
                  <option value="Textbooks">Textbooks & Reference</option>
                  <option value="Stationery">Stationery & Office Supplies</option>
                  <option value="Uniforms">Student Uniforms</option>
                  <option value="IT & Electronics">IT & Computers</option>
                  <option value="Furniture">Campus Furniture</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newOrderForm.expectedDeliveryDate}
                  onChange={e => setNewOrderForm({ ...newOrderForm, expectedDeliveryDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Primary Item Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newOrderForm.itemDesc}
                  onChange={e => setNewOrderForm({ ...newOrderForm, itemDesc: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={newOrderForm.qty}
                  onChange={e => setNewOrderForm({ ...newOrderForm, qty: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Unit Price (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={newOrderForm.unitPrice}
                  onChange={e => setNewOrderForm({ ...newOrderForm, unitPrice: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Procurement Specification Notes</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={newOrderForm.notes}
                onChange={e => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* PO Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Purchase Order — ${selectedOrder.poNumber}`}
          size="large"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              {['school_admin', 'super_admin'].includes(currentRole) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'partially_delivered')}
                  >
                    Mark In-Transit
                  </button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                  >
                    Mark Verified & Received
                  </button>
                </div>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>VENDOR NAME</span>
                <div style={{ fontWeight: 700 }}>{selectedOrder.supplierName}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>PO DATE</span>
                <div style={{ fontWeight: 700 }}>{formatDate(selectedOrder.orderDate)}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>EXPECTED DELIVERY</span>
                <div style={{ fontWeight: 700 }}>{formatDate(selectedOrder.expectedDeliveryDate)}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>DELIVERY STATUS</span>
                <div><Badge status={selectedOrder.deliveryStatus} /></div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Particulars</th>
                    <th>Quantity</th>
                    <th>Unit Rate (₹)</th>
                    <th>Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{it.itemDescription}</td>
                      <td>{it.quantity} {it.unit}</td>
                      <td>{formatCurrencyINR(it.unitPrice)}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrencyINR(it.total)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
                    <td colSpan={3} style={{ textAlign: 'right' }}>Total Order Cost:</td>
                    <td style={{ color: '#0f172a' }}>{formatCurrencyINR(selectedOrder.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

