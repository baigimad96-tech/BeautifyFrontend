import React, { useState } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FolderTree,
  Gem,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, fetchCategoryById } from '@/services/categories/categories.service';
import { fetchSubcategories, fetchSubcategoryById } from '@/services/subcategories/subcategories.service';
import { fetchProducts } from '@/services/products/products.service';
import { addToCart as apiAddToCart } from '@/services/cart/cart.service';
import { fetchWishlist, addToWishlist, removeFromWishlist } from '@/services/wishlist/wishlist.service';
import type { CategoryResponse, ProductResponse } from '@/types/product.types';
import type { SubcategoryResponse } from '@/types/subcategory.types';
import { SiteLayout as Layout } from '@/layouts/SiteLayout';
import { LoadingGrid } from '@/components/common/LoadingGrid';
import { ErrorState } from '@/components/common/ErrorState';
import MalkazProductCard from '@/components/products/MalkazProductCard';
import { getJewelleryImage } from '@/lib/jewellery-images';

const CATEGORY_IMAGE_FALLBACKS: Array<[RegExp, string]> = [
  [/\b(lip|gloss|lipstick)\b/i, '/products/gloss-ritual-lip-oil.jpg'],
  [/\b(blush|makeup|make-up)\b/i, '/products/silk-veil-cream-blush.jpg'],
  [/\b(skin|cream|moistur|cleanser|serum|toner)\b/i, '/products/dew-cloud-cream/1.jpg'],
  [/\b(earring|earrings|jhumka|jhumki)\b/i, '/products/jewels/traditional-kundan-jhumka.jpg'],
  [/\b(ring|rings)\b/i, '/products/jewels/vintage-emerald-ring.jpg'],
  [/\b(bangle|bangles)\b/i, '/products/jewels/designer-gold-bangles.jpg'],
  [/\b(bracelet|bracelets)\b/i, '/products/jewels/diamond-tennis-bracelet.jpg'],
  [/\b(necklace|necklaces|chain|chains|pendant)\b/i, '/products/jewels/royal-emerald-necklace.jpg'],
];

const CATEGORY_IMAGE_DEFAULTS = [
  '/products/jewels/royal-emerald-necklace.jpg',
  '/products/jewels/traditional-kundan-jhumka.jpg',
  '/products/jewels/designer-gold-bangles.jpg',
  '/products/jewels/vintage-emerald-ring.jpg',
  '/products/jewels/diamond-tennis-bracelet.jpg',
] as const;

function getCategoryImageFallback(categoryName: string, index = 0): string {
  return (
    CATEGORY_IMAGE_FALLBACKS.find(([pattern]) => pattern.test(categoryName))?.[1] ??
    CATEGORY_IMAGE_DEFAULTS[index % CATEGORY_IMAGE_DEFAULTS.length]
  );
}

export function CategoriesPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Route matching
  const [matchSub, paramsSub] = useRoute('/categories/:categoryId/:subcategoryId');
  const [matchCat, paramsCat] = useRoute('/categories/:categoryId');

  const categoryId = matchSub ? Number(paramsSub?.categoryId) : matchCat ? Number(paramsCat?.categoryId) : null;
  const subcategoryId = matchSub ? Number(paramsSub?.subcategoryId) : null;

  // Local interaction state
  const [cartLoading, setCartLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  // All categories query (for root /categories or category pill lists)
  const allCategoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // Selected Category details (when categoryId is present)
  const categoryDetailsQuery = useQuery({
    queryKey: ['category-details', categoryId],
    queryFn: () => (categoryId ? fetchCategoryById(categoryId) : Promise.resolve(null)),
    enabled: !!categoryId,
  });

  // Subcategories for current category (active only)
  const subcategoriesQuery = useQuery({
    queryKey: ['category-subcategories', categoryId],
    queryFn: () => (categoryId ? fetchSubcategories(categoryId) : Promise.resolve([])),
    enabled: !!categoryId,
  });

  // Selected Subcategory details (when subcategoryId is present)
  const subcategoryDetailsQuery = useQuery({
    queryKey: ['subcategory-details', subcategoryId],
    queryFn: () => (subcategoryId ? fetchSubcategoryById(subcategoryId) : Promise.resolve(null)),
    enabled: !!subcategoryId,
  });

  // Products query (filtered by category or subcategory from database)
  const productsQuery = useQuery({
    queryKey: ['category-products', categoryId, subcategoryId],
    queryFn: () => {
      if (subcategoryId) {
        return fetchProducts({ subcategoryId, size: 50 });
      }
      if (categoryId) {
        return fetchProducts({ categoryId, size: 50 });
      }
      return Promise.resolve({ items: [] as ProductResponse[] });
    },
    enabled: !!categoryId || !!subcategoryId,
  });

  // Customer Wishlist
  const wishlistQuery = useQuery({
    queryKey: ['customer-wishlist'],
    queryFn: fetchWishlist,
    retry: false,
  });

  const wishlistIds = new Set((wishlistQuery.data ?? []).map((p) => p.id));

  // ---------------------------------------------------------------------------
  // Cart & Wishlist Actions
  // ---------------------------------------------------------------------------
  const handleAddToCart = async (product: ProductResponse) => {
    try {
      setCartLoading(true);
      await apiAddToCart(product.id, 1);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err) {
      console.error('Failed to add product to cart:', err);
    } finally {
      setCartLoading(false);
    }
  };

  const handleToggleWishlist = async (product: ProductResponse) => {
    try {
      if (wishlistIds.has(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product.id);
      }
      await queryClient.invalidateQueries({ queryKey: ['customer-wishlist'] });
    } catch (err) {
      console.error('Failed to update wishlist:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. SUBCATEGORY DETAILS VIEW (/categories/:categoryId/:subcategoryId)
  // ---------------------------------------------------------------------------
  if (matchSub && categoryId && subcategoryId) {
    const isInitialLoading =
      categoryDetailsQuery.isLoading || subcategoryDetailsQuery.isLoading || productsQuery.isLoading;
    const isError =
      categoryDetailsQuery.isError ||
      subcategoryDetailsQuery.isError ||
      productsQuery.isError ||
      (!categoryDetailsQuery.isLoading && !categoryDetailsQuery.data) ||
      (!subcategoryDetailsQuery.isLoading && !subcategoryDetailsQuery.data);

    if (isInitialLoading) {
      return (
        <Layout>
          <main className="page">
            <LoadingGrid />
          </main>
        </Layout>
      );
    }

    if (isError) {
      return (
        <Layout>
          <main className="page" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ maxWidth: 500, margin: '0 auto', background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16, padding: '40px 24px' }}>
              <Gem size={42} color="#0A3B2C" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontSize: 22, marginBottom: 8 }}>
                Subcategory Not Found
              </h2>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>
                This jewellery subcategory is unavailable or has been archived. Explore other curated MALKAZ collections.
              </p>
              <Link href="/categories" className="button" style={{ background: '#0A3B2C', color: '#FAF7F2', borderRadius: 8, padding: '10px 24px', fontWeight: 600 }}>
                Browse All Collections
              </Link>
            </div>
          </main>
        </Layout>
      );
    }

    const currentCat = categoryDetailsQuery.data!;
    const currentSub = subcategoryDetailsQuery.data!;
    const products: ProductResponse[] = productsQuery.data?.items ?? [];
    const siblingSubs: SubcategoryResponse[] = subcategoriesQuery.data ?? [];

    return (
      <Layout>
        <main className="page mz-category-page" style={{ paddingBottom: 60 }}>
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B', margin: '20px 0 24px' }}>
            <Link href="/" style={{ color: '#0A3B2C', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
            <ChevronRight size={13} color="#94A3B8" />
            <Link href="/categories" style={{ color: '#0A3B2C', textDecoration: 'none', fontWeight: 500 }}>Categories</Link>
            <ChevronRight size={13} color="#94A3B8" />
            <Link href={`/categories/${currentCat.id}`} style={{ color: '#0A3B2C', textDecoration: 'none', fontWeight: 500 }}>{currentCat.name}</Link>
            <ChevronRight size={13} color="#94A3B8" />
            <span style={{ color: '#1E293B', fontWeight: 600 }}>{currentSub.name}</span>
          </nav>

          {/* Subcategory Hero Banner */}
          <section
            style={{
              background: 'linear-gradient(135deg, #0A3B2C 0%, #06231A 100%)',
              borderRadius: 20,
              padding: '36px 32px',
              color: '#FAF7F2',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 32,
              boxShadow: '0 10px 30px rgba(10, 59, 44, 0.12)',
            }}
          >
            <div style={{ maxWidth: 650, position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(232, 222, 200, 0.2)', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#E8DEC8', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <Sparkles size={12} /> {currentCat.name} Collection
              </div>
              <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 32, fontWeight: 600, margin: '0 0 10px 0', color: '#FAF7F2' }}>
                {currentSub.name}
              </h1>
              <p style={{ fontSize: 15, color: '#E2E8F0', lineHeight: 1.6, margin: 0 }}>
                {currentSub.description || `Explore handpicked ${currentSub.name} crafted with timeless artistry and royal elegance.`}
              </p>
            </div>
          </section>

          {/* Sibling Subcategories Strip */}
          {siblingSubs.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A3B2C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Explore other {currentCat.name} subcategories:
                </span>
                <Link
                  href={`/categories/${currentCat.id}`}
                  style={{ fontSize: 12, color: '#0A3B2C', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <ArrowLeft size={13} /> View all {currentCat.name}
                </Link>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                <Link
                  href={`/categories/${currentCat.id}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    background: '#FAF7F2',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    transition: 'all 150ms ease',
                  }}
                >
                  All {currentCat.name}
                </Link>
                {siblingSubs.map((sub) => {
                  const isCurrent = sub.id === currentSub.id;
                  return (
                    <Link
                      key={sub.id}
                      href={`/categories/${currentCat.id}/${sub.id}`}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: isCurrent ? 600 : 500,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        background: isCurrent ? '#0A3B2C' : '#FAF7F2',
                        border: isCurrent ? '1px solid #0A3B2C' : '1px solid #CBD5E1',
                        color: isCurrent ? '#FAF7F2' : '#1E293B',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {sub.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subcategory Products Listing */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 20, color: '#0A3B2C', margin: 0, fontWeight: 600 }}>
              {currentSub.name} Pieces ({products.length})
            </h2>
          </div>

          {products.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16 }}>
              <Gem size={36} color="#0A3B2C" style={{ margin: '0 auto 14px' }} />
              <h3 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontSize: 18, marginBottom: 8 }}>
                No Pieces Found
              </h3>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
                No active jewellery pieces are currently assigned to {currentSub.name}. Explore the rest of {currentCat.name}.
              </p>
              <Link href={`/categories/${currentCat.id}`} className="button" style={{ background: '#0A3B2C', color: '#FAF7F2', borderRadius: 8, padding: '8px 20px', fontSize: 13 }}>
                Back to {currentCat.name}
              </Link>
            </div>
          ) : (
            <div className="mb-product-grid mz-product-grid">
              {products.map((product) => (
                <MalkazProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.has(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                  onAddToCart={handleAddToCart}
                  cartLoading={cartLoading}
                />
              ))}
            </div>
          )}
        </main>
      </Layout>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. CATEGORY DETAILS VIEW (/categories/:categoryId)
  // ---------------------------------------------------------------------------
  if (matchCat && categoryId) {
    const isInitialLoading = categoryDetailsQuery.isLoading || productsQuery.isLoading;
    const isError =
      categoryDetailsQuery.isError ||
      productsQuery.isError ||
      (!categoryDetailsQuery.isLoading && !categoryDetailsQuery.data);

    if (isInitialLoading) {
      return (
        <Layout>
          <main className="page">
            <LoadingGrid />
          </main>
        </Layout>
      );
    }

    if (isError) {
      return (
        <Layout>
          <main className="page" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ maxWidth: 500, margin: '0 auto', background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16, padding: '40px 24px' }}>
              <Gem size={42} color="#0A3B2C" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontSize: 22, marginBottom: 8 }}>
                Category Not Found
              </h2>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>
                This category is unavailable or does not exist. Explore other collections in the MALKAZ boutique.
              </p>
              <Link href="/categories" className="button" style={{ background: '#0A3B2C', color: '#FAF7F2', borderRadius: 8, padding: '10px 24px', fontWeight: 600 }}>
                Browse All Collections
              </Link>
            </div>
          </main>
        </Layout>
      );
    }

    const currentCat = categoryDetailsQuery.data!;
    const products: ProductResponse[] = productsQuery.data?.items ?? [];
    const subcategories: SubcategoryResponse[] = subcategoriesQuery.data ?? [];

    return (
      <Layout>
        <main className="page mz-category-page" style={{ paddingBottom: 60 }}>
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B', margin: '20px 0 24px' }}>
            <Link href="/" style={{ color: '#0A3B2C', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
            <ChevronRight size={13} color="#94A3B8" />
            <Link href="/categories" style={{ color: '#0A3B2C', textDecoration: 'none', fontWeight: 500 }}>Categories</Link>
            <ChevronRight size={13} color="#94A3B8" />
            <span style={{ color: '#1E293B', fontWeight: 600 }}>{currentCat.name}</span>
          </nav>

          {/* Category Hero Banner */}
          <section
            style={{
              background: 'linear-gradient(135deg, #0A3B2C 0%, #06231A 100%)',
              borderRadius: 20,
              padding: '40px 32px',
              color: '#FAF7F2',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 32,
              boxShadow: '0 10px 30px rgba(10, 59, 44, 0.12)',
            }}
          >
            <div style={{ maxWidth: 650, position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(232, 222, 200, 0.2)', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#E8DEC8', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <Sparkles size={12} /> MALKAZ Fine Jewellery
              </div>
              <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 34, fontWeight: 600, margin: '0 0 12px 0', color: '#FAF7F2' }}>
                {currentCat.name}
              </h1>
              <p style={{ fontSize: 15, color: '#E2E8F0', lineHeight: 1.6, margin: 0 }}>
                {currentCat.description || 'Explore timeless craftsmanship designed for signature everyday moments and celebrations.'}
              </p>
            </div>
          </section>

          {/* Subcategories Filter Strip */}
          {subcategories.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FolderTree size={16} color="#0A3B2C" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0A3B2C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Filter by Subcategory:
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '8px 18px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#0A3B2C',
                    color: '#FAF7F2',
                    border: '1px solid #0A3B2C',
                    cursor: 'default',
                  }}
                >
                  All Pieces ({products.length})
                </span>
                {subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/categories/${currentCat.id}/${sub.id}`}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: 'none',
                      background: '#FAF7F2',
                      border: '1px solid #CBD5E1',
                      color: '#1E293B',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 150ms ease',
                    }}
                  >
                    <span>{sub.name}</span>
                    <ArrowRight size={12} color="#0A3B2C" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 22, color: '#0A3B2C', margin: 0, fontWeight: 600 }}>
              Collection Pieces ({products.length})
            </h2>
          </div>

          {products.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FAF7F2', border: '1px solid #E8DEC8', borderRadius: 16 }}>
              <Gem size={36} color="#0A3B2C" style={{ margin: '0 auto 14px' }} />
              <h3 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#0A3B2C', fontSize: 18, marginBottom: 8 }}>
                No Pieces in this Collection Yet
              </h3>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
                We are curating new arrivals for {currentCat.name}. Explore other collections in the meantime.
              </p>
              <Link href="/categories" className="button" style={{ background: '#0A3B2C', color: '#FAF7F2', borderRadius: 8, padding: '8px 20px', fontSize: 13 }}>
                Explore All Collections
              </Link>
            </div>
          ) : (
            <div className="mb-product-grid mz-product-grid">
              {products.map((product) => (
                <MalkazProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.has(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                  onAddToCart={handleAddToCart}
                  cartLoading={cartLoading}
                />
              ))}
            </div>
          )}
        </main>
      </Layout>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. ROOT CATEGORIES OVERVIEW (/categories)
  // ---------------------------------------------------------------------------
  const categories: CategoryResponse[] = allCategoriesQuery.data ?? [];

  return (
    <Layout>
      <main className="page mz-categories-root">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B', margin: '20px 0 16px' }}>
          <Link href="/" style={{ color: '#0A3B2C', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
          <ChevronRight size={13} color="#94A3B8" />
          <span style={{ color: '#1E293B', fontWeight: 600 }}>Categories</span>
        </nav>

        <div className="catalog-head">
          <div>
            <div className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} /> MALKAZ COLLECTIONS
            </div>
            <h1>
              Discover your
              <br />
              signature piece.
            </h1>
          </div>
          <p className="section-copy">
            Explore fine jewellery collections, from timeless everyday designs to pieces for special occasions. Browse by category and curated subcategories.
          </p>
        </div>

        {allCategoriesQuery.isLoading ? (
          <LoadingGrid />
        ) : allCategoriesQuery.isError ? (
          <ErrorState retry={() => allCategoriesQuery.refetch()} />
        ) : (
          <div className="browse-grid category-browse-grid" style={{ marginTop: 32 }}>
            {categories.map((category: CategoryResponse, index: number) => {
              const activeSubs = (category.subcategories ?? []).filter((s) => s.active !== false);

              return (
                <div
                  className="browse-card category-browse-card"
                  key={category.id}
                  data-testid={`card-browse-category-${category.id}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Link href={`/categories/${category.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <img
                      src={category.imageUrl?.trim() || getCategoryImageFallback(category.name, index)}
                      alt={category.name}
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.src = getCategoryImageFallback(category.name, index);
                      }}
                      style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: '12px 12px 0 0' }}
                    />
                    <div style={{ padding: '16px 16px 8px' }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0A3B2C', fontFamily: 'Cinzel, Georgia, serif' }}>
                        {category.name}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                        {category.description || 'Curated luxury collection.'}
                      </p>
                    </div>
                  </Link>

                  {/* Active Subcategory Pills on Card */}
                  <div style={{ padding: '8px 16px 16px' }}>
                    {activeSubs.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#0A3B2C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                          Subcategories:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {activeSubs.slice(0, 4).map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/categories/${category.id}/${sub.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                background: '#F1F5F9',
                                border: '1px solid #E2E8F0',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 500,
                                color: '#334155',
                                textDecoration: 'none',
                                transition: 'all 150ms ease',
                              }}
                            >
                              {sub.name}
                            </Link>
                          ))}
                          {activeSubs.length > 4 && (
                            <Link
                              href={`/categories/${category.id}`}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#0A3B2C',
                                textDecoration: 'none',
                              }}
                            >
                              +{activeSubs.length - 4} more
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/categories/${category.id}`}
                      className="eyebrow"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#0A3B2C',
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: 'none',
                      }}
                    >
                      Explore collection <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Layout>
  );
}

export default CategoriesPage;
