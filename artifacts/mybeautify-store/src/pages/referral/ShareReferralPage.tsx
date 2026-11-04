import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Share2,
  Copy,
  Check,
  Gift,
  Users,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  Home,
  Package,
  Heart,
  User as UserIcon,
  MapPin,
  Ticket,
  Star,
  Headphones,
  LogOut,
  ChevronDown,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchMyReferralSummary,
  type ReferralSummary,
  type ReferralItem,
} from '@/services/referral/referral.service';
import {
  fetchCurrentUser,
  logout as apiLogout,
  getCachedUser,
  getAuthToken,
} from '@/services/auth/auth.service';
import { fetchCart } from '@/services/cart/cart.service';
import { fetchWishlist } from '@/services/wishlist/wishlist.service';
import type { UserResponse } from '@/types/auth.types';
import HeaderSearchBar from '@/components/common/HeaderSearchBar';
import { MalkazSidebar } from '@/components/layout/MalkazSidebar';
import '@/styles/customer-dashboard.css';

export function ShareReferralPage() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<UserResponse | null>(() => getCachedUser());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Interaction feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Navigation & Header states
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  // Load user, counts, and referral summary
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [userData, summaryData] = await Promise.all([
          fetchCurrentUser().catch(() => null),
          fetchMyReferralSummary().catch((err) => {
            console.error('Failed to load referral summary:', err);
            return null;
          }),
        ]);

        if (isMounted) {
          if (userData) setUser(userData);
          if (summaryData) {
            setSummary(summaryData);
          } else {
            setError('Could not load referral details. Please try again.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to initialize referral details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }

      // Load counts
      try {
        const [cartRes, wishRes] = await Promise.all([
          fetchCart().catch(() => null),
          fetchWishlist().catch(() => null),
        ]);
        if (isMounted) {
          if (cartRes?.items) {
            setCartCount(cartRes.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0));
          }
          if (Array.isArray(wishRes)) {
            setWishlistCount(wishRes.length);
          }
        }
      } catch {
        // Non-critical counts failure
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const customerName = user?.fullName || user?.email || 'Sign in';

  // Dynamic referral link constructed from production/browser origin
  const fullReferralLink = useMemo(() => {
    if (summary?.referralLink) {
      // Ensure it matches the current window domain if running locally or in staging
      try {
        const u = new URL(summary.referralLink);
        return `${window.location.origin}/?ref=${summary.referralCode}`;
      } catch {
        return summary.referralLink;
      }
    }
    if (summary?.referralCode) {
      return `${window.location.origin}/?ref=${summary.referralCode}`;
    }
    return '';
  }, [summary]);

  const handleCopyLink = useCallback(async () => {
    if (!fullReferralLink) return;
    try {
      await navigator.clipboard.writeText(fullReferralLink);
      setCopiedLink(true);
      setShareFeedback('Referral link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
      setTimeout(() => setShareFeedback(null), 3000);
    } catch {
      setShareFeedback('Unable to copy automatically. Please copy manually.');
    }
  }, [fullReferralLink]);

  const handleCopyCode = useCallback(async () => {
    if (!summary?.referralCode) return;
    try {
      await navigator.clipboard.writeText(summary.referralCode);
      setCopiedCode(true);
      setShareFeedback(`Referral code ${summary.referralCode} copied!`);
      setTimeout(() => setCopiedCode(false), 2500);
      setTimeout(() => setShareFeedback(null), 3000);
    } catch {
      setShareFeedback('Unable to copy code automatically.');
    }
  }, [summary?.referralCode]);

  const handleNativeShare = useCallback(async () => {
    if (!fullReferralLink) return;
    const shareData = {
      title: 'MALKAZ',
      text: `Discover royal handcrafted jewellery at MALKAZ! Use my personal referral link to enjoy an exclusive ${summary?.discountPercent || 10}% discount on your first order.`,
      url: fullReferralLink,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareFeedback('Shared successfully!');
        setTimeout(() => setShareFeedback(null), 2500);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Fallback to clipboard
          handleCopyLink();
        }
      }
    } else {
      // Clean fallback when Web Share API is unavailable
      handleCopyLink();
    }
  }, [fullReferralLink, summary?.discountPercent, handleCopyLink]);

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setLocation('/sign-in');
  };

  return (
    <div className="mb-dashboard-layout">
      <MalkazSidebar
        activeItem="referral"
        isOpen={mobileSidebarOpen}
        isSignedIn={Boolean(user)}
        onClose={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="mb-main-content">
        {/* Top Header */}
        <header className="mb-top-header mz-top-header mz-referral-top-header">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="mb-mobile-hamburger mz-mobile-hamburger"
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
            placeholder="Search jewellery, collections and more..."
          />

          {/* Right actions */}
          <div className="mb-header-right mz-header-right-actions">
            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="mb-header-icon-btn mz-header-icon-btn"
              title="Wishlist"
              aria-label="View Wishlist"
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="mb-badge mz-badge-gold">{wishlistCount}</span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/checkout"
              className="mb-header-icon-btn mz-header-icon-btn"
              title="Cart"
              aria-label="View Cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="mb-badge mz-badge-gold">{cartCount}</span>
              )}
            </Link>

            {/* Neutral Customer profile dropdown */}
            <div className="mb-header-profile-wrap mz-header-profile-wrap">
              <button
                type="button"
                className="mb-header-profile-chip mz-header-profile-chip mb-customer-profile-pill"
                onClick={() => setProfileDropdownOpen((o) => !o)}
                aria-expanded={profileDropdownOpen}
                aria-label="User account menu"
              >
                <div className="mb-header-avatar mz-header-avatar mb-customer-avatar-circle">
                  <UserIcon size={18} aria-hidden="true" />
                </div>
                <span className="mb-header-profile-name mz-header-profile-name mb-customer-profile-name">
                  {customerName}
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
                    <div className="mb-profile-menu-name">{customerName}</div>
                    {user?.email && <div className="mb-profile-menu-email">{user.email}</div>}
                  </div>

                  <Link
                    href="/account"
                    className="mb-profile-menu-item"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <UserIcon size={15} />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/orders"
                    className="mb-profile-menu-item"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <Package size={15} />
                    <span>My Orders</span>
                  </Link>

                  <div className="mb-profile-menu-divider" />

                  {user ? (
                    <button
                      type="button"
                      className="mb-profile-menu-item logout"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
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

        {/* Breadcrumb / Top Bar */}
        <div style={{ padding: '16px 32px 0 32px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#7A6F62' }}>
          <Link href="/" style={{ color: '#063B2F', fontWeight: 600, textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <span style={{ color: '#D4AF63', fontWeight: 700 }}>Share & Referral</span>
        </div>

        {/* Toast / Notification feedback */}
        {shareFeedback && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#063B2F',
              color: '#FAF7F2',
              border: '1px solid #D4AF63',
              padding: '12px 20px',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              zIndex: 9999,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            <Check size={18} style={{ color: '#D4AF63' }} />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Main Share & Referral Content */}
        <main className="mz-referral-page">
          {/* ==================================================================
              A. REFERRAL HERO SECTION
              ================================================================== */}
          <section className="mz-referral-hero">
            <div className="mz-referral-hero-badge">
              <Sparkles size={14} />
              <span>MALKAZ Privilege Circle</span>
            </div>
            <h1 className="mz-referral-hero-title">Share the Elegance, Spread the Love</h1>
            <p className="mz-referral-hero-desc">
              Invite your friends to discover MALKAZ jewellery. Share your referral link and help your friends save on their first purchase.
            </p>
          </section>

          {/* Guest State Notice if not logged in */}
          {!user && (
            <div
              style={{
                background: '#FFF9ED',
                border: '1px solid #F1D489',
                borderRadius: 14,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <AlertCircle size={24} style={{ color: '#B58D3D', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#063B2F', fontSize: 15 }}>Sign in to get your personal referral link</div>
                  <div style={{ color: '#7A6F62', fontSize: 13.5, marginTop: 2 }}>
                    Log in or create a customer account to generate your unique referral code and track rewards.
                  </div>
                </div>
              </div>
              <Link href="/sign-in?redirect=/share-referral" className="mz-btn-gold" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Sign In Now
              </Link>
            </div>
          )}

          {/* ==================================================================
              B & C. MAIN GRID (Personal Link & Friend Discount Card)
              ================================================================== */}
          <div className="mz-referral-main-grid">
            {/* Section B: Your Personal Referral Link */}
            <div className="mz-referral-card">
              <div className="mz-referral-card-header">
                <div className="mz-referral-card-icon">
                  <Share2 size={20} />
                </div>
                <div>
                  <h2 className="mz-referral-card-title">Your Personal Referral Link</h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#7A6F62' }}>
                    Share this unique link or code with your friends and family
                  </p>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: '#063B2F' }}>
                  <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                  <span style={{ fontSize: 13.5 }}>Retrieving your personal referral code...</span>
                </div>
              ) : error ? (
                <div style={{ padding: '20px', background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, color: '#A01548', fontSize: 13.5 }}>
                  {error}
                </div>
              ) : (
                <>
                  {/* Referral Code Box */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#7A6F62', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                      Your Unique Referral Code
                    </label>
                    <div className="mz-referral-code-pill">
                      <span className="mz-referral-code-val">{summary?.referralCode || 'MZ-MALLKAZ'}</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="mz-btn-gold"
                        style={{ padding: '7px 14px', fontSize: 12.5 }}
                        title="Copy Referral Code"
                      >
                        {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Referral URL Input Field */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#7A6F62', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                      Shareable Referral Link
                    </label>
                    <div className="mz-referral-input-wrap">
                      <input
                        type="text"
                        readOnly
                        value={fullReferralLink || `${window.location.origin}/?ref=${summary?.referralCode || 'CODE'}`}
                        className="mz-referral-input"
                        aria-label="Shareable referral link"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="mz-btn-gold"
                        style={{ padding: '8px 16px', fontSize: 12.5, whiteSpace: 'nowrap' }}
                        title="Copy link to clipboard"
                      >
                        {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Share Action Buttons */}
                  <div className="mz-referral-btn-group">
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="mz-btn-gold"
                      style={{ flex: 1 }}
                    >
                      <Share2 size={16} />
                      <span>Share Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="mz-btn-emerald-outline"
                    >
                      <Copy size={16} />
                      <span>Copy Referral Code</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Section C: Exclusive Friend Discount */}
            <div className="mz-promo-highlight-card">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#D4AF63', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  <Gift size={15} />
                  <span>Exclusive Privilege</span>
                </div>
                <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 24, fontWeight: 700, margin: '0 0 10px 0', color: '#FAF7F2' }}>
                  A Special Gift for Your Friends
                </h2>
                <p className="mz-promo-desc-text">
                  Share your referral link and give your friends an exclusive discount on their first eligible purchase.
                </p>
              </div>

              <div style={{ padding: '16px 20px', background: 'rgba(212, 175, 99, 0.12)', border: '1px solid rgba(212, 175, 99, 0.3)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="mz-promo-discount-num">{summary?.discountPercent || 10}%</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#FAF7F2' }}>OFF First Order</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#E2D7C3', marginTop: 4 }}>
                  {summary?.discountDescription || 'Applies automatically at checkout on eligible fine jewellery orders.'}
                </div>
                {summary?.minimumOrderAmount && summary.minimumOrderAmount > 0 && (
                  <div style={{ fontSize: 11.5, color: '#D4AF63', marginTop: 4 }}>
                    Minimum order: ₹{summary.minimumOrderAmount.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <Link
                href="/shop"
                className="mz-btn-gold"
                style={{ textDecoration: 'none', width: '100%' }}
              >
                <span>Shop Jewellery</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* ==================================================================
              D. REFERRAL PROGRESS (Real Backend Data)
              ================================================================== */}
          <section className="mz-referral-card">
            <div className="mz-referral-card-header">
              <div className="mz-referral-card-icon">
                <Users size={20} />
              </div>
              <div>
                <h2 className="mz-referral-card-title">Referral Progress</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#7A6F62' }}>
                  Track your invitations, friend registrations, and qualifying purchases
                </p>
              </div>
            </div>

            {/* 4 Key Statistics Cards */}
            <div className="mz-referral-stats-grid">
              <div className="mz-stat-card">
                <div className="mz-stat-icon-wrap">
                  <Users size={22} />
                </div>
                <div>
                  <div className="mz-stat-number">{summary?.totalReferrals || 0}</div>
                  <div className="mz-stat-label">Friends Registered</div>
                </div>
              </div>

              <div className="mz-stat-card">
                <div className="mz-stat-icon-wrap">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <div className="mz-stat-number">{summary?.successfulReferrals || 0}</div>
                  <div className="mz-stat-label">Purchases Completed</div>
                </div>
              </div>

              <div className="mz-stat-card">
                <div className="mz-stat-icon-wrap">
                  <Gift size={22} />
                </div>
                <div>
                  <div className="mz-stat-number">{summary?.successfulReferrals || 0}</div>
                  <div className="mz-stat-label">Successful Referrals</div>
                </div>
              </div>

              <div className="mz-stat-card">
                <div className="mz-stat-icon-wrap">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="mz-stat-number">
                    {summary?.totalRewards ? `₹${summary.totalRewards.toLocaleString('en-IN')}` : '₹0'}
                  </div>
                  <div className="mz-stat-label">Rewards Earned</div>
                </div>
              </div>
            </div>

            {/* Recent Referrals Activity List / Table */}
            <div style={{ marginTop: 8 }}>
              <h3 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 16, fontWeight: 700, color: '#063B2F', margin: '0 0 12px 0' }}>
                Recent Referral Activity
              </h3>

              {summary?.recentReferrals && summary.recentReferrals.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="mz-referral-table">
                    <thead>
                      <tr>
                        <th>Friend</th>
                        <th>Email</th>
                        <th>Registered Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentReferrals.map((item: ReferralItem) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600, color: '#063B2F' }}>{item.friendName}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{item.friendEmailMasked}</td>
                          <td>{new Date(item.registeredAt).toLocaleDateString()}</td>
                          <td>
                            {item.status === 'COMPLETED' ? (
                              <span className="mz-status-badge mz-status-completed">
                                <Check size={12} />
                                <span>Purchase Completed</span>
                              </span>
                            ) : (
                              <span className="mz-status-badge mz-status-registered">
                                <span>Registered</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Empty state when no referrals yet */
                <div className="mz-referral-empty-state">
                  <div className="mz-referral-empty-icon">
                    <Gift size={26} />
                  </div>
                  <div style={{ fontWeight: 700, color: '#063B2F', fontSize: 15 }}>No referrals yet</div>
                  <div style={{ fontSize: 13.5, maxWidth: 440, lineHeight: 1.5 }}>
                    Copy and share your unique referral link above with friends to begin sharing the luxury of MALKAZ jewellery!
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="mz-btn-gold"
                    style={{ marginTop: 8 }}
                  >
                    <Copy size={15} />
                    <span>Copy Your Referral Link</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================================
              E. HOW IT WORKS (Three Steps)
              ================================================================== */}
          <section className="mz-referral-card">
            <div className="mz-referral-card-header">
              <div className="mz-referral-card-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="mz-referral-card-title">How It Works</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#7A6F62' }}>
                  Three simple steps to share elegance with your inner circle
                </p>
              </div>
            </div>

            <div className="mz-how-it-works-grid">
              {/* Step 1 */}
              <div className="mz-step-card">
                <div className="mz-step-num">1</div>
                <h3 className="mz-step-title">Share Your Link</h3>
                <p className="mz-step-desc">
                  Copy your unique referral link and share it with friends via messaging apps, email, or social media.
                </p>
              </div>

              {/* Step 2 */}
              <div className="mz-step-card">
                <div className="mz-step-num">2</div>
                <h3 className="mz-step-title">Your Friend Gets a Discount</h3>
                <p className="mz-step-desc">
                  Your friend opens the link, registers or signs in, and receives the eligible first-purchase discount according to the configured referral rules.
                </p>
              </div>

              {/* Step 3 */}
              <div className="mz-step-card">
                <div className="mz-step-num">3</div>
                <h3 className="mz-step-title">Track Your Referrals</h3>
                <p className="mz-step-desc">
                  View referral activity and any eligible rewards on your account as friends join and complete qualifying orders.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default ShareReferralPage;
