import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  fetchCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '@/services/categories/categories.service';
import {
  fetchAdminSubcategories,
  createAdminSubcategory,
  updateAdminSubcategory,
  updateAdminSubcategoryStatus,
  deleteAdminSubcategory,
} from '@/services/subcategories/subcategories.service';
import { uploadImage } from '@/services/uploads/uploads.service';
import { getJewelleryImage } from '@/lib/jewellery-images';
import type { CategoryResponse } from '@/types/product.types';
import type { SubcategoryRequest, SubcategoryResponse } from '@/types/subcategory.types';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function CategoryManagementAdminView() {
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Category Form State
  // ---------------------------------------------------------------------------
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catActive, setCatActive] = useState(true);
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);
  const [catError, setCatError] = useState('');
  const [catSuccess, setCatSuccess] = useState('');
  const catFileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Subcategory Form State
  // ---------------------------------------------------------------------------
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subParentCategoryId, setSubParentCategoryId] = useState<string>('');
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subImageUrl, setSubImageUrl] = useState('');
  const [subActive, setSubActive] = useState(true);
  const [subImageFile, setSubImageFile] = useState<File | null>(null);
  const [subImagePreview, setSubImagePreview] = useState<string | null>(null);
  const [subError, setSubError] = useState('');
  const [subSuccess, setSubSuccess] = useState('');
  const subFileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Subcategory Table Filter & Pagination
  // ---------------------------------------------------------------------------
  const [subQuery, setSubQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [subPage, setSubPage] = useState(0);

  // ---------------------------------------------------------------------------
  // Data Queries
  // ---------------------------------------------------------------------------
  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategories,
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['admin-subcategories', subQuery, filterCategoryId, subPage],
    queryFn: () =>
      fetchAdminSubcategories({
        query: subQuery.trim() || undefined,
        categoryId: filterCategoryId ? Number(filterCategoryId) : undefined,
        page: subPage,
        size: 15,
      }),
  });

  const categories: CategoryResponse[] = categoriesQuery.data ?? [];
  const subcategories: SubcategoryResponse[] = subcategoriesQuery.data?.content ?? [];
  const totalSubPages = subcategoriesQuery.data?.totalPages ?? 1;

  // ---------------------------------------------------------------------------
  // Image Previews
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!catImageFile) {
      setCatImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(catImageFile);
    setCatImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [catImageFile]);

  useEffect(() => {
    if (!subImageFile) {
      setSubImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(subImageFile);
    setSubImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [subImageFile]);

  // ---------------------------------------------------------------------------
  // Form Resets & Edits
  // ---------------------------------------------------------------------------
  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatDesc('');
    setCatImageUrl('');
    setCatActive(true);
    setCatImageFile(null);
    if (catFileInputRef.current) catFileInputRef.current.value = '';
    setCatError('');
  };

  const startEditCategory = (cat: CategoryResponse) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description ?? '');
    setCatImageUrl(cat.imageUrl ?? '');
    setCatActive(cat.active);
    setCatImageFile(null);
    if (catFileInputRef.current) catFileInputRef.current.value = '';
    setCatError('');
    setCatSuccess('');
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  const resetSubcategoryForm = () => {
    setEditingSubId(null);
    setSubParentCategoryId('');
    setSubName('');
    setSubDesc('');
    setSubImageUrl('');
    setSubActive(true);
    setSubImageFile(null);
    if (subFileInputRef.current) subFileInputRef.current.value = '';
    setSubError('');
  };

  const startEditSubcategory = (sub: SubcategoryResponse) => {
    setEditingSubId(sub.id);
    setSubParentCategoryId(String(sub.categoryId));
    setSubName(sub.name);
    setSubDesc(sub.description ?? '');
    setSubImageUrl(sub.imageUrl ?? '');
    setSubActive(sub.active);
    setSubImageFile(null);
    if (subFileInputRef.current) subFileInputRef.current.value = '';
    setSubError('');
    setSubSuccess('');
    window.scrollTo({ top: 520, behavior: 'smooth' });
  };

  // ---------------------------------------------------------------------------
  // Category Mutations
  // ---------------------------------------------------------------------------
  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = catImageUrl.trim() || undefined;
      if (catImageFile) {
        finalImageUrl = await uploadImage(catImageFile);
      }
      const payload = {
        name: catName.trim(),
        description: catDesc.trim() || undefined,
        imageUrl: finalImageUrl,
        active: catActive,
      };
      if (editingCategoryId) {
        return updateAdminCategory(editingCategoryId, payload);
      }
      return createAdminCategory(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCatSuccess(editingCategoryId ? 'Category updated successfully.' : 'Category created successfully.');
      resetCategoryForm();
    },
    onError: (err: unknown) => {
      setCatError(err instanceof Error ? err.message : 'Failed to save category.');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => deleteAdminCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCatSuccess('Category deactivated/deleted successfully.');
    },
    onError: (err: unknown) => {
      setCatError(err instanceof Error ? err.message : 'Failed to delete category.');
    },
  });

  // ---------------------------------------------------------------------------
  // Subcategory Mutations
  // ---------------------------------------------------------------------------
  const saveSubcategoryMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = subImageUrl.trim() || null;
      if (subImageFile) {
        finalImageUrl = await uploadImage(subImageFile);
      }
      const payload: SubcategoryRequest = {
        name: subName.trim(),
        categoryId: Number(subParentCategoryId),
        description: subDesc.trim() || null,
        imageUrl: finalImageUrl,
        active: subActive,
      };
      if (editingSubId) {
        return updateAdminSubcategory(editingSubId, payload);
      }
      return createAdminSubcategory(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories-overview'] });
      setSubSuccess(editingSubId ? 'Subcategory updated successfully.' : 'Subcategory created successfully.');
      resetSubcategoryForm();
    },
    onError: (err: unknown) => {
      setSubError(err instanceof Error ? err.message : 'Failed to save subcategory.');
    },
  });

  const statusSubcategoryMutation = useMutation({
    mutationFn: ({ id, nextActive }: { id: number; nextActive: boolean }) =>
      updateAdminSubcategoryStatus(id, nextActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setSubSuccess('Subcategory status updated.');
    },
    onError: (err: unknown) => {
      setSubError(err instanceof Error ? err.message : 'Failed to update status.');
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id: number) => deleteAdminSubcategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-subcategories-overview'] });
      setSubSuccess('Subcategory deleted.');
    },
    onError: (err: unknown) => {
      setSubError(err instanceof Error ? err.message : 'Failed to delete subcategory.');
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCategorySubmit = (e: FormEvent) => {
    e.preventDefault();
    setCatError('');
    setCatSuccess('');
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    saveCategoryMutation.mutate();
  };

  const handleSubcategorySubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubError('');
    setSubSuccess('');
    if (!subParentCategoryId) {
      setSubError('Please select a parent category.');
      return;
    }
    if (!subName.trim()) {
      setSubError('Subcategory name is required.');
      return;
    }
    saveSubcategoryMutation.mutate();
  };

  const handleDeleteCategory = (cat: CategoryResponse) => {
    const subCount = cat.subcategoriesCount ?? 0;
    if (subCount > 0) {
      if (!window.confirm(`Warning: "${cat.name}" has ${subCount} subcategory(ies) linked. The backend requires reassignment before deletion. Attempt deactivation?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to deactivate/delete category "${cat.name}"?`)) {
        return;
      }
    }
    deleteCategoryMutation.mutate(cat.id);
  };

  const handleDeleteSubcategory = (sub: SubcategoryResponse) => {
    if (window.confirm(`Are you sure you want to delete subcategory "${sub.name}"? Associated products may prevent deletion.`)) {
      deleteSubcategoryMutation.mutate(sub.id);
    }
  };

  return (
    <div className="mz-category-admin-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* =====================================================================
          1. CATEGORY MANAGEMENT FORM (Matches Mockup)
      ===================================================================== */}
      <section
        className="admin-card mz-mgmt-card"
        style={{
          background: '#FAF7F2',
          border: '1px solid #E8DEC8',
          borderRadius: 16,
          padding: '24px',
          boxShadow: '0 4px 12px rgba(10, 59, 44, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={19} color="#0A3B2C" />
            <h2 style={{ margin: 0, fontSize: 17, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              Category Management
            </h2>
          </div>
          {editingCategoryId && (
            <button
              type="button"
              className="button secondary small"
              onClick={resetCategoryForm}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748B', fontWeight: 500 }}>
          {editingCategoryId ? `Editing Category #${editingCategoryId}` : 'Add Category'}
        </p>

        <form onSubmit={handleCategorySubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              alignItems: 'flex-end',
            }}
          >
            {/* Category Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Category Name *
              </label>
              <input
                type="text"
                className="input"
                required
                maxLength={120}
                placeholder="e.g. Necklace"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Description */}
            <div style={{ minWidth: 230 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Description
              </label>
              <input
                type="text"
                className="input"
                maxLength={1000}
                placeholder="Enter category description..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Upload Image Dropzone / Button */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Upload Image
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 42,
                    padding: '0 16px',
                    background: '#fff',
                    border: '1px dashed #CBD5E1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#475569',
                    flex: 1,
                    whiteSpace: 'nowrap',
                  }}
                  title="Choose image or drag and drop"
                >
                  <Upload size={14} color="#0A3B2C" />
                  <span>{catImageFile ? catImageFile.name.slice(0, 16) : 'Choose Image or drag and drop'}</span>
                  <input
                    ref={catFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
                        setCatError('Choose a JPEG, PNG, or WebP image.');
                        return;
                      }
                      if (file.size > MAX_IMAGE_SIZE_BYTES) {
                        setCatError('Image file must be 5 MB or smaller.');
                        return;
                      }
                      setCatImageFile(file);
                      setCatError('');
                    }}
                  />
                </label>
                {(catImagePreview || catImageUrl) && (
                  <div
                    style={{
                      position: 'relative',
                      width: 42,
                      height: 42,
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: '1px solid #CBD5E1',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={catImagePreview ?? catImageUrl}
                      alt="Category preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCatImageFile(null);
                        setCatImageUrl('');
                        if (catFileInputRef.current) catFileInputRef.current.value = '';
                      }}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Remove image"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', minWidth: 60 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#0A3B2C' }}>Active</label>
              <button
                type="button"
                onClick={() => setCatActive((v) => !v)}
                style={{
                  width: 46,
                  height: 26,
                  borderRadius: 13,
                  background: catActive ? '#0A3B2C' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 2,
                  transition: 'background 200ms ease',
                }}
                aria-label="Toggle Category active status"
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    transform: catActive ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 200ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={saveCategoryMutation.isPending}
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
                  cursor: saveCategoryMutation.isPending ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {saveCategoryMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving…
                  </>
                ) : editingCategoryId ? (
                  <>
                    <Check size={15} /> Save Category
                  </>
                ) : (
                  <>
                    <Plus size={15} /> + Add Category
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {catError && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12, fontWeight: 500 }} role="alert">{catError}</p>}
        {catSuccess && <p style={{ color: '#059669', fontSize: 13, marginTop: 12, fontWeight: 500 }} role="status">{catSuccess}</p>}
      </section>

      {/* =====================================================================
          2. SUBCATEGORY MANAGEMENT FORM (Matches Mockup)
      ===================================================================== */}
      <section
        className="admin-card mz-mgmt-card"
        style={{
          background: '#FAF7F2',
          border: '1px solid #E8DEC8',
          borderRadius: 16,
          padding: '24px',
          boxShadow: '0 4px 12px rgba(10, 59, 44, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={19} color="#0A3B2C" />
            <h2 style={{ margin: 0, fontSize: 17, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              Subcategory Management
            </h2>
          </div>
          {editingSubId && (
            <button
              type="button"
              className="button secondary small"
              onClick={resetSubcategoryForm}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubcategorySubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '16px',
              alignItems: 'flex-end',
            }}
          >
            {/* Parent Category Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Parent Category *
              </label>
              <select
                className="select"
                required
                value={subParentCategoryId}
                onChange={(e) => setSubParentCategoryId(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              >
                <option value="">Select Parent Category</option>
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
                placeholder="Pendant Necklaces"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Description */}
            <div style={{ minWidth: 230 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Description
              </label>
              <input
                type="text"
                className="input"
                maxLength={1000}
                placeholder="Elegant pendant necklaces collection"
                value={subDesc}
                onChange={(e) => setSubDesc(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', borderColor: '#CBD5E1', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            {/* Upload Image Dropzone / Button */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#0A3B2C', marginBottom: 6 }}>
                Upload Image
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 42,
                    padding: '0 16px',
                    background: '#fff',
                    border: '1px dashed #CBD5E1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#475569',
                    flex: 1,
                    whiteSpace: 'nowrap',
                  }}
                  title="Choose image or drag and drop"
                >
                  <Upload size={14} color="#0A3B2C" />
                  <span>{subImageFile ? subImageFile.name.slice(0, 16) : 'Choose Image or drag and drop'}</span>
                  <input
                    ref={subFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
                        setSubError('Choose a JPEG, PNG, or WebP image.');
                        return;
                      }
                      if (file.size > MAX_IMAGE_SIZE_BYTES) {
                        setSubError('Image file must be 5 MB or smaller.');
                        return;
                      }
                      setSubImageFile(file);
                      setSubError('');
                    }}
                  />
                </label>
                {(subImagePreview || subImageUrl) && (
                  <div
                    style={{
                      position: 'relative',
                      width: 42,
                      height: 42,
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: '1px solid #CBD5E1',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={subImagePreview ?? subImageUrl}
                      alt="Subcategory preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSubImageFile(null);
                        setSubImageUrl('');
                        if (subFileInputRef.current) subFileInputRef.current.value = '';
                      }}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Remove image"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', minWidth: 60 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#0A3B2C' }}>Active</label>
              <button
                type="button"
                onClick={() => setSubActive((v) => !v)}
                style={{
                  width: 46,
                  height: 26,
                  borderRadius: 13,
                  background: subActive ? '#0A3B2C' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 2,
                  transition: 'background 200ms ease',
                }}
                aria-label="Toggle Subcategory active status"
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    transform: subActive ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 200ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={saveSubcategoryMutation.isPending}
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
                  cursor: saveSubcategoryMutation.isPending ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {saveSubcategoryMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving…
                  </>
                ) : editingSubId ? (
                  <>
                    <Check size={15} /> Save Subcategory
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

        {subError && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12, fontWeight: 500 }} role="alert">{subError}</p>}
        {subSuccess && <p style={{ color: '#059669', fontSize: 13, marginTop: 12, fontWeight: 500 }} role="status">{subSuccess}</p>}
      </section>

      {/* =====================================================================
          3. TWO-COLUMN DATA TABLES (Matches Mockup)
      ===================================================================== */}
      <div
        className="mz-admin-tables-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Subcategories Table */}
        <section
          className="admin-card mz-table-card"
          style={{
            background: '#fff',
            border: '1px solid #E8DEC8',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 4px 12px rgba(10, 59, 44, 0.03)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#0A3B2C" />
              <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
                Subcategories
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setSubQuery('');
                  setFilterCategoryId('');
                  setSubPage(0);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0A3B2C',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                View All <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <select
              className="select"
              value={filterCategoryId}
              onChange={(e) => {
                setFilterCategoryId(e.target.value);
                setSubPage(0);
              }}
              style={{
                height: 32,
                fontSize: 12,
                borderColor: '#CBD5E1',
                borderRadius: 6,
                background: '#F8FAFC',
                flex: 1,
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div style={{ position: 'relative', flex: 1.2 }}>
              <input
                type="text"
                placeholder="Search subcategory..."
                value={subQuery}
                onChange={(e) => {
                  setSubQuery(e.target.value);
                  setSubPage(0);
                }}
                style={{
                  height: 32,
                  fontSize: 12,
                  paddingLeft: 26,
                  paddingRight: 8,
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  width: '100%',
                }}
              />
              <Search size={13} style={{ position: 'absolute', left: 7, top: 9, color: '#94A3B8' }} />
            </div>
          </div>

          {subcategoriesQuery.isLoading ? (
            <div className="skeleton line" style={{ height: 140 }} />
          ) : subcategories.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748B', padding: '30px 0', fontSize: 13 }}>
              No subcategories found. Add your first subcategory above.
            </p>
          ) : (
            <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #E2E8F0',
                      fontSize: 11,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <th style={{ padding: '10px 10px' }}>Subcategory</th>
                    <th style={{ padding: '10px 10px' }}>Parent Category</th>
                    <th style={{ padding: '10px 10px' }}>Description</th>
                    <th style={{ padding: '10px 10px' }}>Status</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategories.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                      {/* Subcategory thumbnail + name */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={getJewelleryImage(sub.imageUrl, sub.name, sub.id)}
                            alt=""
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 6,
                              objectFit: 'cover',
                              background: '#0A3B2C',
                              border: '1px solid #E2E8F0',
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              e.currentTarget.src = getJewelleryImage(null, sub.name, sub.id);
                            }}
                          />
                          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>{sub.name}</span>
                        </div>
                      </td>

                      {/* Parent category */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', color: '#475569', fontSize: 12 }}>
                        {sub.categoryName || '—'}
                      </td>

                      {/* Description */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', color: '#64748B', maxWidth: 160, fontSize: 12 }}>
                        <span
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {sub.description || '—'}
                        </span>
                      </td>

                      {/* Status toggle pill */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => statusSubcategoryMutation.mutate({ id: sub.id, nextActive: !sub.active })}
                          title="Click to toggle status"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 999,
                            border: 'none',
                            background: sub.active ? '#ECFDF5' : '#F1F5F9',
                            color: sub.active ? '#059669' : '#64748B',
                            fontSize: 11,
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
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 5 }}>
                          <button
                            type="button"
                            onClick={() => startEditSubcategory(sub)}
                            aria-label={`Edit ${sub.name}`}
                            title="Edit Subcategory"
                            style={{
                              background: '#FEF3C7',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                              borderRadius: 6,
                              width: 30,
                              height: 30,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubcategory(sub)}
                            aria-label={`Delete ${sub.name}`}
                            title="Delete Subcategory"
                            style={{
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              borderRadius: 6,
                              width: 30,
                              height: 30,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subcategory Pagination */}
          {totalSubPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                marginTop: 14,
                paddingTop: 10,
                borderTop: '1px solid #F1F5F9',
              }}
            >
              <button
                className="button secondary small"
                disabled={subPage <= 0}
                onClick={() => setSubPage((p) => p - 1)}
                style={{ fontSize: 11, padding: '3px 8px' }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: '#64748B' }}>
                Page {subPage + 1} of {totalSubPages}
              </span>
              <button
                className="button secondary small"
                disabled={subPage + 1 >= totalSubPages}
                onClick={() => setSubPage((p) => p + 1)}
                style={{ fontSize: 11, padding: '3px 8px' }}
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Categories Table */}
        <section
          className="admin-card mz-table-card"
          style={{
            background: '#fff',
            border: '1px solid #E8DEC8',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 4px 12px rgba(10, 59, 44, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Tag size={18} color="#0A3B2C" />
            <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontWeight: 600 }}>
              Categories ({categories.length})
            </h3>
          </div>

          {categoriesQuery.isLoading ? (
            <div className="skeleton line" style={{ height: 140 }} />
          ) : categories.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748B', padding: '30px 0', fontSize: 13 }}>
              No categories found. Create your first category above.
            </p>
          ) : (
            <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #E2E8F0',
                      fontSize: 11,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <th style={{ padding: '10px 10px' }}>Category</th>
                    <th style={{ padding: '10px 10px' }}>Description</th>
                    <th style={{ padding: '10px 10px' }}>Subcategories</th>
                    <th style={{ padding: '10px 10px' }}>Status</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, idx) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                      {/* Category thumbnail + name */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={getJewelleryImage(cat.imageUrl, cat.name, cat.id)}
                            alt=""
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 6,
                              objectFit: 'cover',
                              background: '#0A3B2C',
                              border: '1px solid #E2E8F0',
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              e.currentTarget.src = getJewelleryImage(null, cat.name, cat.id);
                            }}
                          />
                          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>{cat.name}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', color: '#64748B', maxWidth: 160, fontSize: 12 }}>
                        <span
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {cat.description || '—'}
                        </span>
                      </td>

                      {/* Subcategories Count Badge (Matches Mockup) */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 24,
                            height: 24,
                            borderRadius: 12,
                            background: '#DCFCE7',
                            color: '#166534',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '0 6px',
                          }}
                        >
                          {cat.subcategoriesCount ?? (cat.subcategories ? cat.subcategories.length : 0)}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: cat.active ? '#ECFDF5' : '#F1F5F9',
                            color: cat.active ? '#059669' : '#64748B',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: cat.active ? '#10B981' : '#94A3B8',
                            }}
                          />
                          {cat.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 5 }}>
                          <button
                            type="button"
                            onClick={() => startEditCategory(cat)}
                            aria-label={`Edit ${cat.name}`}
                            title="Edit Category"
                            style={{
                              background: '#FEF3C7',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                              borderRadius: 6,
                              width: 30,
                              height: 30,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            aria-label={`Delete ${cat.name}`}
                            title="Delete Category"
                            style={{
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              borderRadius: 6,
                              width: 30,
                              height: 30,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CategoryManagementAdminView;

