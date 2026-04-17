import Link from 'next/link';
import { ArrowRight, BookOpenText, Building2, FileText } from 'lucide-react';
import { WaslmediaLogo } from '@/components/waslmedia-logo';
import { appConfig } from '@/config/app';
import type { PublicArticle, PublicHubCard } from '@/lib/public-site-content';
import { cn } from '@/lib/utils';

export interface HelpCenterBreadcrumb {
  href?: string;
  label: string;
}

export function HelpCenterBreadcrumbs({
  items,
  className,
}: {
  items: HelpCenterBreadcrumb[];
  className?: string;
}) {
  return (
    <nav className={cn('flex flex-wrap items-center gap-2 text-sm text-[#667085]', className)}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-[#c4ccd7]">›</span> : null}
          {item.href ? (
            <Link href={item.href} className="transition hover:text-[#111827]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#111827]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function HelpCenterPageHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
}: {
  breadcrumbs: HelpCenterBreadcrumb[];
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-[#e7ecf2] bg-white">
      <div className="mx-auto w-full max-w-[1720px] overflow-x-hidden px-4 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
        <HelpCenterBreadcrumbs items={breadcrumbs} />
        <div className="mt-8 max-w-[1120px] min-w-0">
          {eyebrow ? (
            <p className="text-[0.95rem] font-semibold tracking-[0.01em] text-[#667085]">{eyebrow}</p>
          ) : null}
          <h1 className="mt-4 max-w-full text-balance break-words text-[2.2rem] font-semibold leading-[0.94] tracking-[-0.07em] text-[#111827] sm:text-[3.4rem] lg:text-[6.35rem]">
            {title}
          </h1>
          <div className="mt-7 h-px bg-[#dbe3ec] sm:mt-10" />
          <p className="mt-7 max-w-[900px] break-words text-[1rem] leading-8 text-[#4b5563] sm:mt-10 sm:text-[1.1rem] sm:leading-9 lg:text-[1.3rem] lg:leading-10">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

export function HelpCenterHomeHero({
  search,
}: {
  search: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#e7ecf2] bg-white">
      <div className="w-full px-0">
        <div className="bg-[#030303]">
          <div className="mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-[1720px] overflow-hidden lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
          <div className="relative flex items-center px-4 py-12 sm:px-8 sm:py-16 lg:px-16 lg:py-24">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_14%),repeating-linear-gradient(18deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_44px),repeating-linear-gradient(110deg,rgba(255,255,255,0.035)_0,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_48px)] opacity-55" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.07),transparent_18%),radial-gradient(circle_at_74%_24%,rgba(255,255,255,0.04),transparent_16%),radial-gradient(circle_at_16%_72%,rgba(255,255,255,0.05),transparent_20%),radial-gradient(circle_at_70%_82%,rgba(255,255,255,0.035),transparent_18%)] opacity-60" />
            <div className="relative max-w-[760px] min-w-0">
              <p className="text-[0.95rem] font-semibold text-white sm:text-[1.02rem]">Welcome to Waslmedia Help Center</p>
              <h1 className="mt-6 max-w-[700px] text-balance break-words text-[2.6rem] font-semibold leading-[0.92] tracking-[-0.08em] text-white sm:text-[4rem] lg:text-[7rem]">
                What can we help you find?
              </h1>
              <div className="mt-8 max-w-[760px]">{search}</div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/help-center/docs/advertise"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-[0.92rem] font-medium text-[#111827] transition hover:bg-[#f3f4f6] sm:px-6 sm:py-3.5 sm:text-[0.98rem]"
                >
                  Advertise on Waslmedia
                </Link>
                <Link
                  href="/help-center/legal/refunds"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-[0.92rem] font-medium text-[#111827] transition hover:bg-[#f3f4f6] sm:px-6 sm:py-3.5 sm:text-[0.98rem]"
                >
                  Refund policy
                </Link>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[420px] items-center justify-center overflow-hidden lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_16%),repeating-linear-gradient(18deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_44px),repeating-linear-gradient(110deg,rgba(255,255,255,0.035)_0,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_48px)] opacity-42" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_40%)] opacity-60" />
            <div className="relative flex h-[560px] w-[560px] items-center justify-center">
              <div className="absolute inset-[2.6rem] rounded-full border border-white/10" />
              <div className="absolute inset-[6rem] rounded-full border border-white/10" />
              <div className="absolute inset-[9.6rem] rounded-full border border-white/10" />
              <div className="absolute inset-0 flex items-center justify-center text-[25rem] font-semibold tracking-[-0.14em] text-white/92">
                W
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

export function HelpCenterCardGrid({
  cards,
  columns = 2,
}: {
  cards: PublicHubCard[];
  columns?: 2 | 3 | 4;
}) {
  const gridClass =
    columns === 4
      ? 'md:grid-cols-2 xl:grid-cols-4'
      : columns === 3
        ? 'md:grid-cols-2 xl:grid-cols-3'
        : 'md:grid-cols-2';

  return (
    <div className={cn('grid gap-5', gridClass)}>
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group border-t border-[#dbe3ec] pt-6 transition"
        >
          <p className="text-sm font-semibold tracking-[0.02em] text-[#667085]">{card.eyebrow}</p>
          <h3 className="mt-4 text-[1.65rem] font-semibold tracking-[-0.04em] text-[#111827]">
            {card.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#4b5563]">{card.description}</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#111827]">
            Read more
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function HelpCenterHubIntro({
  title,
  description,
  cards,
  sectionLabel,
}: {
  title: string;
  description: string;
  cards: PublicHubCard[];
  sectionLabel: string;
}) {
  const sectionIcon =
    sectionLabel === 'Company'
      ? Building2
      : sectionLabel === 'Docs'
        ? BookOpenText
        : FileText;
  const SectionIcon = sectionIcon;

  return (
    <div className="bg-white">
      <section className="mx-auto w-full max-w-[1720px] overflow-x-hidden px-4 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-24">
        <div className="max-w-[1180px]">
          <HelpCenterBreadcrumbs
            items={[
              { href: '/help-center', label: 'Help Center' },
              { label: sectionLabel },
            ]}
          />
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(360px,0.84fr)_minmax(0,1.16fr)] lg:gap-28">
          <div className="max-w-[640px] min-w-0">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#f4f7fb] text-[#111827] sm:h-20 sm:w-20 sm:rounded-[24px] lg:h-24 lg:w-24 lg:rounded-[28px]">
              <SectionIcon className="h-8 w-8 stroke-[1.7] sm:h-9 sm:w-9 lg:h-11 lg:w-11" />
            </div>
            <HelpCenterBreadcrumbs
              items={[
                { label: sectionLabel },
              ]}
              className="sr-only"
            />
            <p className="mt-6 text-[0.95rem] font-semibold tracking-[0.01em] text-[#667085]">{sectionLabel}</p>
            <h1 className="mt-3 max-w-full text-balance break-words text-[2.3rem] font-semibold leading-[0.95] tracking-[-0.075em] text-[#111827] sm:text-[3.8rem] lg:text-[6.5rem]">
              {title}
            </h1>
            <p className="mt-6 break-words text-[1rem] leading-8 text-[#4b5563] sm:text-[1.1rem] sm:leading-9 lg:text-[1.3rem] lg:leading-10">{description}</p>
          </div>

          <div className="max-w-[980px] min-w-0 pt-2">
            <ul className="space-y-8">
              {cards.map((card) => (
                <li key={card.href} className="border-t border-[#dce4ec] pt-7 first:border-t-0 first:pt-0">
                  <Link href={card.href} className="group block">
                    <p className="break-words text-[1rem] font-semibold tracking-[0.01em] text-[#1d9bf0] transition group-hover:text-[#1570ef] sm:text-[1.08rem]">
                      {card.title}
                    </p>
                    <p className="mt-3 max-w-[860px] break-words text-[1rem] leading-8 text-[#1f2937] sm:text-[1.12rem] sm:leading-9 lg:text-[1.28rem] lg:leading-[2.65rem]">
                      {card.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export function HelpCenterArticlePage({
  article,
  sectionLabel,
  sectionHref,
  siblings,
}: {
  article: PublicArticle;
  sectionLabel: string;
  sectionHref: string;
  siblings: PublicHubCard[];
}) {
  return (
    <div className="bg-white">
      <HelpCenterPageHeader
        breadcrumbs={[
          { href: '/help-center', label: 'Help Center' },
          { href: sectionHref, label: sectionLabel },
          { label: article.title },
        ]}
        eyebrow={sectionLabel}
        title={article.title}
        description={article.lead}
      />

      <div className="mx-auto w-full max-w-[1720px] overflow-x-hidden px-4 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10 lg:px-10 lg:pb-28 lg:pt-16">
        <div className="grid gap-14 lg:grid-cols-[290px_minmax(0,1060px)] lg:gap-20">
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="border-l border-[#dbe3ec] pl-4">
              <p className="text-[0.98rem] font-semibold tracking-[0.02em] text-[#667085]">{sectionLabel}</p>
              <p className="mt-1 text-[0.98rem] text-[#667085]">Updated {article.updatedAt}</p>
            </div>

            <div className="hidden lg:block">
              <p className="text-[0.98rem] font-semibold tracking-[0.02em] text-[#667085]">Topics covered</p>
              <div className="mt-4 space-y-2">
                {article.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-[1rem] leading-7 text-[#4b5563] transition hover:text-[#111827]"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <article className="min-w-0 space-y-10">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
              {article.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="whitespace-nowrap rounded-full border border-[#dbe3ec] px-3.5 py-2 text-[0.9rem] text-[#4b5563] transition hover:bg-[#f7f9fb] hover:text-[#111827] sm:px-4 sm:py-2.5 sm:text-[0.98rem]"
                >
                  {section.title}
                </a>
              ))}
            </div>

            {article.description ? (
              <p className="max-w-[820px] break-words text-[1rem] leading-8 text-[#4b5563] sm:text-[1.05rem] sm:leading-9 lg:text-[1.1rem]">{article.description}</p>
            ) : null}

            <div className="space-y-10">
              {article.sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className={cn('scroll-mt-28 border-[#e7ecf2] pt-8', index > 0 ? 'border-t' : '')}
                >
                  <div className="max-w-[760px] space-y-4">
                    {section.kicker ? (
                      <p className="text-[0.95rem] font-semibold tracking-[0.01em] text-[#667085]">
                        {section.kicker}
                      </p>
                    ) : null}
                    <h2 className="max-w-full text-balance break-words text-[2rem] font-semibold tracking-[-0.055em] text-[#111827] sm:text-[2.7rem] lg:text-[3.5rem]">
                      {section.title}
                    </h2>
                    <div className="space-y-5 break-words text-[1rem] leading-8 text-[#374151] sm:text-[1.05rem] sm:leading-9 lg:text-[1.14rem] lg:leading-10">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    {section.bullets?.length ? (
                      <ul className="space-y-3 break-words pl-5 text-[1rem] leading-8 text-[#374151] sm:pl-6 sm:text-[1.05rem] sm:leading-9 lg:text-[1.14rem] lg:leading-10">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="list-disc marker:text-[#9aa7b8]">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>

            {siblings.length ? (
              <div className="border-t border-[#e7ecf2] pt-10">
                <p className="text-[0.98rem] font-semibold tracking-[0.02em] text-[#667085]">Related pages</p>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  {siblings.map((card) => (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="group border-t border-[#dbe3ec] pt-5 transition"
                    >
                      <p className="text-[0.98rem] font-semibold tracking-[0.02em] text-[#667085]">{card.eyebrow}</p>
                      <h3 className="mt-2 break-words text-[1.35rem] font-semibold tracking-[-0.04em] text-[#111827] sm:text-[1.55rem]">
                        {card.title}
                      </h3>
                      <p className="mt-2 break-words text-[0.98rem] leading-7 text-[#4b5563] sm:text-[1rem] sm:leading-8">{card.description}</p>
                      <span className="mt-4 inline-flex items-center gap-2 text-[0.98rem] font-medium text-[#111827]">
                        Open page
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </div>
  );
}

export function HelpCenterSearchResultsPage({
  query,
  results,
}: {
  query: string;
  results: Array<{
    href: string;
    sectionLabel: string;
    title: string;
    summary: string;
  }>;
}) {
  return (
    <div className="bg-[#f7f9fb]">
      <HelpCenterPageHeader
        breadcrumbs={[
          { href: '/help-center', label: 'Help Center' },
          { label: 'Search' },
        ]}
        eyebrow="Search"
        title={query ? `Results for “${query}”` : 'Search the help center'}
        description={
          query
            ? 'These results only include Waslmedia help-center content, including advertising guidance, company pages, and legal policies.'
            : 'Search Waslmedia advertising guidance, contact pages, and policy content from one place.'
        }
      />

      <section className="w-full overflow-x-hidden px-4 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto w-full max-w-[1720px]">
        {results.length ? (
          <div className="space-y-0">
            {results.map((result) => (
              <Link
                key={result.href}
                href={result.href}
                className="block border-t border-[#dbe3ec] px-0 py-6 transition first:border-t-0 hover:bg-transparent"
              >
                <p className="text-[1rem] font-semibold tracking-[0.01em] text-[#667085]">{result.sectionLabel}</p>
                <h2 className="mt-2 break-words text-[1.8rem] font-semibold tracking-[-0.06em] text-[#111827] sm:text-[2.2rem] lg:text-[2.45rem]">
                  {result.title}
                </h2>
                <p className="mt-2 max-w-[920px] break-words text-[1rem] leading-8 text-[#4b5563] sm:text-[1.08rem] sm:leading-9 lg:text-[1.14rem]">{result.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-4">
            <p className="text-lg font-semibold tracking-[-0.03em] text-[#111827] sm:text-xl">No help-center pages matched that search.</p>
            <p className="mt-2 max-w-[680px] break-words text-sm leading-7 text-[#4b5563]">
              Try a broader search or start with one of the main help-center sections below.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <Link href="/help-center/company" className="border-t border-[#dbe3ec] pt-4 text-sm font-medium text-[#111827]">
                Company
              </Link>
              <Link href="/help-center/docs" className="border-t border-[#dbe3ec] pt-4 text-sm font-medium text-[#111827]">
                Docs
              </Link>
              <Link href="/help-center/legal" className="border-t border-[#dbe3ec] pt-4 text-sm font-medium text-[#111827]">
                Legal
              </Link>
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}

export function HelpCenterFooterNote() {
  return (
    <div className="flex items-center gap-3">
      <WaslmediaLogo className="h-8 w-8" />
      <div>
        <p className="text-base font-semibold tracking-[-0.03em] text-[#111827]">
          {appConfig.appName} Help Center
        </p>
        <p className="text-sm text-[#667085]">
          Company guidance, product docs, legal information, and contact routes.
        </p>
      </div>
    </div>
  );
}
