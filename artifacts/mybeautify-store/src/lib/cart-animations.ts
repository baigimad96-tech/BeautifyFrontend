export function animateProductToCart(source: HTMLElement | null): void {
  if (!source || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cartTarget = document.querySelector<HTMLElement>(
    '[data-testid="header-cart-btn"], [aria-label="View Cart"], .mb-orders-icon-btn'
  );
  const image = source instanceof HTMLImageElement
    ? source
    : source.closest('.mb-card-image-wrap, .product-image')?.querySelector('img') ??
      document.querySelector<HTMLImageElement>('[data-testid="main-product-image"]');
  if (!cartTarget || !image) return;

  const imageBounds = image.getBoundingClientRect();
  const cartBounds = cartTarget.getBoundingClientRect();
  if (!imageBounds.width || !imageBounds.height || !cartBounds.width || !cartBounds.height) return;

  const size = 48;
  const startX = imageBounds.left + imageBounds.width / 2 - size / 2;
  const startY = imageBounds.top + imageBounds.height / 2 - size / 2;
  const deltaX = cartBounds.left + cartBounds.width / 2 - (startX + size / 2);
  const deltaY = cartBounds.top + cartBounds.height / 2 - (startY + size / 2);
  const flyingImage = document.createElement('img');
  flyingImage.src = image.currentSrc || image.src;
  flyingImage.alt = '';
  flyingImage.setAttribute('aria-hidden', 'true');
  Object.assign(flyingImage.style, {
    position: 'fixed',
    zIndex: '10000',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    borderRadius: '12px',
    pointerEvents: 'none',
    boxShadow: '0 5px 18px rgba(0,0,0,.24)',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(flyingImage);

  const flight = flyingImage.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${deltaX * 0.55}px, ${deltaY * 0.55 - 72}px) scale(.78)`, opacity: 1, offset: 0.58 },
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(.16)`, opacity: 0.15 },
    ],
    { duration: 720, easing: 'cubic-bezier(.22,.72,.24,1)' }
  );

  flight.onfinish = () => {
    flyingImage.remove();
    cartTarget.classList.remove('cart-target-pulse');
    void cartTarget.offsetWidth;
    cartTarget.classList.add('cart-target-pulse');
  };
  flight.oncancel = () => flyingImage.remove();
}

export function animateTrashCan(source: HTMLElement | null): Promise<() => void> {
  if (!source || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve(() => {});
  }

  const icon = source.querySelector<SVGElement>('svg');
  if (!icon) return Promise.resolve(() => {});

  const animation = icon.animate(
    [
      { transform: 'translateY(0) rotate(0) scale(1)', opacity: 1 },
      { transform: 'translateY(-12px) rotate(-18deg) scale(1.16)', opacity: 1, offset: 0.34 },
      { transform: 'translateY(-4px) rotate(12deg) scale(1.08)', opacity: 1, offset: 0.66 },
      { transform: 'translateY(-20px) rotate(0) scale(.8)', opacity: 0 },
    ],
    { duration: 480, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' }
  );

  return new Promise((resolve) => {
    animation.onfinish = () => resolve(() => animation.cancel());
    animation.oncancel = () => resolve(() => {});
  });
}
