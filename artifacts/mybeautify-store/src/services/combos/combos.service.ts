import { request } from '@/services/api/client';
import type {
  Combo,
  ComboDiscountRule,
  ComboDiscountRulePayload,
  ComboPage,
  ComboWritePayload,
  CustomComboPreview,
  CustomComboRequestItem,
} from '@/types/combo.types';
import type { ProductResponse } from '@/types/product.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePage<T>(value: unknown, description: string): ComboPage<T> {
  if (Array.isArray(value)) return { content: value as T[] };
  if (!isRecord(value)) throw new Error(`The server returned an invalid ${description} response.`);
  if (Array.isArray(value.content)) return value as unknown as ComboPage<T>;
  if (Array.isArray(value.items)) return { ...value, content: value.items as T[] } as ComboPage<T>;
  if (isRecord(value.data)) return parsePage<T>(value.data, description);
  throw new Error(`The server returned an invalid ${description} response.`);
}

export async function fetchCombos(page = 0, size = 12): Promise<ComboPage<Combo>> {
  const result = await request<unknown>(`/combos?page=${page}&size=${size}`);
  return parsePage<Combo>(result, 'combo list');
}

export async function fetchFeaturedCombos(): Promise<Combo[]> {
  const result = await request<unknown>('/combos/featured');
  return parsePage<Combo>(result, 'featured combos').content;
}

export async function fetchComboBySlug(slug: string): Promise<Combo> {
  const result = await request<unknown>(`/combos/${encodeURIComponent(slug)}`);
  if (!isRecord(result)) throw new Error('The server returned an invalid combo response.');
  return result as unknown as Combo;
}

export async function fetchComboProducts(page = 0, size = 100): Promise<ComboPage<ProductResponse>> {
  const result = await request<unknown>(`/combos/products?page=${page}&size=${size}`);
  return parsePage<ProductResponse>(result, 'eligible product list');
}

export async function previewCustomCombo(items: CustomComboRequestItem[]): Promise<CustomComboPreview> {
  const result = await request<unknown>('/combos/custom/preview', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  if (!isRecord(result)) throw new Error('The server returned an invalid combo preview.');
  return result as unknown as CustomComboPreview;
}

export async function addPredefinedComboToCart(comboId: number, quantity = 1): Promise<void> {
  await request<unknown>(`/combos/${comboId}/cart`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
}

export async function addCustomComboToCart(items: CustomComboRequestItem[]): Promise<void> {
  await request<unknown>('/combos/custom/cart', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function removeComboGroupFromCart(comboGroupId: string): Promise<void> {
  await request<unknown>(`/cart/combos/${encodeURIComponent(comboGroupId)}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminCombos(query = ''): Promise<Combo[]> {
  const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
  const result = await request<unknown>(`/admin/combos${suffix}`);
  return parsePage<Combo>(result, 'admin combo list').content;
}

export async function createAdminCombo(payload: ComboWritePayload): Promise<Combo> {
  return request<Combo>('/admin/combos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCombo(id: number, payload: ComboWritePayload): Promise<Combo> {
  return request<Combo>(`/admin/combos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminComboStatus(id: number, active: boolean): Promise<void> {
  await request<unknown>(`/admin/combos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export async function deleteAdminCombo(id: number): Promise<void> {
  await request<unknown>(`/admin/combos/${id}`, { method: 'DELETE' });
}

export async function fetchAdminComboRules(): Promise<ComboDiscountRule[]> {
  const result = await request<unknown>('/admin/combos/rules');
  return parsePage<ComboDiscountRule>(result, 'combo discount rule list').content;
}

export async function createAdminComboRule(payload: ComboDiscountRulePayload): Promise<ComboDiscountRule> {
  return request<ComboDiscountRule>('/admin/combos/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminComboRule(id: number, payload: ComboDiscountRulePayload): Promise<ComboDiscountRule> {
  return request<ComboDiscountRule>(`/admin/combos/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminComboRule(id: number): Promise<void> {
  await request<unknown>(`/admin/combos/rules/${id}`, { method: 'DELETE' });
}
