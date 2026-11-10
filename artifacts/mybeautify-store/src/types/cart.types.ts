/**
 * Cart, Order, Address, and Coupon Types
 */

export interface CartItemResponse {
  id: number;
  productId: number;
  productName: string;
  imageUrl?: string;
  quantity: number;
  price: number;
  subtotal: number;
  availableStock: number;
  comboId?: number | null;
  comboGroupId?: string | null;
  comboType?: 'PREDEFINED' | 'CUSTOM' | string | null;
  comboName?: string | null;
  originalPrice?: number | null;
  discountAmount?: number | null;
}

export interface CartResponse {
  id: number;
  items: CartItemResponse[];
  subtotal: number;
}

export interface AddressResponse {
  id: number;
  street?: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode?: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
  fullName?: string;
  phoneNumber?: string;
  addressType?: 'HOME' | 'WORK' | 'OTHER' | string;
}

export interface CreateOrderPayload {
  shippingAddressId: number;
  paymentMethod: 'COD' | 'MOCK' | string;
  couponCode?: string;
}


export interface OrderItemResponse {
  id: number;
  productId: number;
  productName: string;
  imageUrl?: string;
  quantity: number;
  price: number;
  subtotal: number;
  comboId?: number | null;
  comboGroupId?: string | null;
  comboType?: 'PREDEFINED' | 'CUSTOM' | string | null;
  comboName?: string | null;
  originalPrice?: number | null;
  discountAmount?: number | null;
}

export interface OrderResponse {
  id: number;
  orderNumber?: string;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  shippingAmount?: number;
  shippingCharge?: number;
  discountAmount?: number;
  status?: string;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items: OrderItemResponse[];
  shippingAddress?: AddressResponse | string;
  createdAt: string;
  updatedAt?: string;
}

export interface CouponResponse {
  id: number;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED' | string;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  active: boolean;
}
