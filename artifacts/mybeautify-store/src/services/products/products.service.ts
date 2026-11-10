/**
 * Products and Reviews Service
 */

import { request } from '@/services/api/client';
import type {
  ProductResponse,
  ProductFilterParams,
  ProductRelationshipResponse,
  ProductRelationshipType,
  ReviewResponse,
  SimilarProductResponse,
} from '@/types/product.types';
import type { PageResponse } from '@/types/api.types';

export async function fetchProducts(
  params: ProductFilterParams = {}
): Promise<PageResponse<ProductResponse>> {
  const queryParts: string[] = [];
  if (params.query?.trim()) queryParts.push(`query=${encodeURIComponent(params.query.trim())}`);
  if (params.categoryId) queryParts.push(`categoryId=${params.categoryId}`);
  if (params.brandId) queryParts.push(`brandId=${params.brandId}`);
  if (params.featured !== undefined) queryParts.push(`featured=${params.featured}`);
  if (params.minPrice !== undefined) queryParts.push(`minPrice=${params.minPrice}`);
  if (params.maxPrice !== undefined) queryParts.push(`maxPrice=${params.maxPrice}`);
  if (params.page !== undefined) queryParts.push(`page=${params.page}`);
  if (params.size !== undefined) queryParts.push(`size=${params.size}`);
  if (params.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);

  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  return request<PageResponse<ProductResponse>>(`/products${qs}`);
}

export async function fetchProductById(id: number): Promise<ProductResponse> {
  return request<ProductResponse>(`/products/${id}`);
}

export async function fetchProductBySlug(slug: string): Promise<ProductResponse> {
  return request<ProductResponse>(`/products/slug/${encodeURIComponent(slug)}`);
}

export async function fetchSimilarProducts(
  productId: number,
  params: { limit?: number; page?: number } = {}
): Promise<PageResponse<SimilarProductResponse>> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.page !== undefined) query.set('page', String(params.page));
  const queryString = query.toString();
  const search = queryString ? `?${queryString}` : '';
  return request<PageResponse<SimilarProductResponse>>(`/products/${productId}/similar${search}`);
}

export async function fetchAdminProductRelationships(
  productId: number
): Promise<ProductRelationshipResponse[]> {
  return request<ProductRelationshipResponse[]>(`/admin/products/${productId}/relationships`);
}

export async function createAdminProductRelationship(
  productId: number,
  payload: {
    relatedProductId: number;
    relationshipType: ProductRelationshipType;
    displayOrder: number;
  }
): Promise<ProductRelationshipResponse> {
  return request<ProductRelationshipResponse>(`/admin/products/${productId}/relationships`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminProductRelationship(
  productId: number,
  relatedProductId: number
): Promise<void> {
  await request<unknown>(`/admin/products/${productId}/relationships/${relatedProductId}`, {
    method: 'DELETE',
  });
}

export async function fetchProductReviews(
  productId: number
): Promise<PageResponse<ReviewResponse>> {
  return request<PageResponse<ReviewResponse>>(`/products/${productId}/reviews`);
}

export async function submitProductReview(
  productId: number,
  review: { rating: number; title?: string; comment: string; orderId?: number }
): Promise<ReviewResponse> {
  return request<ReviewResponse>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review),
  });
}
