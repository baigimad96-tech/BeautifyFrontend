/**
 * MALKAZ Luxury Jewellery - Razorpay Payment Service
 * Integrates official Razorpay Checkout SDK (checkout.js) and Spring Boot backend payment endpoints.
 */

import { request } from '@/services/api/client';
import type {
  RazorpayOrderRequest,
  RazorpayOrderResponse,
  RazorpayVerifyRequest,
  RazorpayVerifyResponse,
  RazorpayQrRequest,
  RazorpayQrResponse,
  PaymentStatusResponse,
  RazorpayOptions,
  RazorpayInstance,
} from '@/types/payment.types';

export const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Safely and idempotently loads the official Razorpay Checkout SDK.
 * Prevents multiple script injections and handles network failures gracefully.
 */
export function loadRazorpayScript(): Promise<boolean> {
  // If Razorpay SDK is already loaded on window
  if (typeof window !== 'undefined' && (window as any).Razorpay) {
    return Promise.resolve(true);
  }

  // If a script load is currently in flight, return the shared promise
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    // Check if script tag is already in DOM
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => {
        scriptLoadingPromise = null;
        reject(new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      scriptLoadingPromise = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(
        new Error(
          'Failed to load the Razorpay payment gateway SDK. Please ensure you have an active internet connection and try again.'
        )
      );
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Step 1: Call backend to create internal pending order and official Razorpay order.
 * Backend calculates authoritative amounts server-side from active customer cart.
 * Endpoint: POST /api/payments/razorpay/create-order
 */
export async function createRazorpayOrder(
  payload: RazorpayOrderRequest
): Promise<RazorpayOrderResponse> {
  return request<RazorpayOrderResponse>('/payments/razorpay/create-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Step 2: Send payment identifiers returned by Razorpay to backend for cryptographic signature verification.
 * Only after backend confirms verification does the order become PAID / CONFIRMED.
 * Endpoint: POST /api/payments/razorpay/verify
 */
export async function verifyRazorpayPayment(
  payload: RazorpayVerifyRequest
): Promise<RazorpayVerifyResponse> {
  return request<RazorpayVerifyResponse>('/payments/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieve verified payment status by MALKAZ order ID.
 * Endpoint: GET /api/payments/{orderId}
 */
export async function fetchPaymentStatus(
  orderId: number
): Promise<PaymentStatusResponse> {
  return request<PaymentStatusResponse>(`/payments/${orderId}`);
}

/**
 * Dynamic UPI QR Code Generation (if customer selects UPI QR scan-to-pay)
 * Endpoint: POST /api/payments/razorpay/qr-code
 */
export async function createRazorpayQrCode(
  payload: RazorpayQrRequest
): Promise<RazorpayQrResponse> {
  return request<RazorpayQrResponse>('/payments/razorpay/qr-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Helper to construct and instantiate Razorpay Checkout instance.
 * Throws an error if SDK is not loaded.
 */
export function initializeRazorpayCheckout(options: RazorpayOptions): RazorpayInstance {
  if (typeof window === 'undefined' || !(window as any).Razorpay) {
    throw new Error('Razorpay Checkout SDK is not loaded. Call loadRazorpayScript() first.');
  }

  const RazorpayConstructor = (window as any).Razorpay;
  return new RazorpayConstructor(options);
}

