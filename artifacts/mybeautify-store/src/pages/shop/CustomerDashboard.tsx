import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Search,
  Heart,
  Home,
  Menu,
  X as CloseIcon,
  ArrowRight,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List as ListIcon,
  ShoppingCart,
  X,
  SlidersHorizontal,
  Package,
  MapPin,
  Ticket,
  Star,
  Headphones,
  LogOut,
  Sparkles,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Share2,
  Shield,
} from 'lucide-react';
import { hasAdminRole } from '@/utils/auth';
import { matchesProductPrice, parsePriceSearchQuery } from '@/utils/product-price-search';
import {
  fetchProducts,
  fetchCategories,
  fetchBrands,
  fetchCurrentUser,
  fetchCart,
  addToCart as apiAddToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart as apiClearCart,
  fetchWishlist,
  addToWishlist as apiAddToWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  fetchOrders,
  fetchAddresses,
  addAddress as apiAddAddress,
  deleteAddress as apiDeleteAddress,
  applyCoupon as apiApplyCoupon,
  getAuthToken,
  setAuthToken,
  getCachedUser,
  setCachedUser,
  type ProductResponse,
  type CategoryResponse,
  type BrandResponse,
  type UserResponse,
  type CartResponse,
  type OrderResponse,
  type AddressResponse,
  type CouponResponse,
} from '@/lib/api';
import '@/styles/customer-dashboard.css';
import { HeaderSearchBar } from '@/components/common/HeaderSearchBar';
import { AnnouncementBar } from '@/components/common/AnnouncementBar';
import { BrandMark } from '@/components/common/BrandMark';
import MalkazProductCard from '@/components/products/MalkazProductCard';
import { MalkazSidebar } from '@/components/layout/MalkazSidebar';
import { getJewelleryImage } from '@/lib/jewellery-images';
import { animateTrashCan } from '@/lib/cart-animations';
import { removeComboGroupFromCart } from '@/services/combos/combos.service';

// Currency formatting with Rupee symbol as per reference design
const formatCurrency = (val: number | undefined | null) => {
  const num = typeof val === 'number' ? val : 0;
  return `₹ ${num.toFixed(2)}`;
};

// Calculate discount percentage
const getDiscountPercent = (price: number, discountPrice?: number) => {
  if (!discountPrice || discountPrice >= price) return null;
  const pct = Math.round(((price - discountPrice) / price) * 100);
  return pct > 0 ? `${pct}% OFF` : null;
};

const getProductRating = (product: ProductResponse) => {
  return Number.isFinite(product.averageRating) ? product.averageRating : 0;
};

type AppliedProductFilters = {
  category: string | null;
  brands: string[];
  minPrice: number;
  maxPrice: number;
  minRating: number | null;
  minDiscount: number | null;
  inStockOnly: boolean;
};

const EMPTY_PRODUCT_FILTERS: AppliedProductFilters = {
  category: null,
  brands: [],
  minPrice: 0,
  maxPrice: Number.MAX_SAFE_INTEGER,
  minRating: null,
  minDiscount: null,
  inStockOnly: false,
};

const HERO_SLIDES = [
  {
    tagline: 'FINE JEWELLERY COLLECTION',
    title: 'Elegance in Every Detail',
    subtitle: 'Discover jewellery that tells your story.',
    image: '/hero-jewellery.jpg',
    imageAlt: 'Emerald and gold jewellery from the MALKAZ collection',
    action: 'Explore Collection',
  },
  {
    tagline: 'THE EVERYDAY EDIT',
    title: 'A Signature for Every Moment',
    subtitle: 'Explore timeless designs selected for everyday elegance.',
    image: '/products/jewels/designer-gold-bangles.jpg',
    imageAlt: 'Gold bangles from the MALKAZ collection',
    action: 'Shop the Collection',
  },
  {
    tagline: 'EMERALD HEIRLOOMS',
    title: 'A Little More Extraordinary',
    subtitle: 'Make every celebration glow with colour and character.',
    image: '/products/jewels/royal-emerald-necklace.jpg',
    imageAlt: 'Royal emerald necklace from the MALKAZ collection',
    action: 'Shop Fine Jewellery',
  },
  {
    tagline: 'TIMELESS CRAFT',
    title: 'Made to Be Remembered',
    subtitle: 'Discover the charm of handcrafted kundan-inspired details.',
    image: '/products/jewels/traditional-kundan-jhumka.jpg',
    imageAlt: 'Traditional kundan earrings from the MALKAZ collection',
    action: 'Discover the Edit',
  },
  {
    tagline: 'THE STATEMENT EDIT',
    title: 'Details That Draw You In',
    subtitle: 'Find a signature piece for your next unforgettable moment.',
    image: '/products/jewels/vintage-emerald-ring.jpg',
    imageAlt: 'Vintage emerald ring from the MALKAZ collection',
    action: 'Explore the Edit',
  },
  {
    tagline: 'EVERYDAY RADIANCE',
    title: 'A Touch of Brilliance',
    subtitle: 'Elevate your everyday with jewellery that catches the light.',
    image: '/products/jewels/diamond-tennis-bracelet.jpg',
    imageAlt: 'Diamond tennis bracelet from the MALKAZ collection',
    action: 'Shop the Collection',
  },
] as const;

const JEWELLERY_REEL_IMAGES = [
  '/products/jewels/royal-emerald-necklace.jpg',
  '/products/jewels/traditional-kundan-jhumka.jpg',
  '/products/jewels/vintage-emerald-ring.jpg',
  '/products/jewels/designer-gold-bangles.jpg',
  '/products/jewels/diamond-tennis-bracelet.jpg',
  '/products/jewels/graceful-pendant-necklace.jpg',
] as const;

export default function CustomerDashboard() {
  const [location, setLocation] = useLocation();

  // Authentication & User State
  const [user, setUser] = useState<UserResponse | null>(() =>
    getAuthToken() ? getCachedUser() : null
  );
  const [authLoading, setAuthLoading] = useState(true);

  // Hidden admin shortcut verified role - strictly requires verified ADMIN role and non-loading state
  const isVerifiedAdmin = useMemo(() => {
    if (authLoading || !user) return false;
    return hasAdminRole(user.role) || hasAdminRole(user);
  }, [authLoading, user]);

  // Layout & UI States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [filterOpen, setFilterOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches);

  // Active sub-view modal (orders, profile, addresses, coupons, reviews, support, cart)
  const [activeModal, setActiveModal] = useState<
    'orders' | 'wishlist' | 'profile' | 'addresses' | 'coupons' | 'reviews' | 'support' | 'cart' | null
  >(() => {
    const panel = new URLSearchParams(window.location.search).get('panel');
    return panel === 'wishlist' ||
      panel === 'profile' ||
      panel === 'addresses' ||
      panel === 'coupons' ||
      panel === 'reviews' ||
      panel === 'support'
      ? panel
      : null;
  });

  // Catalog Data from Backend
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  // Cart & Wishlist State (synced with real backend)
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [wishlist, setWishlist] = useState<ProductResponse[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [cartLoading, setCartLoading] = useState(false);
  const [removingCartItemId, setRemovingCartItemId] = useState<number | null>(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(Number.MAX_SAFE_INTEGER);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [minDiscount, setMinDiscount] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [sortBy, setSortBy] = useState<string>('popularity');

  // Collapsible Filter sections
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [ratingOpen, setRatingOpen] = useState(true);
  const [discountOpen, setDiscountOpen] = useState(true);
  const [showMoreBrands, setShowMoreBrands] = useState(false);

  // Additional Data for Sub-Views
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [newAddress, setNewAddress] = useState({ street: '', city: '', state: '', zipCode: '', country: 'India' });
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  // Show toast notification helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  useEffect(() => {
    const panel = new URLSearchParams(location.split('?')[1] ?? '').get('panel');
    if (
      panel === 'wishlist' ||
      panel === 'profile' ||
      panel === 'addresses' ||
      panel === 'coupons' ||
      panel === 'reviews' ||
      panel === 'support'
    ) {
      setActiveModal(panel);
      if (panel === 'addresses' && getAuthToken()) {
        fetchAddresses()
          .then(setAddresses)
          .catch((err) => {
            console.error('Error fetching addresses:', err);
            showToast('Unable to load your addresses. Please try again.');
          });
      }
    }
  }, [location, showToast]);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Check authentication & load authenticated user info
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      // If visitor navigated directly to protected sub-routes, redirect to sign-in
      const protectedPath = location.split('?')[0];
      if (
        protectedPath === '/account' ||
        protectedPath === '/cart' ||
        protectedPath === '/wishlist'
      ) {
        setLocation('/sign-in?redirect=' + encodeURIComponent(location));
        return;
      }
      // Public browsing is permitted for storefront and catalog exploration
      setUser(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    fetchCurrentUser()
      .then((userData) => {
        setUser(userData);
        setCachedUser(userData);
        setProfilePhone(userData.phoneNumber || '');
      })
      .catch((err) => {
        console.error('Failed to fetch user:', err);
        if (!getAuthToken()) {
          setUser(null);
          const protectedPath = location.split('?')[0];
          if (
            protectedPath === '/account' ||
            protectedPath === '/cart' ||
            protectedPath === '/wishlist'
          ) {
            setLocation('/sign-in?redirect=' + encodeURIComponent(location));
          }
        } else {
          setUser((currentUser) => currentUser || getCachedUser());
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [setLocation, location]);

  // Load real backend Categories and Brands
  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data))
      .catch((err) => console.error('Error fetching categories:', err));

    fetchBrands()
      .then((data) => setBrands(data))
      .catch((err) => console.error('Error fetching brands:', err));
  }, []);

  // Load authenticated customer's Wishlist from Spring Boot
  const reloadWishlist = useCallback(() => {
    if (!getAuthToken()) return;
    fetchWishlist()
      .then((items) => {
        setWishlist(items);
        setWishlistIds(new Set(items.map((i) => i.id)));
      })
      .catch((err) => console.error('Wishlist load error:', err));
  }, []);

  // Load authenticated customer's Cart from Spring Boot
  const reloadCart = useCallback(() => {
    if (!getAuthToken()) return;
    fetchCart()
      .then((c) => setCart(c))
      .catch((err) => console.error('Cart load error:', err));
  }, []);

  useEffect(() => {
    reloadWishlist();
    reloadCart();
  }, [reloadWishlist, reloadCart]);

  // Fetch Products from real backend with query & sorting
  const loadBackendProducts = useCallback(() => {
    setLoadingProducts(true);
    setProductError(null);
    const searchedPrice = parsePriceSearchQuery(debouncedQuery);

    // Map UI sort to backend sort parameter
    let sortParam = 'createdAt,desc';
    if (sortBy === 'price-asc') sortParam = 'price,asc';
    else if (sortBy === 'price-desc') sortParam = 'price,desc';
    else if (sortBy === 'newest') sortParam = 'createdAt,desc';

    fetchProducts({
      query: searchedPrice === null ? debouncedQuery || undefined : undefined,
      size: 100,
      sort: sortParam,
    })
      .then((page) => {
        setProducts(page.content || []);
      })
      .catch((err) => {
        console.error('Error loading products from Spring Boot:', err);
        setProductError(err.message || 'Failed to load products from server.');
      })
      .finally(() => {
        setLoadingProducts(false);
      });
  }, [debouncedQuery, sortBy]);

  useEffect(() => {
    loadBackendProducts();
  }, [loadBackendProducts]);

  useEffect(() => {
    const syncSelectedCategory = () => {
      const params = new URLSearchParams(window.location.search);
      const categoryId = params.get('category');
      const category = categories.find((item) => String(item.id) === categoryId);
      const nextCategory = category?.name ?? categoryId;
      setSelectedCategory(nextCategory);
      setAppliedFilters((current) => ({ ...current, category: nextCategory }));
      const query = params.get('q') ?? '';
      setSearchQuery(query);
      setDebouncedQuery(query);
    };

    syncSelectedCategory();
    window.addEventListener('popstate', syncSelectedCategory);
    return () => window.removeEventListener('popstate', syncSelectedCategory);
  }, [categories, location]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        setActiveHeroSlide((current) => (current + 1) % HERO_SLIDES.length);
      }
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const previousOverflow = document.body.style.overflow;
    if (window.matchMedia('(max-width: 900px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filterOpen]);

  // Toggle brand in filter
  const toggleBrand = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  const setCategoryFilter = (category: CategoryResponse | null) => {
    setSelectedCategory(category?.name ?? null);
    setAppliedFilters((current) => ({ ...current, category: category?.name ?? null }));
    const searchParams = new URLSearchParams(window.location.search);
    if (category) {
      searchParams.set('category', String(category.id));
    } else {
      searchParams.delete('category');
    }
    const query = searchParams.toString();
    const path = category ? '/shop' : window.location.pathname;
    setLocation(`${path}${query ? `?${query}` : ''}`);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setCategoryFilter(null);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete('category');
    searchParams.delete('q');
    const serializedParams = searchParams.toString();
    setLocation(`${window.location.pathname}${serializedParams ? `?${serializedParams}` : ''}`);
    setSelectedBrands([]);
    setMinPrice(0);
    setMaxPrice(Number.MAX_SAFE_INTEGER);
    setMinRating(null);
    setMinDiscount(null);
    setInStockOnly(false);
    setAppliedFilters(EMPTY_PRODUCT_FILTERS);
    setSearchQuery('');
  };

  const applyFilters = () => {
    const selectedCategoryItem = categories.find(
      (category) => category.name === selectedCategory || String(category.id) === selectedCategory
    ) ?? null;
    setCategoryFilter(selectedCategoryItem);
    setAppliedFilters({
      category: selectedCategoryItem?.name ?? null,
      brands: selectedBrands,
      minPrice,
      maxPrice,
      minRating,
      minDiscount,
      inStockOnly,
    });
    setFilterOpen(false);
  };

  const submitSearch = (query: string) => {
    const normalizedQuery = query.trim();
    setSearchQuery(normalizedQuery);
    setDebouncedQuery(normalizedQuery);
    const params = new URLSearchParams();
    if (normalizedQuery) params.set('q', normalizedQuery);
    const serializedParams = params.toString();
    setLocation(`/shop${serializedParams ? `?${serializedParams}` : ''}`);
  };

  // Client-side and faceted filtering on the real products
  const filteredProducts = useMemo(() => {
    const searchedPrice = parsePriceSearchQuery(debouncedQuery);
    return products.filter((p) => {
      if (searchedPrice !== null && !matchesProductPrice(p, searchedPrice)) return false;

      // Category filter (match by name or ID)
      if (appliedFilters.category) {
        const catMatch =
          p.categoryName?.toLowerCase() === appliedFilters.category.toLowerCase() ||
          p.categoryId?.toString() === appliedFilters.category;
        if (!catMatch) return false;
      }

      // Brand filter
      if (appliedFilters.brands.length > 0) {
        const brandMatch = appliedFilters.brands.some(
          (b) => p.brandName?.toLowerCase() === b.toLowerCase()
        );
        if (!brandMatch) return false;
      }

      // Price filter
      const effectivePrice = p.sellingPrice || p.price;
      if (effectivePrice < appliedFilters.minPrice || effectivePrice > appliedFilters.maxPrice) return false;

      // Rating filter
      const rating = getProductRating(p);
      if (appliedFilters.minRating !== null && rating < appliedFilters.minRating) return false;

      // Discount filter
      if (appliedFilters.minDiscount !== null) {
        if (!p.discountPrice || p.discountPrice >= p.price) return false;
        const discountPct = ((p.price - p.discountPrice) / p.price) * 100;
        if (discountPct < appliedFilters.minDiscount) return false;
      }

      if (appliedFilters.inStockOnly && p.stockQuantity <= 0) return false;
      return true;
    });
  }, [products, appliedFilters, debouncedQuery]);

  // Order products to match reference display when on default popularity sort
  const sortedAndFilteredProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'price-asc') list.sort((a, b) => (a.sellingPrice || a.price) - (b.sellingPrice || b.price));
    if (sortBy === 'price-desc') list.sort((a, b) => (b.sellingPrice || b.price) - (a.sellingPrice || a.price));
    return list;
  }, [filteredProducts, sortBy]);

  // Compute category counts for filter display
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const name = p.categoryName || 'Other';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Compute brand counts for filter display
  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const name = p.brandName || 'Other';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [products]);

  const availableBrands = useMemo(
    () => brands.filter((brand) => (brandCounts[brand.name] ?? 0) > 0),
    [brands, brandCounts]
  );
  const priceBounds = useMemo(() => {
    const prices = products.map((product) => product.sellingPrice || product.price).filter(Number.isFinite);
    return {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    };
  }, [products]);
  const activeFilterCount =
    Number(Boolean(appliedFilters.category)) +
    appliedFilters.brands.length +
    Number(appliedFilters.minPrice > 0) +
    Number(appliedFilters.maxPrice < Number.MAX_SAFE_INTEGER) +
    Number(appliedFilters.minRating !== null) +
    Number(appliedFilters.minDiscount !== null) +
    Number(appliedFilters.inStockOnly);

  // Wishlist Toggle (Add/Remove)
  const handleToggleWishlist = async (product: ProductResponse) => {
    const token = getAuthToken();
    if (!token) {
      showToast('Please log in or create an account to save items to your wishlist.');
      setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    const isSaved = wishlistIds.has(product.id);
    try {
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
    }
  };

  // Add to Cart Handler
  const handleAddToCart = async (product: ProductResponse) => {
    const token = getAuthToken();
    if (!token) {
      showToast('Please log in or create an account to add items to your cart.');
      setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    try {
      setCartLoading(true);
      const updatedCart = await apiAddToCart(product.id, 1);
      setCart(updatedCart);
      showToast(`Added "${product.name}" to cart.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to add item to cart.');
    } finally {
      setCartLoading(false);
    }
  };

  // Cart quantity controls
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
      const item = cart?.items.find((cartItem) => cartItem.id === itemId);
      if (item?.comboGroupId) await removeComboGroupFromCart(item.comboGroupId);
      else await removeCartItem(itemId);
      setCart(await fetchCart());
      showToast(item?.comboGroupId ? 'Combo removed from cart.' : 'Item removed from cart.');
    } catch (err: any) {
      restoreTrashIcon();
      showToast(err.message || 'Failed to remove item.');
    } finally {
      setRemovingCartItemId(null);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setLocation('/sign-in');
  };

  // Load orders when orders modal is opened
  const handleOpenOrders = async () => {
    setActiveModal('orders');
    try {
      const data = await fetchOrders();
      setOrders(data.content || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Load addresses when addresses modal is opened
  const handleOpenAddresses = async () => {
    setActiveModal('addresses');
    try {
      const list = await fetchAddresses();
      setAddresses(list);
    } catch (err) {
      console.error('Error fetching addresses:', err);
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

  // Total cart item count
  const cartItemCount = useMemo(() => {
    return cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  }, [cart]);

  // Wishlist count
  const wishlistCount = wishlistIds.size;

  // Filter display brands list (with "+ Show more")
  const brandListToDisplay = showMoreBrands ? availableBrands : availableBrands.slice(0, 5);

  if (authLoading) {
    return (
      <div className="mb-dashboard-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--mb-primary)' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontFamily: 'var(--mb-font-serif)', fontSize: 26, margin: 0 }}>Opening MALKAZ...</h2>
        </div>
      </div>
    );
  }

  const customerName = user?.fullName || user?.email || '';
  const isMobileSidebarToggleOpen = window.matchMedia('(max-width: 900px)').matches
    ? mobileSidebarOpen
    : !sidebarCollapsed;
  return (
    <div className="mb-dashboard-layout">
      {/* Toast notification */}
      {toastMessage && (
        <div className="mb-toast">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <MalkazSidebar
        activeItem={activeModal ?? 'home'}
        isOpen={mobileSidebarOpen}
        isCollapsed={sidebarCollapsed}
        isSignedIn={Boolean(user)}
        categories={categories}
        onCategorySelect={(category) => setSelectedCategory(category.name)}
        onClose={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
        onAction={(action) => {
          if (!user) {
            const messages = {
              wishlist: 'Please log in or create an account to view your wishlist.',
              profile: 'Please log in to view your profile.',
              addresses: 'Please log in to manage your addresses.',
              coupons: 'Please log in to view available coupons and offers.',
              reviews: 'Please log in to view your reviews.',
              support: 'Please log in to contact support.',
            };
            showToast(messages[action]);
            setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
            return;
          }
          if (action === 'addresses') {
            void handleOpenAddresses();
          } else {
            setActiveModal(action);
          }
        }}
      />

      <div className="mb-main-content">
        <AnnouncementBar />
        {/* ==================================================================
            2. TOP HEADER
            ================================================================== */}
        {/* ==================================================================
            2. TOP HEADER
            ================================================================== */}
        <header className="mb-top-header mz-top-header mz-home-top-header">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="mb-mobile-hamburger mz-mobile-hamburger"
            onClick={() => {
              if (window.matchMedia('(max-width: 900px)').matches) {
                setMobileSidebarOpen((open) => !open);
              } else {
                setSidebarCollapsed((collapsed) => !collapsed);
              }
            }}
            aria-label={isMobileSidebarToggleOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileSidebarToggleOpen}
            aria-controls="malkaz-navigation"
          >
            {isMobileSidebarToggleOpen
              ? <CloseIcon size={16} strokeWidth={1.8} aria-hidden="true" />
              : <Menu size={20} aria-hidden="true" />}
          </button>

          <div className="mz-mobile-brand">
            <BrandMark />
          </div>

          <HeaderSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={submitSearch}
            showToast={showToast}
            suggestions={products}
            placeholder="Search jewellery, collections and more..."
          />

          {/* Right actions: Wishlist, Cart, Profile */}
          <div className="mb-header-right-actions mz-header-right-actions">
            {/* Discreet Admin Dashboard Shortcut - Visible strictly ONLY for verified ADMIN */}
            {isVerifiedAdmin && (
              <Link
                href="/admin"
                className="mb-header-icon-btn mz-header-icon-btn mb-admin-shortcut-btn"
                aria-label="Admin Dashboard"
                title="Admin Dashboard"
                data-testid="header-admin-shortcut-btn"
              >
                <Shield size={20} className="mb-admin-shortcut-icon" />
              </Link>
            )}

            {/* Wishlist icon button */}
            <button
              type="button"
              className="mb-header-icon-btn mz-header-icon-btn"
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
              {wishlistCount > 0 && (
                <span className="mb-header-badge mz-header-badge">{wishlistCount}</span>
              )}
            </button>

            {/* Cart icon button */}
            <button
              type="button"
              className="mb-header-icon-btn mz-header-icon-btn"
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
              {cartItemCount > 0 && (
                <span className="mb-header-badge mz-header-badge">{cartItemCount}</span>
              )}
            </button>

            {/* Customer profile dropdown */}
            <div className="mb-header-profile-wrap mz-header-profile-wrap">
              <button
                type="button"
                className="mb-header-profile-chip mz-header-profile-chip mb-customer-profile-pill"
                onClick={() => setProfileDropdownOpen((o) => !o)}
                aria-expanded={profileDropdownOpen}
                aria-label="User account menu"
                data-testid="header-profile-chip"
              >
                <div className="mb-header-avatar mz-header-avatar mb-customer-avatar-circle">
                  <UserIcon size={18} aria-hidden="true" />
                </div>
                <span className="mb-header-profile-name mz-header-profile-name mb-customer-profile-name">
                  {customerName || 'Sign in'}
                </span>
                <ChevronDown
                  size={15}
                  className="mb-header-profile-chevron"
                  style={{
                    transform: profileDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {profileDropdownOpen && (
                <div className="mb-header-profile-menu mz-header-profile-menu">
                  <div className="mb-profile-menu-header">
                    <div className="mb-profile-menu-name">{customerName || 'Welcome to MALKAZ'}</div>
                    {user?.email && <div className="mb-profile-menu-email">{user.email}</div>}
                  </div>

                  <button
                    type="button"
                    className="mb-profile-menu-item"
                    onClick={() => {
                      if (!user) {
                        setLocation('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
                      } else {
                        setActiveModal('profile');
                      }
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
                      if (user) {
                        void handleOpenOrders();
                      } else {
                        setLocation('/sign-in?redirect=' + encodeURIComponent('/orders'));
                      }
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
                      if (user) {
                        void handleOpenAddresses();
                      } else {
                        setLocation('/sign-in?redirect=' + encodeURIComponent('/account?panel=addresses'));
                      }
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
                      if (user) {
                        setActiveModal('wishlist');
                      } else {
                        setLocation('/sign-in?redirect=' + encodeURIComponent('/account?panel=wishlist'));
                      }
                      setProfileDropdownOpen(false);
                    }}
                  >
                    <Heart size={15} />
                    <span>Saved Wishlist</span>
                  </button>

                  {isVerifiedAdmin && (
                    <Link
                      href="/admin"
                      className="mb-profile-menu-item mb-profile-admin-link"
                      onClick={() => setProfileDropdownOpen(false)}
                      title="Admin Dashboard"
                      data-testid="menu-admin-shortcut-link"
                    >
                      <Shield size={15} style={{ color: 'var(--mb-primary, #123a30)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--mb-primary, #123a30)' }}>Admin Dashboard</span>
                    </Link>
                  )}

                  {user ? (
                    <button
                      type="button"
                      className="mb-profile-menu-item logout"
                      onClick={() => {
                        handleLogout();
                        setProfileDropdownOpen(false);
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <Link
                      href="/sign-in"
                      className="mb-profile-menu-item"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <UserIcon size={15} />
                      <span>Sign In</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body Container */}
        <main className="mb-page-body mz-page-body">
          {/* ================================================================
              3. ROYAL HERO BANNER
              ================================================================ */}
          <section
            className="mb-hero-banner mz-hero-banner mz-scroll-reveal"
          >
            <div
              className="mb-hero-left mz-hero-left"
              key={HERO_SLIDES[activeHeroSlide].title}
            >
              <div className="mz-hero-tagline">{HERO_SLIDES[activeHeroSlide].tagline}</div>
              <h1 className="mz-hero-title">{HERO_SLIDES[activeHeroSlide].title}</h1>
              <p className="mz-hero-subtitle">{HERO_SLIDES[activeHeroSlide].subtitle}</p>
              <a
                href="/shop"
                className="mz-hero-cta-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setLocation('/shop');
                }}
              >
                <span>{HERO_SLIDES[activeHeroSlide].action}</span>
                <ArrowRight size={15} />
              </a>
              <div className="mz-hero-controls" aria-label="Promotional carousel controls">
                <div className="mz-hero-dots">
                  {HERO_SLIDES.map((slide, index) => (
                    <button
                      type="button"
                      key={slide.title}
                      className={`mz-hero-dot ${activeHeroSlide === index ? 'active' : ''}`}
                      aria-label={`Show promotion ${index + 1}`}
                      aria-pressed={activeHeroSlide === index}
                      onClick={() => setActiveHeroSlide(index)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-hero-right mz-hero-right">
              {HERO_SLIDES.map((slide, index) => (
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={index === activeHeroSlide ? slide.imageAlt : ''}
                  aria-hidden={index !== activeHeroSlide}
                  className={`mz-hero-banner-img ${index === activeHeroSlide ? 'is-active' : ''}`}
                  loading="eager"
                />
              ))}
            </div>
          </section>

          {/* Decorative Gold Ornament Separator */}
          <div className="mz-ornament-divider">
            <span className="mz-divider-line"></span>
            <span className="mz-divider-symbol">❖</span>
            <span className="mz-divider-line"></span>
          </div>

          {/* ================================================================
              JEWELLERY CATEGORY SHORTCUTS
              ================================================================ */}
          <section className="mz-collections-section mz-scroll-reveal" aria-labelledby="shop-by-collection-title">
            <div className="mz-collections-heading">
              <div>
                <div className="mz-hero-tagline">DISCOVER YOUR NEXT FAVOURITE</div>
                <h2 id="shop-by-collection-title">Shop by Collection</h2>
              </div>
              <Link href="/categories" className="mz-view-collections-link">
                View all collections <ArrowRight size={15} />
              </Link>
            </div>
            <div className="mz-category-shortcuts-row">
              {categories
                .filter((category) => category.active !== false)
                .map((cat) => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`mz-category-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(cat)}
                      aria-label={`Shop ${cat.name}`}
                      aria-current={isSelected ? 'page' : undefined}
                      data-testid={`card-category-${cat.id}`}
                    >
                      <div className="mz-cat-card-img-wrap">
                        <img
                          src={getJewelleryImage(cat.imageUrl, cat.name, cat.id)}
                          alt=""
                          className="mz-cat-card-img"
                          loading="lazy"
                        />
                      </div>
                      <span className="mz-cat-card-name">{cat.name}</span>
                      <ArrowRight size={15} className="mz-cat-card-arrow" />
                    </button>
                  );
                })}
            </div>
          </section>

          <section className="mz-motion-story mz-scroll-reveal" aria-labelledby="mz-motion-story-title">
            <div className="mz-motion-story-copy">
              <span className="mz-motion-story-kicker"><Sparkles size={13} /> THE MALKAZ EDIT</span>
              <h2 id="mz-motion-story-title">Jewellery that moves <em>with your story.</em></h2>
              <p>Discover the details, colour and craftsmanship behind pieces made to be treasured.</p>
              <span className="mz-motion-story-note">CRAFTED TO BE TREASURED</span>
              <Link href="/shop" className="mz-motion-story-link">
                Explore the collection <ArrowRight size={15} />
              </Link>
            </div>
            <div className="mz-motion-reel" aria-hidden="true">
              <div className="mz-motion-reel-track">
                {[0, 1].map((setIndex) => (
                  <div className="mz-motion-reel-set" key={setIndex}>
                    {JEWELLERY_REEL_IMAGES.map((image, index) => (
                      <img
                        key={`${setIndex}-${image}`}
                        src={image}
                        alt=""
                        loading="lazy"
                        style={{ animationDelay: `${index * -260}ms` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ================================================================
              MAIN 2-COLUMN SECTION (Filter Panel + Product Section)
              ================================================================ */}
          <div className={`mb-shop-columns mz-shop-columns ${filterOpen ? 'has-open-filter' : ''}`}>
            {/* ==============================================================
              6. FILTER DRAWER (Category, brand, price, and availability)
                ============================================================== */}
            {filterOpen && (
              <>
                <button
                  type="button"
                  className="mz-filter-backdrop"
                  aria-label="Close filters"
                  onClick={() => setFilterOpen(false)}
                />
                <aside className="mb-filter-panel mz-filter-panel" id="mz-product-filter-panel" aria-label="Product filters">
              <div className="mb-filter-header mz-filter-header">
                <div className="mz-filter-title-wrap">
                  <h3 className="mb-filter-heading mz-filter-heading">Filter by</h3>
                  <button
                    type="button"
                    className="mz-filter-close"
                    aria-label="Close filters"
                    onClick={() => setFilterOpen(false)}
                  >
                    <X size={19} />
                  </button>
                </div>
                <button type="button" className="mb-clear-all-btn mz-clear-all-btn" onClick={clearAllFilters}>
                  Clear All
                </button>
              </div>

              {/* Category Filter */}
              {categories.some((category) => category.active !== false && (categoryCounts[category.name] ?? 0) > 0) && (
                <div className="mb-filter-section mz-filter-section">
                  <button
                    type="button"
                    className="mb-filter-section-title mz-filter-section-title"
                    onClick={() => setCategoryOpen((o) => !o)}
                  >
                    <span>Category</span>
                    {categoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {categoryOpen && (
                    <div className="mb-filter-options">
                      {categories
                        .filter((category) => category.active !== false)
                        .filter((category) => (categoryCounts[category.name] ?? 0) > 0)
                        .map((cat) => {
                          const count = categoryCounts[cat.name] || 0;
                          const isChecked = selectedCategory === cat.name || selectedCategory === String(cat.id);
                          return (
                            <label key={cat.id} className="mb-filter-checkbox-row mz-checkbox-row">
                              <span className="mb-filter-label-group">
                                <input
                                  type="checkbox"
                                  className="mb-checkbox mz-checkbox"
                                  checked={isChecked}
                                  onChange={() => setSelectedCategory(isChecked ? null : cat.name)}
                                />
                                <span>{cat.name}</span>
                              </span>
                              <span className="mb-filter-count mz-filter-count">({count})</span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Brand Filter */}
              {availableBrands.length > 0 && (
                <div className="mb-filter-section mz-filter-section">
                  <button
                    type="button"
                    className="mb-filter-section-title mz-filter-section-title"
                    onClick={() => setBrandOpen((open) => !open)}
                  >
                    <span>Brand</span>
                    {brandOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {brandOpen && (
                    <div className="mb-filter-options">
                      {brandListToDisplay.map((brand) => (
                        <label key={brand.id} className="mb-filter-checkbox-row mz-checkbox-row">
                          <span className="mb-filter-label-group">
                            <input
                              type="checkbox"
                              className="mb-checkbox mz-checkbox"
                              checked={selectedBrands.includes(brand.name)}
                              onChange={() => toggleBrand(brand.name)}
                            />
                            <span>{brand.name}</span>
                          </span>
                          <span className="mb-filter-count mz-filter-count">({brandCounts[brand.name] ?? 0})</span>
                        </label>
                      ))}
                      {availableBrands.length > 5 && (
                        <button
                          type="button"
                          className="mb-show-more-btn"
                          onClick={() => setShowMoreBrands((show) => !show)}
                        >
                          {showMoreBrands ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Price Range Filter */}
              {products.length > 0 && (
                <div className="mb-filter-section mz-filter-section">
                <button
                  type="button"
                  className="mb-filter-section-title mz-filter-section-title"
                  onClick={() => setPriceOpen((o) => !o)}
                >
                  <span>Price Range</span>
                  {priceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {priceOpen && (
                  <div className="mb-price-slider-wrap mz-price-slider-wrap">
                    <div className="mz-price-inputs">
                      <label>
                        <span>Minimum (₹)</span>
                        <input
                          type="number"
                          min={priceBounds.min}
                          max={maxPrice === Number.MAX_SAFE_INTEGER ? priceBounds.max : maxPrice}
                          value={minPrice || priceBounds.min}
                          onChange={(event) => {
                            const nextMinimum = Number(event.target.value);
                            setMinPrice(nextMinimum);
                            if (nextMinimum > maxPrice) setMaxPrice(nextMinimum);
                          }}
                        />
                      </label>
                      <label>
                        <span>Maximum (₹)</span>
                        <input
                          type="number"
                          min={minPrice || priceBounds.min}
                          max={priceBounds.max}
                          value={maxPrice === Number.MAX_SAFE_INTEGER ? priceBounds.max : maxPrice}
                          onChange={(event) => {
                            const nextMaximum = Number(event.target.value);
                            setMaxPrice(nextMaximum);
                            if (nextMaximum < minPrice) setMinPrice(nextMaximum);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* Rating Filter */}
              {products.some((product) => getProductRating(product) > 0) && (
                <div className="mb-filter-section mz-filter-section">
                  <button
                    type="button"
                    className="mb-filter-section-title mz-filter-section-title"
                    onClick={() => setRatingOpen((o) => !o)}
                  >
                    <span>Rating</span>
                    {ratingOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {ratingOpen && (
                    <div className="mb-filter-options">
                      {[4, 3, 2]
                        .filter((rating) => products.some((product) => getProductRating(product) >= rating))
                        .map((rating) => {
                          const count = products.filter((product) => getProductRating(product) >= rating).length;
                          return (
                            <label key={rating} className="mb-filter-checkbox-row mz-checkbox-row">
                              <span className="mb-filter-label-group">
                                <input
                                  type="checkbox"
                                  className="mb-checkbox mz-checkbox"
                                  checked={minRating === rating}
                                  onChange={() => setMinRating(minRating === rating ? null : rating)}
                                />
                                <span>{rating} & above</span>
                              </span>
                              <span className="mb-filter-count mz-filter-count">({count})</span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Discount Filter */}
              {products.some((product) => product.discountPrice && product.discountPrice < product.price) && (
                <div className="mb-filter-section mz-filter-section">
                <button
                  type="button"
                  className="mb-filter-section-title mz-filter-section-title"
                  onClick={() => setDiscountOpen((o) => !o)}
                >
                  <span>Discount</span>
                  {discountOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {discountOpen && (
                  <div className="mb-filter-options">
                    {[10, 20, 30]
                      .filter((pct) => products.some((product) => {
                        const discountPrice = product.discountPrice;
                        return Boolean(
                          discountPrice &&
                          discountPrice < product.price &&
                          ((product.price - discountPrice) / product.price) * 100 >= pct
                        );
                      }))
                      .map((pct) => {
                        const count = products.filter((product) => {
                          const discountPrice = product.discountPrice;
                          if (!discountPrice || discountPrice >= product.price) return false;
                          return ((product.price - discountPrice) / product.price) * 100 >= pct;
                        }).length;
                        return (
                          <label key={pct} className="mb-filter-checkbox-row mz-checkbox-row">
                            <span className="mb-filter-label-group">
                              <input
                                type="checkbox"
                                className="mb-checkbox mz-checkbox"
                                checked={minDiscount === pct}
                                onChange={() => setMinDiscount(minDiscount === pct ? null : pct)}
                              />
                              <span>{pct}% or more</span>
                            </span>
                            <span className="mb-filter-count mz-filter-count">({count})</span>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>
              )}

              {products.some((product) => product.stockQuantity <= 0) && (
                <div className="mb-filter-section mz-filter-section">
                  <label className="mb-filter-checkbox-row mz-checkbox-row">
                    <span className="mb-filter-label-group">
                      <input
                        type="checkbox"
                        className="mb-checkbox mz-checkbox"
                        checked={inStockOnly}
                        onChange={(event) => setInStockOnly(event.target.checked)}
                      />
                      <span>In stock only</span>
                    </span>
                  </label>
                </div>
              )}

              <div className="mz-filter-actions">
                <button type="button" className="mz-apply-filters" onClick={applyFilters}>
                  Apply Filters
                </button>
              </div>
            </aside>
              </>
            )}

            {/* ==============================================================
                4 & 5. PRODUCT SECTION & CARDS
                ============================================================== */}
            <section className="mb-product-section mz-product-section mz-scroll-reveal">
              {/* Product Controls Bar */}
              <div className="mb-product-controls-bar mz-product-controls-bar" id="featured-jewellery">
                <div className="mz-featured-title-wrap">
                  <h2 className="mz-featured-title">Featured Jewellery</h2>
                  <span className="mz-title-ornament">― ❖ ―</span>
                </div>

                <div className="mz-controls-right-wrap">
                  <div className="mb-products-count-text mz-products-count-text">
                    Showing {sortedAndFilteredProducts.length ? 1 : 0}–{sortedAndFilteredProducts.length} of {sortedAndFilteredProducts.length} products
                  </div>

                  <button
                    type="button"
                    className="mz-filter-toggle"
                    aria-expanded={filterOpen}
                    aria-controls="mz-product-filter-panel"
                    onClick={() => setFilterOpen((open) => !open)}
                  >
                    <SlidersHorizontal size={17} />
                    <span>Filter</span>
                    {activeFilterCount > 0 && <span className="mz-filter-count-badge">{activeFilterCount}</span>}
                  </button>

                  <div className="mb-sort-group mz-sort-group">
                    <span className="mb-sort-label">Sort by:</span>
                    <select
                      className="mb-sort-select mz-sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="popularity">Popularity</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="newest">Newest</option>
                    </select>
                  </div>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="mz-active-filter-indicator" aria-live="polite">
                  <span>{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied</span>
                  {appliedFilters.category && <span>{appliedFilters.category}</span>}
                  {appliedFilters.brands.map((brand) => <span key={brand}>{brand}</span>)}
                  {appliedFilters.minPrice > 0 && <span>From {formatCurrency(appliedFilters.minPrice)}</span>}
                  {appliedFilters.maxPrice < Number.MAX_SAFE_INTEGER && <span>Up to {formatCurrency(appliedFilters.maxPrice)}</span>}
                  {appliedFilters.minRating !== null && <span>{appliedFilters.minRating}+ stars</span>}
                  {appliedFilters.minDiscount !== null && <span>{appliedFilters.minDiscount}%+ off</span>}
                  {appliedFilters.inStockOnly && <span>In stock</span>}
                  <button type="button" onClick={clearAllFilters}>Clear filters</button>
                </div>
              )}

              {/* Product Grid / Loading / Empty States */}
              {loadingProducts ? (
                <div className="mb-loading-grid mz-loading-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="mb-skeleton-card mz-skeleton-card">
                      <div className="mb-skeleton-img mz-skeleton-img" />
                      <div className="mb-skeleton-text" style={{ width: '40%' }} />
                      <div className="mb-skeleton-text" style={{ width: '80%' }} />
                      <div className="mb-skeleton-text" style={{ width: '50%' }} />
                    </div>
                  ))}
                </div>
              ) : productError ? (
                <div className="mb-empty-state mz-empty-state">
                  <div className="mb-empty-icon mz-empty-icon">
                    <AlertCircle size={28} />
                  </div>
                  <h3 className="mb-empty-title">Error Connecting to Store</h3>
                  <p className="mb-empty-desc">{productError}</p>
                  <button
                    type="button"
                    className="mb-card-add-btn mz-card-add-btn"
                    style={{ width: 'auto', padding: '0 24px' }}
                    onClick={loadBackendProducts}
                  >
                    Retry Loading Products
                  </button>
                </div>
              ) : sortedAndFilteredProducts.length === 0 ? (
                <div className="mb-empty-state mz-empty-state">
                  <div className="mb-empty-icon mz-empty-icon">
                    <Search size={28} />
                  </div>
                  <h3 className="mb-empty-title">No Products Found</h3>
                  <p className="mb-empty-desc">
                    We couldn't find any products matching your active filters. Try clearing your
                    search or filters.
                  </p>
                  <button
                    type="button"
                    className="mb-card-add-btn mz-card-add-btn"
                    style={{ width: 'auto', padding: '0 24px' }}
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="mb-product-grid mz-product-grid">
                  {sortedAndFilteredProducts.map((product) => (
                    <MalkazProductCard
                      key={product.id}
                      product={product}
                      isWishlisted={wishlistIds.has(product.id)}
                      onToggleWishlist={handleToggleWishlist}
                      onAddToCart={handleAddToCart}
                      cartLoading={cartLoading}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
        <footer className="mz-legal-footer">
          <span>© MALKAZ</span>
          <Link href="/about-us" data-testid="link-footer-about-us">
            About Us
          </Link>
        
        </footer>
      </div>

      {/* ====================================================================
          SLIDE-OVER CART DRAWER
          ==================================================================== */}
      {activeModal === 'cart' && (
        <div className="mb-drawer-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-drawer-card" onClick={(e) => e.stopPropagation()}>
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
                  <p className="mb-empty-desc">
                    Discover MALKAZ jewellery and add your favourite pieces here.
                  </p>
                  <button
                    type="button"
                    className="mb-card-add-btn"
                    style={{ width: 'auto', padding: '0 24px', marginTop: 10 }}
                    onClick={() => setActiveModal(null)}
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div>
                  {cart.items.map((item) => (
                    <div key={item.id} className="mb-cart-item-row">
                      <img
                        src={
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300'
                        }
                        alt={item.productName}
                        className="mb-cart-item-thumb"
                      />
                      <div className="mb-cart-item-details">
                        {item.comboGroupId && (
                          <div className="mb-cart-item-combo">{item.comboName || 'Combo offer'}</div>
                        )}
                        <div className="mb-cart-item-name" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="mb-cart-item-price">
                          {formatCurrency(item.price)}
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className={`mb-cart-qty-ctrl ${item.comboGroupId ? 'is-combo-fixed' : ''}`}>
                            <button
                              type="button"
                              className="mb-cart-qty-btn"
                              onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                              disabled={Boolean(item.comboGroupId)}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="mb-cart-qty-num">{item.quantity}</span>
                            <button
                              type="button"
                              className="mb-cart-qty-btn"
                              onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
                              disabled={Boolean(item.comboGroupId)}
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
                            title={item.comboGroupId ? `Remove ${item.comboName || 'combo'} from cart` : `Remove ${item.productName}`}
                            aria-label={item.comboGroupId ? `Remove ${item.comboName || 'combo'} from cart` : `Remove ${item.productName} from cart`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Summary & Checkout */}
                  <div style={{ marginTop: 24, borderTop: '1px solid var(--mb-border)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                      <span style={{ color: 'var(--mb-text-muted)' }}>Subtotal:</span>
                      <strong style={{ color: 'var(--mb-text-dark)' }}>
                        {formatCurrency(cart.subtotal)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                      <span style={{ color: 'var(--mb-text-muted)' }}>Shipping:</span>
                      <span style={{ color: '#2B7A4B', fontWeight: 600 }}>Complimentary</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--mb-border)', fontSize: 16 }}>
                      <span style={{ fontWeight: 700 }}>Estimated Total:</span>
                      <strong style={{ color: 'var(--mb-primary)', fontSize: 18 }}>
                        {formatCurrency(cart.subtotal)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="mb-card-add-btn mz-card-add-btn"
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
                        border: '1px solid var(--mb-border)',
                        borderRadius: 14,
                        gap: 14,
                      }}
                    >
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200'}
                        alt={item.name}
                        style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--mb-text-dark)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--mb-text-muted)' }}>
                          {item.brandName} • {formatCurrency(item.sellingPrice || item.price)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="mb-card-add-btn"
                          style={{ width: 'auto', padding: '0 14px', height: 34, fontSize: 12 }}
                          onClick={() => {
                            handleAddToCart(item);
                          }}
                        >
                          <ShoppingCart size={13} />
                          <span>Add</span>
                        </button>
                        <button
                          type="button"
                          className="mb-modal-close-btn"
                          onClick={() => handleToggleWishlist(item)}
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
          MY ORDERS MODAL
          ==================================================================== */}
      {activeModal === 'orders' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">My Orders</h3>
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
                    <Package size={26} />
                  </div>
                  <h4 className="mb-empty-title">No orders yet</h4>
                  <p className="mb-empty-desc">
                    Your jewellery purchases will appear here after checkout.
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
                        borderRadius: 14,
                        background: '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong>Order #{ord.orderNumber || ord.id}</strong>
                        <span style={{ color: 'var(--mb-primary)', fontWeight: 600, fontSize: 12 }}>
                          {ord.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--mb-text-muted)' }}>
                        Date: {new Date(ord.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>
                        Total: <strong>{formatCurrency(ord.totalAmount)}</strong>
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
          MY PROFILE MODAL
          ==================================================================== */}
      {activeModal === 'profile' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Customer Profile</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
                <div
                  className="mb-header-avatar"
                  style={{ width: 64, height: 64, fontSize: 22 }}
                  aria-hidden="true"
                >
                  <UserIcon size={28} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 20, color: 'var(--mb-text-dark)' }}>
                    {customerName}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--mb-text-muted)' }}>
                    {user?.email}
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 6,
                      padding: '2px 8px',
                      background: 'var(--mb-primary-light)',
                      color: 'var(--mb-primary)',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {user?.role || 'CUSTOMER'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--mb-text-muted)' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={customerName}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--mb-border)', background: '#F8F4F2' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--mb-text-muted)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--mb-border)', background: '#F8F4F2' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--mb-text-muted)' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--mb-border)' }}
                  />
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="mb-card-add-btn"
                    onClick={() => {
                      showToast('Profile information saved.');
                      setActiveModal(null);
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SAVED ADDRESSES MODAL
          ==================================================================== */}
      {activeModal === 'addresses' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Saved Addresses</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              {/* Address list */}
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    padding: 14,
                    border: '1px solid var(--mb-border)',
                    borderRadius: 12,
                    marginBottom: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{addr.street}</div>
                    <div style={{ fontSize: 12, color: 'var(--mb-text-muted)' }}>
                      {addr.city}, {addr.state} {addr.zipCode}, {addr.country}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#B23A4E', cursor: 'pointer' }}
                    onClick={async () => {
                      await apiDeleteAddress(addr.id);
                      setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
                      showToast('Address deleted.');
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add Address Form */}
              <form onSubmit={handleAddAddress} style={{ marginTop: 20, borderTop: '1px solid var(--mb-border)', paddingTop: 16 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Add New Address</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    style={{ gridColumn: 'span 2', height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--mb-border)' }}
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--mb-border)' }}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--mb-border)' }}
                  />
                  <input
                    type="text"
                    placeholder="Zip / Postal Code"
                    value={newAddress.zipCode}
                    onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                    style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--mb-border)' }}
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={newAddress.country}
                    onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                    style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--mb-border)' }}
                  />
                </div>
                <button
                  type="submit"
                  className="mb-card-add-btn"
                  style={{ marginTop: 14, height: 40 }}
                >
                  Save Address
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          COUPONS & OFFERS MODAL
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
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #FDECF0 0%, #F9DEE5 100%)',
                  border: '1px dashed var(--mb-primary)',
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--mb-primary)' }}>WELCOME10</div>
                  <div style={{ fontSize: 13, color: '#6A2E40', marginTop: 2 }}>
                    Get 10% off your entire order (Min order ₹ 10.00)
                  </div>
                </div>
                <button
                  type="button"
                  className="mb-card-add-btn"
                  style={{ width: 'auto', padding: '0 14px', height: 32, fontSize: 12 }}
                  onClick={() => {
                    setCouponCodeInput('WELCOME10');
                    showToast('Coupon code WELCOME10 copied!');
                  }}
                >
                  Use Code
                </button>
              </div>

              {/* Coupon Test Form */}
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g. WELCOME10)"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--mb-border)' }}
                />
                <button
                  type="submit"
                  className="mb-card-add-btn"
                  style={{ width: 'auto', padding: '0 20px', height: 40 }}
                >
                  Verify
                </button>
              </form>

              {couponResult && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#EAF7EE', color: '#1E6838', fontSize: 13 }}>
                  <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  Coupon <strong>{couponResult.code}</strong> is active! ({couponResult.discountValue}% discount)
                </div>
              )}

              {couponError && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#FDECEF', color: '#901B3A', fontSize: 13 }}>
                  <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  {couponError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          REVIEWS MODAL
          ==================================================================== */}
      {activeModal === 'reviews' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Customer Reviews</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              <div className="mb-empty-state">
                <div className="mb-empty-icon">
                  <Star size={26} />
                </div>
                <h4 className="mb-empty-title">Verified Reviews</h4>
                <p className="mb-empty-desc">
                  You can review any purchased product directly from your order details or the product catalog.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          HELP & SUPPORT MODAL
          ==================================================================== */}
      {activeModal === 'support' && (
        <div className="mb-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h3 className="mb-modal-title">Help & Support</h3>
              <button
                type="button"
                className="mb-modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 16, background: '#FCF6F4', borderRadius: 12 }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--mb-primary)' }}>
                    MALKAZ Client Care
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--mb-text-muted)' }}>
                    Our client care team can help with orders, jewellery care, sizing, and collection questions.
                  </p>
                </div>

                <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div><strong>Client Care:</strong> MALKAZ</div>
                  <div><strong>Phone:</strong> +91 98765 43210 (Mon–Fri, 9am–6pm IST)</div>
                  <div><strong>Store:</strong> Fine Jewellery Collection</div>
                </div>

                <button
                  type="button"
                  className="mb-card-add-btn"
                  onClick={() => {
                    showToast('Support ticket initiated. Our team will contact you shortly.');
                    setActiveModal(null);
                  }}
                >
                  Contact Support Specialist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
