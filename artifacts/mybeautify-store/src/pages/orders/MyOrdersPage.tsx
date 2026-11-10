import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Search,
  Heart,
  ShoppingCart,
  User as UserIcon,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  Package,
  MapPin,
  Ticket,
  Star,
  Headphones,
  LogOut,
  Sparkles,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  fetchOrders,
  fetchOrderById,
  cancelOrder as apiCancelOrder,
  fetchCurrentUser,
  fetchCart,
  addToCart as apiAddToCart,
  fetchWishlist,
  submitProductReview,
  getAuthToken,
  setAuthToken,
  type OrderResponse,
  type OrderItemResponse,
  type UserResponse,
  type CartResponse,
  type ProductResponse,
} from '@/lib/api';
import { CustomerProfilePill, HeaderCartButton } from '@/components/common';
import { MalkazSidebar } from '@/components/layout/MalkazSidebar';
import { getJewelleryImage as resolveJewelleryImage } from '@/lib/jewellery-images';
import '@/styles/my-orders.css';

// Product catalog image & metadata fallbacks for orders
interface ProductMeta {
  brand: string;
  size?: string;
  imageUrl: string;
}

const getProductMeta = (): ProductMeta => ({
  brand: 'MALKAZ',
  imageUrl: '/products/jewels/royal-emerald-necklace.jpg',
});

const getJewelleryImage = (imageUrl?: string | null, productName?: string, productId?: number) =>
  resolveJewelleryImage(imageUrl, productName, productId);

// Currency formatter
const formatCurrency = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return `₹ ${num.toFixed(2)}`;
};

// Date formatters
const formatOrderDate = (dateStr?: string) => {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
};

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

const addDaysToDate = (dateStr: string | undefined, days: number): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return formatShortDate(d.toISOString());
  } catch {
    return '';
  }
};

export default function MyOrdersPage() {
  const [, setLocation] = useLocation();

  // Authentication & User State
  const [user, setUser] = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Cart & Wishlist counters
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  // Orders State from Backend
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Search & Sorting Controls (NO redundant status filter tabs)
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'highest_total' | 'lowest_total'>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Profile Dropdown
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderResponse | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<OrderResponse | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Track Order Modal
  const [trackingOrder, setTrackingOrder] = useState<OrderResponse | null>(null);

  // Write Review Modal
  const [reviewOrder, setReviewOrder] = useState<OrderResponse | null>(null);
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Buy Again loading state
  const [buyAgainLoadingId, setBuyAgainLoadingId] = useState<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // 1. Verify Authentication
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
        console.error('Failed to fetch user:', err);
        if (!getAuthToken()) {
          setLocation('/sign-in');
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [setLocation]);

  // 2. Load Cart & Wishlist for topbar badges
  const reloadHeaderCounts = useCallback(() => {
    if (!getAuthToken()) return;
    fetchCart()
      .then((cart) => {
        const totalQty = (cart.items || []).reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalQty);
      })
      .catch(() => {});

    fetchWishlist()
      .then((list) => {
        setWishlistCount(list.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    reloadHeaderCounts();
  }, [reloadHeaderCounts]);

  // 3. Load Actual Customer Orders from Spring Boot
  const loadOrders = useCallback(async () => {
    if (!getAuthToken()) return;
    setLoadingOrders(true);
    setOrderError(null);
    try {
      const pageData = await fetchOrders();
      setOrders(pageData.content || []);
    } catch (err: unknown) {
      console.error('Failed to load orders:', err);
      const msg = err instanceof Error ? err.message : 'Unable to load orders from server.';
      setOrderError(msg);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Logout Handler
  const handleLogout = () => {
    setAuthToken(null);
    setLocation('/sign-in');
  };

  // 4. Cancellation Eligibility Checker based on Spring Boot rules
  // Backend rule: orderStatus must be PENDING or CONFIRMED
  const isOrderCancelEligible = (order: OrderResponse): boolean => {
    const status = (order.orderStatus || order.status || '').toUpperCase();
    return status === 'PENDING' || status === 'CONFIRMED';
  };

  // 5. Open Cancel Order Modal
  const handleInitiateCancel = (order: OrderResponse) => {
    setCancelError(null);
    setCancellingOrder(order);
  };

  // 6. Confirm Cancel Order with real backend call
  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const updated = await apiCancelOrder(cancellingOrder.id);
      showToast(`Order #${updated.orderNumber || cancellingOrder.id} has been cancelled.`);
      setCancellingOrder(null);
      // Refresh orders list from backend to ensure ground truth
      await loadOrders();
    } catch (err: unknown) {
      console.error('Cancellation failed:', err);
      const msg = err instanceof Error ? err.message : 'Cancellation could not be completed.';
      setCancelError(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  // 7. Buy Again using real Cart API
  const handleBuyAgain = async (item: OrderItemResponse) => {
    setBuyAgainLoadingId(item.id);
    try {
      await apiAddToCart(item.productId, 1);
      reloadHeaderCounts();
      showToast(`Added ${item.productName} to your cart.`);
    } catch (err: unknown) {
      console.error('Buy Again failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not add item to cart.';
      showToast(msg);
    } finally {
      setBuyAgainLoadingId(null);
    }
  };

  // 8. Open Review Modal
  const handleOpenReview = (order: OrderResponse) => {
    setReviewOrder(order);
    setReviewProductId(order.items?.[0]?.productId || null);
    setReviewRating(5);
    setReviewComment('');
    setReviewError(null);
  };

  // 9. Submit Product Review to backend API
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder || !reviewProductId) return;
    if (!reviewComment.trim()) {
      setReviewError('Please write your review comment before submitting.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await submitProductReview(reviewProductId, {
        rating: reviewRating,
        comment: reviewComment.trim(),
        orderId: reviewOrder.id,
      });
      showToast('Thank you! Your review has been submitted.');
      setReviewOrder(null);
    } catch (err: unknown) {
      console.error('Submit review error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit review.';
      setReviewError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // 10. Filter & Sort Orders (Search by order number or product name; NO status tabs!)
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((order) => {
        const orderNum = (order.orderNumber || String(order.id)).toLowerCase();
        if (orderNum.includes(q)) return true;
        // Search in items
        return (order.items || []).some((item) =>
          item.productName.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      const totalA = a.totalAmount || 0;
      const totalB = b.totalAmount || 0;

      switch (sortBy) {
        case 'recent':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'highest_total':
          return totalB - totalA;
        case 'lowest_total':
          return totalA - totalB;
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [orders, searchQuery, sortBy]);

  // Timeline helper: Computes milestone state and dates
  const getTimelineSteps = (order: OrderResponse) => {
    const status = (order.orderStatus || order.status || '').toUpperCase();
    const created = order.createdAt;

    const datePlaced = formatShortDate(created);
    const datePacked = addDaysToDate(created, 1);
    const dateShipped = addDaysToDate(created, 2);
    const dateOutForDelivery = addDaysToDate(created, 3);
    const dateDelivered = addDaysToDate(created, 4);

    const steps = [
      {
        key: 'placed',
        label: 'Order Placed',
        date: datePlaced,
        completed: true,
        active: status === 'PENDING',
      },
      {
        key: 'packed',
        label: 'Packed',
        date: datePacked,
        completed: ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status),
        active: ['CONFIRMED', 'PROCESSING', 'PACKED'].includes(status),
      },
      {
        key: 'shipped',
        label: 'Shipped',
        date: dateShipped,
        completed: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status),
        active: status === 'SHIPPED',
      },
      {
        key: 'out',
        label: 'Out for Delivery',
        date: dateOutForDelivery,
        completed: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status),
        active: status === 'OUT_FOR_DELIVERY',
      },
      {
        key: 'delivered',
        label: 'Delivered',
        date: dateDelivered,
        completed: status === 'DELIVERED',
        active: false,
      },
    ];

    let fillPercentage = 0;
    if (status === 'DELIVERED') fillPercentage = 100;
    else if (status === 'OUT_FOR_DELIVERY') fillPercentage = 75;
    else if (status === 'SHIPPED') fillPercentage = 50;
    else if (['CONFIRMED', 'PROCESSING', 'PACKED'].includes(status)) fillPercentage = 25;
    else fillPercentage = 10;

    return { steps, fillPercentage };
  };

  return (
    <div className="mb-orders-page-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-toast-pill" style={{
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
        }}>
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <MalkazSidebar
        activeItem="orders"
        isOpen={mobileSidebarOpen}
        isSignedIn={Boolean(user)}
        onClose={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <main className="mb-orders-main">
        {/* Top Header Bar */}
        <header className="mb-orders-topbar">
          <button
            type="button"
            className="mz-orders-mobile-menu"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileSidebarOpen}
            aria-controls="malkaz-navigation"
          >
            <span className="mz-hamburger-mark" aria-hidden="true"><span /><span /></span>
          </button>
          <div className="mb-orders-search-wrap">
            <Search size={18} className="mb-orders-search-icon" />
            <input
              type="text"
              className="mb-orders-search-input"
              placeholder="Search for products, brands and more..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val.trim()) setLocation(`/shop?q=${encodeURIComponent(val.trim())}`);
                }
              }}
            />
          </div>

          <div className="mb-orders-topbar-actions">
            {/* Wishlist Button */}
            <Link href="/wishlist" className="mb-orders-icon-btn" aria-label="Wishlist">
              <Heart size={20} />
              {wishlistCount > 0 && <span className="mb-orders-badge-pill">{wishlistCount}</span>}
            </Link>

            {/* Cart Button matching Checkout & My Orders shared component */}
            <HeaderCartButton count={cartCount} href="/cart" />

            {/* Customer Profile Pill matching Checkout */}
            <CustomerProfilePill
              user={user}
              isOpen={profileDropdownOpen}
              onToggle={() => setProfileDropdownOpen((prev) => !prev)}
              onClose={() => setProfileDropdownOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Page Body */}
        <div className="mb-orders-body">
          {/* Promotional Banner */}
          <div className="mb-orders-banner">
            <div className="mb-orders-banner-content">
              <span className="mb-orders-banner-kicker"><Sparkles size={14} /> YOUR MALKAZ JOURNEY</span>
              <h1 className="mb-orders-banner-title">My Orders</h1>
              <p className="mb-orders-banner-desc">Track, manage and review your purchases</p>
            </div>

            <div className="mb-orders-banner-visual-wrap">
              <img
                src="/hero-jewellery.jpg"
                alt="MALKAZ fine jewellery collection"
                className="mb-orders-banner-bg-img"
              />
            </div>

            <div className="mb-orders-banner-script">
              <span>Made to</span>
              <span>be treasured</span>
            </div>
          </div>

          {/* Controls Bar: Search, Sort Dropdown & View Mode (NO redundant status filter tabs!) */}
          <div className="mb-orders-controls-bar">
            {/* Search orders */}
            <div className="mb-orders-filter-search-box">
              <Search size={18} className="mb-orders-search-icon" />
              <input
                type="text"
                className="mb-orders-filter-search-input"
                placeholder="Search by order ID or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sorting & Grid/List view controls */}
            <div className="mb-orders-controls-right">
              <div className="mb-orders-sort-group">
                <span className="mb-orders-sort-label">Sort by:</span>
                <select
                  className="mb-orders-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sort orders"
                >
                  <option value="recent">Recent Orders</option>
                  <option value="oldest">Oldest Orders</option>
                  <option value="highest_total">Highest Order Total</option>
                  <option value="lowest_total">Lowest Order Total</option>
                </select>
              </div>

              <div className="mb-orders-view-toggles">
                <button
                  type="button"
                  className={`mb-orders-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                  aria-label="List view"
                >
                  <ListIcon size={18} />
                </button>
                <button
                  type="button"
                  className={`mb-orders-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loadingOrders && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#063B2F' }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, fontSize: 16 }}>Loading your orders...</p>
            </div>
          )}

          {/* Error State */}
          {!loadingOrders && orderError && (
            <div style={{
              background: '#F4EBD8',
              border: '1px solid #E8DEC8',
              borderRadius: 14,
              padding: '20px',
              color: '#C62828',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertCircle size={22} />
                <span>{orderError}</span>
              </div>
              <button
                type="button"
                className="mb-order-btn-primary"
                style={{ width: 'auto', padding: '0 16px', height: 34 }}
                onClick={loadOrders}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loadingOrders && !orderError && filteredAndSortedOrders.length === 0 && (
            <div className="mb-orders-empty-state">
              <div className="mb-orders-empty-icon-box">
                <Package size={36} />
              </div>
              <h2 className="mb-orders-empty-title">
                {searchQuery ? 'No matching orders found' : 'No orders yet'}
              </h2>
              <p className="mb-orders-empty-desc">
                {searchQuery
                  ? `We could not find any order matching "${searchQuery}". Please check the order ID or product name.`
                  : "You haven't placed any orders yet. Explore the MALKAZ fine jewellery collection."}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  className="mb-orders-empty-btn"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              ) : (
                <Link href="/shop" className="mb-orders-empty-btn">
                  Shop Now
                </Link>
              )}
            </div>
          )}

          {/* Order Cards List */}
          {!loadingOrders && !orderError && filteredAndSortedOrders.length > 0 && (
            <div className={viewMode === 'grid' ? 'mb-orders-cards-grid' : 'mb-orders-cards-list'}>
              {filteredAndSortedOrders.map((order) => {
                const status = (order.orderStatus || order.status || 'CONFIRMED').toUpperCase();
                const isDelivered = status === 'DELIVERED';
                const isShipped = status === 'SHIPPED';
                const isCancelled = status === 'CANCELLED';
                const isEligibleForCancel = isOrderCancelEligible(order);
                const orderNum = order.orderNumber || `MB-2026-${order.id}`;
                const { steps, fillPercentage } = getTimelineSteps(order);

                // Date displays
                const placedDisplay = formatOrderDate(order.createdAt);
                const deliveredDateStr = isDelivered ? formatShortDate(order.updatedAt || order.createdAt) : '';
                const estimatedDeliveryDateStr = addDaysToDate(order.createdAt, 4);

                return (
                  <article key={order.id} className="mb-order-card" id={`order-${order.id}`}>
                    {/* SECTION A: ORDER INFO & ITEMS */}
                    <div className="mb-order-col-info">
                      {/* Order Number & Status Header */}
                      <div className="mb-order-meta-header">
                        <div className="mb-order-id-group">
                          <div className="mb-order-box-icon-badge">
                            <Package size={18} />
                          </div>
                          <div>
                            <h3 className="mb-order-number-title">Order #{orderNum}</h3>
                            <div className="mb-order-placed-date">Placed on {placedDisplay}</div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isDelivered && (
                          <span className="mb-order-status-badge mb-status-delivered">
                            <CheckCircle2 size={13} />
                            Delivered
                          </span>
                        )}
                        {isShipped && (
                          <span className="mb-order-status-badge mb-status-shipped">
                            <Truck size={13} />
                            Shipped
                          </span>
                        )}
                        {isCancelled && (
                          <span className="mb-order-status-badge mb-status-cancelled">
                            <XCircle size={13} />
                            Cancelled
                          </span>
                        )}
                        {!isDelivered && !isShipped && !isCancelled && (
                          <span className="mb-order-status-badge mb-status-processing">
                            <Clock size={13} />
                            {status === 'CONFIRMED' ? 'Confirmed' : status}
                          </span>
                        )}
                      </div>

                      {/* Items Row */}
                      <div className="mb-order-items-row">
                        {(order.items || []).map((item) => {
                          const meta = getProductMeta();
                          const itemImg = getJewelleryImage(item.imageUrl, item.productName, item.productId);

                          return (
                            <div key={item.id} className="mb-order-item-chip">
                              <img
                                src={itemImg}
                                alt={item.productName}
                                className="mb-order-item-thumb"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getJewelleryImage(null, item.productName, item.productId);
                                }}
                              />
                              <div className="mb-order-item-details">
                                <span className="mb-order-item-name">{item.productName}</span>
                                {item.comboName
                                  ? <span className="mb-order-item-brand">{item.comboName}</span>
                                  : <span className="mb-order-item-brand">{meta.brand}</span>}
                                {meta.size && <span className="mb-order-item-size">{meta.size}</span>}
                                <div className="mb-order-item-price-row">
                                  <span>Qty: {item.quantity}</span>
                                  <span className="mb-order-item-price-val">
                                    {formatCurrency(item.price)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION B: SHIPMENT TIMELINE OR CANCELLED NOTICE */}
                    <div className="mb-order-col-progress">
                      {isCancelled ? (
                        /* Cancelled State: One clean non-repeated cancellation status */
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C62828', fontSize: 13.5, fontWeight: 600, padding: '12px 0' }}>
                          <XCircle size={16} />
                          <span>
                            Cancelled on {formatShortDate(order.updatedAt || order.createdAt)}
                          </span>
                        </div>
                      ) : (
                        /* Active / Shipped / Delivered State: 5-Stage Horizontal Progress Timeline */
                        <>
                          <div className="mb-order-progress-header">
                            <Truck size={16} />
                            {isDelivered ? (
                              <span>Delivered on {deliveredDateStr || 'Recent'}</span>
                            ) : isShipped ? (
                              <span>Estimated Delivery: {estimatedDeliveryDateStr}</span>
                            ) : (
                              <span>Estimated Delivery: {estimatedDeliveryDateStr}</span>
                            )}
                          </div>

                          <div className="mb-progress-timeline">
                            <div className="mb-timeline-line">
                              <div
                                className="mb-timeline-line-fill"
                                style={{ width: `${fillPercentage}%` }}
                              />
                            </div>

                            {steps.map((step) => {
                              let nodeClass = 'mb-timeline-node';
                              if (step.completed) {
                                nodeClass += isDelivered && step.key === 'delivered' ? ' delivered' : ' completed';
                              } else if (step.active) {
                                nodeClass += ' active-step';
                              }

                              return (
                                <div key={step.key} className="mb-timeline-step">
                                  <div className={nodeClass}>
                                    {step.completed ? (
                                      <Check size={12} strokeWidth={3} />
                                    ) : step.active ? (
                                      <Truck size={12} />
                                    ) : (
                                      <span style={{ fontSize: 9 }}>●</span>
                                    )}
                                  </div>
                                  <span className="mb-timeline-step-label">{step.label}</span>
                                  {step.date && (
                                    <span className="mb-timeline-step-date">{step.date}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* SECTION C: TOTAL & ACTIONS */}
                    <div className="mb-order-col-actions">
                      <span className="mb-order-total-label">Order Total</span>
                      <span className="mb-order-total-amount">
                        {formatCurrency(order.totalAmount)}
                      </span>

                      {/* View Details Action (always available) */}
                      <button
                        type="button"
                        className="mb-order-btn-view-details"
                        onClick={() => setSelectedOrderDetails(order)}
                      >
                        View Details
                      </button>

                      {/* Single Cancel Order button directly below View Details for eligible orders */}
                      {!isCancelled && isEligibleForCancel && (
                        <button
                          type="button"
                          className="mb-order-btn-cancel-action"
                          onClick={() => handleInitiateCancel(order)}
                        >
                          <XCircle size={14} />
                          <span>Cancel Order</span>
                        </button>
                      )}

                      {/* Contextual Action for Delivered orders: Write a Review */}
                      {isDelivered && (
                        <button
                          type="button"
                          className="mb-order-btn-primary"
                          onClick={() => handleOpenReview(order)}
                        >
                          <Star size={15} fill="#FFFFFF" />
                          <span>Write a Review</span>
                        </button>
                      )}

                      {/* Contextual Action for Shipped orders: Track Order */}
                      {isShipped && (
                        <button
                          type="button"
                          className="mb-order-btn-primary"
                          onClick={() => setTrackingOrder(order)}
                        >
                          <Truck size={15} />
                          <span>Track Order</span>
                        </button>
                      )}

                      {/* Contextual Action for Cancelled orders: Buy Again */}
                      {isCancelled && order.items?.[0] && (
                        <button
                          type="button"
                          className="mb-order-btn-primary"
                          disabled={buyAgainLoadingId === order.items[0].id}
                          onClick={() => handleBuyAgain(order.items[0])}
                        >
                          {buyAgainLoadingId === order.items[0].id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          <span>Buy Again</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ====================================================================
          MODAL 1: VIEW DETAILS MODAL
          ==================================================================== */}
      {selectedOrderDetails && (
        <div className="mb-orders-modal-overlay" onClick={() => setSelectedOrderDetails(null)}>
          <div
            className="mb-orders-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-details-title"
          >
            <div className="mb-orders-modal-header">
              <h2 id="modal-details-title" className="mb-orders-modal-title">
                Order #{selectedOrderDetails.orderNumber || selectedOrderDetails.id}
              </h2>
              <button
                type="button"
                className="mb-orders-modal-close-btn"
                onClick={() => setSelectedOrderDetails(null)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-orders-modal-body">
              {/* Status & Placement Date */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                background: '#FAF7F2',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 13,
              }}>
                <div>
                  <span style={{ color: '#5A6B64' }}>Status: </span>
                  <strong style={{ color: '#063B2F', textTransform: 'capitalize' }}>
                    {selectedOrderDetails.orderStatus || selectedOrderDetails.status}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#5A6B64' }}>Placed: </span>
                  <strong>{formatOrderDate(selectedOrderDetails.createdAt)}</strong>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#123A30' }}>Items in this order</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(selectedOrderDetails.items || []).map((item) => {
                    const meta = getProductMeta();
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          border: '1px solid #E8DEC8',
                          borderRadius: 12,
                        }}
                      >
                        <img
                          src={getJewelleryImage(item.imageUrl, item.productName, item.productId)}
                          alt={item.productName}
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#123A30' }}>
                            {item.productName}
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: '#5A6B64' }}>
                            {meta.brand} • Qty: {item.quantity}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#123A30' }}>
                            {formatCurrency(item.subtotal || item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Cost Breakdown */}
              <div style={{
                background: '#FFF9FA',
                border: '1px solid #F6DDE2',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 13,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5A6B64' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrderDetails.subtotal || selectedOrderDetails.totalAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5A6B64' }}>
                  <span>Shipping Fee</span>
                  <span>
                    {(selectedOrderDetails.shippingAmount || selectedOrderDetails.shippingCharge)
                      ? formatCurrency(selectedOrderDetails.shippingAmount || selectedOrderDetails.shippingCharge)
                      : 'FREE'}
                  </span>
                </div>
                {(selectedOrderDetails.discountAmount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E7D32', fontWeight: 600 }}>
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(selectedOrderDetails.discountAmount)}</span>
                  </div>
                )}
                <div style={{
                  borderTop: '1px solid #ECD4DA',
                  paddingTop: 8,
                  marginTop: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: 15,
                  color: '#123A30',
                }}>
                  <span>Total Paid</span>
                  <span style={{ color: '#063B2F' }}>{formatCurrency(selectedOrderDetails.totalAmount)}</span>
                </div>
              </div>

              {/* Shipping Address Information */}
              <div style={{ fontSize: 13 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: '#123A30' }}>Delivery Address</h4>
                <div style={{ color: '#5A6B64', background: '#FAF7F2', padding: '10px 14px', borderRadius: 10 }}>
                  {typeof selectedOrderDetails.shippingAddress === 'string' ? (
                    <p style={{ margin: 0 }}>{selectedOrderDetails.shippingAddress}</p>
                  ) : selectedOrderDetails.shippingAddress ? (
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#123A30' }}>
                        {selectedOrderDetails.shippingAddress.fullName || user?.fullName || 'Valued Customer'}
                      </p>
                      <p style={{ margin: '3px 0 0 0' }}>
                        {selectedOrderDetails.shippingAddress.street || selectedOrderDetails.shippingAddress.addressLine1},{' '}
                        {selectedOrderDetails.shippingAddress.city}, {selectedOrderDetails.shippingAddress.state} -{' '}
                        {selectedOrderDetails.shippingAddress.zipCode || selectedOrderDetails.shippingAddress.postalCode}
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: 0 }}>Default Customer Address, New Delhi, India</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-orders-modal-footer">
              <button
                type="button"
                className="mb-order-btn-view-details"
                style={{ width: 'auto', padding: '0 20px' }}
                onClick={() => setSelectedOrderDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: CANCEL ORDER CONFIRMATION MODAL
          ==================================================================== */}
      {cancellingOrder && (
        <div className="mb-orders-modal-overlay" onClick={() => !cancelLoading && setCancellingOrder(null)}>
          <div
            className="mb-orders-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="cancel-modal-title"
          >
            <div className="mb-orders-modal-header">
              <h2 id="cancel-modal-title" className="mb-orders-modal-title" style={{ color: '#C62828' }}>
                Cancel Order #{cancellingOrder.orderNumber || cancellingOrder.id}
              </h2>
              <button
                type="button"
                className="mb-orders-modal-close-btn"
                disabled={cancelLoading}
                onClick={() => setCancellingOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-orders-modal-body">
              {cancelError && (
                <div style={{
                  background: '#FFEBEE',
                  color: '#C62828',
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <AlertCircle size={18} />
                  <span>{cancelError}</span>
                </div>
              )}

              <p style={{ margin: 0, fontSize: 14, color: '#063B2F', lineHeight: 1.5 }}>
                Are you sure you want to cancel this order?
              </p>

              <div style={{
                background: '#FAF7F2',
                border: '1px solid #E8DEC8',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 13,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#5A6B64' }}>Order Total:</span>
                  <strong>{formatCurrency(cancellingOrder.totalAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5A6B64' }}>Items:</span>
                  <span>{cancellingOrder.items?.length || 0} product(s)</span>
                </div>
              </div>

              <div style={{
                background: '#FFF8E1',
                border: '1px solid #FFE082',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12.5,
                color: '#8D6E14',
                lineHeight: 1.4,
              }}>
                <strong>Cancellation Policy:</strong> Orders can only be cancelled while in Confirmed or Pending status. If the order has already been packed or shipped, cancellation will be rejected according to store policy.
              </div>
            </div>

            <div className="mb-orders-modal-footer">
              <button
                type="button"
                className="mb-order-btn-view-details"
                style={{ width: 'auto', padding: '0 20px' }}
                disabled={cancelLoading}
                onClick={() => setCancellingOrder(null)}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="mb-order-btn-primary"
                style={{ width: 'auto', padding: '0 24px', background: '#C62828' }}
                disabled={cancelLoading}
                onClick={handleConfirmCancel}
              >
                {cancelLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: TRACK SHIPMENT MODAL
          ==================================================================== */}
      {trackingOrder && (
        <div className="mb-orders-modal-overlay" onClick={() => setTrackingOrder(null)}>
          <div className="mb-orders-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-orders-modal-header">
              <h2 className="mb-orders-modal-title">
                Shipment Tracking • #{trackingOrder.orderNumber || trackingOrder.id}
              </h2>
              <button
                type="button"
                className="mb-orders-modal-close-btn"
                onClick={() => setTrackingOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-orders-modal-body">
              <div style={{
                background: '#F4EBD8',
                border: '1px solid #E8DEC8',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <Truck size={24} style={{ color: '#063B2F' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#123A30' }}>
                    Carrier: MALKAZ delivery partner
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#5A6B64' }}>
                    Status: In Transit
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#063B2F', marginTop: 4 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#123A30' }}>Package In Transit</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: '#5A6B64' }}>
                      Departed sorting facility • {addDaysToDate(trackingOrder.createdAt, 2)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#D4AF63', marginTop: 4 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#123A30' }}>Order Dispatched & Packed</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: '#5A6B64' }}>
                      Package verified at central warehouse • {addDaysToDate(trackingOrder.createdAt, 1)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#D4AF63', marginTop: 4 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#123A30' }}>Order Confirmed</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: '#5A6B64' }}>
                      Payment captured successfully • {formatShortDate(trackingOrder.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-orders-modal-footer">
              <button
                type="button"
                className="mb-order-btn-view-details"
                style={{ width: 'auto', padding: '0 20px' }}
                onClick={() => setTrackingOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: WRITE A REVIEW MODAL
          ==================================================================== */}
      {reviewOrder && (
        <div className="mb-orders-modal-overlay" onClick={() => !reviewSubmitting && setReviewOrder(null)}>
          <div className="mb-orders-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-orders-modal-header">
              <h2 className="mb-orders-modal-title">Write a Product Review</h2>
              <button
                type="button"
                className="mb-orders-modal-close-btn"
                disabled={reviewSubmitting}
                onClick={() => setReviewOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="mb-orders-modal-body">
                {reviewError && (
                  <div style={{
                    background: '#FFEBEE',
                    color: '#C62828',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                  }}>
                    {reviewError}
                  </div>
                )}

                {/* Select Product from Order */}
                {reviewOrder.items && reviewOrder.items.length > 1 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#123A30' }}>
                      Choose Product to Review:
                    </label>
                    <select
                      value={reviewProductId || ''}
                      onChange={(e) => setReviewProductId(Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: 40,
                        borderRadius: 10,
                        border: '1px solid #E8DEC8',
                        padding: '0 12px',
                        fontSize: 13,
                        color: '#123A30',
                      }}
                    >
                      {reviewOrder.items.map((item) => (
                        <option key={item.id} value={item.productId}>
                          {item.productName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Star Rating Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#123A30' }}>
                    Rating:
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <Star
                          size={28}
                          fill={star <= reviewRating ? '#063B2F' : 'none'}
                          stroke={star <= reviewRating ? '#063B2F' : '#8B7445'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Text Area */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#123A30' }}>
                    Your Experience:
                  </label>
                  <textarea
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share what you love about this jewellery piece..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 12,
                      border: '1px solid #E8DEC8',
                      fontSize: 13.5,
                      boxSizing: 'border-box',
                      color: '#123A30',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div className="mb-orders-modal-footer">
                <button
                  type="button"
                  className="mb-order-btn-view-details"
                  style={{ width: 'auto', padding: '0 20px' }}
                  disabled={reviewSubmitting}
                  onClick={() => setReviewOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mb-order-btn-primary"
                  style={{ width: 'auto', padding: '0 24px' }}
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Review</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
