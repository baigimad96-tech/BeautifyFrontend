import { request } from '@/services/api/client';

export interface AdminReviewResponse {
  id: number;
  productId: number;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePage<T>(value: unknown, description: string): { content: T[]; totalElements?: number; totalPages?: number } {
  if (Array.isArray(value)) return { content: value as T[] };
  if (!isRecord(value)) throw new Error(`The server returned an invalid ${description} response.`);
  if (Array.isArray(value.content)) {
    return value as { content: T[]; totalElements?: number; totalPages?: number };
  }
  if (Array.isArray(value.items)) {
    return {
      content: value.items as T[],
      totalElements: typeof value.totalItems === 'number' ? value.totalItems : undefined,
      totalPages: typeof value.totalPages === 'number' ? value.totalPages : undefined,
    };
  }
  if (isRecord(value.data)) return parsePage<T>(value.data, description);
  throw new Error(`The server returned an invalid ${description} response.`);
}

export async function fetchAdminReviews(page = 0, size = 20): Promise<{ content: AdminReviewResponse[]; totalElements?: number; totalPages?: number }> {
  const result = await request<unknown>(`/admin/reviews?page=${page}&size=${size}&sort=createdAt,desc`);
  return parsePage<AdminReviewResponse>(result, 'admin reviews');
}

export async function approveReview(id: number): Promise<AdminReviewResponse> {
  return request<AdminReviewResponse>(`/admin/reviews/${id}/approve`, {
    method: 'PATCH',
  });
}

export async function rejectReview(id: number): Promise<AdminReviewResponse> {
  return request<AdminReviewResponse>(`/admin/reviews/${id}/reject`, {
    method: 'PATCH',
  });
}

