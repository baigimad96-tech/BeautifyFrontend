import type { ProductResponse } from '@/types/product.types';

/**
 * Calculates discount percentage label (e.g., "25% OFF")
 */
export const getDiscountPercent = (price: number, discountPrice?: number): string | null => {
  if (!discountPrice || discountPrice >= price) return null;
  const pct = Math.round(((price - discountPrice) / price) * 100);
  return pct > 0 ? `${pct}% OFF` : null;
};

/**
 * Derives badge text and CSS class from real product attributes
 */
export const getProductBadge = (
  product: ProductResponse
): { text: string; type: string } | null => {
  const discountLabel = getDiscountPercent(product.price, product.discountPrice);
  if (discountLabel) {
    const pct = Math.round(((product.price - (product.discountPrice || product.price)) / product.price) * 100);
    return pct >= 25
      ? { text: 'Hot Deal', type: 'mb-badge-hotdeal' }
      : { text: discountLabel, type: 'mb-badge-discount' };
  }
  if (product.featured) {
    return { text: 'Featured', type: 'mb-badge-bestseller' };
  }
  return null;
};

/**
 * Derives display size for a product from backend data
 */
export const getProductSize = (product: ProductResponse): string => {
  return product.size || '';
};

/**
 * Derives real review count for a product
 */
export const getProductReviewCount = (product: ProductResponse): number => {
  return typeof product.reviewCount === 'number' && product.reviewCount > 0
    ? product.reviewCount
    : 0;
};

/**
 * Derives real average rating for a product
 */
export const getProductRating = (product: ProductResponse): number => {
  return typeof product.averageRating === 'number' && Number.isFinite(product.averageRating)
    ? product.averageRating
    : 0;
};
