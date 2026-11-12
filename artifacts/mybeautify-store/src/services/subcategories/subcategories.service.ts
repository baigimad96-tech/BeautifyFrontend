import { request } from '@/services/api/client';
import type {
  SubcategoryRequest,
  SubcategoryResponse,
  SubcategoryPageResponse,
} from '@/types/subcategory.types';

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
    return { content: value.items as T[], totalElements: typeof value.totalItems === 'number' ? value.totalItems : undefined, totalPages: typeof value.totalPages === 'number' ? value.totalPages : undefined };
  }
  if (isRecord(value.data)) return parsePage<T>(value.data, description);
  throw new Error(`The server returned an invalid ${description} response.`);
}

export async function fetchSubcategories(categoryId?: number): Promise<SubcategoryResponse[]> {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  const result = await request<unknown>(`/subcategories${query}`);
  if (Array.isArray(result)) return result as SubcategoryResponse[];
  if (isRecord(result) && Array.isArray(result.data)) return result.data as SubcategoryResponse[];
  return parsePage<SubcategoryResponse>(result, 'subcategories').content;
}

export async function fetchAdminSubcategories(params?: {
  query?: string;
  categoryId?: number;
  active?: boolean;
  page?: number;
  size?: number;
}): Promise<{ content: SubcategoryResponse[]; totalElements?: number; totalPages?: number }> {
  const searchParams = new URLSearchParams();
  if (params?.query) searchParams.set('query', params.query);
  if (params?.categoryId) searchParams.set('categoryId', String(params.categoryId));
  if (params?.active !== undefined) searchParams.set('active', String(params.active));
  if (params?.page !== undefined) searchParams.set('page', String(params.page));
  if (params?.size !== undefined) searchParams.set('size', String(params.size));

  const queryStr = searchParams.toString();
  const url = `/admin/subcategories${queryStr ? `?${queryStr}` : ''}`;
  const result = await request<unknown>(url);
  return parsePage<SubcategoryResponse>(result, 'admin subcategories');
}

export async function createAdminSubcategory(payload: SubcategoryRequest): Promise<SubcategoryResponse> {
  return request<SubcategoryResponse>('/admin/subcategories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminSubcategory(id: number, payload: SubcategoryRequest): Promise<SubcategoryResponse> {
  return request<SubcategoryResponse>(`/admin/subcategories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminSubcategoryStatus(id: number, active: boolean): Promise<SubcategoryResponse> {
  return request<SubcategoryResponse>(`/admin/subcategories/${id}/status?active=${active}`, {
    method: 'PATCH',
  });
}

export async function deleteAdminSubcategory(id: number): Promise<void> {
  await request<unknown>(`/admin/subcategories/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchSubcategoryById(id: number): Promise<SubcategoryResponse> {
  return request<SubcategoryResponse>(`/subcategories/${id}`);
}

export async function fetchProductsBySubcategory(subcategoryId: number): Promise<any[]> {
  const result = await request<unknown>(`/products?subcategoryId=${subcategoryId}&size=50`);
  if (Array.isArray(result)) return result;
  if (isRecord(result) && Array.isArray(result.content)) return result.content;
  if (isRecord(result) && Array.isArray(result.data)) return result.data;
  return [];
}





