import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  MapPin,
  HelpCircle,
  Crown,
  ShieldCheck,
  FileText,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  fetchPublicSiteContent,
  updateAdminSiteContent,
  DEFAULT_SITE_CONTENT,
  sanitizeWhatsAppNumber,
  type SiteContentResponse,
  type SiteContentUpdateRequest,
  type HelpSupportFaqItem,
  type PolicySectionItem,
} from '@/services/site-content/site-content.service';
import type {
  SiteHelpSupportContent,
  SiteAboutUsContent,
  SitePrivacyPolicyContent,
} from '@/hooks/use-site-content';
import './site-content-admin.css';

type ActiveSubTab = 'contact' | 'about' | 'privacy';

export function SiteContentAdminView() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('contact');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Fetch live site content
  const { data: serverContent, isLoading, isError } = useQuery({
    queryKey: ['site-content'],
    queryFn: fetchPublicSiteContent,
  });

  // 2. Local editable form state initialized with fallback defaults
  const [businessPhone, setBusinessPhone] = useState(DEFAULT_SITE_CONTENT.businessPhone);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_SITE_CONTENT.whatsappNumber);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SITE_CONTENT.supportEmail);
  const [supportHours, setSupportHours] = useState(DEFAULT_SITE_CONTENT.supportHours);
  const [businessAddress, setBusinessAddress] = useState(DEFAULT_SITE_CONTENT.businessAddress);

  // Help & Support
  const [helpSupport, setHelpSupport] = useState<SiteHelpSupportContent>({
    headline: 'MALKAZ Concierge & Business Support',
    subheadline: 'Official channels for order assistance, bespoke styling consultations, and inquiries.',
    subtitle: 'Official channels for order assistance, bespoke styling consultations, and inquiries.',
    responseNotice: 'Direct phone & WhatsApp calls answered during working hours. Average WhatsApp response: < 15 mins.',
    notice: 'Direct phone & WhatsApp calls answered during working hours. Average WhatsApp response: < 15 mins.',
    faqs: [
      {
        question: 'How do I place an order on MALKAZ?',
        answer: 'Browse our jewellery collections, add desired pieces to your cart, and proceed to checkout with our secure payment gateways or Cash on Delivery (where applicable).'
      },
      {
        question: 'What are the delivery timelines across India?',
        answer: 'All orders are dispatched via insured express couriers within 24–48 hours. Standard delivery takes 3–5 business days depending on your location.'
      },
      {
        question: 'Can I request bespoke or bridal customization?',
        answer: 'Yes! Connect directly with our lead styling concierge via our official WhatsApp support for bespoke matching, bridal packages, and personalized gift curation.'
      }
    ],
  });

  // About Us
  const [aboutUs, setAboutUs] = useState<SiteAboutUsContent>({
    heroTitle: 'About MALKAZ',
    heroSubtitle: 'Where Luxury Meets Trust',
    brandIntro: 'Founded under Zainab Khan Enterprises, MALKAZ represents the pinnacle of royal luxury jewellery and timeless design aesthetics. Guided by founder Zainab Khan’s extensive 7+ years of experience in the fashion and styling industry, MALKAZ was established to bridge the gap between regal grandeur and accessible, uncompromising craft.',
    founderTag: 'Founder & Creative Director: Zainab Khan · 7+ Years Fashion Industry Experience',
    qualityTitle: 'Quality Over Quantity',
    qualityBody: 'At MALKAZ, customer satisfaction is not merely a benchmark—it is our crowning commitment. Every piece that carries our seal is meticulously inspected to uphold royal standards of durability, shine, and comfort. We believe in complete transparency and honor every promise we make to our patrons.',
    storyTitle: 'The Story Behind the Name Malkaz',
    storyQuote: 'A mother’s dignity is a daughter’s eternal crown.',
    storyBody: 'The name MALKAZ carries an intimate, deeply emotional legacy. It is born from a heartfelt tribute honoring founder Zainab Khan’s beloved mother, Malka—a matriarch revered for her quiet resilience, regal grace, and unconditional warmth—alongside the unwavering guidance and lifelong companionship of her elder sister.',
    missionTitle: 'More Than a Brand – A Mission to Empower Women',
    missionDesc: 'MALKAZ stands firmly for female elevation, economic self-reliance, and the timeless artistry of Indian craftswomen and karigars.',
    manifestoTitle: 'Who Is Malka?',
    manifestoBody: 'She is not defined by fleeting trends or external validation. She is bold yet gentle, ambitious yet grounded, traditional yet forward-looking. She wears her values with pride, leads with purpose, and turns everyday challenges into stepping stones of grace.',
    tagline: 'MALKAZ – SHE IS HER OWN CROWN.',
    subtagline: 'She Can Shine Her Own Way.',
  });

  // Privacy Policy
  const [privacyPolicy, setPrivacyPolicy] = useState<SitePrivacyPolicyContent>({
    title: 'Privacy & Conditions',
    lastUpdated: 'November 2026',
    intro: 'Find out how information is used on this website and the conditions that apply when you browse or place an order.',
    sections: [
      {
        title: 'Information you provide',
        content: 'When you create an account, place an order, or contact us, we may use the details you submit, such as your name, email address, phone number, delivery address, and order information.'
      },
      {
        title: 'How information is used',
        content: 'We use this information to provide account features, process and manage orders, arrange delivery, respond to support requests, and maintain the service.'
      },
      {
        title: 'Account and browser storage',
        content: 'This site stores authentication tokens in your browser so your sign-in can continue between visits and your account features can work. You can sign out to remove the saved session from this browser. Keep your device and account credentials secure.'
      },
      {
        title: 'Sharing and retention',
        content: 'Information may be shared with service providers when needed to operate the site or fulfil an order, or when disclosure is required by law. We keep information for as long as it is needed for these purposes and applicable requirements.'
      },
      {
        title: 'Your choices',
        content: 'You can review or update some account details from your account page. For questions about your information or a request relating to it, contact MALKAZ customer support through the support options on this website.'
      }
    ],
    termsSections: [
      {
        title: 'Using this website',
        content: 'Use the website lawfully and provide accurate information when creating an account or placing an order. You are responsible for activity carried out through your account and for keeping your sign-in details secure.'
      },
      {
        title: 'Products and orders',
        content: 'Product descriptions, images, prices, and availability are shown as carefully as possible, but may change. Submitting an order is a request to purchase; the order details and any applicable payment or delivery options shown during checkout apply to that order.'
      },
      {
        title: 'Payments, delivery, and support',
        content: 'Available payment and delivery methods are presented during checkout and may vary by order. Contact customer support through the website if you need help with an order, delivery, return, or other service question.'
      },
      {
        title: 'Website content',
        content: 'Website text, branding, images, and other content belong to MALKAZ or their respective rights holders. Do not copy, republish, or use this content commercially without permission.'
      },
      {
        title: 'Changes',
        content: 'We may update these terms or this privacy information as the website and its services change. The latest version will be available on this page.'
      }
    ]
  });

  // 3. Sync server data into state when loaded
  useEffect(() => {
    if (!serverContent) return;
    if (serverContent.businessPhone) setBusinessPhone(serverContent.businessPhone);
    if (serverContent.whatsappNumber) setWhatsappNumber(serverContent.whatsappNumber);
    if (serverContent.supportEmail) setSupportEmail(serverContent.supportEmail);
    if (serverContent.supportHours) setSupportHours(serverContent.supportHours);
    if (serverContent.businessAddress) setBusinessAddress(serverContent.businessAddress);

    if (serverContent.helpSupportContent) {
      try {
        const parsed = JSON.parse(serverContent.helpSupportContent);
        if (parsed && typeof parsed === 'object') {
          setHelpSupport((prev: SiteHelpSupportContent) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Fallback to existing state
      }
    }

    if (serverContent.aboutUsContent) {
      try {
        const parsed = JSON.parse(serverContent.aboutUsContent);
        if (parsed && typeof parsed === 'object') {
          setAboutUs((prev: SiteAboutUsContent) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Fallback
      }
    }

    if (serverContent.privacyPolicyContent) {
      try {
        const parsed = JSON.parse(serverContent.privacyPolicyContent);
        if (parsed && typeof parsed === 'object') {
          setPrivacyPolicy((prev: SitePrivacyPolicyContent) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Fallback
      }
    }
  }, [serverContent]);

  // 4. Mutation to persist changes
  const saveMutation = useMutation({
    mutationFn: (payload: SiteContentUpdateRequest) => updateAdminSiteContent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-content'] });
      setFeedback({
        type: 'success',
        message: 'Changes saved and published live to the storefront successfully!',
      });
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to publish changes. Please try again.',
      });
    },
  });

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const payload: SiteContentUpdateRequest = {
      businessPhone: businessPhone.trim(),
      whatsappNumber: whatsappNumber.trim(),
      supportEmail: supportEmail.trim(),
      supportHours: supportHours.trim(),
      businessAddress: businessAddress.trim(),
      helpSupportContent: JSON.stringify(helpSupport),
      aboutUsContent: JSON.stringify(aboutUs),
      privacyPolicyContent: JSON.stringify(privacyPolicy),
    };

    saveMutation.mutate(payload);
  };

  // Preview URL based on current active subtab
  const getPreviewUrl = () => {
    switch (activeSubTab) {
      case 'contact':
        return '/help-support';
      case 'about':
        return '/about';
      case 'privacy':
        return '/privacy';
    }
  };

  const getPreviewLabel = () => {
    switch (activeSubTab) {
      case 'contact':
        return 'Preview Help & Support Page';
      case 'about':
        return 'Preview About Us Page';
      case 'privacy':
        return 'Preview Privacy & Conditions Page';
    }
  };

  return (
    <div className="mz-content-admin" data-testid="site-content-admin">
      {/* Top Banner */}
      <div className="mz-content-header-banner">
        <div className="mz-content-header-copy">
          <h2>
            <Crown size={22} className="mz-gold-mark" />
            MALKAZ Content &amp; Page Manager
          </h2>
          <p>
            Manage live official business contacts, WhatsApp concierge, About Us royal narrative, and legal policies.
          </p>
        </div>
        <div className="mz-content-header-actions">
          <a
            href={getPreviewUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mz-preview-link-btn"
          >
            <ExternalLink size={15} />
            {getPreviewLabel()}
          </a>
        </div>
      </div>

      {/* Subtab Selector */}
      <div className="mz-content-subtabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'contact'}
          className={`mz-content-subtab-btn ${activeSubTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('contact')}
        >
          <Phone size={16} />
          Business Contact &amp; Support
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'about'}
          className={`mz-content-subtab-btn ${activeSubTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('about')}
        >
          <Crown size={16} />
          About Us Brand Story
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'privacy'}
          className={`mz-content-subtab-btn ${activeSubTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('privacy')}
        >
          <ShieldCheck size={16} />
          Privacy Policy &amp; Conditions
        </button>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div className={`mz-content-feedback-banner ${feedback.type}`} role="alert">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSaveAll} className="mz-content-panel">
        {/* ============================================================== */}
        {/* TAB 1: BUSINESS CONTACT & HELP & SUPPORT                      */}
        {/* ============================================================== */}
        {activeSubTab === 'contact' && (
          <>
            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>Official Business Contact Channels</span>
                <Sparkles size={16} color="#D4AF37" />
              </h3>
              <p className="mz-section-card-desc">
                These contact details appear in the top Navbar WhatsApp Concierge, Help &amp; Support page, footer, and customer dashboard.
              </p>

              <div className="mz-form-grid two-cols">
                <div className="mz-form-field">
                  <label htmlFor="biz-phone">Official Business Phone</label>
                  <input
                    id="biz-phone"
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                  <small>Patrons can click to dial directly from mobile or desktop.</small>
                </div>

                <div className="mz-form-field">
                  <label htmlFor="biz-wa">
                    Official WhatsApp Number (Sanitized: {sanitizeWhatsAppNumber(whatsappNumber)})
                  </label>
                  <input
                    id="biz-wa"
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                  <small>Powers all instant WhatsApp concierge buttons across the store.</small>
                </div>

                <div className="mz-form-field">
                  <label htmlFor="biz-email">Official Support Email</label>
                  <input
                    id="biz-email"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@malkaz.com"
                    required
                  />
                  <small>For escalations, order inquiries, and corporate orders.</small>
                </div>

                <div className="mz-form-field">
                  <label htmlFor="biz-hours">Support Working Hours</label>
                  <input
                    id="biz-hours"
                    type="text"
                    value={supportHours}
                    onChange={(e) => setSupportHours(e.target.value)}
                    placeholder="Mon – Sat: 10:00 AM – 7:00 PM IST"
                    required
                  />
                  <small>Displayed prominently on the Help &amp; Support page.</small>
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="biz-address">Business Registered Address</label>
                  <textarea
                    id="biz-address"
                    rows={2}
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Zainab Khan Enterprises, Mumbai, Maharashtra, India"
                    required
                  />
                  <small>Legal operating entity and registered address.</small>
                </div>
              </div>
            </div>

            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>Help &amp; Support Page Content</span>
              </h3>
              <p className="mz-section-card-desc">
                Customise the hero message, turnaround notice, and Frequently Asked Questions (FAQs).
              </p>

              <div className="mz-form-grid">
                <div className="mz-form-field full-width">
                  <label htmlFor="help-headline">Page Main Headline</label>
                  <input
                    id="help-headline"
                    type="text"
                    value={helpSupport.headline}
                    onChange={(e) => setHelpSupport({ ...helpSupport, headline: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="help-subtitle">Page Subtitle / Tagline</label>
                  <input
                    id="help-subtitle"
                    type="text"
                    value={helpSupport.subtitle || helpSupport.subheadline || ''}
                    onChange={(e) => setHelpSupport({ ...helpSupport, subtitle: e.target.value, subheadline: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="help-notice">Turnaround Time Notice</label>
                  <input
                    id="help-notice"
                    type="text"
                    value={helpSupport.notice || helpSupport.responseNotice || ''}
                    onChange={(e) => setHelpSupport({ ...helpSupport, notice: e.target.value, responseNotice: e.target.value })}
                  />
                </div>
              </div>

              {/* FAQs Manager */}
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0A3622' }}>
                  Frequently Asked Questions (FAQs)
                </label>

                {helpSupport.faqs?.map((faq: HelpSupportFaqItem, idx: number) => (
                  <div key={idx} className="mz-repeat-item">
                    <div className="mz-repeat-item-header">
                      <span>FAQ #{idx + 1}</span>
                      <button
                        type="button"
                        className="mz-btn-remove"
                        onClick={() => {
                          const updated = helpSupport.faqs?.filter((_: HelpSupportFaqItem, i: number) => i !== idx);
                          setHelpSupport({ ...helpSupport, faqs: updated });
                        }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>

                    <div className="mz-form-field">
                      <label>Question</label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...(helpSupport.faqs || [])];
                          updated[idx] = { ...updated[idx], question: e.target.value };
                          setHelpSupport({ ...helpSupport, faqs: updated });
                        }}
                      />
                    </div>

                    <div className="mz-form-field">
                      <label>Answer</label>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...(helpSupport.faqs || [])];
                          updated[idx] = { ...updated[idx], answer: e.target.value };
                          setHelpSupport({ ...helpSupport, faqs: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="mz-btn-add"
                  onClick={() => {
                    const updated = [
                      ...(helpSupport.faqs || []),
                      { question: 'New Question?', answer: 'Answer details here.' },
                    ];
                    setHelpSupport({ ...helpSupport, faqs: updated });
                  }}
                >
                  <Plus size={15} /> Add FAQ Item
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ABOUT US BRAND STORY & MANIFESTO                       */}
        {/* ============================================================== */}
        {activeSubTab === 'about' && (
          <>
            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>1. Hero Banner &amp; Brand Introduction</span>
                <Crown size={18} color="#D4AF37" />
              </h3>

              <div className="mz-form-grid two-cols">
                <div className="mz-form-field">
                  <label htmlFor="about-hero-title">Hero Title</label>
                  <input
                    id="about-hero-title"
                    type="text"
                    value={aboutUs.heroTitle}
                    onChange={(e) => setAboutUs({ ...aboutUs, heroTitle: e.target.value })}
                  />
                </div>

                <div className="mz-form-field">
                  <label htmlFor="about-hero-sub">Hero Subtitle</label>
                  <input
                    id="about-hero-sub"
                    type="text"
                    value={aboutUs.heroSubtitle}
                    onChange={(e) => setAboutUs({ ...aboutUs, heroSubtitle: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-brand-intro">Brand Story / Founder Background</label>
                  <textarea
                    id="about-brand-intro"
                    rows={4}
                    value={aboutUs.brandIntro}
                    onChange={(e) => setAboutUs({ ...aboutUs, brandIntro: e.target.value })}
                  />
                  <small>Highlights Zainab Khan Enterprises and founder Zainab Khan’s 7+ years of industry experience.</small>
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-founder-tag">Founder Tagline / Badge</label>
                  <input
                    id="about-founder-tag"
                    type="text"
                    value={aboutUs.founderTag}
                    onChange={(e) => setAboutUs({ ...aboutUs, founderTag: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>2. Commitment to Customer Satisfaction</span>
                <ShieldCheck size={18} color="#0A3622" />
              </h3>

              <div className="mz-form-grid">
                <div className="mz-form-field full-width">
                  <label htmlFor="about-quality-title">Core Ethos Title</label>
                  <input
                    id="about-quality-title"
                    type="text"
                    value={aboutUs.qualityTitle}
                    onChange={(e) => setAboutUs({ ...aboutUs, qualityTitle: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-quality-body">Ethos Description</label>
                  <textarea
                    id="about-quality-body"
                    rows={3}
                    value={aboutUs.qualityBody}
                    onChange={(e) => setAboutUs({ ...aboutUs, qualityBody: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>3. The Story Behind the Name Malkaz</span>
              </h3>

              <div className="mz-form-grid">
                <div className="mz-form-field full-width">
                  <label htmlFor="about-story-title">Story Section Title</label>
                  <input
                    id="about-story-title"
                    type="text"
                    value={aboutUs.storyTitle}
                    onChange={(e) => setAboutUs({ ...aboutUs, storyTitle: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-story-quote">Emblem Quote</label>
                  <input
                    id="about-story-quote"
                    type="text"
                    value={aboutUs.storyQuote}
                    onChange={(e) => setAboutUs({ ...aboutUs, storyQuote: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-story-body">The Story Behind the Name</label>
                  <textarea
                    id="about-story-body"
                    rows={4}
                    value={aboutUs.storyBody}
                    onChange={(e) => setAboutUs({ ...aboutUs, storyBody: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>4. A Mission to Empower Women</span>
              </h3>

              <div className="mz-form-grid">
                <div className="mz-form-field full-width">
                  <label htmlFor="about-mission-title">Mission Title</label>
                  <input
                    id="about-mission-title"
                    type="text"
                    value={aboutUs.missionTitle}
                    onChange={(e) => setAboutUs({ ...aboutUs, missionTitle: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-mission-desc">Mission Description</label>
                  <textarea
                    id="about-mission-desc"
                    rows={3}
                    value={aboutUs.missionDesc}
                    onChange={(e) => setAboutUs({ ...aboutUs, missionDesc: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>5. Signature Brand Manifesto: Who Is Malka?</span>
                <Sparkles size={16} color="#D4AF37" />
              </h3>

              <div className="mz-form-grid">
                <div className="mz-form-field full-width">
                  <label htmlFor="about-manif-title">Manifesto Title</label>
                  <input
                    id="about-manif-title"
                    type="text"
                    value={aboutUs.manifestoTitle}
                    onChange={(e) => setAboutUs({ ...aboutUs, manifestoTitle: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-manif-body">Manifesto Narrative</label>
                  <textarea
                    id="about-manif-body"
                    rows={3}
                    value={aboutUs.manifestoBody}
                    onChange={(e) => setAboutUs({ ...aboutUs, manifestoBody: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-tagline">Crown Tagline</label>
                  <input
                    id="about-tagline"
                    type="text"
                    value={aboutUs.tagline}
                    onChange={(e) => setAboutUs({ ...aboutUs, tagline: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="about-subtagline">Sub-Tagline</label>
                  <input
                    id="about-subtagline"
                    type="text"
                    value={aboutUs.subtagline}
                    onChange={(e) => setAboutUs({ ...aboutUs, subtagline: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PRIVACY POLICY & CONDITIONS                            */}
        {/* ============================================================== */}
        {activeSubTab === 'privacy' && (
          <>
            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>Page Heading &amp; Introduction</span>
                <FileText size={18} color="#0A3622" />
              </h3>

              <div className="mz-form-grid two-cols">
                <div className="mz-form-field">
                  <label htmlFor="priv-title">Policy Title</label>
                  <input
                    id="priv-title"
                    type="text"
                    value={privacyPolicy.title}
                    onChange={(e) => setPrivacyPolicy({ ...privacyPolicy, title: e.target.value })}
                  />
                </div>

                <div className="mz-form-field">
                  <label htmlFor="priv-date">Last Updated Note</label>
                  <input
                    id="priv-date"
                    type="text"
                    value={privacyPolicy.lastUpdated}
                    onChange={(e) => setPrivacyPolicy({ ...privacyPolicy, lastUpdated: e.target.value })}
                  />
                </div>

                <div className="mz-form-field full-width">
                  <label htmlFor="priv-intro">Policy Intro Summary</label>
                  <textarea
                    id="priv-intro"
                    rows={2}
                    value={privacyPolicy.intro}
                    onChange={(e) => setPrivacyPolicy({ ...privacyPolicy, intro: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Privacy Sections */}
            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>Privacy &amp; Data Protection Clauses</span>
              </h3>
              <p className="mz-section-card-desc">
                Clauses explaining how customer personal details, cookies, and order information are stored and safeguarded.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {privacyPolicy.sections?.map((sec: PolicySectionItem, idx: number) => (
                  <div key={idx} className="mz-repeat-item">
                    <div className="mz-repeat-item-header">
                      <span>Clause #{idx + 1}</span>
                      <button
                        type="button"
                        className="mz-btn-remove"
                        onClick={() => {
                          const updated = privacyPolicy.sections?.filter((_: PolicySectionItem, i: number) => i !== idx);
                          setPrivacyPolicy({ ...privacyPolicy, sections: updated });
                        }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>

                    <div className="mz-form-field">
                      <label>Section Title</label>
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const updated = [...(privacyPolicy.sections || [])];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setPrivacyPolicy({ ...privacyPolicy, sections: updated });
                        }}
                      />
                    </div>

                    <div className="mz-form-field">
                      <label>Section Content</label>
                      <textarea
                        rows={3}
                        value={sec.content}
                        onChange={(e) => {
                          const updated = [...(privacyPolicy.sections || [])];
                          updated[idx] = { ...updated[idx], content: e.target.value };
                          setPrivacyPolicy({ ...privacyPolicy, sections: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="mz-btn-add"
                  onClick={() => {
                    const updated = [
                      ...(privacyPolicy.sections || []),
                      { title: 'New Privacy Clause', content: 'Clause content goes here.' },
                    ];
                    setPrivacyPolicy({ ...privacyPolicy, sections: updated });
                  }}
                >
                  <Plus size={15} /> Add Privacy Clause
                </button>
              </div>
            </div>

            {/* Terms Sections */}
            <div className="mz-section-card">
              <h3 className="mz-section-card-title">
                <span>Website &amp; Ordering Conditions</span>
              </h3>
              <p className="mz-section-card-desc">
                Terms governing website browsing, order placement, payments, and product accuracy.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {privacyPolicy.termsSections?.map((term: PolicySectionItem, idx: number) => (
                  <div key={idx} className="mz-repeat-item">
                    <div className="mz-repeat-item-header">
                      <span>Condition #{idx + 1}</span>
                      <button
                        type="button"
                        className="mz-btn-remove"
                        onClick={() => {
                          const updated = privacyPolicy.termsSections?.filter((_: PolicySectionItem, i: number) => i !== idx);
                          setPrivacyPolicy({ ...privacyPolicy, termsSections: updated });
                        }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>

                    <div className="mz-form-field">
                      <label>Condition Title</label>
                      <input
                        type="text"
                        value={term.title}
                        onChange={(e) => {
                          const updated = [...(privacyPolicy.termsSections || [])];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setPrivacyPolicy({ ...privacyPolicy, termsSections: updated });
                        }}
                      />
                    </div>

                    <div className="mz-form-field">
                      <label>Condition Content</label>
                      <textarea
                        rows={3}
                        value={term.content}
                        onChange={(e) => {
                          const updated = [...(privacyPolicy.termsSections || [])];
                          updated[idx] = { ...updated[idx], content: e.target.value };
                          setPrivacyPolicy({ ...privacyPolicy, termsSections: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="mz-btn-add"
                  onClick={() => {
                    const updated = [
                      ...(privacyPolicy.termsSections || []),
                      { title: 'New Website Condition', content: 'Condition details go here.' },
                    ];
                    setPrivacyPolicy({ ...privacyPolicy, termsSections: updated });
                  }}
                >
                  <Plus size={15} /> Add Condition Clause
                </button>
              </div>
            </div>
          </>
        )}

        {/* Sticky Save & Publish Action Bar */}
        <div className="mz-content-sticky-actions">
          <a
            href={getPreviewUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mz-preview-link-btn"
          >
            <ExternalLink size={16} />
            {getPreviewLabel()}
          </a>

          <button
            type="submit"
            className="mz-btn-save-publish"
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Publishing Changes...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save &amp; Publish Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
