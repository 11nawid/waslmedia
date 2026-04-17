import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { HelpCenterHubIntro } from '@/components/help-center/help-center-primitives';
import { buildPublicMetadata } from '@/lib/seo';
import {
  getHelpCenterSectionLabel,
  helpCenterCompanyCards,
  helpCenterDocsCards,
  helpCenterLegalCards,
  type HelpCenterArticleSectionKey,
} from '@/lib/help-center-content';

const hubConfig: Record<
  HelpCenterArticleSectionKey,
  {
    title: string;
    description: string;
    cards: typeof helpCenterCompanyCards;
  }
> = {
  company: {
    title: 'Company guidance',
    description:
      'Read how Waslmedia presents its advertising service, support routes, and merchant-facing public guidance.',
    cards: helpCenterCompanyCards,
  },
  docs: {
    title: 'Documentation',
    description:
      'Browse simple guides for advertising purchases, creators, AI, data controls, and safety.',
    cards: helpCenterDocsCards,
  },
  legal: {
    title: 'Rules and policies',
    description:
      'Open the policy pages for terms, privacy, refunds, fulfilment, cookies, data handling, ads, community rules, and AI.',
    cards: helpCenterLegalCards,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;

  if (section === 'contact') {
    return buildPublicMetadata({
      title: 'Contact Waslmedia',
      description: 'Find advertiser, support, privacy, billing, and policy contact routes for Waslmedia.',
      path: '/help-center/contact',
      type: 'article',
    });
  }

  if (!(section in hubConfig)) {
    return buildPublicMetadata({
      title: 'Help Center',
      description: 'Browse Waslmedia company guidance, docs, and legal pages.',
      path: '/help-center',
    });
  }

  const key = section as HelpCenterArticleSectionKey;
  const config = hubConfig[key];

  return buildPublicMetadata({
    title: `${config.title} | Waslmedia`,
    description: config.description,
    path: `/help-center/${key}`,
    type: 'website',
  });
}

export default async function HelpCenterSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (section === 'contact') {
    permanentRedirect('/help-center/contact');
  }

  if (!(section in hubConfig)) {
    notFound();
  }

  const key = section as HelpCenterArticleSectionKey;
  const config = hubConfig[key];

  return (
    <HelpCenterHubIntro
      sectionLabel={getHelpCenterSectionLabel(key)}
      title={config.title}
      description={config.description}
      cards={config.cards}
    />
  );
}
