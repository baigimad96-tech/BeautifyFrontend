import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppRoutes } from '@/routes/AppRoutes';
import { getAuthToken, getApiBaseUrl } from '@/services/api/client';

// Configure base URL and auth token getter for @workspace/api-client-react
setBaseUrl(getApiBaseUrl());
setAuthTokenGetter(() => getAuthToken());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref && ref.trim()) {
        localStorage.setItem('malkaz_referral_code', ref.trim().toUpperCase());
      }
    } catch { }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Backward-compatibility exports for legacy imports from App
export { SiteLayout as Layout } from '@/layouts/SiteLayout';
export { ProductCard } from '@/components/products/ProductCard';
export { BrandMark } from '@/components/common/BrandMark';
export { LoadingGrid } from '@/components/common/LoadingGrid';
export { ErrorState } from '@/components/common/ErrorState';
export { useProductActions } from '@/hooks/use-product-actions';
export { ProductDetailPage as ProductDetail } from '@/pages/products/ProductDetailPage';
export { CategoriesPage as Categories } from '@/pages/shop/CategoriesPage';
export { HomePage as Home } from '@/pages/shop/HomePage';
export { ShopPage as Shop } from '@/pages/shop/ShopPage';
export { CartPage as Cart } from '@/pages/cart/CartPage';
export { WishlistPage as Wishlist } from '@/pages/wishlist/WishlistPage';
export { AccountPage as Account } from '@/pages/profile/AccountPage';