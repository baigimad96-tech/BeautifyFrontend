/**
 * Admin Panel Types
 */

export type AdminProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  discountPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  categoryId: number;
  description: string;
  shortDescription?: string;
  imageUrl?: string;
  active: boolean;
  featured: boolean;
  ingredients?: string[];
  benefits?: string[];
  howToUse?: string;
  skinType?: string;
  shade?: string;
  size?: string;
  expiryDate?: string;
};

export type AdminCategory = {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  active: boolean;
};

export type AdminUser = {
  id?: number;
  role?: unknown;
  roles?: unknown;
  authorities?: unknown;
  user?: AdminUser;
};

export type PageResult<T> = { items: T[]; totalPages?: number };
export type InputValue = string | boolean;
export type FormValues = Record<string, InputValue>;
export type FieldSpec = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'checkbox';
  required?: boolean;
};
