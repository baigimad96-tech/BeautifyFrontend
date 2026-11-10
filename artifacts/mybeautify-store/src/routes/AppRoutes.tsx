import { Route, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import CustomerDashboard from '@/pages/shop/CustomerDashboard';
import CombosOffersPage from '@/pages/shop/CombosOffersPage';
import ProductDetailPage from '@/pages/products/ProductDetailPage';
import CategoriesPage from '@/pages/shop/CategoriesPage';
import BrandsPage from '@/pages/shop/BrandsPage';
import AdminPage from '@/pages/admin/AdminPage';
import AuthPage from '@/pages/auth/AuthPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import MyOrdersPage from '@/pages/orders/MyOrdersPage';
import CheckoutPage from '@/pages/checkout/CheckoutPage';
import ShareReferralPage from '@/pages/referral/ShareReferralPage';
import PrivacyConditionsPage from '@/pages/legal/PrivacyConditionsPage';
import AboutUsPage from '@/pages/legal/AboutUsPage';
import NotFoundPage from '@/pages/not-found/NotFoundPage';

export function AppRoutes() {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={CustomerDashboard} />
        <Route path="/shop" component={CustomerDashboard} />
        <Route path="/combos" component={CombosOffersPage} />
        <Route path="/dashboard" component={CustomerDashboard} />
        <Route path="/account" component={CustomerDashboard} />
        <Route path="/share-referral" component={ShareReferralPage} />
        <Route path="/referral" component={ShareReferralPage} />
        <Route path="/privacy-conditions" component={PrivacyConditionsPage} />
        <Route path="/about-us" component={AboutUsPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/products/:productId" component={ProductDetailPage} />
        <Route path="/products/:id" component={ProductDetailPage} />
        <Route path="/product/:productId" component={ProductDetailPage} />
        <Route path="/product/:id" component={ProductDetailPage} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/brands" component={BrandsPage} />
        <Route path="/wishlist" component={CustomerDashboard} />
        <Route path="/cart" component={CustomerDashboard} />
        <Route path="/orders" component={MyOrdersPage} />
        <Route path="/my-orders" component={MyOrdersPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/sign-in" component={() => <AuthPage mode="login" />} />
        <Route path="/login" component={() => <AuthPage mode="login" />} />
        <Route path="/auth" component={() => <AuthPage mode="login" />} />
        <Route path="/register" component={() => <AuthPage mode="register" />} />
        <Route path="/signup" component={() => <AuthPage mode="register" />} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </ErrorBoundary>
  );
}


export default AppRoutes;
