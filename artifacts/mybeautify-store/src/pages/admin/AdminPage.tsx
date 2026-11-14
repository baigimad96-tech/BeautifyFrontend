import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { customFetch } from '@workspace/api-client-react/custom-fetch';
import { ArrowLeft, ArrowRight, Check, Gem, Image as ImageIcon, Layers, Layers3, MessageSquare, Package, Pencil, Plus, ShoppingBag, Sparkles, Star, Tag, TrendingDown, Trash2, Upload } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { getJewelleryImage } from '@/lib/jewellery-images';
import { uploadImage, uploadMultipleImages } from '@/services/uploads/uploads.service';
import { fetchAdminDashboard } from '@/services/admin/dashboard.service';
import { fetchAdminSubcategories } from '@/services/subcategories/subcategories.service';
import {
  COMMON_ATTRIBUTES,
  getCategoryAttributes,
  generateProductDescriptionTemplate,
} from '@/constants/product-attributes';
import { AuditLogsView } from './AuditLogsView';
import { DeveloperToolsView } from './DeveloperToolsView';
import { CombosOffersAdminView } from './CombosOffersAdminView';
import { ProductRelationshipsAdminView } from './ProductRelationshipsAdminView';
import { SubcategoriesAdminView } from './SubcategoriesAdminView';
import { CategoryManagementAdminView } from './CategoryManagementAdminView';
import { AdminOrdersView } from './AdminOrdersView';
import { CouponsAdminView } from './CouponsAdminView';
import { ReviewsAdminView } from './ReviewsAdminView';
import { HeroBannersAdminView } from './HeroBannersAdminView';
import { SiteContentAdminView } from './SiteContentAdminView';
import { normalizeList } from '@/utils/array';
import type { SubcategoryResponse } from '@/types/subcategory.types';
import '@/styles/admin.css';

export { normalizeList };

type AdminProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  discountPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  categoryId: number;
  subcategoryId?: number | null;
  description: string;
  shortDescription?: string;
  imageUrl?: string;
  images?: string[];
  active: boolean;
  featured: boolean;
  size?: string;
  attributes?: Record<string, string>;
};

type GalleryItem = {
  id: string;
  url: string;
  file?: File;
  isNew: boolean;
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
  const items = normalizeList<T>(value);
  if (isRecord(value)) {
    return {
      items,
      totalPages: typeof value.totalPages === 'number' ? value.totalPages : undefined,
      totalItems: typeof value.totalElements === 'number' ? value.totalElements : items.length,
    };
  }
  return { items };
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
  categories,
}: {
  title: string;
  endpoint: string;
  queryKey: readonly unknown[];
  items: T[];
  fields: FieldSpec[];
  columns: Column<T>[];
  categories?: AdminCategory[];
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [newUrlInput, setNewUrlInput] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const multiImageInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const safeItems = normalizeList<T>(items);
  const safeCategories = normalizeList<AdminCategory>(categories);
  const selectedCategory = safeCategories.find((c) => String(c.id) === String(values.categoryId));
  const selectedCategoryName = selectedCategory?.name;
  const categorySpecificAttributes = getCategoryAttributes(selectedCategoryName);

  const handleGenerateDescription = () => {
    const productName = String(values.name || '').trim();
    if (!productName) {
      alert('Please enter a Product Name first.');
      return;
    }
    const currentDesc = String(values.description || '').trim();
    if (currentDesc && !window.confirm('Replace current description with the auto-generated luxury template?')) {
      return;
    }
    const generated = generateProductDescriptionTemplate(
      productName,
      selectedCategoryName || '',
      attributes
    );
    setValues((current) => ({ ...current, description: generated }));
  };

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: GalleryItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        setError(`"${file.name}" is not a supported format. Choose JPEG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError(`"${file.name}" exceeds the 5 MB file size limit.`);
        continue;
      }
      newItems.push({
        id: `new-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        url: URL.createObjectURL(file),
        file,
        isNew: true,
      });
    }
    if (newItems.length > 0) {
      setGalleryItems((prev) => [...prev, ...newItems]);
      setError('');
    }
  };

  const handleAddUrl = () => {
    const trimmed = newUrlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
      setError('Please enter a valid image URL starting with http://, https:// or /');
      return;
    }
    setGalleryItems((prev) => [
      ...prev,
      {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: trimmed,
        isNew: false,
      },
    ]);
    setNewUrlInput('');
    setError('');
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setGalleryItems((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
  };

  const handleMoveItem = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= galleryItems.length) return;
    setGalleryItems((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, selected);
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setGalleryItems((prev) => {
      const item = prev[index];
      if (item && item.isNew && item.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(item.url);
        } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

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
    mutationFn: async (request: {
      method: 'POST' | 'PUT' | 'DELETE';
      id?: number;
      payload?: Record<string, unknown>;
      imageFile?: File;
      galleryItemsToUpload?: GalleryItem[];
    }) => {
      const url = request.id === undefined ? endpoint : `${endpoint}/${request.id}`;
      const payload = { ...request.payload };

      if (title === 'Product' && request.galleryItemsToUpload) {
        const items = request.galleryItemsToUpload;
        const newItems = items.filter((item) => item.isNew && item.file);

        // Upload new files (using batch endpoint with parallel fallback)
        const uploadedMap = new Map<string, string>();
        if (newItems.length > 0) {
          const filesToUpload = newItems.map((item) => item.file!);
          const uploadedUrls = await uploadMultipleImages(filesToUpload);
          newItems.forEach((item, idx) => {
            if (uploadedUrls[idx]) {
              uploadedMap.set(item.id, uploadedUrls[idx]);
            }
          });
        }

        // Assemble final ordered URLs list
        const finalImages: string[] = [];
        for (const item of items) {
          if (item.isNew) {
            const uploaded = uploadedMap.get(item.id);
            if (uploaded) finalImages.push(uploaded);
          } else if (item.url && !item.url.startsWith('blob:')) {
            finalImages.push(item.url);
          }
        }

        payload.images = finalImages;
        payload.imageUrl = finalImages.length > 0 ? finalImages[0] : null;
      } else if (request.imageFile) {
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
      setAttributes({});
      setImageFile(null);
      setGalleryItems([]);
      setNewUrlInput('');
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (multiImageInputRef.current) multiImageInputRef.current.value = '';
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
    setAttributes({});
    setImageFile(null);
    setGalleryItems([]);
    setNewUrlInput('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (multiImageInputRef.current) multiImageInputRef.current.value = '';
    setMessage('');
    setError('');
  };
  const beginEdit = (item: T) => {
    setEditing(item);
    setValues(Object.fromEntries(fields.map((field) => [field.key, inputValue(item, field)])));
    const itemAttributes = (item as any)?.attributes;
    setAttributes(itemAttributes && typeof itemAttributes === 'object' ? { ...itemAttributes } : {});
    setImageFile(null);
    if (title === 'Product') {
      const p = item as any;
      const initial: GalleryItem[] = [];
      if (Array.isArray(p.images) && p.images.length > 0) {
        p.images.forEach((img: unknown, idx: number) => {
          if (typeof img === 'string' && img.trim()) {
            initial.push({
              id: `saved-${idx}-${img.trim()}`,
              url: img.trim(),
              isNew: false,
            });
          }
        });
      } else if (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.trim()) {
        initial.push({
          id: `saved-0-${p.imageUrl.trim()}`,
          url: p.imageUrl.trim(),
          isNew: false,
        });
      }
      setGalleryItems(initial);
    } else {
      setGalleryItems([]);
    }
    setNewUrlInput('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (multiImageInputRef.current) multiImageInputRef.current.value = '';
    setMessage('');
    setError('');
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = makePayload(values, fields);
      const hiddenProductFields = ['ingredients', 'benefits', 'howToUse', 'skinType', 'shade', 'size', 'expiryDate'];
      for (const [key, value] of Object.entries(editing ?? {})) {
        if (hiddenProductFields.includes(key)) {
          payload[key] = (key === 'ingredients' || key === 'benefits') && Array.isArray(value)
            ? value.join(', ')
            : value;
        }
      }

      if (title === 'Product') {
        const cleanAttributes: Record<string, string> = {};
        for (const [k, v] of Object.entries(attributes)) {
          if (v && typeof v === 'string' && v.trim().length > 0) {
            cleanAttributes[k] = v.trim();
          }
        }
        payload.attributes = cleanAttributes;

        mutation.mutate({
          method: editing ? 'PUT' : 'POST',
          id: editing?.id,
          payload,
          galleryItemsToUpload: galleryItems,
        });
        return;
      }

      if (imageFile && !ACCEPTED_IMAGE_TYPES.has(imageFile.type)) {
        throw new Error('Choose a JPEG, PNG, or WebP image.');
      }
      if (imageFile && imageFile.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('Image files must be 5 MB or smaller.');
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
        {fields.map((field) => {
          const isProduct = title === 'Product';
          const isDescription = field.key === 'description';

          return (
            <div key={field.key} style={{ display: 'contents' }}>
              {isProduct && isDescription && (
                <div className="admin-product-attributes-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="admin-attributes-header">
                    <div>
                      <h4 className="admin-attributes-title">Dynamic Product Specifications</h4>
                      <p className="admin-attributes-subtitle">
                        Select jewellery attributes{selectedCategoryName ? ` for ${selectedCategoryName}` : ''}. These are automatically saved and shown in customer filters and product details.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="generate-template-btn"
                      onClick={handleGenerateDescription}
                      title="Generate luxury description using product name and selected attributes"
                    >
                      <Sparkles size={14} /> ✨ Auto-Generate Description Template
                    </button>
                  </div>

                  <div className="admin-attributes-grid">
                    {/* Common Attributes */}
                    {Object.values(COMMON_ATTRIBUTES).map((attr) => (
                      <label key={attr.key} className="form-field">
                        <span>{attr.label}</span>
                        {attr.type === 'text' ? (
                          <input
                            type="text"
                            className="input"
                            placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`}
                            value={attributes[attr.key] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttributes((prev) => {
                                const next = { ...prev };
                                if (val.trim()) {
                                  next[attr.key] = val;
                                } else {
                                  delete next[attr.key];
                                }
                                return next;
                              });
                            }}
                          />
                        ) : (
                          <select
                            className="select"
                            value={attributes[attr.key] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttributes((prev) => {
                                const next = { ...prev };
                                if (val.trim()) {
                                  next[attr.key] = val;
                                } else {
                                  delete next[attr.key];
                                }
                                return next;
                              });
                            }}
                          >
                            <option value="">Select {attr.label.toLowerCase()}</option>
                            {(attr.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>
                    ))}

                    {/* Category Specific Attributes */}
                    {categorySpecificAttributes.map((attr) => (
                      <label key={attr.key} className="form-field">
                        <span>
                          {attr.label} <span className="admin-cat-attr-badge">{selectedCategoryName}</span>
                        </span>
                        {attr.type === 'text' ? (
                          <input
                            type="text"
                            className="input"
                            placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`}
                            value={attributes[attr.key] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttributes((prev) => {
                                const next = { ...prev };
                                if (val.trim()) {
                                  next[attr.key] = val;
                                } else {
                                  delete next[attr.key];
                                }
                                return next;
                              });
                            }}
                          />
                        ) : (
                          <select
                            className="select"
                            value={attributes[attr.key] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttributes((prev) => {
                                const next = { ...prev };
                                if (val.trim()) {
                                  next[attr.key] = val;
                                } else {
                                  delete next[attr.key];
                                }
                                return next;
                              });
                            }}
                          >
                            <option value="">Select {attr.label.toLowerCase()}</option>
                            {(attr.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {field.type === 'file' && isProduct ? (
                <div className="admin-gallery-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="admin-gallery-header">
                    <div>
                      <h4 className="admin-gallery-title">
                        <ImageIcon size={18} /> Product Images Gallery
                        {galleryItems.length > 0 && (
                          <span className="admin-gallery-count-badge">
                            {galleryItems.length} {galleryItems.length === 1 ? 'image' : 'images'}
                          </span>
                        )}
                      </h4>
                      <p className="admin-gallery-subtitle">
                        Upload multiple photos, reorder thumbnails, and select which image serves as the primary cover photo for storefront cards and search.
                      </p>
                    </div>
                  </div>

                  <div className="admin-gallery-controls">
                    {/* Hidden Multiple File Input */}
                    <input
                      ref={multiImageInputRef}
                      type="file"
                      multiple
                      accept={field.accept}
                      style={{ display: 'none' }}
                      disabled={mutation.isPending}
                      onChange={(e) => {
                        handleAddFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />

                    {/* Drop / Click Area */}
                    <div
                      className="admin-gallery-upload-zone"
                      onClick={() => multiImageInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          multiImageInputRef.current?.click();
                        }
                      }}
                    >
                      <div className="admin-gallery-upload-icon">
                        <Upload size={20} />
                      </div>
                      <span className="admin-gallery-upload-text">
                        Click or drag to upload product photos (Select multiple at once)
                      </span>
                      <span className="admin-gallery-upload-hint">
                        Supports JPEG, PNG, and WebP (up to 5 MB per file). Newly selected images will append to the gallery.
                      </span>
                    </div>

                    {/* Optional Direct URL Addition */}
                    <div className="admin-gallery-url-row">
                      <input
                        type="url"
                        className="admin-gallery-url-input"
                        placeholder="Or enter an external image URL (e.g. https://...)"
                        value={newUrlInput}
                        onChange={(e) => setNewUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddUrl();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="admin-gallery-url-btn"
                        onClick={handleAddUrl}
                      >
                        <Plus size={14} /> Add URL
                      </button>
                    </div>
                  </div>

                  {/* Gallery Grid */}
                  {galleryItems.length > 0 ? (
                    <div className="admin-gallery-grid">
                      {galleryItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`admin-gallery-item ${idx === 0 ? 'is-cover' : ''}`}
                        >
                          <div className="admin-gallery-thumb-wrap">
                            <img
                              src={item.url}
                              alt={`Product image ${idx + 1}`}
                              className="admin-gallery-thumb"
                              onError={(e) => {
                                e.currentTarget.src = getJewelleryImage(null, 'Product', idx);
                              }}
                            />
                            {idx === 0 ? (
                              <span className="admin-gallery-badge-cover">
                                <Star size={11} fill="#e8cf7a" /> Cover
                              </span>
                            ) : (
                              <span className="admin-gallery-badge-order">#{idx + 1}</span>
                            )}
                          </div>

                          <div className="admin-gallery-item-actions">
                            {idx > 0 && (
                              <button
                                type="button"
                                className="admin-gallery-primary-btn"
                                onClick={() => handleSetPrimary(idx)}
                                title="Make this photo the primary cover image"
                              >
                                Set Cover
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-gallery-action-btn"
                              disabled={idx === 0}
                              onClick={() => handleMoveItem(idx, 'left')}
                              title="Move Left"
                            >
                              <ArrowLeft size={13} />
                            </button>
                            <button
                              type="button"
                              className="admin-gallery-action-btn"
                              disabled={idx === galleryItems.length - 1}
                              onClick={() => handleMoveItem(idx, 'right')}
                              title="Move Right"
                            >
                              <ArrowRight size={13} />
                            </button>
                            <button
                              type="button"
                              className="admin-gallery-action-btn delete"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove photo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#7b8c82', fontSize: '13px' }}>
                      No photos added yet. Upload files above to showcase multiple angles of this jewellery piece.
                    </div>
                  )}
                </div>
              ) : (
                <label className={`form-field ${field.type === 'checkbox' ? 'admin-checkbox-field' : ''}`}>
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
                    : <>
                      {isProduct && isDescription ? (
                        <div className="admin-desc-header-row">
                          <span>{field.label}</span>
                          <button
                            type="button"
                            className="generate-template-btn"
                            style={{ padding: '3px 10px', fontSize: '11px' }}
                            onClick={handleGenerateDescription}
                            title="Auto-fill description from attributes"
                          >
                            <Sparkles size={12} /> ✨ Generate Description
                          </button>
                        </div>
                      ) : (
                        <span>{field.label}</span>
                      )}
                      {field.type === 'textarea'
                        ? <textarea className="input" rows={isDescription ? 7 : 3} required={field.required} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
                        : field.type === 'select'
                          ? <select className="select" required={field.required} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                            <option value="">Select {field.label.toLowerCase()}</option>
                            {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          : <input className="input" type={field.type === 'list' ? 'text' : field.type} min={field.min} step={field.step} required={field.required} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}
                    </>}
                </label>
              )}
            </div>
          );
        })}
        {error && <p className="form-message" role="alert">{error}</p>}
        {message && <p className="admin-success" role="status">{message}</p>}
        <div className="admin-form-actions">
          <button className="button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : editing ? 'Save changes' : `Add ${title}`}</button>
          {editing && <button className="button secondary" type="button" onClick={beginCreate}>Cancel edit</button>}
        </div>
      </form>
    </section>
    <section className="admin-card">
      <div className="admin-card-heading"><div><div className="eyebrow">Current records</div><h2>{title} ({safeItems.length})</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}<th>Actions</th></tr></thead>
        <tbody>{safeItems.map((item) => <tr key={item.id}>
          {columns.map((column) => <td key={column.label}>{column.render(item)}</td>)}
          <td className="admin-actions">
            <button type="button" className="icon-button" onClick={() => beginEdit(item)} aria-label={`Edit ${title}`} title="Edit"><Pencil size={15} /></button>
            <button type="button" className="icon-button admin-delete" onClick={() => remove(item)} aria-label={`Delete ${title}`} title="Delete" disabled={mutation.isPending}><Trash2 size={15} /></button>
          </td>
        </tr>)}
        {!safeItems.length && <tr><td colSpan={columns.length + 1} className="admin-empty">No records found.</td></tr>}
        </tbody>
      </table></div>
    </section>
  </div>;
}

function AdminConsole() {
  const [section, setSection] = useState<'products' | 'categories' | 'banners' | 'orders' | 'coupons' | 'reviews' | 'relationships' | 'combos' | 'content' | 'audit' | 'developer'>('products');
  const [page, setPage] = useState(0);

  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchAdminDashboard,
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['admin-subcategories-overview'],
    queryFn: () => fetchAdminSubcategories({ page: 0, size: 1 }),
  });

  const productsQuery = useQuery({
    queryKey: ['admin-products', page],
    queryFn: async () => parseList<AdminProduct>(await customFetch<unknown>(`/api/products?page=${page}&size=50&sort=createdAt,desc`)),
    enabled: section === 'products',
  });
  const categoriesQuery = useQuery({
    queryKey: ['admin-categories-overview-list'],
    queryFn: async () => parseList<AdminCategory>(await customFetch<unknown>('/api/categories')),
  });
  const allSubcategoriesQuery = useQuery({
    queryKey: ['admin-all-subcategories'],
    queryFn: () => fetchAdminSubcategories({ size: 200 }),
    enabled: section === 'products',
  });

  const categoriesList = normalizeList<AdminCategory>(categoriesQuery.data?.items ?? categoriesQuery.data);
  const productsList = normalizeList<AdminProduct>(productsQuery.data?.items ?? productsQuery.data);
  const allSubcategoriesList = normalizeList<SubcategoryResponse>(allSubcategoriesQuery.data?.content ?? allSubcategoriesQuery.data);

  const productFields = useMemo<FieldSpec[]>(() => [
    { key: 'name', label: 'Product name', type: 'text', required: true },
    { key: 'sku', label: 'SKU', type: 'text', required: true },
    { key: 'price', label: 'Price', type: 'number', required: true, min: 0, step: '0.01' },
    { key: 'discountPrice', label: 'Discount price', type: 'number', min: 0, step: '0.01' },
    { key: 'stockQuantity', label: 'Stock quantity', type: 'number', required: true, min: 0, step: '1' },
    { key: 'lowStockThreshold', label: 'Low stock threshold', type: 'number', required: true, min: 0, step: '1' },
    { key: 'categoryId', label: 'Category', type: 'select', required: true, options: categoriesList.map((category) => ({ value: String(category.id), label: category.name })) },
    { key: 'subcategoryId', label: 'Subcategory (Optional)', type: 'select', options: [{ value: '', label: 'None (Parent category only)' }, ...allSubcategoriesList.map((sub) => ({ value: String(sub.id), label: `${sub.name} (${sub.categoryName || 'Category #' + sub.categoryId})` }))] },
    { key: 'shortDescription', label: 'Short description', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'textarea', required: true },
    { key: 'imageFile', label: 'Product images', type: 'file', accept: 'image/jpeg,image/png,image/webp', hint: 'Upload one or multiple photos (JPEG, PNG, WebP). The first photo will be the primary storefront cover.' },
    { key: 'featured', label: 'Featured', type: 'checkbox' },
    { key: 'active', label: 'Active', type: 'checkbox', defaultValue: true },
  ], [categoriesList, allSubcategoriesList]);

  const products = productsList;
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
        <div><span>Products in collection</span><strong>{dashboardQuery.data?.totalProducts ?? productsQuery.data?.totalItems ?? (productsQuery.data ? products.length : '—')}</strong></div>
        <small>{dashboardQuery.data ? 'Active collection inventory' : productsQuery.data ? `${activeProducts} active on this page` : 'Inventory summary'}</small>
      </article>
      <article className="admin-overview-card">
        <div className="admin-overview-icon"><Layers3 size={19} /></div>
        <div><span>Collections</span><strong>{categoriesList.length || '—'}</strong></div>
        <small>Parent categories</small>
      </article>
      <article className="admin-overview-card">
        <div className="admin-overview-icon"><Layers size={19} /></div>
        <div><span>Subcategories</span><strong>{subcategoriesQuery.data?.totalElements ?? '—'}</strong></div>
        <small>Curated subcategories</small>
      </article>
      <article className={`admin-overview-card ${(dashboardQuery.data?.lowStockProducts ?? lowStockCount) ? 'needs-attention' : ''}`}>
        <div className="admin-overview-icon"><TrendingDown size={19} /></div>
        <div><span>Low stock</span><strong>{dashboardQuery.data?.lowStockProducts ?? (productsQuery.data ? lowStockCount : '—')}</strong></div>
        <small>{(dashboardQuery.data?.lowStockProducts ?? lowStockCount) ? 'Items to replenish' : 'Stock levels look healthy'}</small>
      </article>
    </section>
    <nav className="admin-tabs" aria-label="Admin management sections" role="tablist">
      {(
        [
          { id: 'products', label: 'Products' },
          { id: 'categories', label: 'Categories' },
          { id: 'banners', label: 'Hero Banners' },
          { id: 'orders', label: 'Orders' },
          { id: 'coupons', label: 'Coupons' },
          { id: 'reviews', label: 'Reviews' },
          { id: 'relationships', label: 'Similar products' },
          { id: 'combos', label: 'Combos & Offers' },
          { id: 'content', label: 'Pages & Support' },
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
        : section === 'products' && productsQuery.data
          ? <>
            <CrudPanel title="Product" endpoint="/api/admin/products" queryKey={['admin-products']} items={productsList} fields={productFields} categories={categoriesList} columns={[
              { label: 'Piece', render: (item) => <div className="admin-product-cell"><img className="admin-product-thumb" src={getJewelleryImage(item.imageUrl, item.name, item.id)} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = getJewelleryImage(null, item.name, item.id); }} /><div><span style={{ display: 'block', fontWeight: 600 }}>{item.name}</span>{Array.isArray(item.images) && item.images.length > 1 && <span className="admin-gallery-count-badge">{item.images.length} photos</span>}</div></div> },
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
          : section === 'categories'
            ? <CategoryManagementAdminView />
            : section === 'banners'
              ? <HeroBannersAdminView />
              : section === 'orders'
                  ? <AdminOrdersView />
                  : section === 'coupons'
                    ? <CouponsAdminView />
                    : section === 'reviews'
                      ? <ReviewsAdminView />
                      : section === 'audit'
                        ? <AuditLogsView />
                        : section === 'developer'
                          ? <DeveloperToolsView />
                          : section === 'combos'
                            ? <CombosOffersAdminView />
                            : section === 'relationships'
                              ? <ProductRelationshipsAdminView />
                              : section === 'content'
                                ? <SiteContentAdminView />
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
