import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Headphones,
  Gift,
  Home,
  LogOut,
  Package,
  Star,
  Tags,
  UserRound,
  X,
} from 'lucide-react';
import type { CategoryResponse } from '@/types/product.types';
import { fetchCategories } from '@/services/categories/categories.service';
import './MalkazSidebar.css';

export type MalkazSidebarAction =
  | 'wishlist'
  | 'profile'
  | 'addresses'
  | 'reviews'
  | 'support';

interface MalkazSidebarProps {
  activeItem?: string;
  isOpen?: boolean;
  isCollapsed?: boolean;
  isSignedIn?: boolean;
  categories?: CategoryResponse[];
  onCategorySelect?: (category: CategoryResponse) => void;
  onAction?: (action: MalkazSidebarAction) => void;
  onClose?: () => void;
  onLogout?: () => void;
}

interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  action?: MalkazSidebarAction;
}

export function MalkazSidebar({
  activeItem,
  isOpen = false,
  isCollapsed = false,
  isSignedIn = false,
  categories: providedCategories,
  onCategorySelect,
  onAction,
  onClose,
  onLogout,
}: MalkazSidebarProps) {
  const categories = providedCategories ?? [];
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  );
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const categoryQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: providedCategories === undefined,
  });
  const availableCategories = categories.length ? categories : categoryQuery.data ?? [];

  const items: SidebarItem[] = [
    { key: 'home', label: 'Home', icon: <Home size={18} />, href: '/' },
    { key: 'categories', label: 'Categories', icon: <Tags size={18} />, href: '/categories' },
    { key: 'combos', label: 'Combos & Offers', icon: <Gift size={18} />, href: '/combos' },
    { key: 'orders', label: 'My Orders', icon: <Package size={18} />, href: '/orders' },
    {
      key: 'reviews',
      label: 'Reviews',
      icon: <Star size={18} />,
      href: '/account?panel=reviews',
      action: 'reviews',
    },
    {
      key: 'support',
      label: 'Help & Support',
      icon: <Headphones size={18} />,
      href: '/account?panel=support',
      action: 'support',
    },
  ];

  return (
    <>
      <button
        type="button"
        className={`mz-sidebar-backdrop ${isOpen ? 'show' : ''}`}
        onClick={onClose}
        aria-label="Close navigation"
        tabIndex={isOpen ? 0 : -1}
      />
      <aside
        id="malkaz-navigation"
        className={`mz-app-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        aria-label="Main navigation"
        aria-hidden={isMobile && !isOpen}
        inert={isMobile && !isOpen}
      >
        <div className="mz-app-sidebar-top">
          <div className="mz-app-sidebar-heading">
            <Link
              href="/"
              className="mz-app-sidebar-brand"
              onClick={onClose}
              aria-label="MALKAZ home"
            >
              <img src="/malka-zai-emblem.png" alt="" width={94} height={82} />
              <span>MALKAZ</span>
            </Link>
            {isMobile && (
              <button
                type="button"
                className="mz-sidebar-close-btn mobile-close"
                onClick={onClose}
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <nav>
            <ul className="mz-app-sidebar-nav">
              {items.map((item) => (
                <li key={item.key}>
                  {item.action && onAction ? (
                    <button
                      type="button"
                      className={`mz-app-sidebar-link ${activeItem === item.key ? 'active' : ''}`}
                      onClick={() => {
                        onAction(item.action!);
                        onClose?.();
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`mz-app-sidebar-link ${activeItem === item.key ? 'active' : ''}`}
                      onClick={onClose}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
              {availableCategories.some((category) => category.active !== false) && (
                <li className="mz-sidebar-category-group">
                  <span className="mz-sidebar-category-heading">Shop by collection</span>
                  {availableCategories
                    .filter((category) => category.active !== false)
                    .map((category) => (
                      <Link
                        key={category.id}
                        href={`/shop?category=${encodeURIComponent(String(category.id))}`}
                        className="mz-app-sidebar-category-link"
                        onClick={() => {
                          onCategorySelect?.(category);
                          onClose?.();
                        }}
                      >
                        <span className="mz-sidebar-category-image" aria-hidden="true">
                          <span>✦</span>
                          {category.imageUrl && (
                            <img
                              src={category.imageUrl}
                              alt=""
                              loading="lazy"
                              onError={(event) => event.currentTarget.remove()}
                            />
                          )}
                        </span>
                        <span className="mz-sidebar-category-name">{category.name}</span>
                      </Link>
                    ))}
                </li>
              )}
              <li className="mz-app-sidebar-auth">
                {isSignedIn ? (
                  <button type="button" className="mz-app-sidebar-link logout-link" onClick={onLogout}>
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                ) : (
                  <Link href="/sign-in" className="mz-app-sidebar-link" onClick={onClose}>
                    <UserRound size={18} />
                    <span>Sign In</span>
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        </div>
        <div className="mz-app-sidebar-footer" aria-label="MALKAZ">
          <span>✦ ❖ ✦</span>
          <p>Timeless Elegance<br />Forever Jewellery</p>
          <span>✦ ❖ ✦</span>
        </div>
      </aside>
    </>
  );
}
