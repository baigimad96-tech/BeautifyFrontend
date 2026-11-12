/**
 * Coupons and Discounts Service
 */

import { request } from '@/services/api/client';
import type { CouponResponse } from '@/types/cart.types';

export type AdminCouponRequest = {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrderAmount?: number | null;
  maximumDiscount?: number | null;
  startDate: string;
  expiryDate: string;
  usageLimit?: number | null;
  active?: boolean;
};

export type AdminCouponResponse = {
  id: number;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrderAmount?: number | null;
  maximumDiscount?: number | null;
  startDate: string;
  expiryDate: string;
  usageLimit?: number | null;
  usedCount: number;
  active: boolean;
};

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

export async function fetchActiveCoupons(): Promise<AdminCouponResponse[]> {
  const result = await request<unknown>('/coupons');
  if (Array.isArray(result)) return result as AdminCouponResponse[];
  if (isRecord(result) && Array.isArray(result.data)) return result.data as AdminCouponResponse[];
  if (isRecord(result) && Array.isArray(result.content)) return result.content as AdminCouponResponse[];
  return [];
}

export async function applyCoupon(
  code: string,
  orderAmount: number
): Promise<CouponResponse> {
  return request<CouponResponse>('/coupons/apply', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim().toUpperCase(), orderAmount }),
  });
}

export async function fetchAdminCoupons(page = 0, size = 20): Promise<{ content: AdminCouponResponse[]; totalElements?: number; totalPages?: number }> {
  const result = await request<unknown>(`/admin/coupons?page=${page}&size=${size}`);
  return parsePage<AdminCouponResponse>(result, 'admin coupons');
}

export async function createAdminCoupon(payload: AdminCouponRequest): Promise<AdminCouponResponse> {
  return request<AdminCouponResponse>('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCoupon(id: number, payload: AdminCouponRequest): Promise<AdminCouponResponse> {
  return request<AdminCouponResponse>(`/admin/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCoupon(id: number): Promise<void> {
  await request<unknown>(`/admin/coupons/${id}`, {
    method: 'DELETE',
  });
}
