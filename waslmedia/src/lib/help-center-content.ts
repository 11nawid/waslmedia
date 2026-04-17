import type { PublicArticle, PublicHubCard } from '@/lib/public-site-content';
import { companyPages, docsPages, legalPages } from '@/lib/public-site-content';

export type HelpCenterSectionKey = 'company' | 'docs' | 'legal' | 'contact';
export type HelpCenterArticleSectionKey = Exclude<HelpCenterSectionKey, 'contact'>;

export interface HelpCenterNavLink {
  href: string;
  label: string;
}

export interface HelpCenterCategoryCard {
  href: string;
  title: string;
  description: string;
}

export interface HelpCenterSearchDocument {
  href: string;
  section: HelpCenterSectionKey;
  sectionLabel: string;
  title: string;
  summary: string;
  body: string;
}

const HELP_CENTER_BASE = '/help-center';

export const helpCenterNavigation: HelpCenterNavLink[] = [
  { href: `${HELP_CENTER_BASE}/company`, label: 'Company' },
  { href: `${HELP_CENTER_BASE}/docs`, label: 'Docs' },
  { href: `${HELP_CENTER_BASE}/legal`, label: 'Legal' },
  { href: `${HELP_CENTER_BASE}/contact`, label: 'Contact' },
];

export const helpCenterFooterGroups = [
  {
    title: 'Company',
    links: [
      { href: `${HELP_CENTER_BASE}/company`, label: 'Company hub' },
      { href: `${HELP_CENTER_BASE}/company/about`, label: 'About Waslmedia' },
      { href: `${HELP_CENTER_BASE}/company/contact`, label: 'Company contact guidance' },
    ],
  },
  {
    title: 'Docs',
    links: [
      { href: `${HELP_CENTER_BASE}/docs`, label: 'Docs hub' },
      { href: `${HELP_CENTER_BASE}/docs/advertise`, label: 'Advertise' },
      { href: `${HELP_CENTER_BASE}/docs/creators`, label: 'Creators' },
      { href: `${HELP_CENTER_BASE}/docs/advertising`, label: 'Advertising' },
      { href: `${HELP_CENTER_BASE}/docs/ai`, label: 'AI at Waslmedia' },
      { href: `${HELP_CENTER_BASE}/docs/data-controls`, label: 'Data controls' },
      { href: `${HELP_CENTER_BASE}/docs/safety`, label: 'Safety' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: `${HELP_CENTER_BASE}/legal`, label: 'Legal hub' },
      { href: `${HELP_CENTER_BASE}/legal/terms`, label: 'Terms' },
      { href: `${HELP_CENTER_BASE}/legal/privacy`, label: 'Privacy' },
      { href: `${HELP_CENTER_BASE}/legal/refunds`, label: 'Refunds' },
      { href: `${HELP_CENTER_BASE}/legal/service-fulfilment`, label: 'Fulfilment' },
      { href: `${HELP_CENTER_BASE}/legal/cookies`, label: 'Cookies' },
      { href: `${HELP_CENTER_BASE}/legal/data-policy`, label: 'Data policy' },
      { href: `${HELP_CENTER_BASE}/legal/ads-policy`, label: 'Ads policy' },
      { href: `${HELP_CENTER_BASE}/legal/ai-policy`, label: 'AI policy' },
      { href: `${HELP_CENTER_BASE}/legal/community-guidelines`, label: 'Community guidelines' },
    ],
  },
];

export const helpCenterHomeCards: HelpCenterCategoryCard[] = [
  {
    href: `${HELP_CENTER_BASE}/company`,
    title: 'Company',
    description: 'Learn how Waslmedia presents its advertising service and where to find merchant-facing company guidance.',
  },
  {
    href: `${HELP_CENTER_BASE}/docs`,
    title: 'Docs',
    description: 'Find clear guides for advertising purchases, creators, AI, privacy controls, and safety.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal`,
    title: 'Legal',
    description: 'Read the policies for terms, privacy, final ad payments, wallet credit, fulfilment, ads, AI, and community rules.',
  },
  {
    href: `${HELP_CENTER_BASE}/contact`,
    title: 'Contact',
    description: 'Find the right route for support, advertisers, trust issues, and follow-up.',
  },
];

export const helpCenterQuickLinks: HelpCenterNavLink[] = [
  { href: `${HELP_CENTER_BASE}/docs/advertise`, label: 'Advertise' },
  { href: `${HELP_CENTER_BASE}/legal/refunds`, label: 'Refunds' },
  { href: `${HELP_CENTER_BASE}/legal/privacy`, label: 'Privacy Policy' },
];

export const helpCenterFeaturedLinks: HelpCenterNavLink[] = [
  { href: `${HELP_CENTER_BASE}/company/about`, label: 'About Waslmedia' },
  { href: `${HELP_CENTER_BASE}/docs/advertising`, label: 'Advertising operations' },
  { href: `${HELP_CENTER_BASE}/legal/service-fulfilment`, label: 'Service fulfilment' },
];

export const helpCenterCompanyCards: PublicHubCard[] = [
  {
    href: `${HELP_CENTER_BASE}/company/about`,
    eyebrow: 'Company',
    title: 'About Waslmedia',
    description: 'Read how Waslmedia positions its advertising service and handles trust and data responsibility.',
  },
  {
    href: `${HELP_CENTER_BASE}/company/contact`,
    eyebrow: 'Company',
    title: 'Contact and support',
    description: 'Find the public route for advertisers, billing questions, support, and trust issues.',
  },
  {
    href: `${HELP_CENTER_BASE}/docs/advertise`,
    eyebrow: 'Docs',
    title: 'Advertise on Waslmedia',
    description: 'See what advertisers buy, how review works, and how fulfilment is handled.',
  },
];

export const helpCenterDocsCards: PublicHubCard[] = [
  {
    href: `${HELP_CENTER_BASE}/docs/advertise`,
    eyebrow: 'Docs',
    title: 'Advertise on Waslmedia',
    description: 'Understand the advertising offer, supported placements, billing basics, and delivery expectations.',
  },
  {
    href: `${HELP_CENTER_BASE}/docs/creators`,
    eyebrow: 'Docs',
    title: 'Creators',
    description: 'Learn how channels, uploads, publishing, and creator workflows fit together.',
  },
  {
    href: `${HELP_CENTER_BASE}/docs/advertising`,
    eyebrow: 'Docs',
    title: 'Advertising',
    description: 'Understand packages, review, campaign operations, billing, and advertiser duties.',
  },
  {
    href: `${HELP_CENTER_BASE}/docs/ai`,
    eyebrow: 'Docs',
    title: 'AI at Waslmedia',
    description: 'See where AI is used, what it helps with, and where human review still matters.',
  },
  {
    href: `${HELP_CENTER_BASE}/docs/data-controls`,
    eyebrow: 'Docs',
    title: 'Data controls',
    description: 'Learn how history, privacy controls, and account-level data settings work.',
  },
  {
    href: `${HELP_CENTER_BASE}/docs/safety`,
    eyebrow: 'Docs',
    title: 'Safety and trust',
    description: 'Review moderation, reports, enforcement, and trust guidance.',
  },
];

export const helpCenterLegalCards: PublicHubCard[] = [
  {
    href: `${HELP_CENTER_BASE}/legal/terms`,
    eyebrow: 'Legal',
    title: 'Terms of service',
    description: 'The rules for using Waslmedia and purchasing sponsored advertising services on the platform.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/privacy`,
    eyebrow: 'Legal',
    title: 'Privacy policy',
    description: 'How Waslmedia handles personal data, what it uses it for, and why it does not sell it.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/refunds`,
    eyebrow: 'Legal',
    title: 'Cancellation and refunds',
    description: 'How final ad payments, wallet-credit outcomes, and advertising payment follow-up are handled.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/service-fulfilment`,
    eyebrow: 'Legal',
    title: 'Service fulfilment',
    description: 'How Waslmedia fulfils digital advertising services and why no shipping applies.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/cookies`,
    eyebrow: 'Legal',
    title: 'Cookies',
    description: 'How cookies, local storage, and session technology are used on the platform.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/data-policy`,
    eyebrow: 'Legal',
    title: 'Data policy',
    description: 'A closer look at retention, access, requests, and Waslmedia’s independent data stewardship model.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/ads-policy`,
    eyebrow: 'Legal',
    title: 'Ads policy',
    description: 'The standards for advertiser approval, restricted content, and campaign delivery.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/community-guidelines`,
    eyebrow: 'Legal',
    title: 'Community guidelines',
    description: 'The conduct and content rules that protect viewers, creators, and advertisers.',
  },
  {
    href: `${HELP_CENTER_BASE}/legal/ai-policy`,
    eyebrow: 'Legal',
    title: 'AI policy',
    description: 'The policy that explains AI usage, governance, and human oversight.',
  },
];

export function getHelpCenterSectionLabel(section: HelpCenterSectionKey) {
  switch (section) {
    case 'company':
      return 'Company';
    case 'docs':
      return 'Docs';
    case 'legal':
      return 'Legal';
    case 'contact':
      return 'Contact';
  }
}

export function getHelpCenterArticleHref(section: HelpCenterArticleSectionKey, slug: string) {
  return `${HELP_CENTER_BASE}/${section}/${slug}`;
}

export function getHelpCenterSectionHref(section: HelpCenterSectionKey) {
  return section === 'contact' ? `${HELP_CENTER_BASE}/contact` : `${HELP_CENTER_BASE}/${section}`;
}

export const helpCenterArticleCollections = {
  company: companyPages,
  docs: docsPages,
  legal: legalPages,
} satisfies Record<HelpCenterArticleSectionKey, Record<string, PublicArticle>>;

export function getHelpCenterArticle(
  section: HelpCenterArticleSectionKey,
  slug: string
) {
  return helpCenterArticleCollections[section][slug];
}

function buildArticleBody(article: PublicArticle) {
  return [
    article.title,
    article.description,
    article.lead,
    ...article.sections.flatMap((section) => [
      section.title,
      section.kicker || '',
      ...section.paragraphs,
      ...(section.bullets || []),
    ]),
  ].join(' ');
}

const helpCenterHubDocuments: HelpCenterSearchDocument[] = [
  {
    href: `${HELP_CENTER_BASE}/company`,
    section: 'company',
    sectionLabel: 'Company',
    title: 'Company help center',
    summary: 'Read about Waslmedia, its advertising service positioning, and its support routes.',
    body: 'company about waslmedia advertising service sponsored placements support routes contact trust model no data selling',
  },
  {
    href: `${HELP_CENTER_BASE}/docs`,
    section: 'docs',
    sectionLabel: 'Docs',
    title: 'Documentation help center',
    summary: 'Find product guidance for advertisers, creators, AI, data controls, and safety.',
    body: 'documentation advertise advertising refunds fulfilment creators ai data controls safety help',
  },
  {
    href: `${HELP_CENTER_BASE}/legal`,
    section: 'legal',
    sectionLabel: 'Legal',
    title: 'Legal help center',
    summary: 'Open the formal terms, privacy, refunds, fulfilment, cookies, data, ads, community, and AI policies.',
    body: 'legal terms privacy refunds wallet credit service fulfilment cookies data policy ads policy community guidelines ai policy',
  },
  {
    href: `${HELP_CENTER_BASE}/contact`,
    section: 'contact',
    sectionLabel: 'Contact',
    title: 'Contact Waslmedia',
    summary: 'See where support, advertising, billing, trust, and privacy questions should go.',
    body: 'contact support advertiser billing refunds privacy trust safety help',
  },
];

export function getHelpCenterSearchDocuments() {
  const articleDocuments = (Object.entries(helpCenterArticleCollections) as Array<
    [HelpCenterArticleSectionKey, Record<string, PublicArticle>]
  >).flatMap(([section, articles]) =>
    Object.values(articles).map((article) => ({
      href: getHelpCenterArticleHref(section, article.slug),
      section,
      sectionLabel: getHelpCenterSectionLabel(section),
      title: article.title,
      summary: article.description || article.lead,
      body: buildArticleBody(article),
    }))
  );

  const standaloneContactDocument: HelpCenterSearchDocument = {
    href: `${HELP_CENTER_BASE}/contact`,
    section: 'contact',
    sectionLabel: 'Contact',
    title: companyPages.contact.title,
    summary: companyPages.contact.description,
    body: buildArticleBody(companyPages.contact),
  };

  return [...helpCenterHubDocuments, standaloneContactDocument, ...articleDocuments];
}

function scoreSearchDocument(document: HelpCenterSearchDocument, query: string) {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return 0;
  }

  const haystack = `${document.title} ${document.summary} ${document.body}`.toLowerCase();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return terms.reduce((score, term) => {
    if (document.title.toLowerCase().includes(term)) {
      return score + 6;
    }
    if (document.summary.toLowerCase().includes(term)) {
      return score + 3;
    }
    if (haystack.includes(term)) {
      return score + 1;
    }
    return score;
  }, 0);
}

export function searchHelpCenterDocuments(query: string, limit = 12) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  return getHelpCenterSearchDocuments()
    .map((document) => ({
      ...document,
      score: scoreSearchDocument(document, normalizedQuery),
    }))
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}
