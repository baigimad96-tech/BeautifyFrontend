import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react/custom-fetch';
import { Check, ChevronRight, Layers, Loader2, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { uploadImage } from '@/services/uploads/uploads.service';
import {
  createAdminSubcategory,
  deleteAdminSubcategory,
  fetchAdminSubcategories,
  updateAdminSubcategory,
  updateAdminSubcategoryStatus,
} from '@/services/subcategories/subcategories.service';
import type { SubcategoryRequest, SubcategoryResponse } from '@/types/subcategory.types';
import { getJewelleryImage } from '@/lib/jewellery-images';

type CategoryOption = {
  id: number;
  name: string;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function SubcategoriesAdminView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Pagination state
  const [query, setQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [page, setPage] = useState(0);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);

  // Image Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Status feedback
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch Parent Categories for dropdown
  const categoriesQuery = useQuery({
    queryKey: ['admin-parent-categories'],
    queryFn: async () => {
      const res = await customFetch<unknown>('/api/categories');
      if (Array.isArray(res)) return res as CategoryOption[];
      if (typeof res === 'object' && res !== null && 'content' in res && Array.isArray((res as any).content)) {
        return (res as any).content as CategoryOption[];
      }
      if (typeof res === 'object' && res !== null && 'data' in res && Array.isArray((res as any).data)) {
        return (res as any).data as CategoryOption[];
      }
      return [] as CategoryOption[];
    },
  });

  // Fetch Subcategories
  const subcategoriesQuery = useQuery({
    queryKey: ['admin-subcategories', query, filterCategoryId, page],
    queryFn: () =>
      fetchAdminSubcategories({
        query: query.trim() || undefined,
        categoryId: filterCategoryId ? Number(filterCategoryId) : undefined,
        page,
        size: 20,
      }),
  });

  const categories = categoriesQuery.data ?? [];
  const subcategories = subcategoriesQuery.data?.content ?? [];
  const totalPages = subcategoriesQuery.data?.totalPages ?? 1;

  // Handle preview for chosen file
  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCategoryId('');
    setDescription('');
    setImageUrl('');
    setActive(true);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError('');
  };

  const startEdit = (item: SubcategoryResponse) => {
    setEditingId(item.id);
    setName(item.name);
    setCategoryId(String(item.categoryId));
    setDescription(item.description ?? '');
    setImageUrl(item.imageUrl ?? '');
    setActive(item.active);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError('');
    setMessage('');
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = imageUrl.trim() || null;
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }
      const payload: SubcategoryRequest = {
        name: name.trim(),
        categoryId: Number(categoryId),
        description: description.trim() || null,
        imageUrl: finalImageUrl,
        active,
      };

      if (editingId) {
        return updateAdminSubcategory(editingId, payload);
      }
      return createAdminSubcategory(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      setMessage(editingId ? 'Subcategory updated successfully.' : 'Subcategory created successfully.');
      resetForm();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to save subcategory.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextActive }: { id: number; nextActive: boolean }) =>
      updateAdminSubcategoryStatus(id, nextActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      setMessage('Status updated.');
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminSubcategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      setMessage('Subcategory deleted.');
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to delete subcategory.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name.trim()) {
      setError('Subcategory name is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a parent category.');
      return;
    }
    saveMutation.mutate();
  };

  const handleDelete = (id: number, subName: string) => {
    if (window.confirm(`Are you sure you want to delete "${subName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="subcategories-admin-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* SECTION 1: Subcategory Management Form (Matches mockup) */}
      <section className="admin-card" style={{ background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={20} color="#0A3B2C" />
            <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              {editingId ? 'Edit Subcategory' : 'Subcategory Management'}
            </h2>
          </div>
          {editingId && (
            <button type="button" className="button secondary small" onClick={resetForm} style={{ fontSize: 12 }}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            {/* Parent Category */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Parent Category *
              </label>
              <select
                className="select"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#E2E8F0', borderRadius: 8, fontSize: 13 }}
              >
                <option value="">Select parent category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Subcategory Name *
              </label>
              <input
                type="text"
                className="input"
                required
                maxLength={120}
                placeholder="e.g. Pendant Necklaces"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#E2E8F0', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Description */}
            <div style={{ minWidth: 220 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Description
              </label>
              <input
                type="text"
                className="input"
                maxLength={1000}
                placeholder="Elegant pendant necklaces collection"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#E2E8F0', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Upload Image */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Upload Image
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 42,
                    padding: '0 14px',
                    background: '#fff',
                    border: '1px dashed #CBD5E1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#475569',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Upload size={14} color="#0A3B2C" />
                  <span>{imageFile ? imageFile.name.slice(0, 16) : 'Choose Image'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
                        setError('Choose a JPEG, PNG, or WebP image.');
                        return;
                      }
                      if (file.size > MAX_IMAGE_SIZE_BYTES) {
                        setError('Image file must be 5 MB or smaller.');
                        return;
                      }
                      setImageFile(file);
                      setError('');
                    }}
                  />
                </label>
                {(imagePreviewUrl || imageUrl) && (
                  <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 6, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                    <img
                      src={imagePreviewUrl ?? imageUrl}
                      alt="preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImageUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#0A3B2C' }}>Active</label>
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  background: active ? '#0A3B2C' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 200ms ease',
                  padding: 2,
                }}
                aria-label="Toggle active status"
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    transform: active ? 'translateX(22px)' : 'translateX(0)',
                    transition: 'transform 200ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>

            {/* Action Submit Button */}
            <div>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="button"
                style={{
                  height: 42,
                  padding: '0 20px',
                  background: '#0A3B2C',
                  color: '#FAF7F2',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving…
                  </>
                ) : editingId ? (
                  <>
                    <Check size={15} /> Save Changes
                  </>
                ) : (
                  <>
                    <Plus size={15} /> + Add Subcategory
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12, fontWeight: 500 }} role="alert">{error}</p>}
        {message && <p style={{ color: '#059669', fontSize: 13, marginTop: 12, fontWeight: 500 }} role="status">{message}</p>}
      </section>

      {/* SECTION 2: Subcategories List Table (Matches Mockup) */}
      <section className="admin-card" style={{ background: '#fff', border: '1px solid #E8DEC8', borderRadius: 16, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={18} color="#0A3B2C" />
            <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              Subcategories ({subcategoriesQuery.data?.totalElements ?? subcategories.length})
            </h3>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="select"
              value={filterCategoryId}
              onChange={(e) => {
                setFilterCategoryId(e.target.value);
                setPage(0);
              }}
              style={{ height: 34, fontSize: 12, borderColor: '#CBD5E1', borderRadius: 6, background: '#F8FAFC' }}
            >
              <option value="">All Parent Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search subcategory..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                style={{ height: 34, fontSize: 12, paddingLeft: 28, paddingRight: 10, borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', width: 170 }}
              />
              <Search size={14} style={{ position: 'absolute', left: 8, top: 10, color: '#94A3B8' }} />
            </div>
          </div>
        </div>

        {subcategoriesQuery.isLoading ? (
          <div className="skeleton line" style={{ height: 120 }} />
        ) : subcategories.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748B', padding: '30px 0', fontSize: 14 }}>
            No subcategories found. Add your first subcategory above.
          </p>
        ) : (
          <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px' }}>Subcategory</th>
                  <th style={{ padding: '12px 14px' }}>Parent Category</th>
                  <th style={{ padding: '12px 14px' }}>Description</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcategories.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                    {/* Subcategory (Image + Name) */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={getJewelleryImage(sub.imageUrl, sub.name, sub.id)}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', background: '#0A3B2C', border: '1px solid #E2E8F0' }}
                          onError={(e) => {
                            e.currentTarget.src = getJewelleryImage(null, sub.name, sub.id);
                          }}
                        />
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>{sub.name}</span>
                      </div>
                    </td>

                    {/* Parent Category */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#475569' }}>
                      {sub.categoryName || '—'}
                    </td>

                    {/* Description */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#64748B', maxWidth: 260 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {sub.description || '—'}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate({ id: sub.id, nextActive: !sub.active })}
                        title="Click to toggle status"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: 'none',
                          background: sub.active ? '#ECFDF5' : '#F1F5F9',
                          color: sub.active ? '#059669' : '#64748B',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: sub.active ? '#10B981' : '#94A3B8',
                          }}
                        />
                        {sub.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => startEdit(sub)}
                          aria-label={`Edit ${sub.name}`}
                          title="Edit subcategory"
                          style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button admin-delete"
                          onClick={() => handleDelete(sub.id, sub.name)}
                          aria-label={`Delete ${sub.name}`}
                          title="Delete subcategory"
                          style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
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

export default SubcategoriesAdminView;

