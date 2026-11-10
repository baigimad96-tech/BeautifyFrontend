import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Gift,
  Loader2,
  Menu,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { MalkazSidebar } from '@/components/layout/MalkazSidebar';
import { getAuthToken } from '@/services/api/client';
import {
  addCustomComboToCart,
  addPredefinedComboToCart,
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

export default function CombosOffersPage() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
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
  const addPredefined = useMutation({
    mutationFn: async (combo: Combo) => {
      await addPredefinedComboToCart(combo.id);
      return combo;
    },
    onSuccess: (combo) => {
      setNotice(`${combo.name} added to your cart.`);
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

  const handleAddPredefined = (combo: Combo) => {
    if (!requestSignIn()) return;
    setActionError('');
    addPredefined.mutate(combo);
  };

  const handleAddCustom = () => {
    if (!requestSignIn() || !preview?.eligible) return;
    setActionError('');
    addCustom.mutate(selectionItems);
  };

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
          <button type="button" className="mb-mobile-hamburger mz-mobile-hamburger" onClick={() => setSidebarOpen((open) => !open)} aria-label="Open menu" aria-expanded={sidebarOpen}>
            <Menu size={20} />
          </button>
          <Link href="/" className="combos-brand-link">MALKAZ <span>ROYAL JEWELS</span></Link>
          <nav className="combos-top-nav" aria-label="Store navigation">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/combos" aria-current="page">Combos &amp; Offers</Link>
          </nav>
          <Link href="/cart" className="combos-cart-link"><ShoppingCart size={18} /> Cart</Link>
        </header>

        <main className="mb-page-body combos-page">
          <section className="combos-hero">
            <div className="combos-hero-copy">
              <span className="combos-kicker"><Sparkles size={14} /> MALKAZ CURATED OFFERS</span>
              <h1>Combos &amp; Offers</h1>
              <p className="combos-hero-script">Curated Combos. Your Style.</p>
              <p className="combos-hero-description">Discover ready-made jewellery sets or create a combo of your own.</p>
              <a className="combos-hero-cta" href="#build-your-combo">Build your combo <ArrowRight size={16} /></a>
            </div>
            <div className="combos-hero-art" aria-hidden="true">
              <img src={combosList[0] ? comboImage(combosList[0]) : getJewelleryImage(null, 'Necklace', 1)} alt="" />
            </div>
          </section>

          <section className="combos-featured-section" aria-labelledby="predefined-combos-heading">
            <div className="combos-section-heading">
              <div><span className="combos-kicker">READY TO GIFT</span><h2 id="predefined-combos-heading">Curated for you</h2></div>
              <span className="combos-heading-ornament" aria-hidden="true">✦ ─── ✦</span>
            </div>
            {combosQuery.isLoading ? <div className="combos-state"><Loader2 className="animate-spin" /> Loading combos…</div>
              : combosQuery.isError ? <div className="combos-state is-error" role="alert">{messageOf(combosQuery.error)} <button type="button" onClick={() => { void combosQuery.refetch(); }}>Try again</button></div>
                : combosList.length ? <div className="combos-card-grid">
                  {combosList.map((combo) => (
                    <article className="combo-offer-card" key={combo.id}>
                      <div className="combo-offer-image">
                        <img src={comboImage(combo)} alt={combo.name} loading="lazy" />
                        {combo.savingsPercentage != null && <span className="combo-offer-tag">SAVE {Math.round(combo.savingsPercentage)}%</span>}
                      </div>
                      <div className="combo-offer-copy">
                        <span className="combo-offer-eyebrow">{combo.items?.map((item) => item.productName).filter(Boolean).join(' + ')}</span>
                        <h3>{combo.name}</h3>
                        {combo.description && <p>{combo.description}</p>}
                        <div className="combo-offer-price">
                          <strong>{formatCurrency(combo.sellingPrice)}</strong>
                          {combo.originalPrice > combo.sellingPrice && <del>{formatCurrency(combo.originalPrice)}</del>}
                        </div>
                        {combo.savingsAmount != null && combo.savingsAmount > 0 && <span className="combo-saving">Save {formatCurrency(combo.savingsAmount)}</span>}
                        <button type="button" className="combo-offer-button" disabled={addPredefined.isPending || combo.inStock === false} onClick={() => handleAddPredefined(combo)}>
                          {addPredefined.isPending && addPredefined.variables?.id === combo.id ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                          {combo.inStock === false ? 'Out of stock' : 'Add combo to cart'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div> : <div className="combos-state">There are no active combos right now. Build a custom combo below.</div>}
          </section>

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

            {actionError && <p className="combo-alert error" role="alert">{actionError}</p>}
            {notice && <p className="combo-alert success" role="status">{notice} <Link href="/checkout">Go to checkout <ArrowRight size={14} /></Link></p>}

            <div className="combo-builder-layout">
              <div className="combo-product-area">
                {productsQuery.isLoading ? <div className="combos-state"><Loader2 className="animate-spin" /> Loading eligible products…</div>
                  : productsQuery.isError ? <div className="combos-state is-error" role="alert">{messageOf(productsQuery.error)} <button type="button" onClick={() => { void productsQuery.refetch(); }}>Try again</button></div>
                    : products.length ? <div className="combo-product-grid">
                      {products.map((product) => {
                        const quantity = selected[product.id] ?? 0;
                        const selectedProduct = quantity > 0;
                        const availableStock = product.stockQuantity ?? 0;
                        return (
                          <article className={`combo-product-card ${selectedProduct ? 'selected' : ''}`} key={product.id}>
                            <button type="button" className="combo-product-select" aria-pressed={selectedProduct} onClick={() => toggleProduct(product)} disabled={availableStock <= 0}>
                              <span className="combo-product-photo"><img src={productImage(product)} alt="" loading="lazy" /></span>
                              <span className="combo-product-info"><strong>{product.name}</strong><span>{formatCurrency(product.sellingPrice || product.discountPrice || product.price)}</span></span>
                              <span className="combo-product-check" aria-hidden="true">{selectedProduct && <Check size={16} />}</span>
                            </button>
                            {selectedProduct && <div className="combo-product-quantity">
                              <span>Quantity</span>
                              <div>
                                <button type="button" aria-label={`Decrease ${product.name} quantity`} disabled={quantity <= 1} onClick={() => changeQuantity(product.id, quantity - 1)}><Minus size={13} /></button>
                                <span>{quantity}</span>
                                <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={quantity >= availableStock} onClick={() => changeQuantity(product.id, quantity + 1)}><Plus size={13} /></button>
                              </div>
                            </div>}
                          </article>
                        );
                      })}
                    </div> : <div className="combos-state">No eligible products are available for custom combos.</div>}
              </div>

              <aside className="combo-summary" aria-label="Your combo summary">
                <h3><ShoppingCart size={19} /> Your combo</h3>
                {selectedProductCount ? <ul className="combo-summary-items">
                  {selectionItems.map((item) => {
                    const product = products.find((candidate) => candidate.id === item.productId);
                    return product ? <li key={item.productId}>
                      <img src={productImage(product)} alt="" />
                      <span>{product.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
                      <button type="button" onClick={() => toggleProduct(product)} aria-label={`Remove ${product.name}`}><Plus size={14} /></button>
                    </li> : null;
                  })}
                </ul> : <p className="combo-summary-empty">Select at least two different products to preview your combo.</p>}

                {selectedProductCount > 0 && selectedProductCount < 2 && <p className="combo-summary-hint">Add one more product to check your offer.</p>}
                {previewQuery.isFetching && <p className="combo-preview-status"><Loader2 size={15} className="animate-spin" /> Checking current offer…</p>}
                {previewQuery.isError && <p className="combo-preview-status is-error" role="alert">{messageOf(previewQuery.error)} <button type="button" onClick={() => { void previewQuery.refetch(); }}>Retry</button></p>}
                {preview && !previewQuery.isFetching && <>
                  {!preview.eligible && <p className="combo-summary-hint">{preview.eligibleMessage || 'This selection does not qualify for a combo discount yet.'}</p>}
                  <div className="combo-summary-line"><span>Subtotal</span><strong>{formatCurrency(preview.originalSubtotal)}</strong></div>
                  <div className="combo-summary-line discount"><span>{preview.appliedRuleName || `Combo discount (${preview.discountPercentage}%)`}</span><strong>−{formatCurrency(preview.discountAmount)}</strong></div>
                  <div className="combo-summary-total"><span>Final total</span><strong>{formatCurrency(preview.finalTotal)}</strong></div>
                </>}
                <button type="button" className="combo-summary-submit" disabled={!preview?.eligible || previewQuery.isFetching || addCustom.isPending} onClick={handleAddCustom}>
                  {addCustom.isPending ? <Loader2 size={17} className="animate-spin" /> : <ShoppingCart size={17} />}
                  Add custom combo to cart
                </button>
                <small className="combo-summary-secure">Final combo prices are verified by MALKAZ at the server.</small>
              </aside>
            </div>
          </section>
          <footer className="combos-footer-note"><Gift size={16} /> Choose two or more unique pieces to see the current combo offer.</footer>
        </main>
      </div>
    </div>
  );
}
