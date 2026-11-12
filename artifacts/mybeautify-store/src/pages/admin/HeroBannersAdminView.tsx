import { useState, useRef, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  fetchAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  toggleAdminBannerStatus,
  deleteAdminBanner,
} from '@/services/banners/banners.service';
import { uploadImage } from '@/services/uploads/uploads.service';
import { resolveImageUrl, handleImageError } from '@/lib/jewellery-images';
import { normalizeList } from '@/utils/array';
import type { HeroBanner, HeroBannerRequest } from '@/types/banner.types';

const EMPTY_BANNER_FORM: HeroBannerRequest = {
  title: '',
  subtitle: '',
  description: '',
  ctaText: 'Explore Collection',
  ctaLink: '/shop',
  imageUrl: '',
  displayOrder: 0,
  active: true,
};

export function HeroBannersAdminView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [formData, setFormData] = useState<HeroBannerRequest>(EMPTY_BANNER_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['admin-hero-banners'],
    queryFn: fetchAdminBanners,
  });

  const banners = normalizeList<HeroBanner>(data);

  const saveMutation = useMutation({
    mutationFn: (payload: HeroBannerRequest) =>
      editingBanner ? updateAdminBanner(editingBanner.id, payload) : createAdminBanner(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-banners'] });
      queryClient.invalidateQueries({ queryKey: ['hero-banners'] });
      setFeedback(editingBanner ? `Banner "${saved.title}" updated successfully.` : `Banner "${saved.title}" created successfully.`);
      setError(null);
      resetForm();
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to save hero banner.');
      setFeedback(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      toggleAdminBannerStatus(id, active),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-banners'] });
      queryClient.invalidateQueries({ queryKey: ['hero-banners'] });
      setFeedback(`Banner "${updated.title}" ${updated.active ? 'activated' : 'paused'}.`);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to change banner status.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-banners'] });
      queryClient.invalidateQueries({ queryKey: ['hero-banners'] });
      setFeedback('Hero banner removed successfully.');
      setError(null);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to delete banner.');
    },
  });

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      ...EMPTY_BANNER_FORM,
      displayOrder: banners.length + 1,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startEdit = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      ctaText: banner.ctaText || 'Explore Collection',
      ctaLink: banner.ctaLink || '/shop',
      imageUrl: banner.imageUrl,
      displayOrder: banner.displayOrder,
      active: banner.active,
    });
    setError(null);
    setFeedback(null);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      if (url) {
        setFormData((prev) => ({ ...prev, imageUrl: url }));
        setFeedback('Banner image uploaded successfully.');
        setTimeout(() => setFeedback(null), 3000);
      } else {
        throw new Error('Image URL not returned by server.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Banner title is required.');
      return;
    }
    if (!formData.imageUrl.trim()) {
      setError('Banner image is required. Upload a file or paste a valid URL.');
      return;
    }

    saveMutation.mutate(formData);
  };

  return (
    <div className="admin-banners-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Introduction banner */}
      <div className="admin-relationship-intro">
        <div className="eyebrow">Storefront Curation</div>
        <h2>Hero Banner Carousel</h2>
        <p>
          Manage the rotating showcase banners on the MALKAZ storefront. Curate luxury visuals, promotional taglines, and direct call-to-action buttons.
        </p>
      </div>

      {feedback && (
        <div className="admin-feedback" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="admin-feedback" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Slide Editor Form */}
      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <div className="eyebrow">{editingBanner ? 'Update Slide' : 'New Slide'}</div>
            <h2>{editingBanner ? `Edit "${editingBanner.title}"` : 'Add Storefront Hero Banner'}</h2>
          </div>
          {editingBanner && (
            <button type="button" className="button secondary small" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="admin-form" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <label className="form-field">
              <span>Main Title *</span>
              <input
                className="input"
                type="text"
                required
                maxLength={255}
                placeholder="e.g. Elegance in Every Detail"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span>Subtitle / Tagline (Optional)</span>
              <input
                className="input"
                type="text"
                maxLength={255}
                placeholder="e.g. FINE JEWELLERY COLLECTION"
                value={formData.subtitle || ''}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </label>
          </div>

          <label className="form-field" style={{ marginTop: '1rem' }}>
            <span>Description / Supporting Copy</span>
            <textarea
              className="input"
              rows={2}
              maxLength={500}
              placeholder="e.g. Discover handcrafted fine jewellery designed to illuminate every celebration with enduring radiance."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <label className="form-field">
              <span>Button Text</span>
              <input
                className="input"
                type="text"
                maxLength={100}
                placeholder="e.g. Explore Collection"
                value={formData.ctaText || ''}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span>Button Link</span>
              <input
                className="input"
                type="text"
                maxLength={255}
                placeholder="e.g. /shop or /categories"
                value={formData.ctaLink || ''}
                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span>Display Order</span>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={formData.displayOrder ?? 0}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })}
              />
            </label>
          </div>

          {/* Image Upload & URL Section */}
          <div style={{ marginTop: '1.25rem', padding: '16px', background: 'rgba(232, 222, 200, 0.2)', borderRadius: 12, border: '1px solid #E8DEC8' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0A3B2C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={16} />
              <span>Banner Visual Asset *</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label className="form-field">
                  <span>Image URL (or upload from PC)</span>
                  <input
                    className="input"
                    type="text"
                    required
                    placeholder="https://... or /hero-jewellery.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                </label>
                <div style={{ marginTop: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    {uploadingImage ? 'Uploading…' : 'Upload Image File'}
                  </button>
                  <small style={{ display: 'block', color: '#666', marginTop: 4 }}>
                    Recommended size: 1600×800 or 1920×960 landscape JPEG/PNG/WebP.
                  </small>
                </div>
              </div>

              {formData.imageUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>Live Preview</span>
                  <div style={{ width: '100%', maxWidth: 280, height: 130, borderRadius: 8, overflow: 'hidden', border: '1px solid #E8DEC8', background: '#000' }}>
                    <img
                      src={resolveImageUrl(formData.imageUrl)}
                      alt="Banner Preview"
                      onError={handleImageError}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <span>Active (Visible on Storefront)</span>
            </label>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              <button
                type="submit"
                className="button"
                disabled={saveMutation.isPending || uploadingImage}
              >
                {saveMutation.isPending ? 'Saving…' : editingBanner ? 'Save Changes' : 'Create Banner Slide'}
              </button>
              {editingBanner && (
                <button type="button" className="button secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Banner Catalogue List */}
      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <div className="eyebrow">Storefront Rotation</div>
            <h2>Configured Hero Slides ({banners.length})</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="skeleton line" style={{ height: 100, margin: '20px 0' }} />
        ) : isError ? (
          <div className="error-state" role="alert">
            <p>{queryError instanceof Error ? queryError.message : 'Failed to load hero banners.'}</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="admin-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Layers size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>No hero banners configured yet. Add your first banner slide above.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Order</th>
                  <th style={{ width: 140 }}>Preview</th>
                  <th>Title &amp; Subtitle</th>
                  <th>CTA Button</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#0A3B2C', fontSize: 15 }}>
                        #{banner.displayOrder}
                      </span>
                    </td>
                    <td>
                      <div style={{ width: 120, height: 60, borderRadius: 6, overflow: 'hidden', border: '1px solid #E8DEC8', background: '#000' }}>
                        <img
                          src={resolveImageUrl(banner.imageUrl)}
                          alt={banner.title}
                          onError={handleImageError}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {banner.subtitle && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#7A4B58', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {banner.subtitle}
                          </span>
                        )}
                        <strong style={{ fontSize: 14, color: '#123A30' }}>{banner.title}</strong>
                        {banner.description && (
                          <small style={{ color: '#666', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {banner.description}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{banner.ctaText || 'Explore Collection'}</span>
                        <small style={{ color: '#888' }}>({banner.ctaLink || '/shop'})</small>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-status ${banner.active ? 'is-active' : 'is-inactive'}`}>
                        {banner.active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="admin-actions" style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="button secondary small"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                        title={banner.active ? 'Pause slide' : 'Activate slide'}
                        onClick={() => toggleMutation.mutate({ id: banner.id, active: !banner.active })}
                      >
                        {banner.active ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span style={{ marginLeft: 4 }}>{banner.active ? 'Pause' : 'Activate'}</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit banner"
                        aria-label={`Edit ${banner.title}`}
                        onClick={() => startEdit(banner)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button admin-delete"
                        title="Delete banner"
                        aria-label={`Delete ${banner.title}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete banner "${banner.title}"?`)) {
                            deleteMutation.mutate(banner.id);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
