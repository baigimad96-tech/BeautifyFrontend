import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import {
  useGetProducts,
  useGetCategories,
  type Product,
  type Category,
} from '@workspace/api-client-react';
import { SiteLayout as Layout } from '@/layouts/SiteLayout';
import { LoadingGrid } from '@/components/common/LoadingGrid';
import { ErrorState } from '@/components/common/ErrorState';
import { ProductCard } from '@/components/products/ProductCard';
import { useProductActions } from '@/hooks/use-product-actions';
import { toArray } from '@/utils/array';
import { fetchBanners } from '@/services/banners/banners.service';
import type { HeroBanner } from '@/types/banner.types';
import { resolveImageUrl, handleImageError } from '@/lib/jewellery-images';

export function HomePage() {
  const products = useGetProducts({ sort: 'featured' });
  const categories = useGetCategories();
  const actions = useProductActions();
  const productList = toArray<Product>(products.data);
  const categoryList = toArray<Category>(categories.data);

  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    fetchBanners().then((list) => {
      if (list && list.length > 0) {
        setBanners(list);
      }
    });
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [banners.length]);

  const activeBanner = banners.length > 0 ? banners[currentBannerIndex] : null;

  return (
    <Layout>
      <main className="page">
        <section className="hero">
          <div>
            <div className="eyebrow">{activeBanner?.subtitle || 'MALKAZ / 01'}</div>
            <h1>
              {activeBanner ? (
                activeBanner.title
              ) : (
                <>
                  Jewellery made for <em>your story.</em>
                </>
              )}
            </h1>
            <p className="lede">
              {activeBanner?.description ||
                'Discover thoughtfully selected gold, gemstones, and timeless designs from MALKAZ.'}
            </p>
            <div className="hero-actions">
              <Link
                href={activeBanner?.ctaLink || '/shop'}
                className="button"
                data-testid="link-hero-shop"
              >
                {activeBanner?.ctaText || 'Explore jewellery'} <ArrowRight size={15} />
              </Link>
              <Link href="/categories" className="button secondary" data-testid="link-hero-categories">
                Browse collections
              </Link>
            </div>
            {banners.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginTop: '1.25rem',
                  alignItems: 'center',
                }}
              >
                {banners.map((b, idx) => (
                  <button
                    key={b.id || idx}
                    type="button"
                    onClick={() => setCurrentBannerIndex(idx)}
                    style={{
                      width: idx === currentBannerIndex ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: idx === currentBannerIndex ? '#c5a059' : '#d8cbba',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      padding: 0,
                    }}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="hero-art" aria-label="MALKAZ fine jewellery collection">
            <img
              src={resolveImageUrl(activeBanner?.imageUrl || '/hero-jewellery.jpg')}
              alt={activeBanner?.title || 'MALKAZ fine jewellery collection'}
              onError={handleImageError('/hero-jewellery.jpg')}
            />
          </div>
        </section>

        <section className="section" id="edit">
          <div className="section-head">
            <div>
              <div className="eyebrow">MALKAZ collection</div>
              <h2 className="section-title">Fine jewellery, thoughtfully chosen</h2>
            </div>
            <p className="section-copy">
              Explore distinctive pieces selected for meaningful moments and everyday elegance.
            </p>
          </div>
          {products.isLoading ? (
            <LoadingGrid />
          ) : products.isError ? (
            <ErrorState retry={() => products.refetch()} />
          ) : (
            <div className="product-grid">
              {productList.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  saved={actions.savedIds.has(product.id)}
                  adding={actions.adding}
                  onSave={actions.save}
                  onAdd={actions.add}
                />
              ))}
            </div>
          )}
        </section>

        <div className="marquee">
          <span>
            GOLD / GEMSTONES / KUNDAN / DIAMONDS · GOLD / GEMSTONES / KUNDAN / DIAMONDS · GOLD / GEMSTONES / KUNDAN / DIAMONDS ·{' '}
          </span>
        </div>

        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">MALKAZ collections</div>
              <h2 className="section-title">Shop by Collection</h2>
            </div>
            <Link href="/categories" className="button secondary small" data-testid="link-all-categories">
              All collections <ArrowRight size={14} />
            </Link>
          </div>
          <div className="category-strip home-category-circles">
            {categoryList.slice(0, 4).map((category) => (
              <Link
                href={`/shop?category=${category.id}`}
                className="category-tile home-category-circle"
                key={category.id}
                data-testid={`card-category-${category.id}`}
              >
                <img src={category.image || '/cat-necklaces.jpg'} alt="" loading="lazy" />
                <h3>{category.name}</h3>
                <p>{category.description || `${category.productCount || 0} fine jewellery pieces`}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}

export default HomePage;
