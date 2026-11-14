import React from 'react';
import { useSiteContent } from '@/hooks/use-site-content';
import './whatsapp-button.css';

interface WhatsAppButtonProps {
  className?: string;
  variant?: 'header' | 'button' | 'pill' | 'compact';
  customMessage?: string;
  label?: string;
  showPhone?: boolean;
}

export function WhatsAppIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.15C10.57 20.15 9.12 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.05 20.15ZM16.57 14.34C16.32 14.21 15.11 13.61 14.88 13.53C14.65 13.45 14.49 13.4 14.32 13.65C14.15 13.9 13.68 14.46 13.53 14.63C13.39 14.79 13.25 14.82 13 14.69C12.75 14.56 11.95 14.3 11 13.46C10.26 12.8 9.76 11.99 9.61 11.74C9.47 11.49 9.6 11.36 9.72 11.23C9.84 11.12 9.97 10.94 10.1 10.79C10.23 10.64 10.27 10.53 10.35 10.37C10.43 10.2 10.39 10.06 10.33 9.93C10.27 9.81 9.77 8.59 9.57 8.09C9.37 7.6 9.17 7.67 9.02 7.66C8.88 7.65 8.71 7.65 8.55 7.65C8.38 7.65 8.11 7.71 7.89 7.96C7.66 8.21 7.02 8.81 7.02 10.03C7.02 11.25 7.91 12.43 8.03 12.59C8.16 12.76 9.78 15.25 12.26 16.32C12.85 16.57 13.31 16.73 13.67 16.84C14.26 17.03 14.8 17 15.22 16.94C15.7 16.87 16.69 16.34 16.89 15.76C17.1 15.19 17.1 14.7 17.04 14.59C16.98 14.49 16.82 14.46 16.57 14.34Z" />
    </svg>
  );
}

export function WhatsAppButton({
  className = '',
  variant = 'header',
  customMessage,
  label = 'Chat on WhatsApp',
  showPhone = false,
}: WhatsAppButtonProps) {
  const { whatsAppUrl, whatsappNumber } = useSiteContent();

  const finalUrl = customMessage
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customMessage)}`
    : whatsAppUrl;

  if (variant === 'header') {
    return (
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mb-header-whatsapp-btn ${className}`}
        aria-label="Chat with MALKAZ Concierge on WhatsApp"
        title="Chat on WhatsApp (+91 MALKAZ Concierge)"
        data-testid="header-whatsapp-btn"
      >
        <WhatsAppIcon size={19} className="whatsapp-svg-icon" />
      </a>
    );
  }

  if (variant === 'pill') {
    return (
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mb-whatsapp-pill ${className}`}
        data-testid="whatsapp-pill-btn"
      >
        <WhatsAppIcon size={18} />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <a
      href={finalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`mb-whatsapp-action-btn ${className}`}
      data-testid="whatsapp-action-btn"
    >
      <WhatsAppIcon size={20} />
      <span>{label}</span>
      {showPhone && <span className="whatsapp-phone-sub">+{whatsappNumber}</span>}
    </a>
  );
}
