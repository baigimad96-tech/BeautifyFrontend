import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Loader2,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react';
import {
  fetchAdminOrders,
  updateAdminOrderStatus,
  type OrderStatus,
} from '@/services/orders/admin-orders.service';
import type { AddressResponse, OrderItemResponse, OrderResponse } from '@/types/cart.types';

const ORDER_STATUS_LIST: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
];

function statusColor(status?: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'DELIVERED':
    case 'CONFIRMED':
      return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
    case 'PROCESSING':
    case 'PACKED':
      return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    case 'PENDING':
      return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    case 'CANCELLED':
    case 'RETURNED':
    case 'RETURN_REQUESTED':
      return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    default:
      return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
  }
}

function paymentStatusColor(status?: string): { bg: string; text: string } {
  switch (status) {
    case 'PAID':
    case 'CAPTURED':
    case 'SUCCESS':
      return { bg: '#ECFDF5', text: '#059669' };
    case 'PENDING':
    case 'INITIATED':
      return { bg: '#FFFBEB', text: '#D97706' };
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return { bg: '#F5F3FF', text: '#7C3AED' };
    default:
      return { bg: '#FEF2F2', text: '#DC2626' };
  }
}

export function AdminOrdersView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => fetchAdminOrders(page, 20),
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      updateAdminOrderStatus(orderId, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setFeedback(`Order #${updated.orderNumber || updated.id} status updated to ${updated.orderStatus || updated.status}.`);
      setErrorMessage(null);
      if (selectedOrder && selectedOrder.id === updated.id) {
        setSelectedOrder(updated);
      }
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update order status.');
      setFeedback(null);
    },
  });

  const orders = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  const filteredOrders = orders.filter((order) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      order.id.toString().includes(term) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(term)) ||
      (typeof order.shippingAddress === 'object' &&
        order.shippingAddress &&
        order.shippingAddress.fullName?.toLowerCase().includes(term));

    const currentStatus = order.orderStatus || order.status || '';
    const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-orders-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <section className="admin-card" style={{ background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#D4AF63', textTransform: 'uppercase' }}>
              MALKAZ Atelier
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              Orders Management ({data?.totalElements ?? orders.length})
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={15} color="#64748B" />
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: 36, fontSize: 13, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8 }}
              >
                <option value="ALL">All Statuses</option>
                {ORDER_STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search order #, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: 36, fontSize: 13, paddingLeft: 30, paddingRight: 12, borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', width: 220 }}
              />
              <Search size={15} style={{ position: 'absolute', left: 9, top: 11, color: '#94A3B8' }} />
            </div>
          </div>
        </div>

        {feedback && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, color: '#065F46', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{feedback}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* Orders Table */}
      <section className="admin-card" style={{ background: '#fff', border: '1px solid #E8DEC8', borderRadius: 16, padding: '24px' }}>
        {isLoading ? (
          <div className="skeleton line" style={{ height: 160 }} />
        ) : isError ? (
          <div style={{ color: '#DC2626', padding: '24px', textAlign: 'center' }}>
            <p>Error loading orders: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748B', padding: '40px 0', fontSize: 14 }}>
            No orders match the current filter.
          </p>
        ) : (
          <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px' }}>Order #</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Customer</th>
                  <th style={{ padding: '12px 14px' }}>Items</th>
                  <th style={{ padding: '12px 14px' }}>Amount</th>
                  <th style={{ padding: '12px 14px' }}>Payment</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const currentStatus = (ord.orderStatus || ord.status || 'PENDING') as OrderStatus;
                  const sc = statusColor(currentStatus);
                  const pc = paymentStatusColor(ord.paymentStatus);
                  const address = typeof ord.shippingAddress === 'object' ? ord.shippingAddress : null;

                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                      {/* Order Number */}
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0A3B2C' }}>
                        #{ord.orderNumber || ord.id}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 14px', color: '#1E293B' }}>
                        <div>{address?.fullName || 'Customer'}</div>
                        {address?.city && <div style={{ fontSize: 11, color: '#94A3B8' }}>{address.city}, {address.state || 'India'}</div>}
                      </td>

                      {/* Items */}
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {ord.items?.length ?? 0} {ord.items?.length === 1 ? 'item' : 'items'}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0A3B2C' }}>
                        ₹{Number(ord.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* Payment */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                            {ord.paymentMethod || 'COD'}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              background: pc.bg,
                              color: pc.text,
                            }}
                          >
                            {ord.paymentStatus || 'PENDING'}
                          </span>
                        </div>
                      </td>

                      {/* Order Status Dropdown */}
                      <td style={{ padding: '12px 14px' }}>
                        <select
                          value={currentStatus}
                          disabled={statusMutation.isPending}
                          onChange={(e) =>
                            statusMutation.mutate({
                              orderId: ord.id,
                              status: e.target.value as OrderStatus,
                            })
                          }
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: sc.bg,
                            color: sc.text,
                            border: `1px solid ${sc.border}`,
                            cursor: 'pointer',
                          }}
                        >
                          {ORDER_STATUS_LIST.map((st) => (
                            <option key={st} value={st}>
                              {st.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => setSelectedOrder(ord)}
                          style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <button
              className="button secondary small"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: 13, color: '#64748B' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="button secondary small"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0A3B2C', fontFamily: 'Cinzel, Georgia, serif' }}>
                  Order #{selectedOrder.orderNumber || selectedOrder.id}
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Placed on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('en-IN') : '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Delivery Address */}
            {typeof selectedOrder.shippingAddress === 'object' && selectedOrder.shippingAddress && (
              <div style={{ background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF63', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Shipping Details
                </div>
                <div style={{ fontWeight: 600, color: '#0A3B2C' }}>{selectedOrder.shippingAddress.fullName}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                  {selectedOrder.shippingAddress.addressLine1}
                  {selectedOrder.shippingAddress.addressLine2 ? `, ${selectedOrder.shippingAddress.addressLine2}` : ''}
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.postalCode}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Phone: {selectedOrder.shippingAddress.phoneNumber}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A3B2C', marginBottom: 10 }}>Items Ordered</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selectedOrder.items ?? []).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: '#F8FAFC',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>{item.productName}</div>
                      {item.comboName && (
                        <span style={{ fontSize: 10, background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                          Combo: {item.comboName}
                        </span>
                      )}
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        Qty: {item.quantity} × ₹{Number(item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0A3B2C' }}>
                      ₹{Number(item.subtotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedOrder.subtotal !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B' }}>
                  <span>Subtotal</span>
                  <span>₹{Number(selectedOrder.subtotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {selectedOrder.discountAmount !== undefined && Number(selectedOrder.discountAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#059669' }}>
                  <span>Discount</span>
                  <span>- ₹{Number(selectedOrder.discountAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {selectedOrder.taxAmount !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B' }}>
                  <span>Taxes (GST)</span>
                  <span>₹{Number(selectedOrder.taxAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {selectedOrder.shippingCharge !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B' }}>
                  <span>Shipping Fee</span>
                  <span>₹{Number(selectedOrder.shippingCharge).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#0A3B2C', borderTop: '1px dashed #CBD5E1', paddingTop: 8, marginTop: 4 }}>
                <span>Total Amount</span>
                <span>₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersView;
