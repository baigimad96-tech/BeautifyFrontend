import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, UserRound, X, Shield } from 'lucide-react';
import { useGetCart, useGetCategories, type Category } from '@workspace/api-client-react';
import { BrandMark } from '@/components/common/BrandMark';
import { HeaderSearchBar } from '@/components/common/HeaderSearchBar';
import { AnnouncementBar } from '@/components/common/AnnouncementBar';
import { toArray } from '@/utils/array';
import { hasAdminRole } from '@/utils/auth';
import { STORAGE_KEYS } from '@/constants';
import { getAuthToken } from '@/services/api/client';

export interface SiteLayoutProps {
  children: ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const [location] = useLocation();
  const [menu, setMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const categories = useGetCategories();

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
    } catch {
      return null;
    }
  })();

  const cart = useGetCart();
  const count = toArray<{ quantity?: number }>(cart.data?.items).reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  const nav = [
    ['Shop', '/shop'],
    ['Categories', '/categories'],
    ['Our collection', '/#edit'],
  ];

  useEffect(() => {
    setMenu(false);
  }, [location]);

  useEffect(() => {
    if (!menu) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menu]);

  return (
    <div className="site-shell">
      <AnnouncementBar />
      <header className="nav">
        <BrandMark />
        <nav className="navlinks" aria-label="Primary navigation">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={location === href ? 'active' : ''}
              onClick={() => setMenu(false)}
              data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          {Boolean(getAuthToken()) && hasAdminRole(currentUser?.role) && (
            <Link
              href="/admin"
              className="icon-button"
              aria-label="Admin Dashboard"
              title="Admin Dashboard"
              data-testid="link-admin-dashboard"
            >
              <Shield size={18} />
            </Link>
          )}
          <HeaderSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search jewellery, collections and more..."
            className="site-nav-search"
          />
          <Link href="/account" className="icon-button" aria-label="Account" data-testid="link-account">
            <UserRound size={18} />
          </Link>
          <Link href="/cart" className="icon-button" aria-label="Shopping cart" data-testid="link-cart">
            <ShoppingCart size={18} />
            {count > 0 && (
              <span className="cart-count" data-testid="text-cart-count">
                {count}
              </span>
            )}
          </Link>
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenu((open) => !open)}
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
            aria-controls="mobile-navigation-drawer"
            data-testid="button-mobile-menu"
          >
            {menu ? (
              <X size={19} />
            ) : (
              <span className="nav-hamburger-mark" aria-hidden="true">
                <span />
                <span />
              </span>
            )}
          </button>
        </div>
      </header>
      <button
        type="button"
        className={`nav-drawer-backdrop ${menu ? 'show' : ''}`}
        onClick={() => setMenu(false)}
        aria-label="Close navigation"
        aria-hidden={!menu}
        tabIndex={menu ? 0 : -1}
      />
      <nav
        id="mobile-navigation-drawer"
        className={`nav-drawer ${menu ? 'open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!menu}
        inert={!menu}
      >
        <div className="nav-drawer-heading">
          <span>Explore MALKAZ</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        {nav.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={location === href ? 'active' : ''}
            onClick={() => setMenu(false)}
          >
            {label}
          </Link>
        ))}
        {toArray<Category>(categories.data).map((category) => (
          <Link
            key={category.id}
            href={`/shop?category=${encodeURIComponent(String(category.id))}`}
            onClick={() => setMenu(false)}
          >
            {category.name}
          </Link>
        ))}
      </nav>
      {children}
      <footer className="footer">
        <BrandMark href="/" testId="link-footer-home" />
        <span>Timeless jewellery, thoughtfully chosen.</span>
        <nav>
          <Link href="/shop" data-testid="link-footer-shop">
            Shop
          </Link>{' '}
          &nbsp;·&nbsp;{' '}
          <Link href="/account" data-testid="link-footer-account">
            Account
          </Link>{' '}
          &nbsp;·&nbsp;{' '}
          <Link href="/wishlist" data-testid="link-footer-wishlist">
            Saved items
          </Link>
          {' '}&nbsp;·&nbsp;{' '}
          <Link href="/about-us" data-testid="link-footer-about-us">
            About Us
          </Link>
          {' '}&nbsp;·&nbsp;{' '}
          <Link href="/privacy-conditions" data-testid="link-footer-privacy-conditions">
            Privacy &amp; Conditions
          </Link>
        </nav>
      </footer>
    </div>
  );
}

export default SiteLayout;
