export const JEWELLERY_IMAGES = [
  '/products/jewels/royal-emerald-necklace.jpg',
  '/products/jewels/traditional-kundan-jhumka.jpg',
  '/products/jewels/vintage-emerald-ring.jpg',
  '/products/jewels/designer-gold-bangles.jpg',
  '/products/jewels/diamond-tennis-bracelet.jpg',
  '/products/jewels/graceful-pendant-necklace.jpg',
  '/products/jewels/classic-green-studs.jpg',
  '/products/jewels/floral-diamond-ring.jpg',
] as const;

export const FALLBACK_JEWELLERY_IMAGE = JEWELLERY_IMAGES[0];

const NON_JEWELLERY_CONTENT =
  /\b(skincare|skin[- ]?care|cosmetic|make[- ]?up|cream|serum|cleanser|lipstick|lip[- ]?oil|blush|foundation|toner|sunscreen|mascara|moisturizer|moisturiser|beauty)\b/i;

const JEWELLERY_CATEGORIES: Array<[RegExp, (typeof JEWELLERY_IMAGES)[number]]> = [
  [/\b(jhumka|jhumki|earring|studs?)\b/i, JEWELLERY_IMAGES[1]],
  [/\b(ring|rings)\b/i, JEWELLERY_IMAGES[2]],
  [/\b(bangle|bangles)\b/i, JEWELLERY_IMAGES[3]],
  [/\b(bracelet|bracelets)\b/i, JEWELLERY_IMAGES[4]],
  [/\b(pendant|pendants|chain|chains)\b/i, JEWELLERY_IMAGES[5]],
  [/\b(necklace|necklaces)\b/i, JEWELLERY_IMAGES[0]],
];

/**
 * Normalizes and upgrades image URLs to HTTPS to prevent mixed-content blocking.
 */
export function resolveImageUrl(url?: string | null, fallback: string = FALLBACK_JEWELLERY_IMAGE): string {
  if (!url || typeof url !== 'string') return fallback;
  let normalized = url.trim();
  if (!normalized) return fallback;

  // Upgrade insecure HTTP to HTTPS for known backend domains
  if (normalized.startsWith('http://api.fashionmalkaz.com')) {
    normalized = normalized.replace('http://api.fashionmalkaz.com', 'https://api.fashionmalkaz.com');
  } else if (normalized.startsWith('http://fashionmalkaz.com')) {
    normalized = normalized.replace('http://fashionmalkaz.com', 'https://fashionmalkaz.com');
  } else if (normalized.startsWith('http://www.fashionmalkaz.com')) {
    normalized = normalized.replace('http://www.fashionmalkaz.com', 'https://www.fashionmalkaz.com');
  }

  return normalized;
}

export function handleImageError(
  fallback?: string
): (event: React.SyntheticEvent<HTMLImageElement>) => void;
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement>,
  fallback?: string
): void;
export function handleImageError(
  eventOrFallback: React.SyntheticEvent<HTMLImageElement> | string = FALLBACK_JEWELLERY_IMAGE,
  maybeFallback?: string
): ((event: React.SyntheticEvent<HTMLImageElement>) => void) | void {
  if (typeof eventOrFallback === 'string') {
    return (event: React.SyntheticEvent<HTMLImageElement>) => {
      const target = event.currentTarget;
      if (target.src !== eventOrFallback) {
        target.src = eventOrFallback;
      }
    };
  }
  const fallback = maybeFallback || FALLBACK_JEWELLERY_IMAGE;
  const target = eventOrFallback.currentTarget;
  if (target.src !== fallback) {
    target.src = fallback;
  }
  return undefined;
}

export function getJewelleryImage(
  imageUrl?: string | null,
  productName?: string | null,
  productId?: number,
): string {
  const name = productName ?? '';
  const url = resolveImageUrl(imageUrl, '');
  const source = `${name} ${url}`;

  if (
    url.startsWith('/products/jewels/') &&
    !NON_JEWELLERY_CONTENT.test(source)
  ) {
    return url;
  }

  if (
    /^https?:\/\//i.test(url) &&
    !NON_JEWELLERY_CONTENT.test(source)
  ) {
    return url;
  }

  const matchedCategory = JEWELLERY_CATEGORIES.find(([pattern]) => pattern.test(name));
  if (matchedCategory) return matchedCategory[1];

  const numericId = typeof productId === 'number' && Number.isFinite(productId)
    ? Math.abs(productId)
    : 0;
  return JEWELLERY_IMAGES[numericId % JEWELLERY_IMAGES.length];
}
