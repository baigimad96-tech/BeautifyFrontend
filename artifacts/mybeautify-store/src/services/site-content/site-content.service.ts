import { request } from '@/services/api/client';

export interface HelpSupportFaqItem {
  question: string;
  answer: string;
}

export interface HelpSupportData {
  headline?: string;
  subheadline?: string;
  subtitle?: string;
  responseNotice?: string;
  notice?: string;
  faqs?: HelpSupportFaqItem[];
}

export interface AboutUsData {
  heroTitle?: string;
  heroSubtitle?: string;
  brandIntro?: string;
  founderTag?: string;
  qualityTitle?: string;
  qualityBody?: string;
  storyTitle?: string;
  storyQuote?: string;
  storyBody?: string;
  missionTitle?: string;
  missionDesc?: string;
  manifestoTitle?: string;
  manifestoBody?: string;
  tagline?: string;
  subtagline?: string;
}

export interface PolicySectionItem {
  title: string;
  content: string;
}

export interface PrivacyPolicyData {
  title?: string;
  lastUpdated?: string;
  intro?: string;
  dataProtectionSummary?: string;
  termsSummary?: string;
  sections?: PolicySectionItem[];
  termsSections?: PolicySectionItem[];
}

export interface SiteContentResponse {
  id?: number;
  configKey?: string;
  businessPhone?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  supportHours?: string;
  businessAddress?: string;
  helpSupportContent?: string;
  aboutUsContent?: string;
  privacyPolicyContent?: string;
  updatedAt?: string;
}

export type SiteContentUpdateRequest = Partial<SiteContentResponse>;

export type SiteHelpSupportContent = HelpSupportData;
export type SiteAboutUsContent = AboutUsData;
export type SitePrivacyPolicyContent = PrivacyPolicyData;

export const DEFAULT_SITE_CONTENT: Required<Omit<SiteContentResponse, 'id' | 'configKey' | 'updatedAt'>> = {
  businessPhone: '+91 98765 43210',
  whatsappNumber: '919876543210',
  supportEmail: 'care@malkaz.com',
  supportHours: 'Mon–Sat: 10:00 AM – 7:00 PM IST',
  businessAddress: 'Zainab Khan Enterprises, Mumbai, Maharashtra, India',
  helpSupportContent: JSON.stringify({
    headline: 'MALKAZ Client Concierge & Support',
    subheadline: 'Our dedicated client care concierge is here to assist you with order inquiries, bespoke jewellery styling, sizing, and post-purchase care.',
    responseNotice: 'We typically respond within 15–30 minutes during official business hours.',
    faqs: [
      {
        question: 'What are your standard delivery timelines across India?',
        answer: 'All orders are processed within 24–48 hours and shipped via express insured couriers (Blue Dart, Delhivery) with delivery in 3–5 business days.',
      },
      {
        question: 'Are MALKAZ jewellery pieces hypoallergenic?',
        answer: 'Yes, all MALKAZ imitation jewellery collections use skin-safe brass and premium alloys that are 100% lead-free and nickel-free.',
      },
      {
        question: 'How can I track my shipment?',
        answer: 'Once dispatched, you will receive real-time SMS and WhatsApp tracking updates, or you can view live delivery status under My Orders in your account.',
      },
      {
        question: 'What is your exchange and return policy?',
        answer: 'We offer a hassle-free 7-day replacement or exchange guarantee in the unlikely event of transit damage or manufacturing defects.',
      },
    ],
  }),
  aboutUsContent: JSON.stringify({
    heroTitle: 'About MALKAZ',
    heroSubtitle: 'Where Luxury Meets Trust',
    brandIntro: 'Founded under Zainab Khan Enterprises, MALKAZ represents the pinnacle of royal luxury jewellery and timeless design aesthetics. Guided by founder Zainab Khan’s extensive 7+ years of experience in the fashion and styling industry, MALKAZ was established to bridge the gap between regal grandeur and accessible, uncompromising craft.',
    founderTag: 'Founder & Creative Director: Zainab Khan · 7+ Years Fashion Industry Experience',
    qualityTitle: 'Quality Over Quantity',
    qualityBody: 'At MALKAZ, customer satisfaction is not merely a benchmark—it is our crowning commitment. Every piece that carries our seal is meticulously inspected to uphold royal standards of durability, shine, and comfort. We believe in complete transparency and honor every promise we make to our patrons.',
    storyTitle: 'The Story Behind the Name Malkaz',
    storyQuote: '“A mother’s dignity is a daughter’s eternal crown.”',
    storyBody: 'The name MALKAZ carries an intimate, deeply emotional legacy. It is born from a heartfelt tribute honoring founder Zainab Khan’s beloved mother, Malka—a matriarch revered for her quiet resilience, regal grace, and unconditional warmth—alongside the unwavering guidance and lifelong companionship of her elder sister. In Urdu and Arabic heritage, “Malka” translates directly to Queen—the sovereign of dignity, wisdom, and inner strength.',
    missionTitle: 'More Than a Brand – A Mission to Empower Women',
    missionDesc: 'MALKAZ stands firmly for female elevation, economic self-reliance, and the timeless artistry of Indian craftswomen and karigars.',
    manifestoTitle: 'Who Is Malka?',
    manifestoBody: 'She is not defined by fleeting trends or external validation. She is bold yet gentle, ambitious yet grounded, traditional yet forward-looking. She wears her values with pride, leads with purpose, and turns everyday challenges into stepping stones of grace.',
    tagline: 'MALKAZ – SHE IS HER OWN CROWN.',
    subtagline: 'She Can Shine Her Own Way.',
  }),
  privacyPolicyContent: JSON.stringify({
    title: 'Privacy Policy & Customer Conditions',
    lastUpdated: 'November 2026',
    intro: 'At MALKAZ (operated under Zainab Khan Enterprises), we are dedicated to protecting your personal information and upholding the highest privacy standards.',
    dataProtectionSummary: 'We use encrypted SSL payment protocols, do not store raw credit/debit card numbers on our servers, and never share or sell customer data to third-party marketers.',
    termsSummary: 'All orders placed on MALKAZ are backed by genuine craftsmanship guarantees, pan-India insured transit, and customer-first support.',
  }),
};

export async function fetchPublicSiteContent(): Promise<SiteContentResponse> {
  try {
    const data = await request<SiteContentResponse>('/site-content');
    if (data && typeof data === 'object') {
      return {
        ...DEFAULT_SITE_CONTENT,
        ...data,
      };
    }
  } catch (err) {
    console.warn('Failed to fetch site content from backend, falling back to defaults:', err);
  }
  return DEFAULT_SITE_CONTENT;
}

export async function updateAdminSiteContent(
  payload: Partial<SiteContentResponse>
): Promise<SiteContentResponse> {
  return request<SiteContentResponse>('/admin/site-content', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function sanitizeWhatsAppNumber(rawNumber?: string): string {
  if (!rawNumber) return DEFAULT_SITE_CONTENT.whatsappNumber;
  const cleaned = rawNumber.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned.length > 0 ? cleaned : DEFAULT_SITE_CONTENT.whatsappNumber;
}

export function getWhatsAppUrl(
  whatsappNumber?: string,
  message = 'Hi MALKAZ, I need assistance with fine jewellery orders & styling.'
): string {
  const number = sanitizeWhatsAppNumber(whatsappNumber);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function parseJsonContent<T>(jsonString?: string | null, fallback: T = {} as T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}
