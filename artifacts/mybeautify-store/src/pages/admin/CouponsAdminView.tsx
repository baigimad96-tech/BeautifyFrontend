import { type FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Percent,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCoupons,
  updateAdminCoupon,
  type AdminCouponRequest,
  type AdminCouponResponse,
} from '@/services/coupons/coupons.service';

const EMPTY_COUPON_FORM = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: '',
  minimumOrderAmount: '',
  maximumDiscount: '',
  startDate: new Date().toISOString().slice(0, 16),
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  usageLimit: '',
  active: true,
};

export function CouponsAdminView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_COUPON_FORM);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['admin-coupons', page],
    queryFn: () => fetchAdminCoupons(page, 20),
  });

  const coupons = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  const saveMutation = useMutation({
    mutationFn: (payload: AdminCouponRequest) =>
      editingId ? updateAdminCoupon(editingId, payload) : createAdminCoupon(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setFeedback(editingId ? `Coupon ${saved.code} updated.` : `Coupon ${saved.code} created.`);
      setError(null);
      resetForm();
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to save coupon.');
      setFeedback(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setFeedback('Coupon deleted successfully.');
      setError(null);
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to delete coupon.');
      setFeedback(null);
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_COUPON_FORM);
  };

  const startEdit = (coupon: AdminCouponResponse) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minimumOrderAmount: coupon.minimumOrderAmount ? String(coupon.minimumOrderAmount) : '',
      maximumDiscount: coupon.maximumDiscount ? String(coupon.maximumDiscount) : '',
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().slice(0, 16) : EMPTY_COUPON_FORM.startDate,
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 16) : EMPTY_COUPON_FORM.expiryDate,
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      active: coupon.active,
    });
    setError(null);
    setFeedback(null);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = Number(form.discountValue);
    if (!form.code.trim()) {
      setError('Coupon code is required.');
      return;
    }
    if (!Number.isFinite(val) || val <= 0) {
      setError('Discount value must be greater than zero.');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && val > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }

    const payload: AdminCouponRequest = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue: val,
      minimumOrderAmount: form.minimumOrderAmount ? Number(form.minimumOrderAmount) : null,
      maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null,
      startDate: new Date(form.startDate).toISOString(),
      expiryDate: new Date(form.expiryDate).toISOString(),
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      active: form.active,
    };

    saveMutation.mutate(payload);
  };

  const handleDelete = (id: number, code: string) => {
    if (window.confirm(`Delete coupon "${code}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="coupons-admin-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* SECTION 1: Create / Edit Coupon */}
      <section className="admin-card" style={{ background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={20} color="#0A3B2C" />
            <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              {editingId ? 'Edit Coupon' : 'Create New Coupon'}
            </h2>
          </div>
          {editingId && (
            <button type="button" className="button secondary small" onClick={resetForm} style={{ fontSize: 12 }}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-start' }}>
            {/* Code */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Coupon Code *
              </label>
              <input
                type="text"
                className="input"
                required
                maxLength={40}
                placeholder="e.g. MALKAZ15"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
              />
            </div>

            {/* Discount Type */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Discount Type *
              </label>
              <select
                className="select"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Discount Value * {form.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={form.discountType === 'PERCENTAGE' ? '15' : '500'}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Minimum Order Amount */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Min Order Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1999"
                value={form.minimumOrderAmount}
                onChange={(e) => setForm({ ...form, minimumOrderAmount: e.target.value })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Maximum Discount */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Max Discount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional cap e.g. 2500"
                value={form.maximumDiscount}
                onChange={(e) => setForm({ ...form, maximumDiscount: e.target.value })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Usage Limit */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Usage Limit (Total)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Optional limit e.g. 100"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Start Date *
              </label>
              <input
                type="datetime-local"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Expiry Date *
              </label>
              <input
                type="datetime-local"
                required
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Description */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. 15% discount on luxury necklaces above ₹1,999"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Active Toggle & Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 26 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#0A3B2C', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#0A3B2C' }}
                />
                Active
              </label>

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="button"
                style={{
                  height: 42,
                  padding: '0 24px',
                  background: '#0A3B2C',
                  color: '#FAF7F2',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving…
                  </>
                ) : editingId ? (
                  <>
                    <Check size={15} /> Save Coupon
                  </>
                ) : (
                  <>
                    <Plus size={15} /> Create Coupon
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12, fontWeight: 500 }}>{error}</p>}
        {feedback && <p style={{ color: '#059669', fontSize: 13, marginTop: 12, fontWeight: 500 }}>{feedback}</p>}
      </section>

      {/* SECTION 2: Coupons List Table */}
      <section className="admin-card" style={{ background: '#fff', border: '1px solid #E8DEC8', borderRadius: 16, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={18} color="#0A3B2C" />
            <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              Active & Scheduled Coupons ({data?.totalElements ?? coupons.length})
            </h3>
          </div>
        </div>

        {isLoading ? (
          <div className="skeleton line" style={{ height: 140 }} />
        ) : isError ? (
          <div style={{ color: '#DC2626', padding: '20px', textAlign: 'center' }}>
            <p>Error loading coupons: {queryError instanceof Error ? queryError.message : 'Unknown error'}</p>
          </div>
        ) : coupons.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748B', padding: '30px 0', fontSize: 14 }}>
            No coupons found. Create your first promotional coupon above.
          </p>
        ) : (
          <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px' }}>Code</th>
                  <th style={{ padding: '12px 14px' }}>Discount</th>
                  <th style={{ padding: '12px 14px' }}>Min Order / Max Cap</th>
                  <th style={{ padding: '12px 14px' }}>Validity</th>
                  <th style={{ padding: '12px 14px' }}>Usage</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                      {/* Code */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FAF7F2', border: '1px solid #E8DEC8', padding: '4px 8px', borderRadius: 6, fontWeight: 700, color: '#0A3B2C', letterSpacing: '0.04em' }}>
                          <Tag size={13} color="#D4AF63" />
                          <span>{c.code}</span>
                        </div>
                        {c.description && <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{c.description}</div>}
                      </td>

                      {/* Discount */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 600, color: '#1E293B' }}>
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${Number(c.discountValue).toLocaleString('en-IN')} OFF`}
                      </td>

                      {/* Min / Max */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#475569' }}>
                        <div>Min: {c.minimumOrderAmount ? `₹${Number(c.minimumOrderAmount).toLocaleString('en-IN')}` : 'None'}</div>
                        {c.maximumDiscount && <div style={{ fontSize: 11, color: '#94A3B8' }}>Cap: ₹{Number(c.maximumDiscount).toLocaleString('en-IN')}</div>}
                      </td>

                      {/* Validity */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#64748B', fontSize: 12 }}>
                        <div>{c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—'} → {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                        {isExpired && <span style={{ color: '#DC2626', fontSize: 10, fontWeight: 700 }}>EXPIRED</span>}
                      </td>

                      {/* Usage */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#475569' }}>
                        <span style={{ fontWeight: 600 }}>{c.usedCount}</span>
                        {c.usageLimit ? ` / ${c.usageLimit}` : ' (unlimited)'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            background: c.active && !isExpired ? '#ECFDF5' : '#F1F5F9',
                            color: c.active && !isExpired ? '#059669' : '#64748B',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: c.active && !isExpired ? '#10B981' : '#94A3B8',
                            }}
                          />
                          {c.active && !isExpired ? 'Active' : isExpired ? 'Expired' : 'Disabled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => startEdit(c)}
                            title="Edit coupon"
                            style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-button admin-delete"
                            onClick={() => handleDelete(c.id, c.code)}
                            title="Delete coupon"
                            style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
          <div className="admin-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
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
    </div>
  );
}

export default CouponsAdminView;

