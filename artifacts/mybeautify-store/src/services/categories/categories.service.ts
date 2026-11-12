/**
 * Categories Service
 */

import { request } from '@/services/api/client';
import type { CategoryResponse } from '@/types/product.types';

export async function fetchCategories(): Promise<CategoryResponse[]> {
  return request<CategoryResponse[]>('/categories');
}

export async function fetchCategoryById(id: number): Promise<CategoryResponse> {
  return request<CategoryResponse>(`/categories/${id}`);
}

export async function createAdminCategory(payload: {
  name: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
}): Promise<CategoryResponse> {
  return request<CategoryResponse>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCategory(
  id: number,
  payload: {
    name: string;
    description?: string;
    imageUrl?: string;
    active?: boolean;
  }
): Promise<CategoryResponse> {
  return request<CategoryResponse>(`/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCategory(id: number): Promise<void> {
  await request<unknown>(`/admin/categories/${id}`, {
    method: 'DELETE',
  });
}

