import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useRoute } from 'wouter';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  Gift,
  Loader2,
  Menu,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { MalkazSidebar } from '@/components/layout/MalkazSidebar';
import { getAuthToken } from '@/services/api/client';
import {
  addCustomComboToCart,
  addPredefinedComboToCart,
  fetchComboBySlug,
  fetchComboProducts,
  fetchCombos,
  previewCustomCombo,
} from '@/services/combos/combos.service';
import type { Combo, CustomComboRequestItem } from '@/types/combo.types';
import type { ProductResponse } from '@/types/product.types';
import { getJewelleryImage } from '@/lib/jewellery-images';
import { formatCurrency } from '@/components/products/MalkazProductCard';
import '@/styles/combos-offers.css';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function comboImage(combo: Combo): string {
  const firstItem = combo.items?.[0];
  return combo.imageUrl || firstItem?.imageUrl || getJewelleryImage(null, firstItem?.productName || combo.name, firstItem?.productId);
}

function productImage(product: ProductResponse): string {
  return getJewelleryImage(product.imageUrl, product.name, product.id);
}

function getUrgencyBadge(endDate?: string | null): { text: string; isHot: boolean } | null {
  if (!endDate) return null;
  const diffMs = new Date(endDate).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours <= 48) {
    return { text: `🔥 Ends in ${diffHours}h`, isHot: true };
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return { text: `⏳ Ends in ${diffDays}d`, isHot: false };
  }
  return null;
}

export default function CombosOffersPage() {
  const [, setLocation] = useLocation();
  const [matchSlugRoute, routeParams] = useRoute('/combos/:slug');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Per-card stepper quantity (defaults to 1)
  const [cardQuantities, setCardQuantities] = useState<Record<number, number>>({});

  // Slide-over modal state
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [modalQty, setModalQty] = useState(1);

  const activeSlug = routeParams?.slug || selectedSlug;

  // Reset modal quantity when active slug changes
  useEffect(() => {
    if (activeSlug) {
      setModalQty(1);
    }
  }, [activeSlug]);

  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeSlug) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlug]);

  const selectionItems = useMemo<CustomComboRequestItem[]>(
    () => Object.entries(selected)
      .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
      .sort((a, b) => a.productId - b.productId),
    [selected],
  );

  const combosQuery = useQuery({
    queryKey: ['public-combos'],
    queryFn: () => fetchCombos(0, 12),
  });

  const productsQuery = useQuery({
    queryKey: ['combo-eligible-products'],
    queryFn: () => fetchComboProducts(0, 100),
  });

  const previewQuery = useQuery({
    queryKey: ['custom-combo-preview', selectionItems],
    queryFn: () => previewCustomCombo(selectionItems),
    enabled: selectionItems.length >= 2,
    staleTime: 0,
  });

  // Combo details query for drawer modal
  const comboDetailQuery = useQuery({
    queryKey: ['combo-detail', activeSlug],
    queryFn: () => (activeSlug ? fetchComboBySlug(activeSlug) : null),
    enabled: Boolean(activeSlug),
  });

  const addPredefined = useMutation({
    mutationFn: async ({ combo, quantity }: { combo: Combo; quantity: number }) => {
      await addPredefinedComboToCart(combo.id, quantity);
      return { combo, quantity };
    },
    onSuccess: ({ combo, quantity }) => {
      setNotice(`${quantity > 1 ? `${quantity}× ` : ''}${combo.name} added to your cart.`);
      setActionError('');
    },
    onError: (error) => {
      setNotice('');
      setActionError(messageOf(error));
    },
  });

  const addCustom = useMutation({
    mutationFn: addCustomComboToCart,
    onSuccess: () => {
      setNotice('Your custom combo was added to your cart.');
      setActionError('');
    },
    onError: (error) => {
      setNotice('');
      setActionError(messageOf(error));
    },
  });

  const preview = previewQuery.data;
  const combosList = combosQuery.data?.content ?? [];
  const products = productsQuery.data?.content ?? [];
  const selectedProductCount = selectionItems.length;

  const requestSignIn = () => {
    if (getAuthToken()) return true;
    setLocation(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
    return false;
  };

  const handleOpenModal = (slug: string) => {
    setSelectedSlug(slug);
    window.history.pushState(null, '', `/combos/${encodeURIComponent(slug)}`);
  };

  const handleCloseModal = () => {
    setSelectedSlug(null);
    if (matchSlugRoute) {
      setLocation('/combos');
    } else {
      window.history.pushState(null, '', '/combos');
    }
  };

  const handleCardQtyChange = (comboId: number, delta: number) => {
    setCardQuantities((prev) => {
      const current = prev[comboId] || 1;
      const updated = Math.max(1, current + delta);
      return { ...prev, [comboId]: updated };
    });
  };

  const toggleProduct = (product: ProductResponse) => {
    setNotice('');
    setActionError('');
    setSelected((current) => {
      if (current[product.id]) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return { ...current, [product.id]: 1 };
    });
  };

  const changeQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    setSelected((current) => ({ ...current, [productId]: quantity }));
    setNotice('');
    setActionError('');
  };

  const handleAddPredefined = (combo: Combo, quantity = 1) => {
    if (!requestSignIn()) return;
    setActionError('');
    addPredefined.mutate({ combo, quantity });
  };

  const handleAddCustom = () => {
    if (!requestSignIn() || !preview?.eligible) return;
    setActionError('');
    addCustom.mutate(selectionItems);
  };

  const activeCombo = comboDetailQuery.data || combosList.find((c) => c.slug === activeSlug);

  return (
    <div className="mb-dashboard-layout">
      <MalkazSidebar
        activeItem="combos"
        isOpen={sidebarOpen}
        isSignedIn={Boolean(getAuthToken())}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="mb-main-content">
        <header className="mb-top-header mz-top-header combos-top-header">
          <button
            type="button"
            className="mb-mobile-hamburger mz-mobile-hamburger"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="combos-brand-link">
            MALKAZ <span>ROYAL JEWELS</span>
          </Link>
          <nav className="combos-top-nav" aria-label="Store navigation">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/combos" aria-current="page">Combos &amp; Offers</Link>
          </nav>
          <Link href="/cart" className="combos-cart-link">
            <ShoppingCart size={18} /> Cart
          </Link>
        </header>

        <main className="mb-page-body combos-page">
          <section className="combos-hero">
            <div className="combos-hero-copy">
              <span className="combos-kicker"><Sparkles size={14} /> MALKAZ CURATED OFFERS</span>
              <h1>Combos &amp; Offers</h1>
              <p className="combos-hero-script">Curated Combos. Your Style.</p>
              <p className="combos-hero-description">Discover ready-made jewellery sets or create a combo of your own.</p>
              <a className="combos-hero-cta" href="#build-your-combo">
                Build your combo <ArrowRight size={16} />
              </a>
            </div>
            <div className="combos-hero-art" aria-hidden="true">
              <img src={combosList[0] ? comboImage(combosList[0]) : getJewelleryImage(null, 'Necklace', 1)} alt="" />
            </div>
          </section>

          {/* User Feedback Alerts */}
          {actionError && <p className="combo-alert error" role="alert">{actionError}</p>}
          {notice && (
            <p className="combo-alert success" role="status">
              {notice} <Link href="/checkout">Go to checkout <ArrowRight size={14} /></Link>
            </p>
          )}

          <section className="combos-featured-section" aria-labelledby="predefined-combos-heading">
            <div className="combos-section-heading">
              <div>
                <span className="combos-kicker">READY TO GIFT</span>
                <h2 id="predefined-combos-heading">Curated for you</h2>
              </div>
              <span className="combos-heading-ornament" aria-hidden="true">✦ ─── ✦</span>
            </div>

            {combosQuery.isLoading ? (
              <div className="combos-state"><Loader2 className="animate-spin" /> Loading combos…</div>
            ) : combosQuery.isError ? (
              <div className="combos-state is-error" role="alert">
                {messageOf(combosQuery.error)}{' '}
                <button type="button" onClick={() => { void combosQuery.refetch(); }}>Try again</button>
              </div>
            ) : combosList.length ? (
              <div className="combos-card-grid">
                {combosList.map((combo) => {
                  const cardQty = cardQuantities[combo.id] || 1;
                  const urgency = getUrgencyBadge(combo.endDate);
                  return (
                    <article className="combo-offer-card" key={combo.id}>
                      <div
                        className="combo-offer-image combo-card-clickable"
                        onClick={() => handleOpenModal(combo.slug)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleOpenModal(combo.slug); }}
                        title="Click to view full package breakdown"
                      >
                        <img src={comboImage(combo)} alt={combo.name} loading="lazy" />
                        {combo.savingsPercentage != null && (
                          <span className="combo-offer-tag">SAVE {Math.round(combo.savingsPercentage)}%</span>
                        )}
                        {urgency && (
                          <span
                            className={`combo-urgency-badge ${urgency.isHot ? 'is-urgent' : ''}`}
                            style={{ position: 'absolute', bottom: 8, right: 8 }}
                          >
                            {urgency.text}
                          </span>
                        )}
                      </div>
                      <div className="combo-offer-copy">
                        <span className="combo-offer-eyebrow">
                          {combo.items?.map((item) => item.productName).filter(Boolean).join(' + ')}
                        </span>
                        <h3
                          className="combo-card-clickable"
                          onClick={() => handleOpenModal(combo.slug)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleOpenModal(combo.slug); }}
                          title="Click to view full package breakdown"
                        >
                          {combo.name}
                        </h3>
                        {combo.description && <p>{combo.description}</p>}
                        <div className="combo-offer-price">
                          <strong>{formatCurrency(combo.sellingPrice)}</strong>
                          {combo.originalPrice > combo.sellingPrice && (
                            <del>{formatCurrency(combo.originalPrice)}</del>
                          )}
                        </div>
                        {combo.savingsAmount != null && combo.savingsAmount > 0 && (
                          <span className="combo-saving">Save {formatCurrency(combo.savingsAmount)}</span>
                        )}

                        <button
                          type="button"
                          className="combo-view-details-btn"
                          onClick={() => handleOpenModal(combo.slug)}
                        >
                          <Eye size={13} /> View Package Breakdown
                        </button>

                        <div className="combo-card-actions">
                          <div className="combo-card-qty-row">
                            <div className="combo-card-stepper" aria-label="Combo quantity">
                              <button
                                type="button"
                                onClick={() => handleCardQtyChange(combo.id, -1)}
                                disabled={cardQty <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={12} />
                              </button>
                              <span>{cardQty}</span>
                              <button
                                type="button"
                                onClick={() => handleCardQtyChange(combo.id, 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button
                              type="button"
                              className="combo-offer-button combo-card-add-btn"
                              disabled={addPredefined.isPending || combo.inStock === false}
                              onClick={() => handleAddPredefined(combo, cardQty)}
                            >
                              {addPredefined.isPending && addPredefined.variables?.combo.id === combo.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <ShoppingCart size={15} />
                              )}
                              {combo.inStock === false ? 'Out of stock' : 'Add combo to cart'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="combos-state">There are no active combos right now. Build a custom combo below.</div>
            )}
          </section>

          {/* ====================================================================
              SLIDE-OVER DRAWER MODAL (COMBO BREAKDOWN)
              ==================================================================== */}
          {Boolean(activeSlug) && (
            <div className="combo-drawer-backdrop" onClick={handleCloseModal}>
              <div className="combo-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="combo-drawer-header">
                  <div className="combo-drawer-header-title">
                    <Sparkles size={16} color="#bd9145" /> Curated Combo Breakdown
                  </div>
                  <button
                    type="button"
                    className="combo-drawer-close"
                    onClick={handleCloseModal}
                    aria-label="Close combo details"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="combo-drawer-body">
                  {comboDetailQuery.isLoading && !activeCombo ? (
                    <div className="combos-state"><Loader2 className="animate-spin" /> Loading combo details…</div>
                  ) : activeCombo ? (
                    <>
                      <div className="combo-drawer-hero">
                        <img src={comboImage(activeCombo)} alt={activeCombo.name} />
                        {activeCombo.savingsPercentage != null && (
                          <span className="combo-offer-tag">SAVE {Math.round(activeCombo.savingsPercentage)}%</span>
                        )}
                        {getUrgencyBadge(activeCombo.endDate) && (
                          <span className={`combo-urgency-badge ${getUrgencyBadge(activeCombo.endDate)?.isHot ? 'is-urgent' : ''}`}>
                            {getUrgencyBadge(activeCombo.endDate)?.text}
                          </span>
                        )}
                      </div>

                      <div className="combo-drawer-details">
                        <h2>{activeCombo.name}</h2>
                        {activeCombo.description && <p>{activeCombo.description}</p>}
                      </div>

                      <div className="combo-breakdown-section">
                        <div className="combo-breakdown-title">
                          <Gift size={15} /> Included in this Package ({activeCombo.items?.length || 0} items)
                        </div>
                        <ul className="combo-breakdown-list">
                          {activeCombo.items?.map((item, idx) => {
                            const thumb = item.imageUrl || getJewelleryImage(null, item.productName || 'Jewellery', item.productId);
                            const unitPrice = item.effectivePrice ?? item.basePrice ?? 0;
                            return (
                              <li className="combo-breakdown-item" key={item.id ?? idx}>
                                <img src={thumb} alt={item.productName || ''} className="combo-breakdown-thumb" />
                                <div className="combo-breakdown-item-info">
                                  <div className="combo-breakdown-item-name">{item.productName || `Item #${item.productId}`}</div>
                                  <div className="combo-breakdown-item-qty">Quantity: {item.quantity}</div>
                                  {item.inStock === false && (
                                    <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>Temporarily out of stock</span>
                                  )}
                                </div>
                                <div className="combo-breakdown-item-pricing">
                                  <span className="combo-breakdown-item-price">{formatCurrency(unitPrice * item.quantity)}</span>
                                  {item.basePrice && item.effectivePrice && item.basePrice > item.effectivePrice && (
                                    <span className="combo-breakdown-item-base">{formatCurrency(item.basePrice * item.quantity)}</span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="combo-drawer-pricing-box">
                        <div className="combo-drawer-pricing-row">
                          <span>Total Standalone Price:</span>
                          <span style={{ textDecoration: 'line-through' }}>{formatCurrency(activeCombo.originalPrice)}</span>
                        </div>
                        <div className="combo-drawer-pricing-row savings">
                          <span>Package Discount:</span>
                          <span>−{formatCurrency(activeCombo.savingsAmount || (activeCombo.originalPrice - activeCombo.sellingPrice))}</span>
                        </div>
                        <div className="combo-drawer-pricing-row total">
                          <span>Combo Offer Price:</span>
                          <span>{formatCurrency(activeCombo.sellingPrice)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="combos-state is-error">Combo details could not be found.</div>
                  )}
                </div>

                {activeCombo && (
                  <div className="combo-drawer-footer">
                    <div className="combo-drawer-footer-actions">
                      <div className="combo-drawer-stepper" aria-label="Modal combo quantity">
                        <button
                          type="button"
                          onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                          disabled={modalQty <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{modalQty}</span>
                        <button
                          type="button"
                          onClick={() => setModalQty((q) => q + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="combo-drawer-add-btn"
                        disabled={addPredefined.isPending || activeCombo.inStock === false}
                        onClick={() => {
                          handleAddPredefined(activeCombo, modalQty);
                          handleCloseModal();
                        }}
                      >
                        {addPredefined.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                        {activeCombo.inStock === false ? 'Out of Stock' : `Add Combo to Cart (${formatCurrency(activeCombo.sellingPrice * modalQty)})`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================================
              BUILD YOUR OWN COMBO SECTION
              ==================================================================== */}
          <section className="combo-builder" id="build-your-combo" aria-labelledby="combo-builder-heading">
            <div className="combo-builder-heading">
              <span className="combos-kicker">MADE AROUND YOU</span>
              <h2 id="combo-builder-heading">Build your own combo</h2>
              <p>Choose your favourites. Your combo discount is calculated securely at checkout preview.</p>
            </div>
            <div className="combo-steps" aria-label="Combo steps">
              <div className="active"><span>1</span><div><strong>Select products</strong><small>Pick the pieces you love</small></div></div>
              <ChevronRight size={18} aria-hidden="true" />
              <div className={preview?.eligible ? 'active' : ''}><span>2</span><div><strong>Get your discount</strong><small>Based on your selection</small></div></div>
              <ChevronRight size={18} aria-hidden="true" />
              <div className={notice.includes('added') ? 'active' : ''}><span>3</span><div><strong>Add to cart</strong><small>Complete your order</small></div></div>
            </div>

            <div className="combo-builder-layout">
              <div className="combo-product-area">
                {productsQuery.isLoading ? (
                  <div className="combos-state"><Loader2 className="animate-spin" /> Loading eligible products…</div>
                ) : productsQuery.isError ? (
                  <div className="combos-state is-error" role="alert">
                    {messageOf(productsQuery.error)}{' '}
                    <button type="button" onClick={() => { void productsQuery.refetch(); }}>Try again</button>
                  </div>
                ) : products.length ? (
                  <div className="combo-product-grid">
                    {products.map((product) => {
                      const quantity = selected[product.id] ?? 0;
                      const selectedProduct = quantity > 0;
                      const availableStock = product.stockQuantity ?? 0;
                      return (
                        <article className={`combo-product-card ${selectedProduct ? 'selected' : ''}`} key={product.id}>
                          <button
                            type="button"
                            className="combo-product-select"
                            aria-pressed={selectedProduct}
                            onClick={() => toggleProduct(product)}
                            disabled={availableStock <= 0}
                          >
                            <span className="combo-product-photo">
                              <img src={productImage(product)} alt="" loading="lazy" />
                            </span>
                            <span className="combo-product-info">
                              <strong>{product.name}</strong>
                              <span>{formatCurrency(product.sellingPrice || product.discountPrice || product.price)}</span>
                            </span>
                            <span className="combo-product-check" aria-hidden="true">
                              {selectedProduct && <Check size={16} />}
                            </span>
                          </button>
                          {selectedProduct && (
                            <div className="combo-product-quantity">
                              <span>Quantity</span>
                              <div>
                                <button
                                  type="button"
                                  aria-label={`Decrease ${product.name} quantity`}
                                  disabled={quantity <= 1}
                                  onClick={() => changeQuantity(product.id, quantity - 1)}
                                >
                                  <Minus size={13} />
                                </button>
                                <span>{quantity}</span>
                                <button
                                  type="button"
                                  aria-label={`Increase ${product.name} quantity`}
                                  disabled={quantity >= availableStock}
                                  onClick={() => changeQuantity(product.id, quantity + 1)}
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="combos-state">No eligible products are available for custom combos.</div>
                )}
              </div>

              <aside className="combo-summary" aria-label="Your combo summary">
                <h3><ShoppingCart size={19} /> Your combo</h3>
                {selectedProductCount ? (
                  <ul className="combo-summary-items">
                    {selectionItems.map((item) => {
                      const product = products.find((candidate) => candidate.id === item.productId);
                      return product ? (
                        <li key={item.productId}>
                          <img src={productImage(product)} alt="" />
                          <span>{product.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
                          <button type="button" onClick={() => toggleProduct(product)} aria-label={`Remove ${product.name}`}>
                            <Plus size={14} />
                          </button>
                        </li>
                      ) : null;
                    })}
                  </ul>
                ) : (
                  <p className="combo-summary-empty">Select at least two different products to preview your combo.</p>
                )}

                {selectedProductCount > 0 && selectedProductCount < 2 && (
                  <p className="combo-summary-hint">Add one more product to check your offer.</p>
                )}
                {previewQuery.isFetching && (
                  <p className="combo-preview-status"><Loader2 size={15} className="animate-spin" /> Checking current offer…</p>
                )}
                {previewQuery.isError && (
                  <p className="combo-preview-status is-error" role="alert">
                    {messageOf(previewQuery.error)}{' '}
                    <button type="button" onClick={() => { void previewQuery.refetch(); }}>Retry</button>
                  </p>
                )}
                {preview && !previewQuery.isFetching && (
                  <>
                    {!preview.eligible && (
                      <p className="combo-summary-hint">{preview.eligibleMessage || 'This selection does not qualify for a combo discount yet.'}</p>
                    )}
                    <div className="combo-summary-line">
                      <span>Subtotal</span>
                      <strong>{formatCurrency(preview.originalSubtotal)}</strong>
                    </div>
                    <div className="combo-summary-line discount">
                      <span>{preview.appliedRuleName || `Combo discount (${preview.discountPercentage}%)`}</span>
                      <strong>−{formatCurrency(preview.discountAmount)}</strong>
                    </div>
                    <div className="combo-summary-total">
                      <span>Final total</span>
                      <strong>{formatCurrency(preview.finalTotal)}</strong>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="combo-summary-submit"
                  disabled={!preview?.eligible || previewQuery.isFetching || addCustom.isPending}
                  onClick={handleAddCustom}
                >
                  {addCustom.isPending ? <Loader2 size={17} className="animate-spin" /> : <ShoppingCart size={17} />}
                  Add custom combo to cart
                </button>
                <small className="combo-summary-secure">Final combo prices are verified by MALKAZ at the server.</small>
              </aside>
            </div>
          </section>
          <footer className="combos-footer-note">
            <Gift size={16} /> Choose two or more unique pieces to see the current combo offer.
          </footer>
        </main>
      </div>
    </div>
  );
}
