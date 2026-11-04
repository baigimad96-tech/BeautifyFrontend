import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { customFetch } from '@workspace/api-client-react/custom-fetch';
import { ArrowRight, Gem, Layers3, Package, Pencil, Plus, Sparkles, TrendingDown, Trash2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { getJewelleryImage } from '@/lib/jewellery-images';
import { uploadImage } from '@/services/uploads/uploads.service';
import { AuditLogsView } from './AuditLogsView';
import { DeveloperToolsView } from './DeveloperToolsView';
import '@/styles/admin.css';

type AdminProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  discountPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  categoryId: number;
  description: string;
  shortDescription?: string;
  imageUrl?: string;
  active: boolean;
  featured: boolean;
  size?: string;
};

type AdminCategory = {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  active: boolean;
};

type AdminUser = {
  id?: number;
  role?: unknown;
  roles?: unknown;
  authorities?: unknown;
  user?: AdminUser;
};

type PageResult<T> = { items: T[]; totalPages?: number; totalItems?: number };
type InputValue = string | boolean;
type FormValues = Record<string, InputValue>;
type FieldSpec = {
  key: string;
  label: string;
  type: 'text' | 'url' | 'number' | 'textarea' | 'checkbox' | 'select' | 'list' | 'datetime-local' | 'file';
  required?: boolean;
  defaultValue?: InputValue;
  min?: number;
  step?: string;
  accept?: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
};
type Column<T> = { label: string; render: (item: T) => ReactNode };

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseList<T>(value: unknown): PageResult<T> {
  if (Array.isArray(value)) return { items: value as T[] };
  if (!isRecord(value)) throw new Error('The server returned an unexpected list response.');
  if (Array.isArray(value.content)) {
    return {
      items: value.content as T[],
      totalPages: typeof value.totalPages === 'number' ? value.totalPages : undefined,
      totalItems: typeof value.totalElements === 'number' ? value.totalElements : undefined,
    };
  }
  if (Array.isArray(value.data)) return { items: value.data as T[] };
  if (isRecord(value.data)) return parseList<T>(value.data);
  throw new Error('The server returned an unexpected list response.');
}

function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

function hasAdminRole(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.user && hasAdminRole(value.user)) return true;
  const rawRoles = [value.role, value.roles, value.authorities];
  return rawRoles.some((rawRole) => {
    const roles = Array.isArray(rawRole) ? rawRole : [rawRole];
    return roles.some((role) => {
      const name = typeof role === 'string'
        ? role
        : isRecord(role) && typeof role.authority === 'string'
          ? role.authority
          : '';
      return name === 'ADMIN' || name === 'ROLE_ADMIN';
    });
  });
}

function inputValue(item: unknown, field: FieldSpec): InputValue {
  if (!isRecord(item)) return field.type === 'checkbox' ? false : '';
  const value = item[field.key];
  if (field.type === 'checkbox') return value === true;
  if (field.type === 'list') return Array.isArray(value) ? value.join(', ') : '';
  if (field.type === 'datetime-local' && typeof value === 'string') return value.slice(0, 16);
  return value == null ? '' : String(value);
}

function makePayload(values: FormValues, fields: FieldSpec[]): Record<string, unknown> {
  return Object.fromEntries(fields.filter((field) => field.type !== 'file').map((field) => {
    const value = values[field.key];
    if (field.type === 'checkbox') return [field.key, value === true];
    if (field.type === 'number') {
      if (value === '') return [field.key, null];
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`${field.label} must be a valid number.`);
      return [field.key, number];
    }
    if (field.key.endsWith('Id') && value !== '' && value != null) {
      const number = Number(value);
      if (Number.isFinite(number)) return [field.key, number];
    }
    if (field.type === 'list') {
      return [field.key, typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''];
    }
    return [field.key, value === '' ? null : value];
  }));
}

function CrudPanel<T extends { id: number }>({
  title,
  endpoint,
  queryKey,
  items,
  fields,
  columns,
}: {
  title: string;
  endpoint: string;
  queryKey: readonly unknown[];
  items: T[];
  fields: FieldSpec[];
  columns: Column<T>[];
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const mutation = useMutation({
    mutationFn: async (request: { method: 'POST' | 'PUT' | 'DELETE'; id?: number; payload?: Record<string, unknown>; imageFile?: File }) => {
      const url = request.id === undefined ? endpoint : `${endpoint}/${request.id}`;
      const payload = { ...request.payload };
      if (request.imageFile) {
        payload.imageUrl = await uploadImage(request.imageFile);
      }
      return customFetch<unknown>(url, {
        method: request.method,
        ...(request.payload ? { body: JSON.stringify(payload) } : {}),
      });
    },
    onSuccess: async (_, request) => {
      await queryClient.invalidateQueries({ queryKey });
      setEditing(null);
      setValues({});
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      setError('');
      setMessage(request.method === 'DELETE' ? 'Record deleted.' : request.method === 'POST' ? 'Record added.' : 'Changes saved.');
    },
    onError: (mutationError) => {
      setMessage('');
      setError(getMessage(mutationError));
    },
  });

  const beginCreate = () => {
    setEditing(null);
    setValues(Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? (field.type === 'checkbox' ? false : '')])));
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setMessage('');
    setError('');
  };
  const beginEdit = (item: T) => {
    setEditing(item);
    setValues(Object.fromEntries(fields.map((field) => [field.key, inputValue(item, field)])));
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setMessage('');
    setError('');
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = makePayload(values, fields);
      if (imageFile && !ACCEPTED_IMAGE_TYPES.has(imageFile.type)) {
        throw new Error('Choose a JPEG, PNG, or WebP image.');
      }
      if (imageFile && imageFile.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('Image files must be 5 MB or smaller.');
      }
      const hiddenProductFields = ['ingredients', 'benefits', 'howToUse', 'skinType', 'shade', 'size', 'expiryDate'];
      for (const [key, value] of Object.entries(editing ?? {})) {
        if (hiddenProductFields.includes(key)) {
          payload[key] = (key === 'ingredients' || key === 'benefits') && Array.isArray(value)
            ? value.join(', ')
            : value;
        }
      }
      mutation.mutate({ method: editing ? 'PUT' : 'POST', id: editing?.id, payload, imageFile: imageFile ?? undefined });
    } catch (submitError) {
      setError(getMessage(submitError));
    }
  };
  const remove = (item: T) => {
    if (window.confirm(`Delete this ${title.toLowerCase()} record? This cannot be undone.`)) {
      setMessage('');
      setError('');
      mutation.mutate({ method: 'DELETE', id: item.id });
    }
  };

  return <div className="admin-management">
    <section className="admin-card">
      <div className="admin-card-heading">
        <div><div className="eyebrow">Management</div><h2>{editing ? `Edit ${title}` : `Add ${title}`}</h2></div>
        <button type="button" className="button secondary small" onClick={beginCreate}><Plus size={15} /> Add new</button>
      </div>
      <form className="admin-form" onSubmit={submit}>
        {fields.map((field) => <label className={`form-field ${field.type === 'checkbox' ? 'admin-checkbox-field' : ''}`} key={field.key}>
          {field.type === 'checkbox'
            ? <><input type="checkbox" checked={values[field.key] === true} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))} />{field.label}</>
            : field.type === 'file'
              ? <><span>{field.label}</span>
                <input
                  ref={imageInputRef}
                  className="input"
                  type="file"
                  accept={field.accept}
                  disabled={mutation.isPending}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    if (!file) return;
                    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
                      setImageFile(null);
                      setError('Choose a JPEG, PNG, or WebP image.');
                      event.currentTarget.value = '';
                      return;
                    }
                    if (file.size > MAX_IMAGE_SIZE_BYTES) {
                      setImageFile(null);
                      setError('Image files must be 5 MB or smaller.');
                      event.currentTarget.value = '';
                      return;
                    }
                    setImageFile(file);
                    setError('');
                    setMessage('');
                  }}
                />
                {field.hint && <small className="admin-image-hint">{field.hint}</small>}
                {(imagePreviewUrl || (typeof values.imageUrl === 'string' && values.imageUrl)) && (
                  <img
                    className="admin-image-preview"
                    src={imagePreviewUrl ?? String(values.imageUrl)}
                    alt={imageFile ? `Preview of ${imageFile.name}` : 'Current image'}
                  />
                )}
              </>
            : <><span>{field.label}</span>
              {field.type === 'textarea'
                ? <textarea className="input" rows={3} required={field.required} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
                : field.type === 'select'
                  ? <select className="select" required={field.required} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  : <input className="input" type={field.type === 'list' ? 'text' : field.type} min={field.min} step={field.step} required={field.required} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}
            </>}
        </label>)}
        {error && <p className="form-message" role="alert">{error}</p>}
        {message && <p className="admin-success" role="status">{message}</p>}
        <div className="admin-form-actions">
          <button className="button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : editing ? 'Save changes' : `Add ${title}`}</button>
          {editing && <button className="button secondary" type="button" onClick={beginCreate}>Cancel edit</button>}
        </div>
      </form>
    </section>
    <section className="admin-card">
      <div className="admin-card-heading"><div><div className="eyebrow">Current records</div><h2>{title} ({items.length})</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}<th>Actions</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          {columns.map((column) => <td key={column.label}>{column.render(item)}</td>)}
          <td className="admin-actions">
            <button type="button" className="icon-button" onClick={() => beginEdit(item)} aria-label={`Edit ${title}`} title="Edit"><Pencil size={15} /></button>
            <button type="button" className="icon-button admin-delete" onClick={() => remove(item)} aria-label={`Delete ${title}`} title="Delete" disabled={mutation.isPending}><Trash2 size={15} /></button>
          </td>
        </tr>)}
        {!items.length && <tr><td colSpan={columns.length + 1} className="admin-empty">No records found.</td></tr>}
        </tbody>
      </table></div>
    </section>
  </div>;
}

function AdminConsole() {
  const [section, setSection] = useState<'products' | 'categories' | 'audit' | 'developer'>('products');
  const [page, setPage] = useState(0);
  const productsQuery = useQuery({
    queryKey: ['admin-products', page],
    queryFn: async () => parseList<AdminProduct>(await customFetch<unknown>(`/api/products?page=${page}&size=50&sort=createdAt,desc`)),
    enabled: section === 'products',
  });
  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => parseList<AdminCategory>(await customFetch<unknown>('/api/categories')),
    enabled: section === 'products' || section === 'categories',
  });
  const productFields = useMemo<FieldSpec[]>(() => [
    { key: 'name', label: 'Product name', type: 'text', required: true },
    { key: 'sku', label: 'SKU', type: 'text', required: true },
    { key: 'price', label: 'Price', type: 'number', required: true, min: 0, step: '0.01' },
    { key: 'discountPrice', label: 'Discount price', type: 'number', min: 0, step: '0.01' },
    { key: 'stockQuantity', label: 'Stock quantity', type: 'number', required: true, min: 0, step: '1' },
    { key: 'lowStockThreshold', label: 'Low stock threshold', type: 'number', required: true, min: 0, step: '1' },
    { key: 'categoryId', label: 'Category', type: 'select', required: true, options: (categoriesQuery.data?.items ?? []).map((category) => ({ value: String(category.id), label: category.name })) },
    { key: 'shortDescription', label: 'Short description', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'textarea', required: true },
    { key: 'imageFile', label: 'Upload image', type: 'file', accept: 'image/jpeg,image/png,image/webp', hint: 'JPEG, PNG, or WebP. Maximum file size: 5 MB. A selected file replaces the current image.' },
    { key: 'featured', label: 'Featured', type: 'checkbox' },
    { key: 'active', label: 'Active', type: 'checkbox', defaultValue: true },
  ], [categoriesQuery.data?.items]);

  const products = productsQuery.data?.items ?? [];
  const lowStockCount = products.filter((product) => product.stockQuantity <= product.lowStockThreshold).length;
  const activeProducts = products.filter((product) => product.active).length;

  return <main className="page admin-page">
    <section className="admin-hero">
      <div className="admin-hero-copy">
        <div className="admin-hero-brand">
          <img src="/malka-zai-emblem.png" alt="" width={42} height={42} />
          <span>MALKAZ <i>Atelier administration</i></span>
        </div>
        <div className="admin-hero-eyebrow"><Sparkles size={14} /> MALKAZ · STORE MANAGEMENT</div>
        <h1>Curate your<br /><em>jewellery house.</em></h1>
        <p>Manage the MALKAZ collection, keep an eye on stock, and bring every product detail to life.</p>
        <Link href="/shop" className="admin-hero-link">View storefront <ArrowRight size={15} /></Link>
      </div>
      <div className="admin-hero-image" role="img" aria-label="MALKAZ jewellery collection" />
    </section>
    <section className="admin-overview" aria-label="Store overview">
      <article className="admin-overview-card">
        <div className="admin-overview-icon"><Package size={19} /></div>
        <div><span>Products in collection</span><strong>{productsQuery.data?.totalItems ?? (productsQuery.data ? products.length : '—')}</strong></div>
        <small>{productsQuery.data ? `${activeProducts} active on this page` : 'Inventory summary'}</small>
      </article>
      <article className="admin-overview-card">
        <div className="admin-overview-icon"><Layers3 size={19} /></div>
        <div><span>Collections</span><strong>{categoriesQuery.data?.items.length ?? '—'}</strong></div>
        <small>Product categories</small>
      </article>
      <article className="admin-overview-card">
        <div className="admin-overview-icon"><Gem size={19} /></div>
        <div><span>Featured pieces</span><strong>{productsQuery.data ? products.filter((product) => product.featured).length : '—'}</strong></div>
        <small>{productsQuery.data ? 'From the current product page' : 'Featured collection'}</small>
      </article>
      <article className={`admin-overview-card ${lowStockCount ? 'needs-attention' : ''}`}>
        <div className="admin-overview-icon"><TrendingDown size={19} /></div>
        <div><span>Low stock</span><strong>{productsQuery.data ? lowStockCount : '—'}</strong></div>
        <small>{!productsQuery.data ? 'Stock overview' : lowStockCount ? 'Items to replenish' : 'Stock levels look healthy'}</small>
      </article>
    </section>
    <nav className="admin-tabs" aria-label="Admin management sections" role="tablist">
      {(
        [
          { id: 'products', label: 'Products' },
          { id: 'categories', label: 'Categories' },
          { id: 'audit', label: 'Audit Logs' },
          { id: 'developer', label: 'Developer' },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={section === item.id}
          className={`admin-tab ${section === item.id ? 'active' : ''}`}
          onClick={() => {
            setSection(item.id);
            setPage(0);
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
    {section === 'products' && (productsQuery.isLoading || categoriesQuery.isLoading)
      ? <div className="skeleton line" />
      : section === 'products' && (productsQuery.isError || categoriesQuery.isError)
        ? <div className="error-state" role="alert"><h3>We could not load the admin data.</h3><p>{getMessage(productsQuery.error ?? categoriesQuery.error)}</p><button className="button secondary" onClick={() => { void productsQuery.refetch(); void categoriesQuery.refetch(); }}>Try again</button></div>
        : section === 'products' && productsQuery.data && categoriesQuery.data
          ? <>
            <CrudPanel title="Product" endpoint="/api/admin/products" queryKey={['admin-products']} items={productsQuery.data.items} fields={productFields} columns={[
              { label: 'Piece', render: (item) => <div className="admin-product-cell"><img className="admin-product-thumb" src={getJewelleryImage(item.imageUrl, item.name, item.id)} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = getJewelleryImage(null, item.name, item.id); }} /><span>{item.name}</span></div> },
              { label: 'SKU', render: (item) => item.sku },
              { label: 'Price', render: (item) => `₹${Number(item.discountPrice ?? item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
              { label: 'Stock', render: (item) => String(item.stockQuantity) },
              { label: 'Status', render: (item) => <span className={`admin-status ${item.active ? 'is-active' : 'is-inactive'}`}>{item.active ? 'Active' : 'Inactive'}</span> },
            ]} />
            {productsQuery.data.totalPages !== undefined && productsQuery.data.totalPages > 1 && <div className="admin-pagination">
              <button className="button secondary small" disabled={page <= 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
              <span>Page {page + 1} of {productsQuery.data.totalPages}</span>
              <button className="button secondary small" disabled={page + 1 >= productsQuery.data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>}
          </>
          : section === 'categories' && categoriesQuery.isLoading
            ? <div className="skeleton line" />
            : section === 'categories' && categoriesQuery.isError
              ? <div className="error-state" role="alert"><h3>Categories could not be loaded.</h3><p>{getMessage(categoriesQuery.error)}</p><button className="button secondary" onClick={() => { void categoriesQuery.refetch(); }}>Try again</button></div>
              : section === 'categories' && categoriesQuery.data
                ? <CrudPanel title="Category" endpoint="/api/admin/categories" queryKey={['admin-categories']} items={categoriesQuery.data.items} fields={[
                  { key: 'name', label: 'Category name', type: 'text', required: true },
                  { key: 'description', label: 'Description', type: 'textarea' },
                  { key: 'imageFile', label: 'Upload image', type: 'file', accept: 'image/jpeg,image/png,image/webp', hint: 'JPEG, PNG, or WebP. Maximum file size: 5 MB. A selected file replaces the current image.' },
                  { key: 'active', label: 'Active', type: 'checkbox', defaultValue: true },
                ]} columns={[
                  { label: 'Name', render: (item) => item.name },
                  { label: 'Description', render: (item) => item.description ?? '—' },
                  { label: 'Status', render: (item) => item.active ? 'Active' : 'Inactive' },
                ]} />
                : section === 'audit'
                  ? <AuditLogsView />
                  : section === 'developer'
                    ? <DeveloperToolsView />
                    : null}
    <p className="admin-back"><Link href="/account">Back to account</Link></p>
  </main>;
}

export default function AdminPage() {
  const session = useQuery({
    queryKey: ['admin-session'],
    queryFn: () => customFetch<AdminUser>('/api/auth/me'),
    retry: false,
  });

  if (session.isLoading) {
    return <main className="page admin-page"><div className="skeleton line" /></main>;
  }
  if (session.isError) {
    return <main className="page admin-page"><div className="error-state" role="alert"><h3>Sign in required.</h3><p>{getMessage(session.error)}</p><Link href="/sign-in" className="button">Sign in</Link></div></main>;
  }
  if (!hasAdminRole(session.data)) {
    return <main className="page admin-page"><div className="error-state" role="alert"><h3>Admin access required.</h3><p>This account is not authorized to manage the store.</p><Link href="/account" className="button secondary">Back to account</Link></div></main>;
  }

  return <ErrorBoundary resetKey="admin"><AdminConsole /></ErrorBoundary>;
}
