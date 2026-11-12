import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import {
  MapPin,
  Truck,
  Smartphone,
  Building2,
  Banknote,
  Search,
  Heart,
  ShoppingCart,
  Trash2,
  Tag,
  ShieldCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  User as UserIcon,
  Zap,
  Edit3,
  X,
  Loader2,
  ArrowRight,
  Headphones,
  Lock,
  PackageCheck,
  Plus,
  Gift,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchCurrentUser,
  fetchCart,
  removeCartItem,
  fetchAddresses,
  addAddress,
  updateAddress,
  createOrder,
  applyCoupon,
  getAuthToken,
  setAuthToken,
  type UserResponse,
  type CartResponse,
  type AddressResponse,
  type OrderResponse,
  type CouponResponse,
} from '@/lib/api';
import {
  loadRazorpayScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
  fetchPaymentStatus,
  initializeRazorpayCheckout,
} from '@/services/payments/payments.service';
import { fetchOrderById } from '@/services/orders/orders.service';
import type {
  RazorpayOptions,
  RazorpayPaymentSuccessPayload,
} from '@/types/payment.types';
import { CustomerProfilePill, HeaderCartButton } from '@/components/common';
import { getJewelleryImage, resolveImageUrl, handleImageError } from '@/lib/jewellery-images';
import { animateTrashCan } from '@/lib/cart-animations';
import { removeComboGroupFromCart } from '@/services/combos/combos.service';
import { INDIAN_STATES_AND_UTS, getCitiesForState, findMatchingState } from '@/constants/indian-states-cities';
import { extractArray } from '@/utils/array';
import '@/styles/checkout.css';

const getProductImage = (productId: number, imageUrl?: string, productName?: string) =>
  getJewelleryImage(imageUrl, productName, productId);

// Currency formatter
const formatCurrency = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return `₹ ${num.toFixed(2)}`;
};

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

export default function CheckoutPage() {
  const [, setLocation] = useLocation();

  // 1. Auth & User state
  const [user, setUser] = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // 2. Cart State from backend
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

  // 3. Addresses State from backend
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressResponse | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);

  // 4. Shipping Method: standard (FREE) vs express (₹99.00)
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');

  // 5. Payment Method: UPI vs NET_BANKING vs COD (Cards strictly disallowed)
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NET_BANKING' | 'COD'>('UPI');

  // 6. Coupon code & Discount
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // 7. Modals
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Address form fields
  const [formFullName, setFormFullName] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formAddressLine1, setFormAddressLine1] = useState('');
  const [formAddressLine2, setFormAddressLine2] = useState('');
  const [formCity, setFormCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formAddressType, setFormAddressType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [formIsDefault, setFormIsDefault] = useState(true);

  // 8. Order Placement & Confirmation & Recovery
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState<PendingVerificationState | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('malkaz_pending_verification');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.orderId && parsed.razorpayPaymentId) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderResponse | null>(null);

  // Keep sessionStorage in sync with pending verification state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (pendingVerification) {
        sessionStorage.setItem('malkaz_pending_verification', JSON.stringify(pendingVerification));
      } else {
        sessionStorage.removeItem('malkaz_pending_verification');
      }
    } catch (e) {
      console.warn('Failed to update sessionStorage for pending verification:', e);
    }
  }, [pendingVerification]);

  // Sanitize pending verification if customer account switches or doesn't match
  useEffect(() => {
    if (user && pendingVerification && pendingVerification.userId && pendingVerification.userId !== user.id) {
      setPendingVerification(null);
      try {
        sessionStorage.removeItem('malkaz_pending_verification');
      } catch {}
    }
  }, [user, pendingVerification]);

  // 9. Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Check authentication & load user
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLocation('/sign-in');
      return;
    }
    setAuthLoading(true);
    fetchCurrentUser()
      .then((userData) => {
        setUser(userData);
      })
      .catch((err) => {
        console.error('Failed to load user:', err);
        if (!getAuthToken()) {
          setLocation('/sign-in');
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [setLocation]);

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setLocation('/sign-in');
  }, [setLocation]);

  // Load real backend Cart
  const loadCartData = useCallback(async () => {
    if (!getAuthToken()) return;
    setCartLoading(true);
    try {
      const cartData = await fetchCart();
      setCart(cartData);
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCartData();
  }, [loadCartData]);

  // Load real backend Addresses
  const loadAddresses = useCallback(async () => {
    if (!getAuthToken()) return;
    setAddressLoading(true);
    try {
      const list = await fetchAddresses();
      setAddresses(list);
      // Select default or first address if none selected yet
      if (list.length > 0) {
        setSelectedAddress((prev) => {
          if (prev && list.some((a) => a.id === prev.id)) return prev;
          const def = list.find((a) => a.isDefault);
          return def || list[0];
        });
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Remove item from cart
  const handleRemoveItem = async (itemId: number, removeButton: HTMLElement) => {
    setRemovingItemId(itemId);
    let restoreTrashIcon = () => {};
    try {
      restoreTrashIcon = await animateTrashCan(removeButton);
      const item = cart?.items.find((cartItem) => cartItem.id === itemId);
      if (item?.comboGroupId) await removeComboGroupFromCart(item.comboGroupId);
      else await removeCartItem(itemId);
      await loadCartData();
      showToast(item?.comboGroupId ? 'Combo removed from cart.' : 'Item removed from cart.');
    } catch (err) {
      restoreTrashIcon();
      console.error('Failed to remove item:', err);
      showToast('Could not remove item.');
    } finally {
      setRemovingItemId(null);
    }
  };

  // Remove entire combo package
  const handleRemoveComboGroup = async (comboGroupId: string, removeButton: HTMLElement) => {
    if (removingItemId !== null) return;
    setRemovingItemId(-1);
    let restoreTrashIcon = () => {};
    try {
      restoreTrashIcon = await animateTrashCan(removeButton);
      await removeComboGroupFromCart(comboGroupId);
      await loadCartData();
      showToast('Combo package removed from cart.');
    } catch (err) {
      restoreTrashIcon();
      console.error('Failed to remove combo:', err);
      showToast('Could not remove combo package.');
    } finally {
      setRemovingItemId(null);
    }
  };

  // Grouped cart entries for visual packaging
  const groupedCartEntries = useMemo(() => {
    if (!cart?.items) return [];
    type GroupEntry =
      | { type: 'regular'; item: (typeof cart.items)[number] }
      | {
          type: 'combo';
          comboGroupId: string;
          comboName: string;
          comboType?: string | null;
          items: typeof cart.items;
          totalPrice: number;
        };

    const result: GroupEntry[] = [];
    const comboMap = new Map<string, {
      type: 'combo';
      comboGroupId: string;
      comboName: string;
      comboType?: string | null;
      items: typeof cart.items;
      totalPrice: number;
    }>();

    for (const item of cart.items) {
      if (item.comboGroupId) {
        let entry = comboMap.get(item.comboGroupId);
        if (!entry) {
          entry = {
            type: 'combo',
            comboGroupId: item.comboGroupId,
            comboName: item.comboName || 'Curated Combo Set',
            comboType: item.comboType,
            items: [],
            totalPrice: 0,
          };
          comboMap.set(item.comboGroupId, entry);
          result.push(entry);
        }
        entry.items.push(item);
        entry.totalPrice += (item.price || 0) * (item.quantity || 1);
      } else {
        result.push({ type: 'regular', item });
      }
    }
    return result;
  }, [cart?.items]);

  // Apply Coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const orderAmount = cart?.subtotal || 0;
      const res = await applyCoupon(couponInput.trim().toUpperCase(), orderAmount);
      setAppliedCoupon(res);
      showToast(`Coupon ${res.code} applied successfully!`);
    } catch (err) {
      console.error('Coupon apply failed:', err);
      const msg = err instanceof Error ? err.message : 'Invalid coupon code.';
      setCouponError(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  // Remove Coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    showToast('Coupon removed.');
  };

  // Open Edit/Add Address Modal
  const handleOpenAddressModal = () => {
    setAddressError(null);
    setIsAddingNewAddress(false);
    setEditingAddressId(null);
    setShowAddressModal(true);
  };

  const citiesForCheckout = useMemo(() => getCitiesForState(formState), [formState]);

  const hasUnavailableCheckoutItems = useMemo(() => {
    if (!cart?.items) return false;
    return cart.items.some(
      (item) => (item.availableStock !== undefined && item.availableStock <= 0) || (item.availableStock !== undefined && item.availableStock > 0 && item.quantity > item.availableStock)
    );
  }, [cart?.items]);

  const handleRemoveAllUnavailableItems = async () => {
    if (!cart?.items) return;
    const unavailableItems = cart.items.filter(
      (item) => (item.availableStock !== undefined && item.availableStock <= 0) || (item.availableStock !== undefined && item.availableStock > 0 && item.quantity > item.availableStock)
    );
    for (const item of unavailableItems) {
      try {
        if (item.comboGroupId) {
          await removeComboGroupFromCart(item.comboGroupId);
        } else {
          await removeCartItem(item.id);
        }
      } catch (err) {
        console.error('Failed to remove item', err);
      }
    }
    await loadCartData();
    showToast('Unavailable items removed from cart.');
  };

  const handleStartAddNewAddress = () => {
    setIsAddingNewAddress(true);
    setEditingAddressId(null);
    setAddressError(null);
    setFormFullName(user?.fullName || '');
    setFormPhoneNumber(user?.phoneNumber || '');
    setFormAddressLine1('');
    setFormAddressLine2('');
    setFormState('');
    setFormCity('');
    setCustomCity('');
    setFormPostalCode('');
    setFormAddressType('HOME');
    setFormIsDefault(true);
  };

  const handleStartEditAddress = (addr: AddressResponse) => {
    setIsAddingNewAddress(true);
    setEditingAddressId(addr.id);
    setAddressError(null);
    setFormFullName(addr.fullName || '');
    setFormPhoneNumber(addr.phoneNumber || '');
    setFormAddressLine1(addr.addressLine1 || addr.street || '');
    setFormAddressLine2(addr.addressLine2 || '');
    const matchedState = findMatchingState(addr.state);
    setFormState(matchedState);
    const availableCities = getCitiesForState(matchedState);
    if (addr.city && availableCities.includes(addr.city) && addr.city !== 'Other') {
      setFormCity(addr.city);
      setCustomCity('');
    } else if (addr.city) {
      setFormCity('Other');
      setCustomCity(addr.city);
    } else {
      setFormCity('');
      setCustomCity('');
    }
    setFormPostalCode(addr.postalCode || addr.zipCode || '');
    setFormAddressType((addr.addressType as 'HOME' | 'WORK' | 'OTHER') || 'HOME');
    setFormIsDefault(Boolean(addr.isDefault));
  };

  // Save Address (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCity = formCity === 'Other' ? customCity.trim() : formCity.trim();
    if (!formFullName.trim() || !formPhoneNumber.trim() || !formAddressLine1.trim() || !formState.trim() || !effectiveCity || !formPostalCode.trim()) {
      setAddressError('Please fill in all required address fields including state and city.');
      return;
    }

    if (formPostalCode.trim().length !== 6 || !/^\d{6}$/.test(formPostalCode.trim())) {
      setAddressError('Please enter a valid 6-digit Indian PIN Code.');
      return;
    }

    setAddressSaving(true);
    setAddressError(null);
    try {
      const payload = {
        fullName: formFullName.trim(),
        phoneNumber: formPhoneNumber.trim(),
        addressLine1: formAddressLine1.trim(),
        addressLine2: formAddressLine2.trim(),
        city: effectiveCity,
        state: formState.trim(),
        postalCode: formPostalCode.trim(),
        country: 'India',
        addressType: formAddressType,
        isDefault: formIsDefault,
      };

      let saved: AddressResponse;
      if (editingAddressId) {
        saved = await updateAddress(editingAddressId, payload);
        showToast('Address updated successfully.');
      } else {
        saved = await addAddress(payload);
        showToast('New address saved.');
      }

      await loadAddresses();
      setSelectedAddress(saved);
      setIsAddingNewAddress(false);
      setEditingAddressId(null);
      setShowAddressModal(false);
    } catch (err) {
      console.error('Failed to save address:', err);
      const msg = err instanceof Error ? err.message : 'Could not save address.';
      setAddressError(msg);
    } finally {
      setAddressSaving(false);
    }
  };

  // Totals calculations aligned with backend OrderService
  const subtotal = useMemo(() => cart?.subtotal || 0, [cart]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      const raw = (subtotal * appliedCoupon.discountValue) / 100;
      return appliedCoupon.maximumDiscount ? Math.min(raw, appliedCoupon.maximumDiscount) : raw;
    }
    return Math.min(appliedCoupon.discountValue, subtotal);
  }, [appliedCoupon, subtotal]);

  const shippingFee = useMemo(() => {
    const baseShipping = Number(import.meta.env.VITE_CHECKOUT_SHIPPING ?? 8.99);
    return shippingMethod === 'express' ? baseShipping + 90 : baseShipping;
  }, [shippingMethod]);

  const taxRate = useMemo(() => {
    return Number(import.meta.env.VITE_CHECKOUT_TAX_RATE ?? 0.08);
  }, []);

  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const taxAmount = useMemo(() => {
    return Math.round(taxableAmount * taxRate * 100) / 100;
  }, [taxableAmount, taxRate]);

  const finalTotal = useMemo(() => {
    return Math.round((taxableAmount + shippingFee + taxAmount) * 100) / 100;
  }, [taxableAmount, shippingFee, taxAmount]);

  // Order Submission Handler
  const handleProceedOrder = async () => {
    if (!selectedAddress) {
      showToast('Please select or add a shipping address first.');
      handleOpenAddressModal();
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      showToast('Your cart is empty. Add products to proceed.');
      return;
    }

    if (hasUnavailableCheckoutItems) {
      showToast('Please remove out of stock items from your cart to proceed.');
      return;
    }

    if (submittingOrder) {
      return; // Prevent duplicate payment trigger
    }

    // 1. Cash on Delivery (COD)
    if (paymentMethod === 'COD') {
      await executeCodOrderPlacement();
      return;
    }

    // 2. Online Razorpay Checkout (UPI or Net Banking)
    await executeRazorpayOnlinePayment(paymentMethod);
  };

  const executeCodOrderPlacement = async () => {
    if (!selectedAddress) return;
    setSubmittingOrder(true);
    setPaymentVerifying(false);
    setOrderError(null);

    try {
      const response = await createOrder({
        shippingAddressId: selectedAddress.id,
        paymentMethod: 'COD',
        couponCode: appliedCoupon?.code,
      });

      setConfirmedOrder(response);
      await loadCartData();
      showToast('Order placed successfully!');
    } catch (err) {
      console.error('COD order creation failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not place order. Please try again.';
      setOrderError(msg);
      showToast(msg);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Step D: Cryptographic Verification Handler & Recovery Method
  const executeVerification = async (data: PendingVerificationState) => {
    if (paymentVerifying) return; // Prevent concurrent calls
    setPaymentVerifying(true);
    setOrderError(null);
    setVerificationFeedback('Verifying payment signature with MALKAZ server…');

    try {
      const verifyResp = await verifyRazorpayPayment({
        orderId: data.orderId,
        razorpayOrderId: data.razorpayOrderId,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
      });

      if (verifyResp.paymentStatus === 'SUCCESS' || (verifyResp.message && verifyResp.message.toLowerCase().includes('verified'))) {
        setPendingVerification(null);
        setVerificationFeedback(null);
        try {
          sessionStorage.removeItem('malkaz_pending_verification');
        } catch {}

        let finalizedOrder: OrderResponse | null = null;
        try {
          finalizedOrder = await fetchOrderById(data.orderId);
        } catch {
          finalizedOrder = {
            id: data.orderId,
            orderNumber: data.orderNumber,
            totalAmount: data.amount,
            paymentStatus: 'SUCCESS',
            orderStatus: 'CONFIRMED',
            paymentMethod: data.paymentMethod,
            items: [],
            createdAt: new Date().toISOString(),
          };
        }

        setConfirmedOrder(finalizedOrder);
        await loadCartData();
        showToast('Payment verified and order confirmed successfully!');
      } else {
        const msg = verifyResp.message || 'Payment verification could not be confirmed.';
        setVerificationFeedback(msg);
        setOrderError(msg);
        showToast(msg);
      }
    } catch (verifyErr) {
      console.error('Payment verification failed:', verifyErr);
      const msg = verifyErr instanceof Error ? verifyErr.message : 'Server connection interrupted.';
      const detailedMsg = `Payment authorization received at Razorpay (Payment ID: ${data.razorpayPaymentId}), but server verification was interrupted: ${msg}. You can click "Retry Verification" or "Check Payment Status" below.`;
      setVerificationFeedback(detailedMsg);
      setOrderError(detailedMsg);
      showToast('Verification interrupted. You can retry verification or check status.');
    } finally {
      setSubmittingOrder(false);
      setPaymentVerifying(false);
    }
  };

  // Step E: Check Payment Status via GET /api/payments/{orderId}
  const handleCheckPaymentStatus = async (orderId: number) => {
    if (checkingStatus) return; // Prevent concurrent status checks
    setCheckingStatus(true);
    setVerificationFeedback('Checking latest payment and order status with server…');

    try {
      const statusResp = await fetchPaymentStatus(orderId);

      if (statusResp.paymentStatus === 'SUCCESS') {
        setPendingVerification(null);
        setVerificationFeedback(null);
        setOrderError(null);
        try {
          sessionStorage.removeItem('malkaz_pending_verification');
        } catch {}

        let finalizedOrder: OrderResponse | null = null;
        try {
          finalizedOrder = await fetchOrderById(orderId);
        } catch {
          finalizedOrder = {
            id: orderId,
            orderNumber: statusResp.orderNumber || `ORD-${orderId}`,
            totalAmount: statusResp.amount || 0,
            paymentStatus: 'SUCCESS',
            orderStatus: 'CONFIRMED',
            paymentMethod: (statusResp.paymentMethod as any) || 'UPI',
            items: [],
            createdAt: new Date().toISOString(),
          };
        }

        setConfirmedOrder(finalizedOrder);
        await loadCartData();
        showToast('Payment verified via server status reconciliation!');
      } else if (statusResp.paymentStatus === 'PENDING' || statusResp.paymentStatus === 'AUTHORIZED') {
        const msg = `Payment is currently ${statusResp.paymentStatus} on the server. If your account was debited, our background webhook will reconcile it shortly.`;
        setVerificationFeedback(msg);
        showToast(msg);
      } else if (statusResp.paymentStatus === 'FAILED') {
        setPendingVerification(null);
        try {
          sessionStorage.removeItem('malkaz_pending_verification');
        } catch {}
        const reason = statusResp.failureReason || 'Payment authorization was declined or failed.';
        const msg = `Payment failed: ${reason}. You may select a payment method and try placing your order again.`;
        setVerificationFeedback(null);
        setOrderError(msg);
        showToast(msg);
      } else {
        const msg = `Current payment status: ${statusResp.paymentStatus}.`;
        setVerificationFeedback(msg);
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
      const msg = err instanceof Error ? err.message : 'Unable to check status at this moment.';
      setVerificationFeedback(`Failed to check payment status: ${msg}. Please try again.`);
      showToast('Could not fetch payment status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const executeRazorpayOnlinePayment = async (selectedMethod: 'UPI' | 'NET_BANKING') => {
    if (!selectedAddress) return;
    setSubmittingOrder(true);
    setPaymentVerifying(false);
    setOrderError(null);

    try {
      // Step A: Load official Razorpay Checkout SDK
      await loadRazorpayScript();

      // Step B: Create internal pending order & Razorpay order on backend
      const orderResp = await createRazorpayOrder({
        shippingAddressId: selectedAddress.id,
        paymentMethod: selectedMethod,
        couponCode: appliedCoupon?.code,
      });

      // Step C: Configure Razorpay Checkout modal with Strict Instrument Isolation
      const options: RazorpayOptions = {
        key: orderResp.razorpayKeyId,
        amount: orderResp.amountInPaise,
        currency: orderResp.currency || 'INR',
        name: orderResp.companyName || 'MALKAZ Luxury Jewellery',
        description: `Order #${orderResp.orderNumber}`,
        order_id: orderResp.razorpayOrderId,
        prefill: {
          name: orderResp.customerName || selectedAddress.fullName || '',
          email: orderResp.customerEmail || user?.email || '',
          contact: orderResp.customerPhone || selectedAddress.phoneNumber || '',
        },
        theme: {
          color: orderResp.themeColor || '#0A3B2C',
        },
        modal: {
          ondismiss: () => {
            setSubmittingOrder(false);
            setPaymentVerifying(false);
            setOrderError('Payment was not completed. Your jewellery checkout details are preserved and can be safely completed whenever you are ready.');
            showToast('Payment window closed.');
          },
          escape: true,
          backdropclose: false,
        },
        config: {
          display: {
            // Strict Instrument Isolation: Expose ONLY the selected payment method.
            // When UPI is selected: show ONLY UPI block.
            // When Net Banking is selected: show ONLY Net Banking block.
            // Cards are completely excluded.
            blocks:
              selectedMethod === 'UPI'
                ? {
                    upi: {
                      name: 'Pay via UPI',
                      instruments: [{ method: 'upi' }],
                    },
                  }
                : {
                    netbanking: {
                      name: 'Net Banking',
                      instruments: [{ method: 'netbanking' }],
                    },
                  },
            sequence: selectedMethod === 'UPI' ? ['block.upi'] : ['block.netbanking'],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
        handler: async (paymentResponse: RazorpayPaymentSuccessPayload) => {
          // Immediately preserve payment authorization in state and sessionStorage
          const verificationData: PendingVerificationState = {
            userId: user?.id,
            orderId: orderResp.orderId,
            orderNumber: orderResp.orderNumber,
            amount: orderResp.amount,
            paymentMethod: selectedMethod,
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpaySignature: paymentResponse.razorpay_signature,
            attemptedAt: new Date().toISOString(),
          };
          setPendingVerification(verificationData);

          // Execute backend cryptographic verification
          await executeVerification(verificationData);
        },
      };

      const razorpayInstance = initializeRazorpayCheckout(options);

      razorpayInstance.on('payment.failed', (failureResponse: any) => {
        console.warn('Razorpay payment failed:', failureResponse);
        const reason = failureResponse?.error?.description || failureResponse?.error?.reason || 'Payment failed at gateway.';
        setOrderError(`Payment failed: ${reason}. Please try again or select another payment method.`);
        showToast(`Payment failed: ${reason}`);
        setSubmittingOrder(false);
        setPaymentVerifying(false);
      });

      razorpayInstance.open();
    } catch (err) {
      console.error('Online checkout initiation failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to initiate payment.';
      setOrderError(msg);
      showToast(msg);
      setSubmittingOrder(false);
      setPaymentVerifying(false);
    }
  };

  // User initials for badge
  const userInitials = useMemo(() => {
    if (!user || !user.fullName) return 'MB';
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  }, [user]);

  // User cart items count
  const cartItemCount = useMemo(() => {
    return (cart?.items || []).reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  // If loading authentication
  if (authLoading) {
    return (
      <div className="mb-checkout-root" style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#063B2F' }}>
          <Loader2 size={38} className="animate-spin" style={{ margin: '0 auto 14px' }} />
          <p style={{ fontWeight: 600 }}>Loading checkout experience…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-checkout-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#063B2F',
            color: '#FFFFFF',
            padding: '12px 22px',
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 24px rgba(70, 15, 30, 0.25)',
            zIndex: 9999,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          1. HEADER (Exact match to reference mockup)
          - MALKAZ branding
          - Center search bar
          - Wishlist, Cart with count, Profile icon & User initials pill
          - NO general navigation links!
          ==================================================================== */}
      <header className="mb-checkout-header">
        <Link href="/" className="mb-checkout-logo-link" aria-label="MALKAZ">
          <img
            src="/malka-zai-emblem.png"
            alt="MALKAZ"
            className="mb-checkout-logo-img"
          />
          <div className="mb-checkout-brand-info">
            <span className="mb-checkout-brand-title">MALKAZ</span>
          </div>
        </Link>

        {/* Search Bar */}
        <div className="mb-checkout-search-wrap">
          <Search size={18} className="mb-checkout-search-icon" />
          <input
            type="text"
            className="mb-checkout-search-input"
            placeholder="Search for products, brands and more..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value;
                if (val.trim()) setLocation(`/shop?q=${encodeURIComponent(val.trim())}`);
              }
            }}
          />
        </div>

        {/* Right Actions */}
        <div className="mb-checkout-header-actions">
          {/* Wishlist */}
          <Link href="/wishlist" className="mb-checkout-icon-btn" aria-label="Wishlist">
            <Heart size={20} />
          </Link>

          {/* Cart Icon matching My Orders */}
          <HeaderCartButton count={cartItemCount} href="/cart" />

          {/* User Icon */}
          <Link href="/account" className="mb-checkout-icon-btn" aria-label="Account">
            <UserIcon size={20} />
          </Link>

          {/* User Profile Pill */}
          <CustomerProfilePill
            user={user}
            isOpen={profileDropdownOpen}
            onToggle={() => setProfileDropdownOpen((prev) => !prev)}
            onClose={() => setProfileDropdownOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* ====================================================================
          2. CHECKOUT PROGRESS STEPPER
          1. Cart  2. Information  3. Shipping (active)  4. Payment
          ==================================================================== */}
      <div className="mb-checkout-stepper-wrap">
        <div className="mb-checkout-stepper">
          {/* Step 1: Cart */}
          <div className="mb-checkout-step">
            <div className="mb-checkout-step-circle completed">
              <ShoppingCart size={17} />
            </div>
            <span className="mb-checkout-step-label">Cart</span>
          </div>

          <div className="mb-checkout-step-line completed" />

          {/* Step 2: Information */}
          <div className="mb-checkout-step">
            <div className="mb-checkout-step-circle completed">
              <UserIcon size={17} />
            </div>
            <span className="mb-checkout-step-label">Information</span>
          </div>

          <div className="mb-checkout-step-line completed" />

          {/* Step 3: Shipping */}
          <div className="mb-checkout-step">
            <div className="mb-checkout-step-circle active">
              <Truck size={17} />
            </div>
            <span className="mb-checkout-step-label active">Shipping</span>
          </div>

          <div className="mb-checkout-step-line" />

          {/* Step 4: Payment */}
          <div className="mb-checkout-step">
            <div className="mb-checkout-step-circle pending">
              <ShieldCheck size={17} />
            </div>
            <span className="mb-checkout-step-label">Payment</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. MAIN CONTENT: 2-COLUMN LAYOUT
          ==================================================================== */}
      <main className="mb-checkout-main">
        {/* LEFT COLUMN: Shipping Address + Shipping Method + Payment Method */}
        <section className="mb-checkout-left-col">
          {/* CARD 1: Shipping Address */}
          <div className="mb-checkout-card">
            <div className="mb-checkout-card-header">
              <div className="mb-checkout-card-title-group">
                <MapPin size={22} className="mb-checkout-card-icon" />
                <h2 className="mb-checkout-card-title">Shipping Address</h2>
              </div>
              <button
                type="button"
                className="mb-checkout-edit-btn"
                onClick={handleOpenAddressModal}
              >
                <Edit3 size={15} />
                <span>Edit</span>
              </button>
            </div>

            {selectedAddress ? (
              <div className="mb-checkout-address-box">
                <MapPin size={20} className="mb-checkout-address-pin" />
                <div className="mb-checkout-address-content">
                  <div className="mb-checkout-address-name">
                    {selectedAddress.fullName || user?.fullName || 'Mudassir Ahmed'}
                  </div>
                  <div className="mb-checkout-address-line">
                    {selectedAddress.addressLine1 || selectedAddress.street || 'House No. 12, Mohalla Bhopal Gate, Near Masjid'}
                    {selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}
                  </div>
                  <div className="mb-checkout-address-line">
                    {selectedAddress.city || 'Bhopal'}, {selectedAddress.state || 'Madhya Pradesh'} - {selectedAddress.postalCode || selectedAddress.zipCode || '462001'}
                  </div>
                  <div className="mb-checkout-address-phone">
                    {selectedAddress.phoneNumber || user?.phoneNumber || '+91 9876543210'}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#FFF8FA',
                  border: '1.5px dashed #F2D5DE',
                  borderRadius: 14,
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#7A4B58', marginBottom: 12, fontSize: 14 }}>
                  No saved shipping address found.
                </p>
                <button
                  type="button"
                  className="mb-checkout-btn-primary"
                  onClick={handleStartAddNewAddress}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={16} />
                  <span>Add Delivery Address</span>
                </button>
              </div>
            )}
          </div>

          {/* CARD 2: Shipping Method */}
          <div className="mb-checkout-card">
            <div className="mb-checkout-card-header">
              <div className="mb-checkout-card-title-group">
                <Truck size={22} className="mb-checkout-card-icon" />
                <h2 className="mb-checkout-card-title">Shipping Method</h2>
              </div>
            </div>

            <div className="mb-checkout-shipping-options">
              {/* Option 1: Standard Delivery */}
              <div
                className={`mb-checkout-method-row ${shippingMethod === 'standard' ? 'selected' : ''}`}
                onClick={() => setShippingMethod('standard')}
                role="radio"
                aria-checked={shippingMethod === 'standard'}
                tabIndex={0}
              >
                <div className="mb-checkout-method-left">
                  <div className="mb-checkout-radio-circle">
                    {shippingMethod === 'standard' && <div className="mb-checkout-radio-dot" />}
                  </div>
                  <Truck size={20} style={{ color: '#063B2F' }} />
                  <div className="mb-checkout-method-info">
                    <span className="mb-checkout-method-title">Standard Delivery</span>
                    <span className="mb-checkout-method-sub">3-5 business days</span>
                  </div>
                </div>
                <div className="mb-checkout-method-price-free">FREE</div>
              </div>

              {/* Option 2: Express Delivery */}
              <div
                className={`mb-checkout-method-row ${shippingMethod === 'express' ? 'selected' : ''}`}
                onClick={() => setShippingMethod('express')}
                role="radio"
                aria-checked={shippingMethod === 'express'}
                tabIndex={0}
              >
                <div className="mb-checkout-method-left">
                  <div className="mb-checkout-radio-circle">
                    {shippingMethod === 'express' && <div className="mb-checkout-radio-dot" />}
                  </div>
                  <Zap size={20} style={{ color: '#D97706' }} />
                  <div className="mb-checkout-method-info">
                    <span className="mb-checkout-method-title">Express Delivery</span>
                    <span className="mb-checkout-method-sub">1-2 business days</span>
                  </div>
                </div>
                <div className="mb-checkout-method-price">₹ 99.00</div>
              </div>
            </div>
          </div>

          {/* CARD 3: Payment Method */}
          <div className="mb-checkout-card">
            <div className="mb-checkout-card-header">
              <div className="mb-checkout-card-title-group">
                <ShieldCheck size={22} className="mb-checkout-card-icon" />
                <h2 className="mb-checkout-card-title">Payment Method</h2>
              </div>
            </div>

            <div className="mb-checkout-payment-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {/* Option A: UPI (Google Pay, PhonePe, Paytm, BHIM) */}
              <div
                className={`mb-checkout-payment-card ${paymentMethod === 'UPI' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('UPI')}
                role="radio"
                aria-checked={paymentMethod === 'UPI'}
                tabIndex={0}
              >
                <div className="mb-checkout-payment-card-top">
                  <div className="mb-checkout-radio-circle" style={{ marginTop: 2 }}>
                    {paymentMethod === 'UPI' && <div className="mb-checkout-radio-dot" />}
                  </div>
                  <Smartphone size={22} style={{ color: '#063B2F', flexShrink: 0 }} />
                  <div className="mb-checkout-payment-card-details">
                    <span className="mb-checkout-payment-title">UPI</span>
                    <span className="mb-checkout-payment-desc">
                      Pay instantly with Google Pay, PhonePe, Paytm, BHIM or any UPI App
                    </span>
                    <div className="mb-checkout-badges-row">
                      <span className="mb-checkout-badge-pill">GPay</span>
                      <span className="mb-checkout-badge-pill">PhonePe</span>
                      <span className="mb-checkout-badge-pill">Paytm</span>
                      <span className="mb-checkout-badge-pill">BHIM</span>
                      <span className="mb-checkout-badge-pill">UPI</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option B: Net Banking */}
              <div
                className={`mb-checkout-payment-card ${paymentMethod === 'NET_BANKING' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('NET_BANKING')}
                role="radio"
                aria-checked={paymentMethod === 'NET_BANKING'}
                tabIndex={0}
              >
                <div className="mb-checkout-payment-card-top">
                  <div className="mb-checkout-radio-circle" style={{ marginTop: 2 }}>
                    {paymentMethod === 'NET_BANKING' && <div className="mb-checkout-radio-dot" />}
                  </div>
                  <Building2 size={22} style={{ color: '#063B2F', flexShrink: 0 }} />
                  <div className="mb-checkout-payment-card-details">
                    <span className="mb-checkout-payment-title">Net Banking</span>
                    <span className="mb-checkout-payment-desc">
                      Direct secure transfer via SBI, HDFC, ICICI, Axis &amp; all Indian banks
                    </span>
                    <div className="mb-checkout-badges-row">
                      <span className="mb-checkout-badge-pill">HDFC</span>
                      <span className="mb-checkout-badge-pill">ICICI</span>
                      <span className="mb-checkout-badge-pill">SBI</span>
                      <span className="mb-checkout-badge-pill">Axis</span>
                      <span className="mb-checkout-badge-pill">All Banks</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option C: Cash on Delivery (COD) */}
              <div
                className={`mb-checkout-payment-card ${paymentMethod === 'COD' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('COD')}
                role="radio"
                aria-checked={paymentMethod === 'COD'}
                tabIndex={0}
              >
                <div className="mb-checkout-payment-card-top">
                  <div className="mb-checkout-radio-circle" style={{ marginTop: 2 }}>
                    {paymentMethod === 'COD' && <div className="mb-checkout-radio-dot" />}
                  </div>
                  <Banknote size={22} style={{ color: '#063B2F', flexShrink: 0 }} />
                  <div className="mb-checkout-payment-card-details">
                    <span className="mb-checkout-payment-title">Cash on Delivery (COD)</span>
                    <span className="mb-checkout-payment-desc">Pay with cash when you receive your jewellery order</span>
                    <div className="mb-checkout-badges-row">
                      <span className="mb-checkout-badge-pill">Pay on Delivery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery / Retry Verification Card */}
          {pendingVerification && (!pendingVerification.userId || pendingVerification.userId === user?.id) && (
            <div
              style={{
                background: '#FFFBEB',
                border: '1.5px solid #FCD34D',
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={24} style={{ color: '#D97706', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#92400E', fontSize: 15 }}>
                    Payment Verification Needed
                  </div>
                  <div style={{ fontSize: 13, color: '#B45309', marginTop: 2 }}>
                    Authorization received for Order #{pendingVerification.orderNumber} ({formatCurrency(pendingVerification.amount)}) • Payment ID: <strong>{pendingVerification.razorpayPaymentId}</strong>
                  </div>
                </div>
              </div>

              {verificationFeedback && (
                <div style={{ fontSize: 13, color: '#78350F', background: '#FEF3C7', padding: '10px 14px', borderRadius: 8, lineHeight: 1.4 }}>
                  {verificationFeedback}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => executeVerification(pendingVerification)}
                  disabled={paymentVerifying || checkingStatus}
                  style={{
                    flex: '1 1 200px',
                    padding: '10px 16px',
                    fontSize: 13.5,
                    background: '#063B2F',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: paymentVerifying || checkingStatus ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {paymentVerifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying with Server…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Retry Payment Verification</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCheckPaymentStatus(pendingVerification.orderId)}
                  disabled={paymentVerifying || checkingStatus}
                  style={{
                    flex: '1 1 200px',
                    padding: '10px 16px',
                    fontSize: 13.5,
                    background: '#FFFFFF',
                    color: '#063B2F',
                    border: '1.5px solid #063B2F',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: paymentVerifying || checkingStatus ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Checking Status…</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      <span>Check Payment Status</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {orderError && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                padding: '12px 18px',
                borderRadius: 12,
                fontSize: 13.5,
              }}
            >
              {orderError}
            </div>
          )}

          {/* Primary Action Button */}
          {(() => {
            const hasActivePendingVerification = !!pendingVerification && (!pendingVerification.userId || pendingVerification.userId === user?.id);
            return (
              <button
                type="button"
                className="mb-checkout-submit-btn"
                onClick={handleProceedOrder}
                disabled={submittingOrder || paymentVerifying || checkingStatus || hasActivePendingVerification || !cart || (cart.items || []).length === 0 || hasUnavailableCheckoutItems}
              >
                {submittingOrder ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{paymentVerifying ? 'Verifying Payment with MALKAZ Server…' : 'Processing Payment…'}</span>
                  </>
                ) : hasActivePendingVerification ? (
                  <>
                    <ShieldCheck size={20} />
                    <span>Verification Pending — Use Actions Above</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    <span>
                      {paymentMethod === 'COD'
                        ? 'Place Order (COD)'
                        : `Pay ${formatCurrency(finalTotal)} via ${paymentMethod === 'UPI' ? 'UPI' : 'Net Banking'}`}
                    </span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            );
          })()}

          {/* Back link */}
          <div>
            <Link href="/cart" className="mb-checkout-back-link">
              <span>← Back to Cart</span>
            </Link>
          </div>
        </section>

        {/* RIGHT COLUMN: Order Summary Card */}
        <aside>
          <div className="mb-checkout-summary-card">
            <div className="mb-checkout-summary-header">
              <span className="mb-checkout-summary-icon">
                <PackageCheck size={22} />
              </span>
              <h2 className="mb-checkout-summary-title">Order Summary</h2>
            </div>

            {/* Cart Items List */}
            {cartLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9B6271' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading cart items…</span>
              </div>
            ) : !cart || !cart.items || cart.items.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 10px',
                  background: '#FFF8FA',
                  borderRadius: 12,
                  border: '1px solid #F6E2E7',
                }}
              >
                <ShoppingCart size={28} style={{ color: '#9B6271', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 14, color: '#633240', marginBottom: 12 }}>
                  Your cart is empty.
                </p>
                <Link
                  href="/shop"
                  className="mb-checkout-btn-primary"
                  style={{
                    display: 'inline-block',
                    padding: '8px 18px',
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="mb-checkout-items-list">
                {hasUnavailableCheckoutItems && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#991B1B', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span>Some items in your cart are currently out of stock.</span>
                    <button
                      type="button"
                      className="button secondary small"
                      style={{ fontSize: 11, padding: '3px 8px', color: '#991B1B', borderColor: '#FECACA', whiteSpace: 'nowrap' }}
                      onClick={handleRemoveAllUnavailableItems}
                    >
                      Remove Unavailable
                    </button>
                  </div>
                )}
                {groupedCartEntries.map((entry) => {
                  if (entry.type === 'combo') {
                    return (
                      <div key={entry.comboGroupId} className="mb-checkout-combo-package">
                        <div className="mb-checkout-combo-header">
                          <div className="mb-checkout-combo-title">
                            <Gift size={16} color="#063B2F" />
                            <span>🎁 Combo Package: {entry.comboName}</span>
                            <span className="mb-checkout-combo-badge">({entry.items.length} items)</span>
                          </div>
                          <button
                            type="button"
                            className="mb-checkout-item-remove-btn"
                            onClick={(event) => {
                              void handleRemoveComboGroup(entry.comboGroupId, event.currentTarget);
                            }}
                            disabled={removingItemId !== null}
                            title={`Remove ${entry.comboName} from cart`}
                            aria-label={`Remove ${entry.comboName} from cart`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mb-checkout-combo-items">
                          {entry.items.map((cItem) => {
                            const imgSrc = getProductImage(cItem.productId, cItem.imageUrl, cItem.productName);
                            return (
                              <div key={cItem.id} className="mb-checkout-combo-item-row">
                                <img
                                  src={imgSrc}
                                  alt={cItem.productName}
                                  className="mb-checkout-combo-item-thumb"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getProductImage(cItem.productId, undefined, cItem.productName);
                                  }}
                                />
                                <div className="mb-checkout-combo-item-name">
                                  {cItem.productName} {cItem.quantity > 1 ? `× ${cItem.quantity}` : ''}
                                </div>
                                <div className="mb-checkout-combo-item-price">
                                  {formatCurrency(cItem.price * cItem.quantity)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mb-checkout-combo-footer">
                          <span>Package Price</span>
                          <span>{formatCurrency(entry.totalPrice)}</span>
                        </div>
                      </div>
                    );
                  }

                  const item = entry.item;
                  const imgSrc = getProductImage(item.productId, item.imageUrl, item.productName);
                  return (
                    <div key={item.id} className="mb-checkout-item-row">
                      <img
                        src={imgSrc}
                        alt={item.productName}
                        className="mb-checkout-item-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getProductImage(item.productId, undefined, item.productName);
                        }}
                      />
                      <div className="mb-checkout-item-details">
                        <span className="mb-checkout-item-title">{item.productName}</span>
                        <span className="mb-checkout-item-qty">Qty: {item.quantity}</span>
                        <span className="mb-checkout-item-price">{formatCurrency(item.price)}</span>
                        {item.availableStock !== undefined && item.availableStock <= 0 && (
                          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, width: 'fit-content', marginTop: 4 }}>
                            Out of stock
                          </div>
                        )}
                        {item.availableStock !== undefined && item.availableStock > 0 && item.quantity > item.availableStock && (
                          <div style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, width: 'fit-content', marginTop: 4 }}>
                            Only {item.availableStock} in stock
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="mb-checkout-item-remove-btn"
                        onClick={(event) => {
                          void handleRemoveItem(item.id, event.currentTarget);
                        }}
                        disabled={removingItemId !== null}
                        title={`Remove ${item.productName}`}
                        aria-label={`Remove ${item.productName} from cart`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mb-checkout-divider" />

            {/* Price breakdown */}
            <div className="mb-checkout-price-row">
              <span>Subtotal</span>
              <span className="mb-checkout-price-val">{formatCurrency(subtotal)}</span>
            </div>

            <div className="mb-checkout-price-row">
              <span>Shipping ({shippingMethod === 'express' ? 'Express' : 'Standard'})</span>
              <span className="mb-checkout-price-val">{formatCurrency(shippingFee)}</span>
            </div>

            <div className="mb-checkout-price-row">
              <span>Estimated Taxes (GST {Math.round(taxRate * 100)}%)</span>
              <span className="mb-checkout-price-val">{formatCurrency(taxAmount)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="mb-checkout-price-row">
                <span>Discount ({appliedCoupon?.code})</span>
                <span className="mb-checkout-coupon-discount-val">
                  - {formatCurrency(discountAmount)}
                </span>
              </div>
            )}

            {/* Coupon field */}
            {appliedCoupon ? (
              <div className="mb-checkout-coupon-chip">
                <span>
                  <strong>{appliedCoupon.code}</strong> applied ({appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`})
                </span>
                <button
                  type="button"
                  className="mb-checkout-coupon-chip-remove"
                  onClick={handleRemoveCoupon}
                  title="Remove coupon"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="mb-checkout-coupon-wrap">
                <div className="mb-checkout-coupon-input-box">
                  <Tag size={16} className="mb-checkout-coupon-icon" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter discount code"
                    className="mb-checkout-coupon-input"
                  />
                </div>
                <button
                  type="submit"
                  className="mb-checkout-coupon-apply-btn"
                  disabled={couponLoading || !couponInput.trim()}
                >
                  {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                </button>
              </form>
            )}

            {couponError && (
              <div style={{ color: '#DC2626', fontSize: 12.5, marginTop: -8 }}>
                {couponError}
              </div>
            )}

            <div className="mb-checkout-divider" />

            {/* Total Row */}
            <div className="mb-checkout-total-row">
              <span className="mb-checkout-total-label">Total</span>
              <span className="mb-checkout-total-val">{formatCurrency(finalTotal)}</span>
            </div>

            {/* Bottom Branding Watermark */}
            <div className="mb-checkout-summary-watermark">
              <div className="mb-checkout-watermark-logo">
                <img
                  src="/malka-zai-emblem.png"
                  alt="MALKAZ"
                  className="mb-checkout-watermark-img"
                />
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span className="mb-checkout-watermark-brand">MALKAZ</span>
                </div>
              </div>
              <div className="mb-checkout-watermark-slogan">MALKAZ jewellery, delivered with care</div>
              <div className="mb-checkout-watermark-heart">♥</div>
            </div>
          </div>
        </aside>
      </main>

      {/* ====================================================================
          4. TRUST BADGES FOOTER BAR
          - Free Shipping on orders above ₹499
          - Secure Payments 100% Encrypted
          - Customer Support
          - Official Brand Watermark
          ==================================================================== */}
      <footer className="mb-checkout-footer">
        <div className="mb-checkout-trust-grid">
          <div className="mb-checkout-trust-item">
            <Truck size={28} className="mb-checkout-trust-icon" />
            <div className="mb-checkout-trust-text">
              <span className="mb-checkout-trust-title">Free Shipping</span>
              <span className="mb-checkout-trust-sub">On orders above ₹499</span>
            </div>
          </div>

          <div className="mb-checkout-trust-item">
            <ShieldCheck size={28} className="mb-checkout-trust-icon" />
            <div className="mb-checkout-trust-text">
              <span className="mb-checkout-trust-title">Secure Payments</span>
              <span className="mb-checkout-trust-sub">100% Secure &amp; Encrypted</span>
            </div>
          </div>

          <div className="mb-checkout-trust-item">
            <Headphones size={28} className="mb-checkout-trust-icon" />
            <div className="mb-checkout-trust-text">
              <span className="mb-checkout-trust-title">Customer Support</span>
              <span className="mb-checkout-trust-sub">MALKAZ Client Care</span>
            </div>
          </div>

          <div className="mb-checkout-trust-item" style={{ justifyContent: 'flex-end' }}>
            <img
              src="/malka-zai-emblem.png"
              alt="MALKAZ"
              style={{ width: 34, height: 34, objectFit: 'contain' }}
            />
            <div className="mb-checkout-trust-text">
              <span className="mb-checkout-trust-title" style={{ fontFamily: 'var(--app-font-serif, Georgia, serif)', fontSize: 16 }}>
                MALKAZ
              </span>
            </div>
          </div>
        </div>
        <div className="mb-checkout-legal-link">
          <Link href="/about-us" data-testid="link-footer-about-us">
            About Us
          </Link>
          {' '}·{' '}
          <Link href="/privacy-conditions" data-testid="link-footer-privacy-conditions">
            Privacy &amp; Conditions
          </Link>
        </div>
      </footer>

      {/* ====================================================================
          MODAL 1: EDIT / SELECT / ADD ADDRESS MODAL
          ==================================================================== */}
      {showAddressModal && (
        <div className="mb-checkout-modal-backdrop" onClick={() => setShowAddressModal(false)}>
          <div
            className="mb-checkout-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: isAddingNewAddress ? 600 : 520 }}
          >
            <div className="mb-checkout-modal-header">
              <h3 className="mb-checkout-modal-title">
                {isAddingNewAddress
                  ? editingAddressId
                    ? 'Edit Delivery Address'
                    : 'Add New Delivery Address'
                  : 'Select Delivery Address'}
              </h3>
              <button
                type="button"
                className="mb-checkout-modal-close"
                onClick={() => {
                  setShowAddressModal(false);
                  setIsAddingNewAddress(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {isAddingNewAddress ? (
              // Add / Edit Address Form
              <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="mb-checkout-form-grid">
                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">Full Name *</label>
                    <input
                      type="text"
                      className="mb-checkout-input"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="e.g. Mudassir Ahmed"
                      required
                    />
                  </div>

                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">Phone Number *</label>
                    <input
                      type="text"
                      className="mb-checkout-input"
                      value={formPhoneNumber}
                      onChange={(e) => setFormPhoneNumber(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      required
                    />
                  </div>

                  <div className="mb-checkout-field mb-checkout-form-full">
                    <label className="mb-checkout-label">Address Line 1 *</label>
                    <input
                      type="text"
                      className="mb-checkout-input"
                      value={formAddressLine1}
                      onChange={(e) => setFormAddressLine1(e.target.value)}
                      placeholder="House/Flat number, building, street, area"
                      required
                    />
                  </div>

                  <div className="mb-checkout-field mb-checkout-form-full">
                    <label className="mb-checkout-label">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      className="mb-checkout-input"
                      value={formAddressLine2}
                      onChange={(e) => setFormAddressLine2(e.target.value)}
                      placeholder="Landmark, nearby location"
                    />
                  </div>

                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">State / UT *</label>
                    <select
                      className="mb-checkout-input"
                      value={formState}
                      onChange={(e) => {
                        const nextState = e.target.value;
                        setFormState(nextState);
                        setFormCity('');
                        setCustomCity('');
                      }}
                      required
                    >
                      <option value="">Select State / UT</option>
                      {INDIAN_STATES_AND_UTS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">City *</label>
                    <select
                      className="mb-checkout-input"
                      value={formCity}
                      disabled={!formState}
                      onChange={(e) => {
                        const nextCity = e.target.value;
                        setFormCity(nextCity);
                        if (nextCity !== 'Other') {
                          setCustomCity('');
                        }
                      }}
                      required
                    >
                      <option value="">{formState ? 'Select City' : 'Select State first'}</option>
                      {citiesForCheckout.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formCity === 'Other' && (
                    <div className="mb-checkout-field mb-checkout-form-full">
                      <label className="mb-checkout-label">Custom City / Town / Village *</label>
                      <input
                        type="text"
                        className="mb-checkout-input"
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder="Enter your city, town, or village name"
                        required
                      />
                    </div>
                  )}

                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">PIN Code *</label>
                    <input
                      type="text"
                      className="mb-checkout-input"
                      value={formPostalCode}
                      onChange={(e) => setFormPostalCode(e.target.value)}
                      placeholder="e.g. 462001"
                      required
                    />
                  </div>

                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">Address Type</label>
                    <select
                      className="mb-checkout-input"
                      value={formAddressType}
                      onChange={(e) => setFormAddressType(e.target.value as 'HOME' | 'WORK' | 'OTHER')}
                    >
                      <option value="HOME">Home</option>
                      <option value="WORK">Work</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                  />
                  <span>Set as default delivery address</span>
                </label>

                {addressError && (
                  <div style={{ color: '#DC2626', fontSize: 13 }}>{addressError}</div>
                )}

                <div className="mb-checkout-modal-actions">
                  <button
                    type="button"
                    className="mb-checkout-btn-cancel"
                    onClick={() => setIsAddingNewAddress(false)}
                    disabled={addressSaving}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="mb-checkout-btn-primary"
                    disabled={addressSaving}
                  >
                    {addressSaving ? 'Saving…' : 'Save Address'}
                  </button>
                </div>
              </form>
            ) : (
              // Saved Addresses Selection List
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {addresses.length === 0 ? (
                  <p style={{ color: '#7A4B58', textAlign: 'center', padding: '16px 0' }}>
                    No saved addresses found.
                  </p>
                ) : (
                  addresses.map((addr) => {
                    const isSelected = selectedAddress?.id === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr)}
                        style={{
                          border: isSelected ? '2px solid #063B2F' : '1px solid #E8DEC8',
                          background: isSelected ? '#FFF1F5' : '#FFFFFF',
                          borderRadius: 12,
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div className="mb-checkout-radio-circle" style={{ marginTop: 2 }}>
                            {isSelected && <div className="mb-checkout-radio-dot" />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13.5 }}>
                            <span style={{ fontWeight: 700, color: '#123A30' }}>
                              {addr.fullName || user?.fullName}
                              {addr.isDefault && (
                                <span style={{ marginLeft: 8, fontSize: 11, background: '#F4EBD8', color: '#063B2F', padding: '2px 6px', borderRadius: 4 }}>
                                  Default
                                </span>
                              )}
                            </span>
                            <span style={{ color: '#123A30' }}>
                              {addr.addressLine1 || addr.street}
                              {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                            </span>
                            <span style={{ color: '#123A30' }}>
                              {addr.city}, {addr.state} - {addr.postalCode || addr.zipCode}
                            </span>
                            <span style={{ color: '#7A4B58', fontWeight: 500 }}>
                              {addr.phoneNumber || user?.phoneNumber}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditAddress(addr);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#063B2F',
                            cursor: 'pointer',
                            padding: 6,
                          }}
                          title="Edit this address"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    );
                  })
                )}

                <button
                  type="button"
                  onClick={handleStartAddNewAddress}
                  style={{
                    border: '1.5px dashed #DDA3B4',
                    background: '#FFF9FB',
                    color: '#063B2F',
                    padding: '12px',
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 13.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    marginTop: 6,
                  }}
                >
                  <Plus size={16} />
                  <span>Add New Address</span>
                </button>

                <div className="mb-checkout-modal-actions">
                  <button
                    type="button"
                    className="mb-checkout-btn-primary"
                    onClick={() => setShowAddressModal(false)}
                  >
                    Confirm Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          ORDER SUCCESS CONFIRMATION MODAL
          - Direct link to My Orders page
          ==================================================================== */}
      {confirmedOrder && (
        <div className="mb-checkout-modal-backdrop">
          <div
            className="mb-checkout-modal-card"
            style={{ maxWidth: 480, textAlign: 'center', alignItems: 'center' }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#F0FDF4',
                color: '#16A34A',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.15)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#063B2F', margin: '4px 0 0' }}>
              Order Placed Successfully!
            </h3>

            <p style={{ fontSize: 14, color: '#633240', lineHeight: 1.4, margin: 0 }}>
              Thank you for choosing MALKAZ. Your jewellery order has been received and will be delivered shortly.
            </p>

            <div
              style={{
                width: '100%',
                background: '#FFF9FA',
                border: '1px solid #F3E0E5',
                borderRadius: 14,
                padding: '16px 20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 13.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7A4B58' }}>Order Number:</span>
                <strong style={{ color: '#063B2F' }}>#{confirmedOrder.orderNumber || confirmedOrder.id}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7A4B58' }}>Payment Method:</span>
                <strong style={{ color: '#123A30' }}>
                  {confirmedOrder.paymentMethod === 'COD'
                    ? 'Cash on Delivery (COD)'
                    : confirmedOrder.paymentMethod === 'UPI'
                      ? 'UPI (Razorpay Verified)'
                      : confirmedOrder.paymentMethod === 'NET_BANKING'
                        ? 'Net Banking (Razorpay Verified)'
                        : 'Online Payment (Razorpay Verified)'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7A4B58' }}>Order Status:</span>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>
                  {confirmedOrder.orderStatus || 'CONFIRMED'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7A4B58' }}>Total Amount:</span>
                <strong style={{ color: '#063B2F', fontSize: 16 }}>
                  {formatCurrency(confirmedOrder.totalAmount)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#7A4B58' }}>Estimated Delivery:</span>
                <span style={{ color: '#123A30', fontWeight: 600 }}>
                  {shippingMethod === 'express' ? '1-2 business days' : '3-5 business days'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
              <Link
                href="/orders"
                className="mb-checkout-btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  textDecoration: 'none',
                }}
              >
                <PackageCheck size={18} />
                <span>View in My Orders</span>
              </Link>

              <Link
                href="/shop"
                className="mb-checkout-btn-cancel"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
