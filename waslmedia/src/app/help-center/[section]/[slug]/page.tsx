import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HelpCenterArticlePage } from '@/components/help-center/help-center-primitives';
import {
  getHelpCenterArticle,
  getHelpCenterSectionHref,
  getHelpCenterSectionLabel,
  helpCenterArticleCollections,
  helpCenterCompanyCards,
  helpCenterDocsCards,
  helpCenterLegalCards,
  type HelpCenterArticleSectionKey,
} from '@/lib/help-center-content';
import { buildPublicMetadata } from '@/lib/seo';

const siblingCardMap = {
  company: helpCenterCompanyCards,
  docs: helpCenterDocsCards,
  legal: helpCenterLegalCards,
} satisfies Record<HelpCenterArticleSectionKey, typeof helpCenterCompanyCards>;

export function generateStaticParams() {
  return (Object.entries(helpCenterArticleCollections) as Array<
    [HelpCenterArticleSectionKey, Record<string, { slug: string }>]
  >).flatMap(([section, pages]) =>
    Object.keys(pages).map((slug) => ({
      section,
      slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}): Promise<Metadata> {
  const { section, slug } = await params;

  if (!(section in helpCenterArticleCollections)) {
    return buildPublicMetadata({
      title: 'Help Center',
      description: 'Browse Waslmedia company guidance, docs, and legal pages.',
      path: '/help-center',
    });
  }

  const sectionKey = section as HelpCenterArticleSectionKey;
  const article = getHelpCenterArticle(sectionKey, slug);

  if (!article) {
    return buildPublicMetadata({
      title: 'Help Center',
      description: 'Browse Waslmedia company guidance, docs, and legal pages.',
      path: '/help-center',
    });
  }

  return buildPublicMetadata({
    title: `${article.title} | Waslmedia`,
    description: article.description || article.lead,
    path: `/help-center/${sectionKey}/${article.slug}`,
    type: 'article',
  });
}

export default async function HelpCenterArticleRoute({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;

  if (!(section in helpCenterArticleCollections)) {
    notFound();
  }

  const sectionKey = section as HelpCenterArticleSectionKey;
  const article = getHelpCenterArticle(sectionKey, slug);

  if (!article) {
    notFound();
  }

  const siblings = siblingCardMap[sectionKey]
    .filter((card) => card.href !== `/help-center/${sectionKey}/${slug}`)
    .slice(0, 2);

  return (
    <HelpCenterArticlePage
      article={article}
      sectionLabel={getHelpCenterSectionLabel(sectionKey)}
      sectionHref={getHelpCenterSectionHref(sectionKey)}
      siblings={siblings}
    />
  );
}
