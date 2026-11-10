export interface ComboItem {
  id?: number;
  productId: number;
  productName?: string;
  imageUrl?: string | null;
  quantity: number;
  basePrice?: number;
  effectivePrice?: number;
  subtotal?: number;
  customPrice?: number | null;
  availableStock?: number;
  inStock?: boolean;
}

export interface Combo {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  originalPrice: number;
  sellingPrice: number;
  discountAmount?: number;
  savingsAmount?: number;
  savingsPercentage?: number;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
  featured: boolean;
  inStock?: boolean;
  items: ComboItem[];
}

export interface ComboDiscountRule {
  id: number;
  name: string;
  description?: string;
  minProducts: number;
  discountType: 'PERCENTAGE' | 'FIXED' | string;
  discountValue: number;
  minSubtotal?: number | null;
  maxDiscountAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
}

export interface CustomComboRequestItem {
  productId: number;
  quantity: number;
}

export interface CustomComboPreviewItem {
  productId: number;
  productName: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountedUnitPrice: number;
  allocatedDiscount: number;
  inStock: boolean;
  availableStock: number;
}

export interface CustomComboPreview {
  items: CustomComboPreviewItem[];
  totalItemCount: number;
  distinctProductCount: number;
  originalSubtotal: number;
  discountAmount: number;
  finalTotal: number;
  discountPercentage: number;
  appliedRuleName?: string | null;
  eligible: boolean;
  eligibleMessage?: string | null;
}

export interface ComboPage<T> {
  content: T[];
  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface ComboWritePayload {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  originalPrice: number;
  sellingPrice: number;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
  featured: boolean;
  items: Array<{ productId: number; quantity: number; customPrice?: number | null }>;
}

export type ComboDiscountRulePayload = Omit<ComboDiscountRule, 'id'>;
