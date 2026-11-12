/**
 * Application Constants
 */

export const STORAGE_KEYS = {
  TOKEN: 'mybeautify-token',
  REFRESH_TOKEN: 'mybeautify-refresh-token',
  USER: 'mybeautify-user',
} as const;

export const DEMO_IMAGES: readonly string[] = [
  '/products/jewels/royal-emerald-necklace.jpg',
  '/products/jewels/traditional-kundan-jhumka.jpg',
  '/products/jewels/vintage-emerald-ring.jpg',
  '/products/jewels/diamond-tennis-bracelet.jpg',
] as const;

export const PRODUCT_SIZE_LOOKUP: Record<number, string> = {
  1: 'Adjustable 16-18"',
  2: '2.8" drop',
  3: 'US Size 7',
  4: 'Size 2.6',
  5: '7 inches',
  6: '18" + 2"',
  7: '9mm diameter',
  8: 'US Size 6.5',
};

export const PRODUCT_REVIEW_COUNT_LOOKUP: Record<number, number> = {
  1: 124,
  2: 98,
  3: 76,
  4: 83,
  5: 54,
  6: 43,
  7: 67,
  8: 48,
};

export const PRODUCT_RATING_LOOKUP: Record<number, number> = {
  1: 4.8,
  2: 4.6,
  3: 4.7,
  4: 4.5,
  5: 4.6,
  6: 4.5,
  7: 4.7,
  8: 4.4,
};

export * from './product-attributes';

