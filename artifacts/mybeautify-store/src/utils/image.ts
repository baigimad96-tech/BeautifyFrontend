import { resolveImageUrl, FALLBACK_JEWELLERY_IMAGE } from '@/lib/jewellery-images';

/**
 * Normalizes product image URL and ensures HTTPS.
 */
export function imageFor(image?: string | null): string {
  return resolveImageUrl(image, FALLBACK_JEWELLERY_IMAGE);
}
