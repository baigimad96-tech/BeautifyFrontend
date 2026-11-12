/**
 * MALKAZ Luxury Jewellery - Razorpay & Payment Gateway Types
 * Strictly aligned with Java Spring Boot backend DTOs (PaymentDtos.java & PaymentMethod.java)
 */

export type OnlinePaymentMethod = 'UPI' | 'NET_BANKING';
export type SupportedPaymentMethod = 'COD' | 'CASH_ON_DELIVERY' | 'UPI' | 'NET_BANKING' | 'UPI_QR';

/**
 * Request payload for POST /api/payments/razorpay/create-order
 * Aligns with backend record RazorpayOrderRequest(@NotNull Long shippingAddressId, @NotNull PaymentMethod paymentMethod, String couponCode)
 */
export interface RazorpayOrderRequest {
  shippingAddressId: number;
  paymentMethod: OnlinePaymentMethod | 'UPI_QR';
  couponCode?: string;
}

/**
 * Response payload from POST /api/payments/razorpay/create-order
 * Aligns with backend record RazorpayOrderResponse
 */
export interface RazorpayOrderResponse {
  orderId: number;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  razorpayKeyId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  themeColor: string;
  paymentMethod: string;
}

/**
 * Request payload for POST /api/payments/razorpay/verify
 * Aligns with backend record RazorpayVerifyRequest(@NotNull Long orderId, @NotBlank String razorpayOrderId, @NotBlank String razorpayPaymentId, @NotBlank String razorpaySignature)
 */
export interface RazorpayVerifyRequest {
  orderId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Response payload from POST /api/payments/razorpay/verify
 * Aligns with backend record RazorpayVerifyResponse
 */
export interface RazorpayVerifyResponse {
  orderId: number;
  orderNumber: string;
  paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | string;
  transactionId: string;
  razorpayPaymentId: string;
  amount: number;
  message: string;
}

/**
 * Request payload for POST /api/payments/razorpay/qr-code
 */
export interface RazorpayQrRequest {
  shippingAddressId: number;
  couponCode?: string;
}

/**
 * Response payload from POST /api/payments/razorpay/qr-code
 */
export interface RazorpayQrResponse {
  orderId: number;
  orderNumber: string;
  razorpayOrderId: string;
  qrCodeId: string;
  qrImageUrl: string;
  paymentUrl: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  status: string;
}

/**
 * Response payload from GET /api/payments/{orderId}
 */
export interface PaymentStatusResponse {
  orderId: number;
  orderNumber: string;
  paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | 'AUTHORIZED' | 'REFUNDED' | string;
  paymentMethod: string;
  amount: number;
  transactionId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  failureReason?: string;
}

/**
 * Razorpay SDK Success Callback Payload
 */
export interface RazorpayPaymentSuccessPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Razorpay SDK Failure Callback Payload
 */
export interface RazorpayPaymentFailurePayload {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

/**
 * Razorpay Checkout SDK Options
 */
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayPaymentSuccessPayload) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
  config?: {
    display?: {
      blocks?: Record<string, { name: string; instruments: Array<{ method: string }> }>;
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
}

/**
 * Extended Window interface with Razorpay constructor
 */
export interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (data: any) => void) => void;
  close: () => void;
}

/**
 * Ephemeral & Session-Stored Payment Verification Recovery State
 */
export interface PendingVerificationState {
  userId?: number;
  orderId: number;
  orderNumber: string;
  amount: number;
  paymentMethod: 'UPI' | 'NET_BANKING';
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  attemptedAt: string;
}


