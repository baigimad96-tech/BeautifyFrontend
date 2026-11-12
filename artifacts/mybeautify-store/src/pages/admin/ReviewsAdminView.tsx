import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  MessageSquare,
  Search,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import {
  approveReview,
  fetchAdminReviews,
  rejectReview,
  type AdminReviewResponse,
} from '@/services/reviews/reviews.service';

export function ReviewsAdminView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['admin-reviews', page],
    queryFn: () => fetchAdminReviews(page, 20),
  });

  const reviews = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveReview(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setFeedback(`Review by "${updated.customerName}" approved.`);
      setError(null);
      setTimeout(() => setFeedback(null), 3500);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to approve review.');
      setFeedback(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectReview(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setFeedback(`Review by "${updated.customerName}" rejected.`);
      setError(null);
      setTimeout(() => setFeedback(null), 3500);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to reject review.');
      setFeedback(null);
    },
  });

  const filteredReviews = reviews.filter((r) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      r.productName.toLowerCase().includes(term) ||
      r.customerName.toLowerCase().includes(term) ||
      r.comment.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'APPROVED' && r.approved) ||
      (statusFilter === 'PENDING' && !r.approved);

    return matchesSearch && matchesStatus;
  });

  const pendingCount = reviews.filter((r) => !r.approved).length;

  return (
    <div className="reviews-admin-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Filter Bar */}
      <section className="admin-card" style={{ background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#D4AF63', textTransform: 'uppercase' }}>
              Customer Experience
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              Reviews & Moderation ({data?.totalElements ?? reviews.length})
            </h2>
            {pendingCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                <Clock size={12} /> {pendingCount} awaiting approval
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={15} color="#64748B" />
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ height: 36, fontSize: 13, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8 }}
              >
                <option value="ALL">All Moderation Status</option>
                <option value="PENDING">Pending Moderation</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search product, customer, keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: 36, fontSize: 13, paddingLeft: 30, paddingRight: 12, borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', width: 230 }}
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

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Reviews Table */}
      <section className="admin-card" style={{ background: '#fff', border: '1px solid #E8DEC8', borderRadius: 16, padding: '24px' }}>
        {isLoading ? (
          <div className="skeleton line" style={{ height: 160 }} />
        ) : isError ? (
          <div style={{ color: '#DC2626', padding: '20px', textAlign: 'center' }}>
            <p>Error loading reviews: {queryError instanceof Error ? queryError.message : 'Unknown error'}</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748B', padding: '40px 0', fontSize: 14 }}>
            No reviews match the selected filter.
          </p>
        ) : (
          <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px' }}>Product</th>
                  <th style={{ padding: '12px 14px' }}>Customer</th>
                  <th style={{ padding: '12px 14px' }}>Rating</th>
                  <th style={{ padding: '12px 14px' }}>Review Comment</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((rev) => (
                  <tr key={rev.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                    {/* Product */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', fontWeight: 600, color: '#0A3B2C' }}>
                      {rev.productName}
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', color: '#1E293B' }}>
                      {rev.customerName || 'Anonymous'}
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#D4AF63' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < rev.rating ? '#D4AF63' : 'none'}
                            stroke={i < rev.rating ? '#D4AF63' : '#CBD5E1'}
                          />
                        ))}
                      </div>
                    </td>

                    {/* Comment */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', color: '#475569', maxWidth: 320 }}>
                      <p style={{ margin: 0, lineHeight: 1.5 }}>{rev.comment}</p>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', color: '#64748B', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: rev.approved ? '#ECFDF5' : '#FFFBEB',
                          color: rev.approved ? '#059669' : '#D97706',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: rev.approved ? '#10B981' : '#F59E0B',
                          }}
                        />
                        {rev.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>

                    {/* Moderation Actions */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {!rev.approved ? (
                          <>
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate(rev.id)}
                              disabled={approveMutation.isPending}
                              title="Approve review"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                background: '#ECFDF5',
                                color: '#059669',
                                border: '1px solid #A7F3D0',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectMutation.mutate(rev.id)}
                              disabled={rejectMutation.isPending}
                              title="Reject review"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => rejectMutation.mutate(rev.id)}
                            disabled={rejectMutation.isPending}
                            title="Unpublish / Reject"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              background: '#F1F5F9',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <X size={13} /> Unpublish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

export default ReviewsAdminView;

