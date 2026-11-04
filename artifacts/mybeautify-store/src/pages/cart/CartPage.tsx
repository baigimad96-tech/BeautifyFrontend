import { useState } from 'react';
import { Link } from 'wouter';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCartQueryKey,
  getGetOrdersQueryKey,
  useClearCart,
  useCreateOrder,
  useGetCart,
  useRemoveCartItem,
  useUpdateCartItem,
  useValidateCoupon,
  type Order,
} from '@workspace/api-client-react';
import { SiteLayout as Layout } from '@/layouts/SiteLayout';
import { ErrorState } from '@/components/common/ErrorState';
import { money } from '@/utils/format';
import { imageFor } from '@/utils/image';
import { toArray } from '@/utils/array';

export function CartPage() {
  const cart = useGetCart();
  const qc = useQueryClient();
  const clear = useClearCart();
  const remove = useRemoveCartItem();
  const update = useUpdateCartItem();
  const coupon = useValidateCoupon();
  const create = useCreateOrder();
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [address, setAddress] = useState('');
  const [ordered, setOrdered] = useState<Order | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() });

  if (cart.isLoading) {
    return (
      <Layout>
        <main className="page">
          <div className="skeleton line" style={{ marginTop: 55 }} />
          <div className="skeleton image" style={{ maxWidth: 500, marginTop: 20 }} />
        </main>
      </Layout>
    );
  }

  if (cart.isError) {
    return (
      <Layout>
        <main className="page">
          <ErrorState retry={() => cart.refetch()} />
        </main>
      </Layout>
    );
  }

  if (ordered) {
    return (
      <Layout>
        <main className="page">
          <div className="empty-state" style={{ marginTop: 80 }}>
            <div className="eyebrow">Order {ordered.id}</div>
            <h2>Thank you for choosing MALKAZ.</h2>
            <p>Your jewellery order has been received.</p>
            <Link href="/account" className="button" data-testid="link-order-account">
              View order history
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  const data = cart.data ?? {
    items: [],
    subtotal: 0,
    shipping: 0,
    tax: 0,
    couponDiscount: 0,
    total: 0,
  };
  const items = toArray<any>(data.items);

  return (
    <Layout>
      <main className="page">
        <div className="catalog-head">
          <div>
            <div className="eyebrow">Your cart</div>
            <h1>Take a moment.</h1>
          </div>
          <p className="section-copy">
            {items.length} pieces selected · Review your jewellery before checkout.
          </p>
        </div>

        {items.length ? (
          <div className="cart-layout">
            <section>
              {items.map((item) => (
                <div className="cart-item" key={item.product?.id}>
                  <img
                    className="cart-thumb"
                    src={imageFor(item.product?.image)}
                    alt={item.product?.name}
                  />
                  <div>
                    <div className="product-brand">{item.product?.brand}</div>
                    <div className="product-name">{item.product?.name}</div>
                    <div className="qty">
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? update.mutate(
                                {
                                  productId: item.product?.id ?? '',
                                  data: { quantity: item.quantity - 1 },
                                },
                                { onSuccess: refresh }
                              )
                            : remove.mutate(
                                { productId: item.product?.id ?? '' },
                                { onSuccess: refresh }
                              )
                        }
                        aria-label="Decrease quantity"
                        data-testid={`button-decrease-${item.product?.id}`}
                      >
                        <Minus size={13} />
                      </button>
                      <span data-testid={`text-quantity-${item.product?.id}`}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          update.mutate(
                            {
                              productId: item.product?.id ?? '',
                              data: { quantity: item.quantity + 1 },
                            },
                            { onSuccess: refresh }
                          )
                        }
                        aria-label="Increase quantity"
                        data-testid={`button-increase-${item.product?.id}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <strong>{money(item.lineTotal)}</strong>
                    <button
                      className="icon-button"
                      onClick={() =>
                        remove.mutate(
                          { productId: item.product?.id ?? '' },
                          { onSuccess: refresh }
                        )
                      }
                      aria-label="Remove item"
                      data-testid={`button-remove-${item.product?.id}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="button secondary small"
                onClick={() => clear.mutate(undefined, { onSuccess: refresh })}
                data-testid="button-clear-cart"
              >
                Clear cart
              </button>
            </section>

            <aside className="summary">
              <h2>Your total</h2>
              <div className="summary-line">
                <span>Subtotal</span>
                <span>{money(Number(data.subtotal ?? 0))}</span>
              </div>
              <div className="summary-line">
                <span>Shipping</span>
                <span>
                  {data.shipping ? money(Number(data.shipping ?? 0)) : 'Complimentary'}
                </span>
              </div>
              <div className="summary-line">
                <span>Estimated tax</span>
                <span>{money(Number(data.tax ?? 0))}</span>
              </div>
              {Boolean(data.couponDiscount) && (
                <div className="summary-line">
                  <span>Coupon</span>
                  <span>−{money(Number(data.couponDiscount ?? 0))}</span>
                </div>
              )}
              <div className="coupon">
                <input
                  className="input"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  data-testid="input-coupon"
                />
                <button
                  className="button secondary small"
                  onClick={() =>
                    coupon.mutate(
                      { data: { code: couponCode } },
                      {
                        onSuccess: (result) =>
                          setCouponMessage(
                            result.message ||
                              (result.valid ? 'Coupon applied.' : 'That code is not valid.')
                          ),
                      }
                    )
                  }
                  data-testid="button-apply-coupon"
                >
                  Apply
                </button>
              </div>
              {couponMessage && <p className="eyebrow">{couponMessage}</p>}
              <div className="summary-line summary-total">
                <span>Total</span>
                <span>{money(Number(data.total ?? 0))}</span>
              </div>
              <input
                className="input"
                style={{ width: '100%', margin: '12px 0' }}
                placeholder="Shipping address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                aria-label="Shipping address"
                data-testid="input-shipping-address"
              />
              <Link
                href="/checkout"
                className="button wide"
                data-testid="button-checkout"
                style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}
              >
                Proceed to Checkout
              </Link>
            </aside>
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: 35 }}>
            <ShoppingCart size={25} />
            <h2>Your cart is taking a breath.</h2>
            <p>Nothing here yet. We have plenty of good ideas.</p>
            <Link href="/shop" className="button" data-testid="link-empty-cart">
              Continue shopping
            </Link>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default CartPage;
