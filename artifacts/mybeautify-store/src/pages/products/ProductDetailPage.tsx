import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import {
  Search,
  Heart,
  ShoppingCart,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Package,
  MapPin,
  Ticket,
  Star,
  Headphones,
  LogOut,
  Sparkles,
  Plus,
  Minus,
  Share2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Banknote,
  Edit3,
} from 'lucide-react';
import { FaFacebookF, FaInstagram, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import {
  fetchProductById,
  fetchProducts,
  fetchProductReviews,
  submitProductReview,
  fetchCurrentUser,
  fetchCart,
  addToCart as apiAddToCart,
  updateCartItemQuantity,
  removeCartItem,
  fetchWishlist,
  addToWishlist as apiAddToWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  fetchOrders,
  fetchAddresses,
  addAddress as apiAddAddress,
  applyCoupon as apiApplyCoupon,
  getAuthToken,
  setAuthToken,
  type ProductResponse,
  type UserResponse,
  type CartResponse,
  type OrderResponse,
  type AddressResponse,
  type CouponResponse,
  type ReviewResponse,
} from '@/lib/api';
import MalkazProductCard, {
  formatCurrency,
  getDiscountPercent,
  getProductBadge,
  getProductSize,
  getProductRating,
} from '@/components/products/MalkazProductCard';
import '@/styles/customer-dashboard.css';
import '@/styles/product-detail.css';
import { HeaderSearchBar } from '@/components/common/HeaderSearchBar';
import { MalkazSidebar } from '@/components/layout/MalkazSidebar';
import { getJewelleryImage } from '@/lib/jewellery-images';
import { animateProductToCart, animateTrashCan } from '@/lib/cart-animations';

export function ProductDetailPage() {
  const params = useParams<{ productId?: string; id?: string }>();
  const productIdRaw = params.productId || params.id || '';
  const productId = parseInt(productIdRaw, 10);
  const [, setLocation] = useLocation();

  // Authentication & User State
  const [user, setUser] = useState<UserResponse | null>(null);

  // Layout & UI States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active sub-view modal
  const [activeModal, setActiveModal] = useState<
    'orders' | 'wishlist' | 'profile' | 'addresses' | 'coupons' | 'reviews' | 'support' | 'cart' | null
  >(null);

  // Product Data
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  // Purchase state
  const [quantity, setQuantity] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Cart & Wishlist State
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [removingCartItemId, setRemovingCartItemId] = useState<number | null>(null);
  const [wishlist, setWishlist] = useState<ProductResponse[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());

  // Search input in header
  const [searchQuery, setSearchQuery] = useState('');

  // Active tab in middle section
  const [activeTab, setActiveTab] = useState<'details' | 'delivery' | 'reviews' | 'care'>('details');

  // Delivery options state
  const [deliveryType, setDeliveryType] = useState<'standard' | 'express'>('standard');
  const [pincode, setPincode] = useState('110001');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>('Delivery available to New Delhi');
  const [selectedCity, setSelectedCity] = useState('New Delhi');

  // Reviews data & Review Form Modal
  const [reviewsList, setReviewsList] = useState<ReviewResponse[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Recommended Products
  const [recommendedProducts, setRecommendedProducts] = useState<ProductResponse[]>([]);
  const [recommendedPage, setRecommendedPage] = useState(0);

  // Additional data for sub-views
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [newAddress, setNewAddress] = useState({ street: '', city: '', state: '', zipCode: '', country: 'India' });
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState('');

  // Show toast notification helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Load user, cart, wishlist, and addresses
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser()
        .then((userData) => setUser(userData))
        .catch(() => {});

      fetchCart()
        .then((c) => setCart(c))
        .catch(() => {});

      fetchWishlist()
        .then((items) => {
          setWishlist(items);
          setWishlistIds(new Set(items.map((i) => i.id)));
        })
        .catch(() => {});

      fetchAddresses()
        .then((list) => {
          setAddresses(list);
          if (list.length > 0) {
            const def = list.find((a) => a.isDefault) || list[0];
            if (def.postalCode) setPincode(def.postalCode);
            if (def.city) setSelectedCity(def.city);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Fetch Product Details and Recommendations
  useEffect(() => {
    if (!productId || isNaN(productId)) {
      setError('Invalid product ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setActiveImageIndex(0);
    setQuantity(1);

    fetchProductById(productId)
      .then((data) => {
        setProduct(data);
        setLoading(false);

        // Fetch product reviews
        setReviewsLoading(true);
        fetchProductReviews(productId)
          .then((res) => {
            setReviewsList(res.content || []);
          })
          .catch(() => {})
          .finally(() => setReviewsLoading(false));

        // Fetch recommended products from the same category or overall catalog
        fetchProducts({ size: 10 })
          .then((catalog) => {
            const list = catalog.content || [];
            const filtered = list.filter((p) => p.id !== productId);
            setRecommendedProducts(filtered);
          })
          .catch(() => {});
      })
      .catch((err) => {
        console.error('Failed to load product:', err);
        setError(err.message || 'Product not found');
        setLoading(false);
      });
  }, [productId]);

  // Gallery images array
  const galleryImages = useMemo(() => {
    if (!product) return [];
    return [getJewelleryImage(product.imageUrl, product.name, product.id)];
  }, [product]);

  const productShareText = product
    ? `${product.name} — ${formatCurrency(product.sellingPrice || product.price)}`
    : '';
  const productShareUrl = typeof window === 'undefined' ? '' : window.location.href;

  const handleNativeProductShare = async (fallbackShareUrl?: string) => {
    if (!product || !productShareUrl) return;
    if (!navigator.share) {
      if (fallbackShareUrl) {
        openProductShare(fallbackShareUrl);
        return;
      }
      try {
        await navigator.clipboard.writeText(productShareUrl);
        showToast('Product link copied. Open it on your phone to share the photo with Instagram or other apps.');
      } catch {
        showToast('Sharing is unavailable in this browser. Copy the product link from the address bar.');
      }
      return;
    }

    let files: File[] = [];
    try {
      const imageResponse = await fetch(galleryImages[activeImageIndex] || galleryImages[0]);
      if (!imageResponse.ok) throw new Error('The product photo could not be loaded.');
      const image = await imageResponse.blob();
      const extension = image.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const fileName = `${product.name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'product'}.${extension}`;
      files = [new File([image], fileName, { type: image.type || 'image/jpeg' })];
    } catch {
      showToast('Could not attach the product photo; sharing the product link instead.');
    }

    const shareData: ShareData = {
      title: product.name,
      text: productShareText,
      url: productShareUrl,
    };
    const canShareImage = files.length > 0 && Boolean(navigator.canShare?.({ files }));
    if (canShareImage) {
      shareData.files = files;
    } else if (fallbackShareUrl) {
      openProductShare(fallbackShareUrl);
      return;
    }

    try {
      await navigator.share(shareData);
      setShareMenuOpen(false);
    } catch (shareError) {
      if (!(shareError instanceof Error && shareError.name === 'AbortError')) {
        showToast('The product could not be shared. Please try again.');
      }
    }
  };

  const handleCopyProductLink = async () => {
    try {
      await navigator.clipboard.writeText(productShareUrl);
      setShareMenuOpen(false);
      showToast('Product link copied.');
    } catch {
      showToast('Could not copy the product link. Please copy it from the address bar.');
    }
  };

  const openProductShare = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    setShareMenuOpen(false);
  };

  // Handle next / previous image in gallery
  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  // Add to Cart Handler
  const handleAddToCart = async () => {
    if (!product || cartLoading) return;
    const token = getAuthToken();
    if (!token) {
      showToast('Please log in or create an account to add items to your cart.');
      setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setCartLoading(true);
      const updatedCart = await apiAddToCart(product.id, quantity);
      setCart(updatedCart);
      showToast(`Added ${quantity} × "${product.name}" to cart.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to add item to cart.');
    } finally {
      setCartLoading(false);
    }
  };

  // Wishlist Toggle Handler
  const handleToggleWishlist = async () => {
    if (!product) return;
    const token = getAuthToken();
    if (!token) {
      showToast('Please log in or create an account to save items to your wishlist.');
      setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    const isSaved = wishlistIds.has(product.id);
    try {
      setWishlistLoading(true);
      if (isSaved) {
        await apiRemoveFromWishlist(product.id);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
        setWishlist((prev) => prev.filter((item) => item.id !== product.id));
        showToast(`Removed "${product.name}" from wishlist.`);
      } else {
        await apiAddToWishlist(product.id);
        setWishlistIds((prev) => new Set(prev).add(product.id));
        setWishlist((prev) => [...prev, product]);
        showToast(`Added "${product.name}" to wishlist.`);
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating wishlist.');
    } finally {
      setWishlistLoading(false);
    }
  };

  // Recommended Products Wishlist toggle
  const handleToggleRecWishlist = async (recProduct: ProductResponse) => {
    const token = getAuthToken();
    if (!token) {
      showToast('Please log in or create an account to save items to your wishlist.');
      setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    const isSaved = wishlistIds.has(recProduct.id);
    try {
      if (isSaved) {
        await apiRemoveFromWishlist(recProduct.id);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(recProduct.id);
          return next;
        });
        setWishlist((prev) => prev.filter((item) => item.id !== recProduct.id));
        showToast(`Removed "${recProduct.name}" from wishlist.`);
      } else {
        await apiAddToWishlist(recProduct.id);
        setWishlistIds((prev) => new Set(prev).add(recProduct.id));
        setWishlist((prev) => [...prev, recProduct]);
        showToast(`Added "${recProduct.name}" to wishlist.`);
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating wishlist.');
    }
  };

  // Recommended Products Add to Cart
  const handleAddRecToCart = async (recProduct: ProductResponse) => {
    const token = getAuthToken();
    if (!token) {
      showToast('Please log in or create an account to add items to your cart.');
      setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    try {
      const updated = await apiAddToCart(recProduct.id, 1);
      setCart(updated);
      showToast(`Added "${recProduct.name}" to cart.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to add item to cart.');
    }
  };

  // Check PIN Code
  const handleCheckPincode = () => {
    const trimmed = pincode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setPincodeStatus('Please enter a valid 6-digit Indian PIN code.');
      return;
    }
    setPincodeStatus(`Available! Standard: 2–4 days, Express: 1–2 days to ${trimmed}`);
  };

  // Keyboard navigation for accessible tabs
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs: Array<'details' | 'delivery' | 'reviews' | 'care'> = [
      'details',
      'delivery',
      'reviews',
      'care',
    ];
    const currentIndex = tabs.indexOf(activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      setActiveTab(nextTab);
      document.getElementById(`mb-tab-${nextTab}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      setActiveTab(prevTab);
      document.getElementById(`mb-tab-${prevTab}`)?.focus();
    }
  };

  // Submit Review Form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!reviewComment.trim()) {
      showToast('Please enter your review feedback.');
      return;
    }

    try {
      setReviewSubmitting(true);
      // Fetch delivered orders to check verified purchase requirement
      const ordersData = await fetchOrders();
      const deliveredOrders = (ordersData.content || []).filter(
        (o) => o.orderStatus === 'DELIVERED'
      );

      const matchingOrder = deliveredOrders.find((o) =>
        o.items?.some((item) => item.productId === product.id)
      );

      if (!matchingOrder) {
        showToast('Review requires a verified delivered purchase. Order this product first!');
        setReviewModalOpen(false);
        setReviewSubmitting(false);
        return;
      }

      await submitProductReview(product.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
        orderId: matchingOrder.id,
      });

      showToast('Thank you! Your review has been submitted for approval.');
      setReviewModalOpen(false);
      setReviewComment('');
    } catch (err: any) {
      showToast(err.message || 'Review requires an authenticated delivered order.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Cart quantity controls for cart modal
  const handleUpdateCartQty = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      const updated = await updateCartItemQuantity(itemId, newQty);
      setCart(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to update quantity.');
    }
  };

  const handleRemoveCartItem = async (itemId: number, removeButton: HTMLElement) => {
    if (removingCartItemId !== null) return;
    setRemovingCartItemId(itemId);
    let restoreTrashIcon = () => {};
    try {
      restoreTrashIcon = await animateTrashCan(removeButton);
      await removeCartItem(itemId);
      const updated = await fetchCart();
      setCart(updated);
      showToast('Item removed from cart.');
    } catch (err: any) {
      restoreTrashIcon();
      showToast(err.message || 'Failed to remove item.');
    } finally {
      setRemovingCartItemId(null);
    }
  };

  // Add Address Handler
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.street || !newAddress.city) {
      showToast('Please enter street and city.');
      return;
    }
    try {
      const created = await apiAddAddress(newAddress);
      setAddresses((prev) => [...prev, created]);
      setNewAddress({ street: '', city: '', state: '', zipCode: '', country: 'India' });
      showToast('Address added successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to add address.');
    }
  };

  // Apply Coupon Handler
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCodeInput.trim()) return;
    try {
      const subtotal = cart?.subtotal || 100;
      const res = await apiApplyCoupon(couponCodeInput.trim(), subtotal);
      setCouponResult(res);
      showToast(`Coupon ${res.code} applied successfully!`);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code.');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setLocation('/sign-in');
  };

  const customerName = user?.fullName || user?.email || '';
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const wishlistCount = wishlistIds.size;

  // Active product attributes
  const badge = product ? getProductBadge(product) : null;
  const isWishlisted = product ? wishlistIds.has(product.id) : false;
  const discount = product ? getDiscountPercent(product.price, product.discountPrice) : null;
  const displayPrice = product ? (product.sellingPrice || product.price) : 0;
  const rating = product ? getProductRating(product) : 0;
  const reviewCount = reviewsList.length;
  const displaySize = product ? getProductSize(product) : '—';

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="mb-dashboard-layout">
        <MalkazSidebar
          activeItem="shop"
          isOpen={mobileSidebarOpen}
          isSignedIn={Boolean(getAuthToken())}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
        />
        <div className="mb-main-content">
          <header className="mb-top-header" />
          <main className="mb-page-body" style={{ padding: 32 }}>
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mb-primary)' }}>
              <Loader2 size={38} className="animate-spin" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontFamily: 'var(--mb-font-serif)', fontSize: 26, margin: 0 }}>
                Loading product details...
              </h2>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error / Not-Found State
  if (error || !product) {
    return (
      <div className="mb-dashboard-layout">
        <MalkazSidebar
          activeItem="shop"
          isOpen={mobileSidebarOpen}
          isSignedIn={Boolean(user)}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
        />

        <div className="mb-main-content">
          <header className="mb-top-header">
            <button
              type="button"
              className="mb-mobile-hamburger"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileSidebarOpen}
              aria-controls="malkaz-navigation"
            >
              <span className="mz-hamburger-mark" aria-hidden="true"><span /><span /></span>
            </button>
            <HeaderSearchBar
              value=""
              onChange={() => {}}
              onSubmit={(val) => {
                if (val.trim()) setLocation(`/shop?q=${encodeURIComponent(val.trim())}`);
              }}
              placeholder="Search for products, brands and more..."
            />
          </header>

          <main className="mb-page-body" style={{ padding: 32 }}>
            <div className="mb-empty-state" style={{ padding: '60px 20px' }}>
              <div className="mb-empty-icon">
                <AlertCircle size={32} />
              </div>
              <h3 className="mb-empty-title">Product Not Found</h3>
              <p className="mb-empty-desc">
                {error || "The jewellery piece you are looking for is unavailable or doesn't exist."}
              </p>
              <Link
                href="/shop"
                className="mb-card-add-btn"
                style={{ width: 'auto', padding: '0 28px', textDecoration: 'none', display: 'inline-flex' }}
              >
                Back to Shop Catalog
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-dashboard-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-toast">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <MalkazSidebar
        activeItem="shop"
        isOpen={mobileSidebarOpen}
        isSignedIn={Boolean(user)}
        onClose={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
        onAction={(action) => {
          if (!user) {
            showToast('Please log in to access your account.');
            setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
            return;
          }
          if (action === 'addresses') {
            fetchAddresses()
              .then(setAddresses)
              .catch((err) => showToast(err.message || 'Failed to load addresses.'));
            setActiveModal('addresses');
          } else if (action === 'reviews') {
            setActiveTab('reviews');
            document.getElementById('middle-reviews-section')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            setActiveModal(action);
          }
        }}
      />

      <div className="mb-main-content">
        {/* Top Header */}
        <header className="mb-top-header">
          <button
            type="button"
            className="mb-mobile-hamburger"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileSidebarOpen}
            aria-controls="malkaz-navigation"
          >
            <span className="mz-hamburger-mark" aria-hidden="true"><span /><span /></span>
          </button>

          {/* Search bar */}
          <HeaderSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={(val) => {
              if (val.trim()) {
                setLocation(`/shop?q=${encodeURIComponent(val.trim())}`);
              }
            }}
            placeholder="Search for products, brands and more..."
          />

          {/* Right Header Icons */}
          <div className="mb-header-right-actions">
            <button
              type="button"
              className="mb-header-icon-btn"
              onClick={() => {
                if (!user) {
                  showToast('Please log in or create an account to view your wishlist.');
                  setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
                  return;
                }
                setActiveModal('wishlist');
              }}
              aria-label="View wishlist"
              data-testid="header-wishlist-btn"
            >
              <Heart size={20} />
              {wishlistCount > 0 && <span className="mb-header-badge">{wishlistCount}</span>}
            </button>

            <button
              type="button"
              className="mb-header-icon-btn"
              onClick={() => {
                if (!user) {
                  showToast('Please log in or create an account to view your cart.');
                  setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
                  return;
                }
                setActiveModal('cart');
              }}
              aria-label="View cart"
              data-testid="header-cart-btn"
            >
              <ShoppingCart size={20} />
              {cartItemCount > 0 && <span className="mb-header-badge">{cartItemCount}</span>}
            </button>

            {/* Profile Chip or Sign-In buttons */}
            {user ? (
              <div className="mb-header-profile-wrap">
                <button
                  type="button"
                  className="mb-header-profile-chip"
                  onClick={() => setProfileDropdownOpen((o) => !o)}
                  aria-expanded={profileDropdownOpen}
                  aria-label="User account menu"
                >
                  <div className="mb-header-avatar" aria-hidden="true">
                    <UserIcon size={18} />
                  </div>
                  <span className="mb-header-profile-name">{customerName}</span>
                  <ChevronDown
                    size={15}
                    className="mb-header-profile-chevron"
                    style={{
                      transform: profileDropdownOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>

                {profileDropdownOpen && (
                  <div className="mb-header-profile-menu">
                    <div className="mb-profile-menu-header">
                      <div className="mb-profile-menu-name">{customerName}</div>
                      <div className="mb-profile-menu-email">{user?.email}</div>
                    </div>

                    <button
                      type="button"
                      className="mb-profile-menu-item"
                      onClick={() => {
                        setActiveModal('profile');
                        setProfileDropdownOpen(false);
                      }}
                    >
                      <UserIcon size={15} />
                      <span>My Profile</span>
                    </button>

                    <button
                      type="button"
                      className="mb-profile-menu-item"
                      onClick={() => {
                        fetchOrders().then((o) => setOrders(o.content || [])).catch(() => {});
                        setActiveModal('orders');
                        setProfileDropdownOpen(false);
                      }}
                    >
                      <Package size={15} />
                      <span>My Orders</span>
                    </button>

                    <button
                      type="button"
                      className="mb-profile-menu-item"
                      onClick={() => {
                        fetchAddresses().then((a) => setAddresses(a)).catch(() => {});
                        setActiveModal('addresses');
                        setProfileDropdownOpen(false);
                      }}
                    >
                      <MapPin size={15} />
                      <span>Saved Addresses</span>
                    </button>

                    <button
                      type="button"
                      className="mb-profile-menu-item"
                      onClick={() => {
                        setActiveModal('wishlist');
                        setProfileDropdownOpen(false);
                      }}
                    >
                      <Heart size={15} />
                      <span>Saved Wishlist</span>
                    </button>

                    <button
                      type="button"
                      className="mb-profile-menu-item logout"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link
                  href="/sign-in"
                  className="mb-auth-nav-btn login"
                  style={{
                    padding: '7px 15px',
                    borderRadius: 999,
                    border: '1px solid #D4AF63',
                    color: '#063B2F',
                    background: '#F4EBD8',
                    fontWeight: 600,
                    fontSize: 13,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <UserIcon size={14} />
                  <span>Login</span>
                </Link>
                <Link
                  href="/register"
                  className="mb-auth-nav-btn register"
                  style={{
                    padding: '7px 15px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #063B2F 0%, #063B2F 100%)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 13,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(138,21,56,0.2)',
                  }}
                >
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="mb-page-body mb-product-detail-body">
          {/* Breadcrumb Navigation */}
          <nav className="mb-breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="mb-breadcrumb-link">
              Home
            </Link>
            <ChevronRight size={14} className="mb-breadcrumb-sep" />
            <Link href={`/shop?category=${encodeURIComponent(product.categoryName)}`} className="mb-breadcrumb-link">
              {product.categoryName}
            </Link>
            <ChevronRight size={14} className="mb-breadcrumb-sep" />
            <span className="mb-breadcrumb-link">{product.categoryName || 'Fine Jewellery'}</span>
            <ChevronRight size={14} className="mb-breadcrumb-sep" />
            <span className="mb-breadcrumb-current">{product.name}</span>
          </nav>

          {/* ==================================================================
              MAIN PRODUCT HERO (Gallery + Purchase Info)
              ================================================================== */}
          <section className="mb-detail-hero">
            {/* LEFT: IMAGE GALLERY */}
            <div className="mb-gallery-wrap">
              <div className="mb-gallery-main-card">
                {badge && <span className="mb-gallery-badge">{badge.text}</span>}

                <div className="mb-gallery-action-buttons">
                  <button
                    type="button"
                    className={`mb-gallery-wish-btn ${isWishlisted ? 'active' : ''}`}
                    onClick={handleToggleWishlist}
                    disabled={wishlistLoading}
                    aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    data-testid="detail-wishlist-toggle"
                  >
                    <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    type="button"
                    className="mb-gallery-share-btn"
                    onClick={() => setShareMenuOpen((open) => !open)}
                    aria-label="Share product"
                    aria-expanded={shareMenuOpen}
                    aria-controls="product-share-menu"
                    data-testid="product-share-toggle"
                  >
                    <Share2 size={18} />
                  </button>
                </div>

                {shareMenuOpen && (
                  <div className="mb-product-share-menu" id="product-share-menu" role="menu" aria-label="Share product">
                    <button type="button" role="menuitem" onClick={() => { void handleNativeProductShare(`https://wa.me/?text=${encodeURIComponent(`${productShareText}\n${productShareUrl}`)}`); }}>
                      <FaWhatsapp className="whatsapp" size={18} /> WhatsApp
                    </button>
                    <button type="button" role="menuitem" onClick={() => { void handleNativeProductShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productShareUrl)}&quote=${encodeURIComponent(productShareText)}`); }}>
                      <FaFacebookF className="facebook" size={17} /> Facebook
                    </button>
                    <button type="button" role="menuitem" onClick={() => { void handleNativeProductShare(); }}>
                      <FaInstagram className="instagram" size={18} /> Instagram
                    </button>
                    <button type="button" role="menuitem" onClick={() => openProductShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(productShareText)}&url=${encodeURIComponent(productShareUrl)}`)}>
                      <FaTwitter className="twitter" size={17} /> X / Twitter
                    </button>
                    <button type="button" role="menuitem" onClick={() => { void handleNativeProductShare(); }}>
                      <Share2 size={17} /> More apps
                    </button>
                    <button type="button" role="menuitem" onClick={() => { void handleCopyProductLink(); }}>
                      <Copy size={17} /> Copy link
                    </button>
                  </div>
                )}

                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="mb-gallery-arrow prev"
                      onClick={handlePrevImage}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      className="mb-gallery-arrow next"
                      onClick={handleNextImage}
                      aria-label="Next image"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                <img
                  src={galleryImages[activeImageIndex] || galleryImages[0]}
                  alt={product.name}
                  className="mb-gallery-main-img"
                  data-testid="main-product-image"
                  onError={(event) => {
                    event.currentTarget.src = getJewelleryImage(null, product.name, product.id);
                  }}
                />
              </div>

              {/* Thumbnail row below main image */}
              <div className="mb-thumbnails-row">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`mb-thumbnail-item ${activeImageIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`View angle ${idx + 1}`}
                    data-testid={`thumbnail-img-${idx}`}
                  >
                    <img src={imgUrl} alt={`${product.name} preview ${idx + 1}`} className="mb-thumbnail-img" />
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: PURCHASE INFORMATION */}
            <div className="mb-detail-info">
              <div className="mb-detail-brand">{product.brandName || 'MALKAZ'}</div>
              <h1 className="mb-detail-title">{product.name}</h1>

              <div className="mb-detail-specs-row">
                <span>{product.categoryName || 'Fine Jewellery'}</span>
                <span className="mb-detail-specs-dot">|</span>
                <span>MALKAZ</span>
                <span className="mb-detail-specs-dot">|</span>
                <span>{displaySize}</span>
              </div>

              {/* Rating & Reviews row */}
              <div
                className="mb-detail-rating-row"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('reviews');
                  const section = document.getElementById('mb-details-section');
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Click to view customer reviews"
              >
                {rating > 0 && (
                  <span className="mb-detail-stars">
                    {'★'.repeat(Math.min(5, Math.max(1, Math.round(rating))))}
                  </span>
                )}
                <span className="mb-detail-rating-text">
                  {rating > 0
                    ? `${rating.toFixed(1)}${reviewCount > 0 ? ` (${reviewCount} Reviews)` : ''}`
                    : 'No ratings yet'}
                </span>
              </div>

              {/* Pricing row */}
              <div className="mb-detail-price-row">
                <span className="mb-detail-current-price">
                  {formatCurrency(displayPrice)}
                </span>
                {product.discountPrice && product.discountPrice < product.price && (
                  <span className="mb-detail-original-price">
                    {formatCurrency(product.price)}
                  </span>
                )}
                {discount && <span className="mb-detail-discount-pill">{discount}</span>}
              </div>

              {/* Short description */}
              <p className="mb-detail-description">
                {product.description ||
                  `${product.name} from the MALKAZ fine jewellery collection.`}
              </p>

              {/* 4 Benefit Icon Highlights */}
              <div className="mb-benefit-pills-row">
                <div className="mb-benefit-pill-item">
                  <div className="mb-benefit-pill-icon">
                    <Star size={18} />
                  </div>
                  <span className="mb-benefit-pill-label">Timeless design</span>
                </div>

                <div className="mb-benefit-pill-item">
                  <div className="mb-benefit-pill-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="mb-benefit-pill-label">MALKAZ collection</span>
                </div>

                <div className="mb-benefit-pill-item">
                  <div className="mb-benefit-pill-icon">
                    <Sparkles size={18} />
                  </div>
                  <span className="mb-benefit-pill-label">Made for meaningful moments</span>
                </div>

                <div className="mb-benefit-pill-item">
                  <div className="mb-benefit-pill-icon">
                    <Heart size={18} />
                  </div>
                  <span className="mb-benefit-pill-label">A thoughtful gift</span>
                </div>
              </div>

              {/* Quantity Selector and Buttons */}
              <div className="mb-detail-actions-row">
                <div className="mb-quantity-selector">
                  <button
                    type="button"
                    className="mb-qty-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || product.stockQuantity === 0}
                    aria-label="Decrease quantity"
                    data-testid="btn-decrease-qty"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="mb-qty-value" data-testid="qty-display">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="mb-qty-btn"
                    onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                    disabled={quantity >= product.stockQuantity || product.stockQuantity === 0}
                    aria-label="Increase quantity"
                    data-testid="btn-increase-qty"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  className="mb-detail-add-cart-btn"
                  disabled={cartLoading || product.stockQuantity === 0}
                  onClick={(event) => {
                    animateProductToCart(event.currentTarget);
                    void handleAddToCart();
                  }}
                  data-testid="btn-detail-add-to-cart"
                >
                  {cartLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ShoppingCart size={18} />
                  )}
                  <span>
                    {product.stockQuantity === 0
                      ? 'Out of Stock'
                      : cartLoading
                      ? 'Adding...'
                      : 'Add to Cart'}
                  </span>
                </button>

                <button
                  type="button"
                  className={`mb-detail-wishlist-btn ${isWishlisted ? 'active' : ''}`}
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  data-testid="btn-detail-add-wishlist"
                >
                  <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
                  <span>{isWishlisted ? 'Saved' : 'Add to Wishlist'}</span>
                </button>
              </div>

              {/* Delivery and Stock Meta Line */}
              <div className="mb-detail-meta-line">
                <div className="mb-delivery-estimate-badge">
                  <Truck size={17} style={{ color: 'var(--mb-primary)' }} />
                  <span>Expected Delivery: 2 - 5 Days</span>
                </div>

                {product.stockQuantity > 0 ? (
                  <div className="mb-stock-badge-green">
                    <span>● In Stock</span>
                    <span style={{ color: 'var(--mb-text-muted)', fontSize: 12 }}>
                      ({product.stockQuantity} available)
                    </span>
                  </div>
                ) : (
                  <div className="mb-stock-badge-red">
                    <span>● Out of Stock</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ==================================================================
              MIDDLE SECTION: TABS & 4-COLUMN DETAILED PANELS
              ================================================================== */}
          {/* ==================================================================
              MIDDLE SECTION: TABS & CONDITIONALLY RENDERED PANELS
              ================================================================== */}
          <section className="mb-details-section" id="mb-details-section">
            <div
              className="mb-tab-header"
              role="tablist"
              aria-label="Product Information Tabs"
              onKeyDown={handleTabKeyDown}
            >
              <button
                id="mb-tab-details"
                type="button"
                role="tab"
                aria-selected={activeTab === 'details'}
                aria-controls="mb-panel-details"
                tabIndex={activeTab === 'details' ? 0 : -1}
                className={`mb-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Product Details
              </button>
              <button
                id="mb-tab-delivery"
                type="button"
                role="tab"
                aria-selected={activeTab === 'delivery'}
                aria-controls="mb-panel-delivery"
                tabIndex={activeTab === 'delivery' ? 0 : -1}
                className={`mb-tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
                onClick={() => setActiveTab('delivery')}
              >
                Delivery & Returns
              </button>
              <button
                id="mb-tab-reviews"
                type="button"
                role="tab"
                aria-selected={activeTab === 'reviews'}
                aria-controls="middle-reviews-section"
                tabIndex={activeTab === 'reviews' ? 0 : -1}
                className={`mb-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Reviews ({reviewCount})
              </button>
              <button
                id="mb-tab-care"
                type="button"
                role="tab"
                aria-selected={activeTab === 'care'}
                aria-controls="mb-panel-care"
                tabIndex={activeTab === 'care' ? 0 : -1}
                className={`mb-tab-btn ${activeTab === 'care' ? 'active' : ''}`}
                onClick={() => setActiveTab('care')}
              >
                Jewellery Care
              </button>
            </div>

            {/* Tab Content Container: Renders Only ONE Active Panel At A Time */}
            <div className="mb-tab-content-container">
              {/* TAB 1: Product Details */}
              {activeTab === 'details' && (
                <div
                  id="mb-panel-details"
                  role="tabpanel"
                  aria-labelledby="mb-tab-details"
                  className="mb-tab-panel mb-tab-panel-details"
                >
                  <div className="mb-panel-grid-2col">
                    <div className="mb-panel-col-main">
                      <h3 className="mb-col-heading">Product Overview</h3>
                      <p className="mb-panel-desc">
                        {product.description || `${product.name} from the MALKAZ fine jewellery collection.`}
                      </p>

                      <h4 className="mb-panel-subheading">The MALKAZ edit</h4>
                      <ul className="mb-feature-checklist">
                        <li className="mb-feature-check-item">
                          <span className="mb-check-icon-circle">✓</span>
                          <span>Timeless design for your jewellery collection</span>
                        </li>
                        <li className="mb-feature-check-item">
                          <span className="mb-check-icon-circle">✓</span>
                          <span>Thoughtfully selected by MALKAZ</span>
                        </li>
                        <li className="mb-feature-check-item">
                          <span className="mb-check-icon-circle">✓</span>
                          <span>A considered choice for gifting or keeping</span>
                        </li>
                      </ul>

                      <h4 className="mb-panel-subheading">Jewellery Care</h4>
                      <div className="mb-how-to-use-box">
                        <p>
                          Store your jewellery in a soft, dry place and avoid direct contact with perfumes, chemicals, and moisture.
                        </p>
                      </div>
                    </div>

                    <div className="mb-panel-col-side">
                      <h3 className="mb-col-heading">Product Specifications</h3>
                      <table className="mb-specs-table">
                        <tbody>
                          <tr>
                            <td className="mb-specs-label">Brand</td>
                            <td className="mb-specs-val">{product.brandName || 'MALKAZ'}</td>
                          </tr>
                          <tr>
                            <td className="mb-specs-label">Category</td>
                            <td className="mb-specs-val">{product.categoryName}</td>
                          </tr>
                          <tr>
                            <td className="mb-specs-label">Size</td>
                            <td className="mb-specs-val">{displaySize}</td>
                          </tr>
                          <tr>
                            <td className="mb-specs-label">SKU</td>
                            <td className="mb-specs-val">{product.sku}</td>
                          </tr>
                          <tr>
                            <td className="mb-specs-label">Country of Origin</td>
                            <td className="mb-specs-val">India</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mb-specs-highlights-card">
                        <div className="mb-specs-highlight-item">
                          <span className="mb-specs-highlight-icon">✦</span>
                          <span>MALKAZ</span>
                        </div>
                        <div className="mb-specs-highlight-item">
                          <span className="mb-specs-highlight-icon">✦</span>
                          <span>Timeless jewellery designs</span>
                        </div>
                        <div className="mb-specs-highlight-item">
                          <span className="mb-specs-highlight-icon">✦</span>
                          <span>Thoughtful gifting choices</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Delivery & Returns */}
              {activeTab === 'delivery' && (
                <div
                  id="mb-panel-delivery"
                  role="tabpanel"
                  aria-labelledby="mb-tab-delivery"
                  className="mb-tab-panel mb-tab-panel-delivery"
                >
                  <div className="mb-panel-grid-2col">
                    <div className="mb-panel-col-main">
                      <div className="mb-delivery-panel">
                        <h3 className="mb-col-heading">
                          <Truck size={18} style={{ color: 'var(--mb-primary)' }} />
                          <span>Delivery & Shipping Information</span>
                        </h3>

                        <div className="mb-delivery-header-row">
                          <div className="mb-delivery-loc">
                            <span>Deliver to</span>
                            <MapPin size={14} style={{ color: 'var(--mb-primary)' }} />
                            <strong>{pincode} - {selectedCity}</strong>
                          </div>
                          <button
                            type="button"
                            className="mb-delivery-change-btn"
                            onClick={() => {
                              fetchAddresses().then((a) => setAddresses(a)).catch(() => {});
                              setActiveModal('addresses');
                            }}
                          >
                            Change
                          </button>
                        </div>

                        {/* PIN Code check box */}
                        <div className="mb-pincode-check-row">
                          <input
                            type="text"
                            className="mb-pincode-input"
                            placeholder="Enter Pincode"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            maxLength={6}
                          />
                          <button
                            type="button"
                            className="mb-pincode-check-btn"
                            onClick={handleCheckPincode}
                          >
                            CHECK
                          </button>
                        </div>
                        {pincodeStatus && (
                          <div style={{ fontSize: 12, color: '#2B7A4B', marginBottom: 14, fontWeight: 600 }}>
                            ✓ {pincodeStatus}
                          </div>
                        )}

                        {/* Delivery radio options */}
                        <div className="mb-delivery-options">
                          <label
                            className={`mb-del-option-card ${deliveryType === 'standard' ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="delOption"
                              className="mb-del-radio"
                              checked={deliveryType === 'standard'}
                              onChange={() => setDeliveryType('standard')}
                            />
                            <div className="mb-del-option-body">
                              <div className="mb-del-option-title">
                                <span>Standard Delivery</span>
                              </div>
                              <div className="mb-del-option-desc">
                                <strong>FREE</strong> on orders above ₹499 or standard shipping fee.
                              </div>
                              <div className="mb-del-option-desc">
                                Estimated delivery: 2 - 4 business days · Dispatches within 24 hours
                              </div>
                            </div>
                          </label>

                          <label
                            className={`mb-del-option-card ${deliveryType === 'express' ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="delOption"
                              className="mb-del-radio"
                              checked={deliveryType === 'express'}
                              onChange={() => setDeliveryType('express')}
                            />
                            <div className="mb-del-option-body">
                              <div className="mb-del-option-title">
                                <span>Express Delivery</span>
                                <span className="mb-del-extra-pill">₹99 Extra</span>
                              </div>
                              <div className="mb-del-option-desc">
                                Get it in 1 – 2 business days.
                              </div>
                              <div className="mb-del-option-desc">
                                Order within 2 hrs for same-day priority dispatch.
                              </div>
                            </div>
                          </label>
                        </div>

                        {/* Delivery Perks */}
                        <div className="mb-del-perks">
                          <div className="mb-del-perk-item">
                            <Banknote size={15} style={{ color: 'var(--mb-primary)' }} />
                            <span>Cash on Delivery (COD) available</span>
                          </div>
                          <div className="mb-del-perk-item">
                            <ShieldCheck size={15} style={{ color: 'var(--mb-primary)' }} />
                            <span>Safe & Hygienic Delivery with contactless handover</span>
                          </div>
                          <div className="mb-del-perk-item">
                            <RotateCcw size={15} style={{ color: 'var(--mb-primary)' }} />
                            <span>7 Days Easy Return Policy for unopened items</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-panel-col-side">
                      <div className="mb-return-policy-card">
                        <h3 className="mb-col-heading">
                          <RotateCcw size={18} style={{ color: 'var(--mb-primary)' }} />
                          <span>Returns & Replacement Policy</span>
                        </h3>

                        <div className="mb-return-step">
                          <div className="mb-return-step-num">1</div>
                          <div className="mb-return-step-text">
                            <strong>7-Day Return Window</strong>
                            <p>You can request a return or replacement within 7 days of order delivery.</p>
                          </div>
                        </div>

                        <div className="mb-return-step">
                          <div className="mb-return-step-num">2</div>
                          <div className="mb-return-step-text">
                            <strong>Condition Requirements</strong>
                            <p>Products must be unused, sealed in original packaging with tags and invoice intact.</p>
                          </div>
                        </div>

                        <div className="mb-return-step">
                          <div className="mb-return-step-num">3</div>
                          <div className="mb-return-step-text">
                            <strong>Quick Doorstep Pickup</strong>
                            <p>Our courier picks up the product from your address. Full refund issued upon receipt.</p>
                          </div>
                        </div>

                        <div className="mb-return-guarantee-note">
                          <ShieldCheck size={16} />
                          <span>100% Buyer Protection & Money Back Guarantee</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Reviews */}
              {activeTab === 'reviews' && (
                <div
                  id="middle-reviews-section"
                  role="tabpanel"
                  aria-labelledby="mb-tab-reviews"
                  className="mb-tab-panel mb-tab-panel-reviews"
                >
                  <div className="mb-panel-reviews-layout">
                    {/* Left: Score Overview & Rating Distribution */}
                    <div className="mb-reviews-summary-card">
                      <h3 className="mb-col-heading">Customer Ratings</h3>
                      <div className="mb-reviews-overview">
                        <span className="mb-score-big">{rating.toFixed(1)}</span>
                        <div className="mb-score-meta">
                          <div className="mb-score-stars">{'★'.repeat(Math.min(5, Math.max(1, Math.round(rating))))}</div>
                          <span className="mb-score-count">Based on {reviewCount} reviews</span>
                        </div>
                      </div>

                      {/* Rating distribution breakdown bars */}
                      <div className="mb-rating-breakdown">
                        <div className="mb-dist-row">
                          <span>5 ★</span>
                          <div className="mb-dist-bar-bg">
                            <div className="mb-dist-bar-fill" style={{ width: '75%' }} />
                          </div>
                          <span className="mb-dist-pct">75%</span>
                        </div>
                        <div className="mb-dist-row">
                          <span>4 ★</span>
                          <div className="mb-dist-bar-bg">
                            <div className="mb-dist-bar-fill" style={{ width: '10%' }} />
                          </div>
                          <span className="mb-dist-pct">10%</span>
                        </div>
                        <div className="mb-dist-row">
                          <span>3 ★</span>
                          <div className="mb-dist-bar-bg">
                            <div className="mb-dist-bar-fill" style={{ width: '6%' }} />
                          </div>
                          <span className="mb-dist-pct">6%</span>
                        </div>
                        <div className="mb-dist-row">
                          <span>2 ★</span>
                          <div className="mb-dist-bar-bg">
                            <div className="mb-dist-bar-fill" style={{ width: '3%' }} />
                          </div>
                          <span className="mb-dist-pct">3%</span>
                        </div>
                        <div className="mb-dist-row">
                          <span>1 ★</span>
                          <div className="mb-dist-bar-bg">
                            <div className="mb-dist-bar-fill" style={{ width: '1%' }} />
                          </div>
                          <span className="mb-dist-pct">1%</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mb-write-review-btn"
                        onClick={() => setReviewModalOpen(true)}
                      >
                        <Edit3 size={15} />
                        <span>Write a Review</span>
                      </button>
                    </div>

                    {/* Right: Reviews List */}
                    <div className="mb-reviews-feed-container">
                      <div className="mb-reviews-feed-header">
                        <h3 className="mb-col-heading">Customer Reviews ({reviewCount})</h3>
                        <span className="mb-reviews-feed-sub">Real feedback from verified purchasers</span>
                      </div>

                      <div className="mb-reviews-list">
                        {/* Render backend reviews if any exist */}
                        {reviewsList.map((rev) => (
                          <div key={rev.id} className="mb-review-card">
                            <div className="mb-review-user-row">
                              <div className="mb-review-avatar">
                                {(rev.customerName || rev.authorName || 'User')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="mb-review-user-name">
                                  {rev.customerName || rev.authorName || 'Verified Customer'}
                                </div>
                                <span className="mb-verified-badge">
                                  <CheckCircle2 size={12} /> Verified Purchase
                                </span>
                              </div>
                            </div>

                            <div className="mb-review-rating-row">
                              <span className="mb-review-stars">{'★'.repeat(rev.rating)}</span>
                              <span className="mb-review-date">
                                {new Date(rev.createdAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>

                            <p className="mb-review-text">{rev.comment}</p>
                          </div>
                        ))}

                        {!reviewsLoading && reviewsList.length === 0 && (
                          <p className="mb-review-text">No reviews yet. Be the first to share your experience.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Jewellery care */}
              {activeTab === 'care' && (
                <div
                  id="mb-panel-care"
                  role="tabpanel"
                  aria-labelledby="mb-tab-care"
                  className="mb-tab-panel mb-tab-panel-ingredients"
                >
                  <div className="mb-ingredients-panel-view">
                    <div className="mb-ingredients-header">
                      <h3 className="mb-col-heading">Caring for your jewellery</h3>
                      <p className="mb-ingredients-sub">
                        A few simple steps help keep your MALKAZ pieces looking their best.
                      </p>
                    </div>

                    <div className="mb-ingredients-grid">
                      <div className="mb-ingredient-card">
                        <div className="mb-ingredient-info">
                          <span className="mb-ingredient-title">Store with care</span>
                          <span className="mb-ingredient-desc">Keep each piece in a soft, dry pouch or jewellery box.</span>
                        </div>
                      </div>
                      <div className="mb-ingredient-card">
                        <div className="mb-ingredient-info">
                          <span className="mb-ingredient-title">Avoid contact with chemicals</span>
                          <span className="mb-ingredient-desc">Apply perfume before putting on your jewellery.</span>
                        </div>
                      </div>
                      <div className="mb-ingredient-card">
                        <div className="mb-ingredient-info">
                          <span className="mb-ingredient-title">Wipe gently</span>
                          <span className="mb-ingredient-desc">Use a clean, soft cloth after wearing to remove everyday residue.</span>
                        </div>
                      </div>
                      <div className="mb-ingredient-card">
                        <div className="mb-ingredient-info">
                          <span className="mb-ingredient-title">Keep pieces separate</span>
                          <span className="mb-ingredient-desc">Store items separately to help avoid scratches and tangles.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================================
              RECOMMENDED PRODUCTS ("You may also like")
              ================================================================== */}
          <section className="mb-recommended-section">
            <div className="mb-recommended-header">
              <h2 className="mb-recommended-title">You may also like</h2>
              <div className="mb-recommended-arrows">
                <button
                  type="button"
                  className="mb-rec-arrow-btn"
                  onClick={() => setRecommendedPage((p) => Math.max(0, p - 1))}
                  disabled={recommendedPage === 0}
                  aria-label="Previous recommended"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="mb-rec-arrow-btn"
                  onClick={() => setRecommendedPage((p) => p + 1)}
                  disabled={(recommendedPage + 1) * 5 >= recommendedProducts.length}
                  aria-label="Next recommended"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="mb-recommended-grid">
              {recommendedProducts
                .slice(recommendedPage * 5, recommendedPage * 5 + 5)
                .map((rec) => (
                  <MalkazProductCard
                    key={rec.id}
                    product={rec}
                    isWishlisted={wishlistIds.has(rec.id)}
                    onToggleWishlist={handleToggleRecWishlist}
                    onAddToCart={handleAddRecToCart}
                  />
                ))}
            </div>
          </section>
        </main>
      </div>

      {/* ====================================================================
          REVIEW MODAL FORM
          ==================================================================== */}
      {reviewModalOpen && (
        <div className="mb-modal-overlay" onClick={() => setReviewModalOpen(false)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Write a Review for {product.name}</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setReviewModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="mb-modal-body">
              <div className="mb-review-form-field">
                <label className="mb-review-form-label">Overall Rating</label>
                <div className="mb-star-rating-select">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      className={`mb-star-select-btn ${reviewRating >= starVal ? 'active' : ''}`}
                      onClick={() => setReviewRating(starVal)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-review-form-field">
                <label className="mb-review-form-label">Your Review Feedback</label>
                <textarea
                  className="mb-review-form-textarea"
                  placeholder="Share how this product felt, benefits noticed, or usage tips..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                />
              </div>

              <div style={{ fontSize: 12, color: 'var(--mb-text-muted)', marginBottom: 16 }}>
                Note: In accordance with our store verification policy, reviews require a confirmed delivered order of this item.
              </div>

              <button
                type="submit"
                className="mb-card-add-btn"
                disabled={reviewSubmitting}
                style={{ height: 44 }}
              >
                {reviewSubmitting ? 'Submitting...' : 'Submit Verified Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          CART DRAWER / MODAL
          ==================================================================== */}
      {activeModal === 'cart' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Cart ({cartItemCount})</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              {!cart?.items?.length ? (
                <div className="mb-empty-state" style={{ padding: '40px 10px', border: 'none' }}>
                  <ShoppingCart size={44} style={{ color: 'var(--mb-primary)' }} />
                  <h4 style={{ fontFamily: 'var(--mb-font-serif)', fontSize: 24, margin: '10px 0 0' }}>
                    Your cart is empty
                  </h4>
                  <p className="mb-empty-desc">Discover fine jewellery from the MALKAZ collection.</p>
                </div>
              ) : (
                <div>
                  {cart.items.map((item) => (
                    <div key={item.id} className="mb-cart-item-row">
                      <img
                        src={
                          getJewelleryImage(item.imageUrl, item.productName, item.productId)
                        }
                        alt={item.productName}
                        className="mb-cart-item-thumb"
                        onError={(event) => {
                          event.currentTarget.src = getJewelleryImage(null, item.productName, item.productId);
                        }}
                      />
                      <div className="mb-cart-item-details">
                        <div className="mb-cart-item-name" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="mb-cart-item-price">{formatCurrency(item.price)}</div>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="mb-cart-qty-ctrl">
                            <button
                              type="button"
                              className="mb-cart-qty-btn"
                              onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="mb-cart-qty-num">{item.quantity}</span>
                            <button
                              type="button"
                              className="mb-cart-qty-btn"
                              onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="mb-cart-item-remove-btn"
                            onClick={(event) => {
                              void handleRemoveCartItem(item.id, event.currentTarget);
                            }}
                            disabled={removingCartItemId !== null}
                            title={`Remove ${item.productName}`}
                            aria-label={`Remove ${item.productName} from cart`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 24, borderTop: '1px solid var(--mb-border)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                      <span style={{ color: 'var(--mb-text-muted)' }}>Subtotal:</span>
                      <strong>{formatCurrency(cart.subtotal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                      <span style={{ color: 'var(--mb-text-muted)' }}>Shipping:</span>
                      <span style={{ color: '#2B7A4B', fontWeight: 600 }}>Complimentary</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--mb-border)', fontSize: 16 }}>
                      <span style={{ fontWeight: 700 }}>Total:</span>
                      <strong style={{ color: 'var(--mb-primary)', fontSize: 18 }}>
                        {formatCurrency(cart.subtotal)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="mb-card-add-btn"
                      style={{ height: 44, marginTop: 20, fontSize: 14 }}
                      onClick={() => {
                        setActiveModal(null);
                        setLocation('/checkout');
                      }}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          WISHLIST MODAL
          ==================================================================== */}
      {activeModal === 'wishlist' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">My Wishlist ({wishlist.length})</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              {!wishlist.length ? (
                <div className="mb-empty-state">
                  <div className="mb-empty-icon">
                    <Heart size={26} />
                  </div>
                  <h4 className="mb-empty-title">Your wishlist is empty</h4>
                  <p className="mb-empty-desc">
                    Tap the heart icon on any product to save it here for later.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {wishlist.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        background: '#FAF7F2',
                        border: '1px solid var(--mb-border)',
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                        onClick={() => {
                          setActiveModal(null);
                          setLocation(`/products/${item.id}`);
                        }}
                      >
                        <img
                          src={
                            getJewelleryImage(item.imageUrl, item.name, item.id)
                          }
                          alt={item.name}
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                          onError={(event) => {
                            event.currentTarget.src = getJewelleryImage(null, item.name, item.id);
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--mb-text-dark)' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--mb-primary)', fontWeight: 700 }}>
                            {formatCurrency(item.sellingPrice || item.price)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          className="mb-card-add-btn"
                          style={{ height: 34, padding: '0 14px', fontSize: 12 }}
                          onClick={() => handleAddRecToCart(item)}
                        >
                          Add to Cart
                        </button>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#063B2F', cursor: 'pointer' }}
                          onClick={() => handleToggleRecWishlist(item)}
                          title="Remove from wishlist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ORDERS MODAL
          ==================================================================== */}
      {activeModal === 'orders' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">My Orders ({orders.length})</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              {!orders.length ? (
                <div className="mb-empty-state">
                  <div className="mb-empty-icon">
                    <Package size={28} />
                  </div>
                  <h4 className="mb-empty-title">No orders yet</h4>
                  <p className="mb-empty-desc">
                    When you place an order, you can track delivery and status right here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        padding: 16,
                        border: '1px solid var(--mb-border)',
                        borderRadius: 12,
                        background: '#FAF7F2',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong>Order #{ord.orderNumber}</strong>
                        <span style={{ fontSize: 12, color: 'var(--mb-primary)', fontWeight: 600 }}>
                          {ord.orderStatus}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--mb-text-muted)', marginBottom: 8 }}>
                        Placed on {new Date(ord.createdAt).toLocaleDateString()} · Total: {formatCurrency(ord.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ADDRESSES MODAL
          ==================================================================== */}
      {activeModal === 'addresses' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Saved Delivery Addresses</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    style={{
                      padding: 14,
                      border: '1px solid var(--mb-border)',
                      borderRadius: 12,
                      background: addr.postalCode === pincode ? '#F4EBD8' : '#FFFFFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                        {addr.addressLine1 || addr.city}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--mb-text-muted)' }}>
                        {addr.city}, {addr.state} - {addr.postalCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mb-pincode-check-btn"
                      style={{ padding: '0 12px', height: 32 }}
                      onClick={() => {
                        if (addr.postalCode) setPincode(addr.postalCode);
                        if (addr.city) setSelectedCity(addr.city);
                        setActiveModal(null);
                        showToast(`Delivery location set to ${addr.city} (${addr.postalCode})`);
                      }}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Address Form */}
              <form onSubmit={handleAddAddress} style={{ borderTop: '1px solid var(--mb-border)', paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Add New Address</h4>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input
                    type="text"
                    className="mb-pincode-input"
                    placeholder="Street / House No."
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  />
                  <input
                    type="text"
                    className="mb-pincode-input"
                    placeholder="City"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <input
                    type="text"
                    className="mb-pincode-input"
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  />
                  <input
                    type="text"
                    className="mb-pincode-input"
                    placeholder="PIN Code"
                    value={newAddress.zipCode}
                    onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                  />
                </div>
                <button type="submit" className="mb-card-add-btn" style={{ height: 40 }}>
                  Save Address
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          COUPONS MODAL
          ==================================================================== */}
      {activeModal === 'coupons' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Coupons & Special Offers</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              <div
                style={{
                  padding: 16,
                  border: '1.5px dashed var(--mb-primary)',
                  borderRadius: 12,
                  background: '#FAF7F2',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 16, color: 'var(--mb-primary)' }}>WELCOME10</strong>
                  <button
                    type="button"
                    className="mb-pincode-check-btn"
                    style={{ height: 32 }}
                    onClick={() => {
                      setCouponCodeInput('WELCOME10');
                      showToast('Coupon WELCOME10 copied!');
                    }}
                  >
                    Apply
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--mb-text-muted)' }}>
                  Enjoy available offers on your MALKAZ jewellery order.
                </p>
              </div>

              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="mb-pincode-input"
                  placeholder="Enter promo code"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                />
                <button type="submit" className="mb-card-add-btn" style={{ width: 'auto', padding: '0 20px', height: 40 }}>
                  Apply
                </button>
              </form>
              {couponError && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{couponError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          PROFILE MODAL
          ==================================================================== */}
      {activeModal === 'profile' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">My Customer Profile</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div className="mb-header-avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
                    <UserIcon size={25} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--mb-font-serif)' }}>
                    {customerName}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--mb-text-muted)' }}>
                    {user?.email || 'MALKAZ customer'}
                  </p>
                  <span style={{ fontSize: 11, background: 'var(--mb-primary-light)', color: 'var(--mb-primary)', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                    {user?.role || 'CUSTOMER'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUPPORT MODAL
          ==================================================================== */}
      {activeModal === 'support' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Help & Customer Support</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              <p style={{ fontSize: 14, color: 'var(--mb-text-muted)', lineHeight: 1.6 }}>
                Have questions about your order, jewellery care, sizing, or returns? The MALKAZ Client Care team is here to help.
              </p>
              <div style={{ padding: 14, background: '#F4EBD8', borderRadius: 12, border: '1px solid var(--mb-border)' }}>
                <div><strong>Client Care:</strong> MALKAZ</div>
                <div style={{ marginTop: 6 }}><strong>Hours:</strong> Mon – Sat, 9:00 AM – 7:00 PM IST</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {product && (
        <div className="mb-detail-sticky-cart" role="region" aria-label="Quick add to cart">
          <div className="mb-detail-sticky-copy">
            <strong>{product.name}</strong>
            <span>₹ {(product.sellingPrice || product.price).toLocaleString('en-IN')} · Qty {quantity}</span>
          </div>
          <button
            type="button"
            className="mb-detail-sticky-button"
            disabled={cartLoading || product.stockQuantity === 0}
            onClick={(event) => {
              animateProductToCart(event.currentTarget);
              void handleAddToCart();
            }}
            data-testid="btn-sticky-detail-add-to-cart"
          >
            {cartLoading ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
            <span>
              {product.stockQuantity === 0
                ? 'Out of Stock'
                : cartLoading
                  ? 'Adding...'
                  : 'Add to Cart'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;
