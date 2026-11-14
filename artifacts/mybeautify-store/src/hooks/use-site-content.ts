import { useQuery } from '@tanstack/react-query';
import {
  fetchPublicSiteContent,
  DEFAULT_SITE_CONTENT,
  getWhatsAppUrl,
  parseJsonContent,
  type HelpSupportData,
  type AboutUsData,
  type PrivacyPolicyData,
  type SiteContentResponse,
} from '@/services/site-content/site-content.service';

export type {
  HelpSupportData,
  AboutUsData,
  PrivacyPolicyData,
  SiteHelpSupportContent,
  SiteAboutUsContent,
  SitePrivacyPolicyContent,
} from '@/services/site-content/site-content.service';

export function useSiteContent() {
  const query = useQuery<SiteContentResponse>({
    queryKey: ['site-content'],
    queryFn: fetchPublicSiteContent,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const content = query.data || DEFAULT_SITE_CONTENT;

  const helpSupport = parseJsonContent<HelpSupportData>(
    content.helpSupportContent,
    parseJsonContent<HelpSupportData>(DEFAULT_SITE_CONTENT.helpSupportContent)
  );

  const aboutUs = parseJsonContent<AboutUsData>(
    content.aboutUsContent,
    parseJsonContent<AboutUsData>(DEFAULT_SITE_CONTENT.aboutUsContent)
  );

  const privacyPolicy = parseJsonContent<PrivacyPolicyData>(
    content.privacyPolicyContent,
    parseJsonContent<PrivacyPolicyData>(DEFAULT_SITE_CONTENT.privacyPolicyContent)
  );

  const whatsAppUrl = getWhatsAppUrl(
    content.whatsappNumber,
    'Hi MALKAZ, I need assistance with fine jewellery orders & styling.'
  );

  return {
    ...query,
    content,
    helpSupport,
    aboutUs,
    privacyPolicy,
    whatsAppUrl,
    businessPhone: content.businessPhone || DEFAULT_SITE_CONTENT.businessPhone,
    whatsappNumber: content.whatsappNumber || DEFAULT_SITE_CONTENT.whatsappNumber,
    supportEmail: content.supportEmail || DEFAULT_SITE_CONTENT.supportEmail,
    supportHours: content.supportHours || DEFAULT_SITE_CONTENT.supportHours,
    businessAddress: content.businessAddress || DEFAULT_SITE_CONTENT.businessAddress,
  };
}
