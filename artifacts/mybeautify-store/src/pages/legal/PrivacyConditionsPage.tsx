import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { SiteLayout } from '@/layouts/SiteLayout';
import { useSiteContent } from '@/hooks/use-site-content';
import './privacy-conditions.css';

const privacySections = [
  {
    title: 'Information you provide',
    content:
      'When you create an account, place an order, or contact us, we may use the details you submit, such as your name, email address, phone number, delivery address, and order information.',
  },
  {
    title: 'How information is used',
    content:
      'We use this information to provide account features, process and manage orders, arrange delivery, respond to support requests, and maintain the service.',
  },
  {
    title: 'Account and browser storage',
    content:
      'This site stores authentication tokens in your browser so your sign-in can continue between visits and your account features can work. You can sign out to remove the saved session from this browser. Keep your device and account credentials secure.',
  },
  {
    title: 'Sharing and retention',
    content:
      'Information may be shared with service providers when needed to operate the site or fulfil an order, or when disclosure is required by law. We keep information for as long as it is needed for these purposes and applicable requirements.',
  },
  {
    title: 'Your choices',
    content:
      'You can review or update some account details from your account page. For questions about your information or a request relating to it, contact MALKAZ customer support through the support options on this website.',
  },
];

const termsSections = [
  {
    title: 'Using this website',
    content:
      'Use the website lawfully and provide accurate information when creating an account or placing an order. You are responsible for activity carried out through your account and for keeping your sign-in details secure.',
  },
  {
    title: 'Products and orders',
    content:
      'Product descriptions, images, prices, and availability are shown as carefully as possible, but may change. Submitting an order is a request to purchase; the order details and any applicable payment or delivery options shown during checkout apply to that order.',
  },
  {
    title: 'Payments, delivery, and support',
    content:
      'Available payment and delivery methods are presented during checkout and may vary by order. Contact customer support through the website if you need help with an order, delivery, return, or other service question.',
  },
  {
    title: 'Website content',
    content:
      'Website text, branding, images, and other content belong to MALKAZ or their respective rights holders. Do not copy, republish, or use this content commercially without permission.',
  },
  {
    title: 'Changes',
    content:
      'We may update these terms or this privacy information as the website and its services change. The latest version will be available on this page.',
  },
];

export default function PrivacyConditionsPage() {
  const { privacyPolicy } = useSiteContent();

  const activePrivacySections =
    privacyPolicy.sections && privacyPolicy.sections.length > 0
      ? privacyPolicy.sections
      : privacySections;

  const activeTermsSections =
    privacyPolicy.termsSections && privacyPolicy.termsSections.length > 0
      ? privacyPolicy.termsSections
      : termsSections;

  return (
    <SiteLayout>
      <main className="page legal-page">
        <Link href="/" className="legal-back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to MALKAZ
        </Link>

        <header className="legal-page-heading">
          <p className="eyebrow">MALKAZ / CUSTOMER INFORMATION</p>
          <h1 className="page-title">{privacyPolicy.title || 'Privacy & Conditions'}</h1>
          <p>
            {privacyPolicy.intro ||
              'Find out how information is used on this website and the conditions that apply when you browse or place an order.'}
          </p>
          {privacyPolicy.lastUpdated && (
            <p style={{ fontSize: '0.82rem', color: '#666', marginTop: '0.5rem' }}>
              Last updated: {privacyPolicy.lastUpdated}
            </p>
          )}
        </header>

        <div className="legal-sections">
          <section aria-labelledby="privacy-title">
            <p className="eyebrow">YOUR INFORMATION</p>
            <h2 id="privacy-title">Privacy</h2>
            {activePrivacySections.map((section: { title: string; content: string }) => (
              <article className="legal-copy-block" key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.content}</p>
              </article>
            ))}
          </section>

          <section aria-labelledby="conditions-title">
            <p className="eyebrow">BROWSING &amp; ORDERS</p>
            <h2 id="conditions-title">Website conditions</h2>
            {activeTermsSections.map((section: { title: string; content: string }) => (
              <article className="legal-copy-block" key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.content}</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    </SiteLayout>
  );
}
