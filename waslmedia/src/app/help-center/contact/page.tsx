import type { Metadata } from 'next';
import { HelpCenterArticlePage } from '@/components/help-center/help-center-primitives';
import { helpCenterDocsCards, helpCenterLegalCards } from '@/lib/help-center-content';
import { companyPages } from '@/lib/public-site-content';
import { buildPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPublicMetadata({
  title: companyPages.contact.title,
  description: companyPages.contact.description,
  path: '/help-center/contact',
  type: 'article',
});

export default function HelpCenterContactPage() {
  const siblings = [
    helpCenterDocsCards.find((card) => card.href.endsWith('/docs/advertise')),
    helpCenterLegalCards.find((card) => card.href.endsWith('/legal/refunds')),
  ].filter((card): card is (typeof helpCenterDocsCards)[number] => Boolean(card));

  return (
    <HelpCenterArticlePage
      article={companyPages.contact}
      sectionLabel="Contact"
      sectionHref="/help-center/contact"
      siblings={siblings}
    />
  );
}
