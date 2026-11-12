import { request } from '@/services/api/client';
import type { OrderResponse } from '@/types/cart.types';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

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

export async function fetchAdminOrders(page = 0, size = 20): Promise<{ content: OrderResponse[]; totalElements?: number; totalPages?: number }> {
  const result = await request<unknown>(`/admin/orders?page=${page}&size=${size}&sort=createdAt,desc`);
  return parsePage<OrderResponse>(result, 'admin orders');
}

export async function updateAdminOrderStatus(orderId: number, status: OrderStatus): Promise<OrderResponse> {
  return request<OrderResponse>(`/admin/orders/${orderId}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
  });
}

