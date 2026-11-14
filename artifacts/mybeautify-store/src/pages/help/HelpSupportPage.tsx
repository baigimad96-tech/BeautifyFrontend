import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  MapPin,
  Copy,
  Check,
  Sparkles,
  Send,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { SiteLayout } from '@/layouts/SiteLayout';
import { WhatsAppIcon } from '@/components/common/WhatsAppButton';
import { useSiteContent } from '@/hooks/use-site-content';
import './help-support.css';

export default function HelpSupportPage() {
  const {
    businessPhone,
    whatsappNumber,
    supportEmail,
    supportHours,
    businessAddress,
    helpSupport,
    whatsAppUrl,
  } = useSiteContent();

  const [copiedType, setCopiedType] = useState<'phone' | 'email' | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSubject, setFormSubject] = useState('Order & Delivery Status');
  const [formMessage, setFormMessage] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Help & Support | MALKAZ — Client Care Concierge';
  }, []);

  const handleCopy = (text: string, type: 'phone' | 'email') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMessage.trim()) return;

    // Launch WhatsApp with pre-composed customer inquiry
    const inquiryText = `Hi MALKAZ Concierge,\n\nName: ${formName || 'Customer'}\nPhone: ${formPhone || 'Not provided'}\nSubject: ${formSubject}\n\nMessage: ${formMessage.trim()}`;
    const targetUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(inquiryText)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormMessage('');
    }, 4000);
  };

  return (
    <SiteLayout>
      <main className="malkaz-support-page" id="main-support">
        {/* Navigation Breadcrumb */}
        <div className="malkaz-support-back-wrap">
          <Link href="/" className="malkaz-support-back-link" data-testid="support-back-home">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to MALKAZ Home
          </Link>
        </div>

        {/* 1. HERO BANNER */}
        <section className="malkaz-support-hero">
          <div className="malkaz-support-hero-content">
            <div className="malkaz-support-badge">
              <Sparkles size={14} />
              <span>MALKAZ Client Care Concierge</span>
            </div>
            <h1 className="malkaz-support-hero-title">
              {helpSupport.headline || 'Help & Support'}
            </h1>
            <p className="malkaz-support-hero-desc">
              {helpSupport.subheadline ||
                'Our dedicated client care team is here to assist with order tracking, custom styling, jewellery care, sizing, and post-purchase support.'}
            </p>
          </div>
        </section>

        <div className="malkaz-support-container">
          {/* 2. DEDICATED OFFICIAL BUSINESS SUPPORT CARD */}
          <section className="malkaz-official-support-card" aria-labelledby="official-support-title">
            <div className="malkaz-official-header">
              <p className="eyebrow">DIRECT CONTACT CHANNELS</p>
              <h2 id="official-support-title" className="malkaz-official-title">
                MALKAZ Official Business Support
              </h2>
              <p className="malkaz-official-desc">
                Connect directly with our dedicated concierges. We take pride in swift, personalized assistance for all our patrons across India.
              </p>
            </div>

            <div className="malkaz-contact-channels-grid">
              {/* Channel 1: WhatsApp Support */}
              <div className="malkaz-contact-channel-card">
                <div className="malkaz-channel-icon-wrap whatsapp" aria-hidden="true">
                  <WhatsAppIcon size={24} />
                </div>
                <h3 className="malkaz-channel-title">Direct WhatsApp Concierge</h3>
                <div className="malkaz-channel-value">+{whatsappNumber}</div>
                <p className="malkaz-channel-sub">
                  Instant order assistance, bespoke styling recommendations, and photo consultations.
                </p>
                <div className="malkaz-channel-actions">
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="malkaz-channel-btn whatsapp-direct"
                    data-testid="support-whatsapp-direct"
                  >
                    <WhatsAppIcon size={16} />
                    Chat on WhatsApp
                  </a>
                </div>
              </div>

              {/* Channel 2: Official Phone Line */}
              <div className="malkaz-contact-channel-card">
                <div className="malkaz-channel-icon-wrap" aria-hidden="true">
                  <Phone size={22} />
                </div>
                <h3 className="malkaz-channel-title">Business Support Phone</h3>
                <div className="malkaz-channel-value">{businessPhone}</div>
                <p className="malkaz-channel-sub">
                  Hours: {supportHours}
                </p>
                <div className="malkaz-channel-actions">
                  <a
                    href={`tel:${businessPhone.replace(/[^0-9+]/g, '')}`}
                    className="malkaz-channel-btn primary"
                    data-testid="support-tel-call"
                  >
                    <Phone size={14} />
                    Call Now
                  </a>
                  <button
                    type="button"
                    className="malkaz-channel-btn secondary"
                    onClick={() => handleCopy(businessPhone, 'phone')}
                    title="Copy phone number"
                  >
                    {copiedType === 'phone' ? <Check size={14} color="#128C7E" /> : <Copy size={14} />}
                    {copiedType === 'phone' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Channel 3: Official Email */}
              <div className="malkaz-contact-channel-card">
                <div className="malkaz-channel-icon-wrap" aria-hidden="true">
                  <Mail size={22} />
                </div>
                <h3 className="malkaz-channel-title">Official Support Email</h3>
                <div className="malkaz-channel-value">{supportEmail}</div>
                <p className="malkaz-channel-sub">
                  For formal corporate inquiries, invoice requests, and partnership proposals.
                </p>
                <div className="malkaz-channel-actions">
                  <a
                    href={`mailto:${supportEmail}`}
                    className="malkaz-channel-btn primary"
                    data-testid="support-email-link"
                  >
                    <Mail size={14} />
                    Send Email
                  </a>
                  <button
                    type="button"
                    className="malkaz-channel-btn secondary"
                    onClick={() => handleCopy(supportEmail, 'email')}
                    title="Copy email address"
                  >
                    {copiedType === 'email' ? <Check size={14} color="#128C7E" /> : <Copy size={14} />}
                    {copiedType === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Support Notice & Address Bar */}
            <div className="malkaz-support-notice-bar">
              <Clock size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Support Availability:</strong> {supportHours} ·{' '}
                <span>{helpSupport.responseNotice || 'Average response time: 15–30 mins during working hours.'}</span>
                {businessAddress && (
                  <div style={{ marginTop: 4, fontSize: '12.5px', color: '#55685F' }}>
                    <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                    {businessAddress}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. SPLIT SECTION: CONTACT FORM & FREQUENTLY ASKED QUESTIONS */}
          <section className="malkaz-support-split-section">
            {/* Left: Interactive Inquiry Form */}
            <div className="malkaz-inquiry-card">
              <h3>Connect with Our Concierge</h3>
              <p>
                Have questions regarding styling, delivery or custom requests? Send us a message and we will respond immediately.
              </p>

              <form onSubmit={handleFormSubmit} className="malkaz-inquiry-form">
                <div className="malkaz-inquiry-field">
                  <label htmlFor="inquiry-name">Your Full Name</label>
                  <input
                    id="inquiry-name"
                    type="text"
                    placeholder="e.g. Ayesha Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="malkaz-inquiry-field">
                  <label htmlFor="inquiry-phone">Phone / WhatsApp Number</label>
                  <input
                    id="inquiry-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>

                <div className="malkaz-inquiry-field">
                  <label htmlFor="inquiry-subject">Inquiry Subject</label>
                  <select
                    id="inquiry-subject"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  >
                    <option value="Order & Delivery Status">Order &amp; Delivery Status</option>
                    <option value="Bespoke Jewellery Styling">Bespoke Jewellery Styling</option>
                    <option value="Size, Fit & Material Query">Size, Fit &amp; Material Query</option>
                    <option value="Exchange or Transit Assistance">Exchange or Transit Assistance</option>
                    <option value="Wholesale & Corporate Gifting">Wholesale &amp; Corporate Gifting</option>
                  </select>
                </div>

                <div className="malkaz-inquiry-field">
                  <label htmlFor="inquiry-message">Your Message</label>
                  <textarea
                    id="inquiry-message"
                    rows={4}
                    placeholder="Describe how we can assist you..."
                    required
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="malkaz-inquiry-submit-btn"
                  data-testid="inquiry-submit-btn"
                >
                  <Send size={15} />
                  <span>Send via WhatsApp Concierge</span>
                </button>

                {formSubmitted && (
                  <div style={{ color: '#128C7E', fontSize: 13, fontWeight: 600, textAlign: 'center', marginTop: 8 }}>
                    ✓ Inquiry dispatched to WhatsApp Concierge!
                  </div>
                )}
              </form>
            </div>

            {/* Right: FAQs */}
            <div className="malkaz-faqs-wrap">
              <div className="malkaz-faqs-header">
                <h3>Frequently Asked Questions</h3>
                <p>Quick answers to common questions about our fine jewellery, orders, and services.</p>
              </div>

              {(helpSupport.faqs ?? []).map((faq, idx) => (
                <article key={idx} className="malkaz-faq-card">
                  <h4 className="malkaz-faq-q">
                    <HelpCircle size={18} style={{ color: '#D4AF37', flexShrink: 0 }} />
                    {faq.question}
                  </h4>
                  <p className="malkaz-faq-a">{faq.answer}</p>
                </article>
              ))}

              <div style={{ marginTop: 12, padding: 18, background: '#FFFFFF', borderRadius: 14, border: '1px solid #ECE3D4', display: 'flex', alignItems: 'center', gap: 12 }}>
                <ShieldCheck size={28} style={{ color: '#0A3622', flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, color: '#4A5D54' }}>
                  <strong>MALKAZ Trust Guarantee:</strong> All orders are protected by 100% insured transit, hypoallergenic certification, and dedicated after-sales care.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </SiteLayout>
  );
}
