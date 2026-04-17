import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { appConfig } from '@/config/app';
import type { PublicArticle, PublicArticleSection, PublicHubCard } from '@/lib/public-site-content';
import { cn } from '@/lib/utils';

function buildBreadcrumbs(article: PublicArticle, categoryLabel: string) {
  const categoryHref =
    categoryLabel === 'Company' ? '/company' : categoryLabel === 'Documentation' ? '/docs' : '/legal';

  return [
    { href: '/company', label: 'Help Center' },
    { href: categoryHref, label: categoryLabel },
    { href: `${categoryHref}/${article.slug}`, label: article.title },
  ];
}

export function PublicHero({
  eyebrow,
  title,
  description,
  actions,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className={cn('max-w-4xl space-y-5', align === 'center' && 'mx-auto text-center')}>
          <p className="text-sm font-semibold tracking-tight text-slate-600">{eyebrow}</p>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-3xl text-pretty text-base leading-8 text-slate-600 sm:text-lg">{description}</p>
          {actions ? <div className={cn('flex flex-wrap gap-3 pt-2', align === 'center' && 'justify-center')}>{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function PublicSearchHero({
  eyebrow,
  title,
  description,
  quickLinks,
}: {
  eyebrow: string;
  title: string;
  description: string;
  quickLinks: Array<{ href: string; label: string }>;
}) {
  return (
    <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f7f6_100%)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:gap-16 lg:px-8 lg:py-16">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-tight text-slate-600">{eyebrow}</p>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-[4.3rem] lg:leading-[0.92]">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{description}</p>
          </div>

          <div className="max-w-2xl rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-3 rounded-[1rem] bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-500">Browse public guidance, policies, creator docs, and platform answers</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden min-h-[320px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),transparent_30%),linear-gradient(135deg,#0f1114_0%,#191d23_100%)] p-10 text-white lg:block">
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-white/70">Waslmedia public center</p>
              <p className="max-w-xs text-sm leading-7 text-white/70">
                Clean company pages, policy references, and product guidance designed to be readable before and after sign-in.
              </p>
            </div>
            <div className="self-end text-right">
              <div className="text-[7rem] font-semibold tracking-[-0.09em] text-white/95">W</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicSectionBand({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          {eyebrow ? <p className="text-sm font-semibold tracking-tight text-slate-600">{eyebrow}</p> : null}
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">{title}</h2>
          {description ? <p className="text-base leading-8 text-slate-600 sm:text-lg">{description}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function PublicHubGrid({ cards }: { cards: PublicHubCard[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <p className="text-sm font-semibold tracking-tight text-slate-500">{card.eyebrow}</p>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{card.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-950">
            Open page
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function ArticleSectionBlock({ section }: { section: PublicArticleSection }) {
  return (
    <section id={section.id} className="scroll-mt-28 border-t border-slate-200 pt-8 first:border-t-0 first:pt-0">
      <div className="max-w-3xl space-y-4">
        {section.kicker ? <p className="text-sm font-semibold tracking-tight text-slate-500">{section.kicker}</p> : null}
        <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.6rem]">{section.title}</h2>
        <div className="space-y-5 text-base leading-8 text-slate-700">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {section.bullets?.length ? (
          <ul className="space-y-3 pl-6 text-base leading-8 text-slate-700">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="list-disc marker:text-slate-400">
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function PublicArticlePage({
  article,
  categoryLabel,
  siblings,
}: {
  article: PublicArticle;
  categoryLabel: string;
  siblings: PublicHubCard[];
}) {
  const breadcrumbs = buildBreadcrumbs(article, categoryLabel);

  return (
    <div className="bg-white">
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {index > 0 ? <span className="text-slate-300">›</span> : null}
                <Link href={crumb.href} className={cn('transition hover:text-slate-900', index === breadcrumbs.length - 1 && 'pointer-events-none text-slate-900')}>
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="mt-8 max-w-4xl">
            <p className="text-sm font-semibold tracking-tight text-slate-500">{article.eyebrow}</p>
            <h1 className="mt-4 text-balance text-5xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-[4.5rem] lg:leading-[0.92]">
              {article.title}
            </h1>
            <div className="mt-8 h-px bg-slate-200" />
            <p className="mt-8 max-w-3xl text-lg leading-9 text-slate-700">{article.lead}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-2 border-l border-slate-200 pl-4">
              <p className="text-sm font-semibold tracking-tight text-slate-500">{categoryLabel}</p>
              <p className="text-sm text-slate-500">Updated {article.updatedAt}</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold tracking-tight text-slate-500">Topics covered</p>
              <div className="mt-4 space-y-2">
                {article.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm leading-6 text-slate-600 transition hover:text-slate-950"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <article className="space-y-10">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
              {article.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  {section.title}
                </a>
              ))}
            </div>

            {article.description ? <p className="max-w-3xl text-base leading-8 text-slate-600">{article.description}</p> : null}

            <div className="space-y-10">
              {article.sections.map((section) => (
                <ArticleSectionBlock key={section.id} section={section} />
              ))}
            </div>

            <div className="border-t border-slate-200 pt-10">
              <p className="text-sm font-semibold tracking-tight text-slate-500">Related pages</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {siblings.map((card) => (
                  <Link key={card.href} href={card.href} className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white">
                    <p className="text-sm font-semibold tracking-tight text-slate-500">{card.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-950">
                      Read page
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export function PublicCtaBand() {
  return (
    <section className="border-t border-slate-200 bg-[#f7f7f6]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold tracking-tight text-slate-500">Next steps</p>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Explore {appConfig.appName} with the public context already in hand.
          </h2>
          <p className="text-base leading-8 text-slate-600">
            Move from the public pages into the app, creator tools, or account setup without losing the product and policy context you just read.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
              Create an account
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-50">
              Open the app
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
