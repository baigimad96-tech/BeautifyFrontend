import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RotateCw,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  ShieldAlert,
  FileText,
  UserCheck,
  X,
  Layers,
} from 'lucide-react';
import { fetchAuditLogs } from '@/services/audit/audit.service';
import { normalizeList } from '@/utils/array';
import type { AuditLogItem } from '@/types/audit.types';

export function AuditLogsView() {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const auditQuery = useQuery({
    queryKey: ['admin-audit-logs', page, pageSize, categoryFilter, statusFilter, searchTerm, startDate, endDate],
    queryFn: async () => {
      const res = await fetchAuditLogs({
        page,
        size: pageSize,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      return res;
    },
  });

  const logs = normalizeList<AuditLogItem>(auditQuery.data?.content ?? auditQuery.data);
  const totalItems = auditQuery.data?.totalElements ?? 0;
  const totalPages = auditQuery.data?.totalPages ?? 1;

  // Safe category styling
  const getCategoryClass = (cat?: string) => {
    const c = (cat || '').toUpperCase();
    if (c.includes('AUTH') || c.includes('SECURITY')) return 'audit-cat-security';
    if (c.includes('USER')) return 'audit-cat-user';
    if (c.includes('ORDER')) return 'audit-cat-order';
    if (c.includes('CATALOG') || c.includes('PRODUCT')) return 'audit-cat-catalog';
    if (c.includes('MARKETING') || c.includes('COUPON')) return 'audit-cat-marketing';
    return 'audit-cat-auth';
  };

  const formatTimestamp = (raw?: string) => {
    if (!raw) return '—';
    try {
      const d = new Date(raw);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return raw;
    }
  };

  const maskSensitive = (str?: string | null): string => {
    if (!str) return '—';
    return str
      .replace(/("password"\s*:\s*)"[^"]*"/gi, '$1"********"')
      .replace(/("secret"\s*:\s*)"[^"]*"/gi, '$1"********"')
      .replace(/("token"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED_TOKEN]"')
      .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, 'Bearer [REDACTED_JWT]');
  };

  const formatJson = (val?: string | null) => {
    if (!val) return null;
    const sanitized = maskSensitive(val);
    try {
      const parsed = JSON.parse(sanitized);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return sanitized;
    }
  };

  return (
    <section className="admin-card" aria-label="Security and governance audit trail">
      <div className="admin-subheading">
        <div className="admin-subheading-copy">
          <div className="eyebrow"><ShieldAlert size={13} style={{ display: 'inline', marginRight: 5 }} /> SYSTEM GOVERNANCE & COMPLIANCE</div>
          <h3>Enterprise Audit Logs</h3>
          <p>Read-only, chronological trail of all identity events, catalog changes, and administrative actions.</p>
        </div>
        <button
          type="button"
          className="button secondary small"
          onClick={() => void auditQuery.refetch()}
          disabled={auditQuery.isFetching}
          title="Refresh audit records"
        >
          <RotateCw size={14} className={auditQuery.isFetching ? 'animate-spin' : ''} />
          {auditQuery.isFetching ? 'Refreshing…' : 'Refresh logs'}
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="audit-kpi-grid">
        <article className="audit-kpi-card">
          <span>Total Logged Records</span>
          <strong>{totalItems.toLocaleString()}</strong>
          <small>Verified backend audit records</small>
        </article>
        <article className="audit-kpi-card">
          <span>Current Result Window</span>
          <strong>{logs.length}</strong>
          <small>Page {page + 1} of {totalPages || 1}</small>
        </article>
        <article className="audit-kpi-card">
          <span>Governance Mode</span>
          <strong>Append-Only</strong>
          <small>Immutability enforced by policy</small>
        </article>
      </div>

      {/* Filter Bar */}
      <div className="audit-filter-bar">
        <div className="audit-filter-search">
          <Search size={16} color="#8c7139" />
          <input
            type="text"
            placeholder="Search action, actor, or entity..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <select
          className="audit-filter-select"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by category"
        >
          <option value="ALL">All Categories</option>
          <option value="AUTH">Authentication (AUTH)</option>
          <option value="USER">User Management (USER)</option>
          <option value="CATALOG">Catalog & Inventory</option>
          <option value="ORDER">Orders & Payments</option>
          <option value="SECURITY">Security Events</option>
          <option value="MARKETING">Marketing & Coupons</option>
        </select>

        <select
          className="audit-filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success Only</option>
          <option value="FAILURE">Failure Only</option>
        </select>

        <input
          type="date"
          className="audit-filter-select"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(0);
          }}
          title="Filter from start date"
        />

        <input
          type="date"
          className="audit-filter-select"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(0);
          }}
          title="Filter to end date"
        />

        {(searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || startDate || endDate) && (
          <button
            type="button"
            className="button secondary small"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('ALL');
              setStatusFilter('ALL');
              setStartDate('');
              setEndDate('');
              setPage(0);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table Display */}
      {auditQuery.isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div className="skeleton line" style={{ height: 36, margin: '8px 0' }} />
          <div className="skeleton line" style={{ height: 36, margin: '8px 0' }} />
          <div className="skeleton line" style={{ height: 36, margin: '8px 0' }} />
        </div>
      ) : auditQuery.isError ? (
        <div className="error-state" role="alert">
          <h3>Failed to load backend audit logs.</h3>
          <p>{auditQuery.error instanceof Error ? auditQuery.error.message : 'The audit service is currently unreachable.'}</p>
          <button type="button" className="button secondary" onClick={() => void auditQuery.refetch()}>
            Retry audit query
          </button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Category</th>
                <th>Action</th>
                <th>Entity / Resource</th>
                <th>Status</th>
                <th>Details</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((logItem) => {
                const category = logItem.category || (logItem as any).resourceType || 'SYSTEM';
                const status = (logItem.status || (logItem as any).result || 'SUCCESS').toUpperCase();
                const isSuccess = status === 'SUCCESS';
                const entityName = logItem.entityName || (logItem as any).resourceType || '—';
                const entityId = logItem.entityId || (logItem as any).resourceId;
                const details = logItem.details || (logItem as any).description || '—';

                return (
                  <tr key={logItem.id}>
                    <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTimestamp(logItem.timestamp)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#123a30' }}>
                        {maskSensitive(logItem.actorEmail || 'SYSTEM')}
                      </div>
                      <small style={{ color: '#8c7139', fontSize: 10, textTransform: 'uppercase' }}>
                        {logItem.actorRole || 'System Agent'}
                      </small>
                    </td>
                    <td>
                      <span className={`audit-badge-category ${getCategoryClass(category)}`}>
                        {category}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#063b2f' }}>
                      {logItem.action}
                    </td>
                    <td>
                      <span>{entityName}</span>
                      {entityId && <small style={{ color: '#7b8a82', marginLeft: 4 }}>(#{entityId})</small>}
                    </td>
                    <td>
                      <span className={`audit-status-badge ${isSuccess ? 'audit-status-success' : 'audit-status-failed'}`}>
                        {isSuccess ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {status}
                      </span>
                    </td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={details}>
                      {details}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button secondary small"
                        style={{ padding: '5px 10px', fontSize: 11 }}
                        onClick={() => setSelectedLog(logItem)}
                        title="Inspect full audit record"
                      >
                        <Eye size={13} style={{ marginRight: 4 }} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!logs.length && (
                <tr>
                  <td colSpan={8} className="admin-empty" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    No audit log records match the current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="button secondary small"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span>Page {page + 1} of {totalPages} ({totalItems} total entries)</span>
          <button
            type="button"
            className="button secondary small"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Details & State Change Modal */}
      {selectedLog && (
        <div className="audit-modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Audit Record Details">
            <div className="audit-modal-header">
              <div>
                <span className={`audit-badge-category ${getCategoryClass(selectedLog.category || (selectedLog as any).resourceType)}`}>
                  {selectedLog.category || (selectedLog as any).resourceType || 'SYSTEM'}
                </span>
                <h3 style={{ marginTop: 6 }}>{selectedLog.action}</h3>
                <small style={{ color: '#7b8a82' }}>Record ID #{selectedLog.id} · Recorded {formatTimestamp(selectedLog.timestamp)}</small>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedLog(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="audit-modal-grid">
              <div className="audit-field-card">
                <span>Actor Email & Role</span>
                <strong>{maskSensitive(selectedLog.actorEmail || 'SYSTEM')} ({selectedLog.actorRole || 'System Agent'})</strong>
              </div>
              <div className="audit-field-card">
                <span>Execution Status</span>
                <strong style={{ color: (selectedLog.status || (selectedLog as any).result) === 'SUCCESS' ? '#1a6f43' : '#bc2c2c' }}>
                  {(selectedLog.status || (selectedLog as any).result || 'SUCCESS').toUpperCase()}
                </strong>
              </div>
              <div className="audit-field-card">
                <span>Target Entity / Resource</span>
                <strong>{selectedLog.entityName || (selectedLog as any).resourceType || '—'} {selectedLog.entityId || (selectedLog as any).resourceId ? `(#${selectedLog.entityId || (selectedLog as any).resourceId})` : ''}</strong>
              </div>
              <div className="audit-field-card">
                <span>Client IP Address</span>
                <strong>{selectedLog.ipAddress || '127.0.0.1'}</strong>
              </div>
              <div className="audit-field-card" style={{ gridColumn: 'span 2' }}>
                <span>Action Description & Operational Notes</span>
                <strong>{selectedLog.details || (selectedLog as any).description || 'No additional details logged.'}</strong>
              </div>
              {selectedLog.userAgent && (
                <div className="audit-field-card" style={{ gridColumn: 'span 2' }}>
                  <span>User Agent</span>
                  <strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{selectedLog.userAgent}</strong>
                </div>
              )}
            </div>

            {/* Before and After State Diffs */}
            {(selectedLog.oldValue || selectedLog.newValue || (selectedLog as any).previousState || (selectedLog as any).newState) && (
              <div className="audit-diff-section">
                <div className="audit-diff-title">
                  <FileText size={15} style={{ display: 'inline', marginRight: 6 }} />
                  State Change Diffs (Before &amp; After)
                </div>
                <div className="audit-diff-grid">
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#922b2b', display: 'block', marginBottom: 4 }}>
                      Previous State (Before)
                    </span>
                    <pre className="audit-diff-box old">
                      {formatJson(selectedLog.oldValue || (selectedLog as any).previousState) || 'No prior state snapshot'}
                    </pre>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16643b', display: 'block', marginBottom: 4 }}>
                      New State (After)
                    </span>
                    <pre className="audit-diff-box new">
                      {formatJson(selectedLog.newValue || (selectedLog as any).newState) || 'No new state snapshot'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <button type="button" className="button secondary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
