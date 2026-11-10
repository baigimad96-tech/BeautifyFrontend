import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import {
  MapPin,
  Truck,
  CreditCard,
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
import { CustomerProfilePill, HeaderCartButton } from '@/components/common';
import { getJewelleryImage } from '@/lib/jewellery-images';
import { animateTrashCan } from '@/lib/cart-animations';
import { removeComboGroupFromCart } from '@/services/combos/combos.service';
import '@/styles/checkout.css';

const getProductImage = (productId: number, imageUrl?: string, productName?: string) =>
  getJewelleryImage(imageUrl, productName, productId);

// Currency formatter
const formatCurrency = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return `₹ ${num.toFixed(2)}`;
};

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

  // 5. Payment Method: COD vs ONLINE
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');

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
  const [formState, setFormState] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formAddressType, setFormAddressType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [formIsDefault, setFormIsDefault] = useState(true);

  // Online Payment Simulation Modal
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [selectedOnlineChannel, setSelectedOnlineChannel] = useState<'upi' | 'card' | 'wallet'>('upi');
  const [onlineUpiId, setOnlineUpiId] = useState('');

  // 8. Order Placement & Confirmation
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderResponse | null>(null);

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

  const handleStartAddNewAddress = () => {
    setIsAddingNewAddress(true);
    setEditingAddressId(null);
    setFormFullName(user?.fullName || '');
    setFormPhoneNumber(user?.phoneNumber || '');
    setFormAddressLine1('');
    setFormAddressLine2('');
    setFormCity('');
    setFormState('');
    setFormPostalCode('');
    setFormAddressType('HOME');
    setFormIsDefault(true);
  };

  const handleStartEditAddress = (addr: AddressResponse) => {
    setIsAddingNewAddress(true);
    setEditingAddressId(addr.id);
    setFormFullName(addr.fullName || '');
    setFormPhoneNumber(addr.phoneNumber || '');
    setFormAddressLine1(addr.addressLine1 || addr.street || '');
    setFormAddressLine2(addr.addressLine2 || '');
    setFormCity(addr.city || '');
    setFormState(addr.state || '');
    setFormPostalCode(addr.postalCode || addr.zipCode || '');
    setFormAddressType((addr.addressType as 'HOME' | 'WORK' | 'OTHER') || 'HOME');
    setFormIsDefault(Boolean(addr.isDefault));
  };

  // Save Address (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formPhoneNumber.trim() || !formAddressLine1.trim() || !formCity.trim() || !formPostalCode.trim()) {
      setAddressError('Please fill in all required address fields.');
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
        city: formCity.trim(),
        state: formState.trim() || 'Madhya Pradesh',
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

  // Totals calculations
  const subtotal = useMemo(() => cart?.subtotal || 0, [cart]);

  const shippingFee = useMemo(() => {
    return shippingMethod === 'express' ? 99 : 0;
  }, [shippingMethod]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      const raw = (subtotal * appliedCoupon.discountValue) / 100;
      return appliedCoupon.maximumDiscount ? Math.min(raw, appliedCoupon.maximumDiscount) : raw;
    }
    return Math.min(appliedCoupon.discountValue, subtotal);
  }, [appliedCoupon, subtotal]);

  const finalTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + shippingFee);
  }, [subtotal, discountAmount, shippingFee]);

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

    if (paymentMethod === 'ONLINE') {
      // Open Online Payment modal to allow secure mock session
      setShowOnlinePaymentModal(true);
      return;
    }

    // Place COD Order directly
    executeOrderPlacement('COD');
  };

  const executeOrderPlacement = async (method: 'COD' | 'MOCK') => {
    if (!selectedAddress) return;
    setSubmittingOrder(true);
    setOrderError(null);

    try {
      const response = await createOrder({
        shippingAddressId: selectedAddress.id,
        paymentMethod: method,
        couponCode: appliedCoupon?.code,
      });

      setConfirmedOrder(response);
      setShowOnlinePaymentModal(false);
      // Cart will have been cleared on backend by checkout
      await loadCartData();
      showToast('Order placed successfully!');
    } catch (err) {
      console.error('Order creation failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not place order. Please try again.';
      setOrderError(msg);
      showToast(msg);
    } finally {
      setSubmittingOrder(false);
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
              <CreditCard size={17} />
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
                <CreditCard size={22} className="mb-checkout-card-icon" />
                <h2 className="mb-checkout-card-title">Payment Method</h2>
              </div>
            </div>

            <div className="mb-checkout-payment-grid">
              {/* Option A: Cash on Delivery (COD) */}
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
                    <span className="mb-checkout-payment-desc">Pay when you receive your order</span>
                  </div>
                </div>
              </div>

              {/* Option B: Online Payment */}
              <div
                className={`mb-checkout-payment-card ${paymentMethod === 'ONLINE' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('ONLINE')}
                role="radio"
                aria-checked={paymentMethod === 'ONLINE'}
                tabIndex={0}
              >
                <div className="mb-checkout-payment-card-top">
                  <div className="mb-checkout-radio-circle" style={{ marginTop: 2 }}>
                    {paymentMethod === 'ONLINE' && <div className="mb-checkout-radio-dot" />}
                  </div>
                  <CreditCard size={22} style={{ color: '#063B2F', flexShrink: 0 }} />
                  <div className="mb-checkout-payment-card-details">
                    <span className="mb-checkout-payment-title">Online Payment</span>
                    <span className="mb-checkout-payment-desc">
                      Pay securely via UPI, Cards, Wallets &amp; More
                    </span>
                    <div className="mb-checkout-badges-row">
                      <span className="mb-checkout-badge-pill">UPI</span>
                      <span className="mb-checkout-badge-pill">VISA</span>
                      <span className="mb-checkout-badge-pill">MC</span>
                      <span className="mb-checkout-badge-pill">RuPay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
          <button
            type="button"
            className="mb-checkout-submit-btn"
            onClick={handleProceedOrder}
            disabled={submittingOrder || !cart || (cart.items || []).length === 0}
          >
            {submittingOrder ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing Order…</span>
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                <span>
                  {paymentMethod === 'COD' ? 'Place Order (COD)' : 'Continue to Payment'}
                </span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

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
                {cart.items.map((item) => {
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
                        {item.comboGroupId && (
                          <span className="mb-checkout-item-combo">{item.comboName || 'Combo offer'}</span>
                        )}
                        <span className="mb-checkout-item-title">{item.productName}</span>
                        <span className="mb-checkout-item-qty">Qty: {item.quantity}</span>
                        <span className="mb-checkout-item-price">{formatCurrency(item.price)}</span>
                      </div>
                      <button
                        type="button"
                        className="mb-checkout-item-remove-btn"
                        onClick={(event) => {
                          void handleRemoveItem(item.id, event.currentTarget);
                        }}
                        disabled={removingItemId !== null}
                        title={item.comboGroupId ? `Remove ${item.comboName || 'combo'}` : 'Remove item'}
                        aria-label={item.comboGroupId ? `Remove ${item.comboName || 'combo'} from cart` : 'Remove item'}
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
              <span>Shipping</span>
              {shippingFee === 0 ? (
                <span className="mb-checkout-price-free">FREE</span>
              ) : (
                <span className="mb-checkout-price-val">₹ 99.00</span>
              )}
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
                    <label className="mb-checkout-label">City *</label>
                    <input
                      type="text"
                      className="mb-checkout-input"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="e.g. Bhopal"
                      required
                    />
                  </div>

                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">State *</label>
                    <input
                      type="text"
                      className="mb-checkout-input"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      placeholder="e.g. Madhya Pradesh"
                      required
                    />
                  </div>

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
          MODAL 2: ONLINE PAYMENT GATEWAY DIALOG
          - Connects to Spring Boot backend order creation & payment gateway
          ==================================================================== */}
      {showOnlinePaymentModal && (
        <div className="mb-checkout-modal-backdrop" onClick={() => setShowOnlinePaymentModal(false)}>
          <div
            className="mb-checkout-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="mb-checkout-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={22} style={{ color: '#063B2F' }} />
                <h3 className="mb-checkout-modal-title">Complete Payment</h3>
              </div>
              <button
                type="button"
                className="mb-checkout-modal-close"
                onClick={() => setShowOnlinePaymentModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#FFF1F5', borderRadius: 12, padding: 16, border: '1px solid #F5D3DC' }}>
              <div style={{ fontSize: 13, color: '#7A4B58' }}>Payable Amount</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#063B2F', marginTop: 2 }}>
                {formatCurrency(finalTotal)}
              </div>
              <div style={{ fontSize: 12, color: '#633240', marginTop: 4 }}>
                Deliver to: <strong>{selectedAddress?.fullName}</strong> ({selectedAddress?.city})
              </div>
            </div>

            {/* Payment channel tabs */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedOnlineChannel('upi')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: selectedOnlineChannel === 'upi' ? '2px solid #063B2F' : '1px solid #E8DEC8',
                  background: selectedOnlineChannel === 'upi' ? '#FFF3F6' : '#FFFFFF',
                  color: selectedOnlineChannel === 'upi' ? '#063B2F' : '#123A30',
                  cursor: 'pointer',
                }}
              >
                UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setSelectedOnlineChannel('card')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: selectedOnlineChannel === 'card' ? '2px solid #063B2F' : '1px solid #E8DEC8',
                  background: selectedOnlineChannel === 'card' ? '#FFF3F6' : '#FFFFFF',
                  color: selectedOnlineChannel === 'card' ? '#063B2F' : '#123A30',
                  cursor: 'pointer',
                }}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setSelectedOnlineChannel('wallet')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: selectedOnlineChannel === 'wallet' ? '2px solid #063B2F' : '1px solid #E8DEC8',
                  background: selectedOnlineChannel === 'wallet' ? '#FFF3F6' : '#FFFFFF',
                  color: selectedOnlineChannel === 'wallet' ? '#063B2F' : '#123A30',
                  cursor: 'pointer',
                }}
              >
                Net Banking
              </button>
            </div>

            {/* Selected Channel Input */}
            {selectedOnlineChannel === 'upi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="mb-checkout-label">Enter UPI ID</label>
                <input
                  type="text"
                  className="mb-checkout-input"
                  placeholder="e.g. yourname@okhdfcbank"
                  value={onlineUpiId}
                  onChange={(e) => setOnlineUpiId(e.target.value)}
                />
                <span style={{ fontSize: 12, color: '#7A4B58' }}>
                  Supported: Google Pay, PhonePe, Paytm, BHIM, etc.
                </span>
              </div>
            )}

            {selectedOnlineChannel === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="mb-checkout-field">
                  <label className="mb-checkout-label">Card Number</label>
                  <input
                    type="text"
                    className="mb-checkout-input"
                    placeholder="•••• •••• •••• 4242"
                    defaultValue="4242 •••• •••• 4242"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">Expiry</label>
                    <input type="text" className="mb-checkout-input" placeholder="MM/YY" defaultValue="12/28" />
                  </div>
                  <div className="mb-checkout-field">
                    <label className="mb-checkout-label">CVV</label>
                    <input type="password" className="mb-checkout-input" placeholder="•••" defaultValue="123" />
                  </div>
                </div>
              </div>
            )}

            {selectedOnlineChannel === 'wallet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="mb-checkout-label">Select Bank</label>
                <select className="mb-checkout-input" defaultValue="HDFC">
                  <option value="HDFC">HDFC Bank</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="SBI">State Bank of India</option>
                  <option value="AXIS">Axis Bank</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#15803D', background: '#F0FDF4', padding: '8px 12px', borderRadius: 8 }}>
              <Lock size={14} />
              <span>256-bit encrypted secure checkout connection</span>
            </div>

            <div className="mb-checkout-modal-actions">
              <button
                type="button"
                className="mb-checkout-btn-cancel"
                onClick={() => setShowOnlinePaymentModal(false)}
                disabled={submittingOrder}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mb-checkout-btn-primary"
                onClick={() => executeOrderPlacement('MOCK')}
                disabled={submittingOrder}
              >
                {submittingOrder ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying Payment…</span>
                  </>
                ) : (
                  <span>Authorize &amp; Pay {formatCurrency(finalTotal)}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: ORDER SUCCESS CONFIRMATION
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
                  {confirmedOrder.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment'}
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
