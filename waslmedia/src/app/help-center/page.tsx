import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HelpCenterSearch } from '@/components/help-center/help-center-search';
import { HelpCenterHomeHero } from '@/components/help-center/help-center-primitives';
import { buildPublicMetadata } from '@/lib/seo';
import {
  helpCenterFeaturedLinks,
  helpCenterHomeCards,
} from '@/lib/help-center-content';

export const metadata: Metadata = buildPublicMetadata({
  title: 'Waslmedia Help Center',
  description: 'Browse company guidance, advertising docs, legal policies, fulfilment details, and support information for Waslmedia.',
  path: '/help-center',
  type: 'website',
});

export default function HelpCenterHomePage() {
  return (
    <div className="bg-[#f7f9fb]">
      <HelpCenterHomeHero search={<HelpCenterSearch variant="hero" />} />

      <section className="bg-[#eef3f7]">
        <div className="mx-auto w-full max-w-[1720px] px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
            {helpCenterHomeCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-[1.75rem] border border-[#dbe4ed] bg-white px-8 py-8 transition hover:border-[#c8d3df]"
              >
                <p className="text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.055em] text-[#111827]">
                  {card.title}
                </p>
                <p className="mt-4 max-w-[30rem] text-[1.08rem] leading-9 text-[#667085]">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e7ecf2] bg-white">
        <div className="mx-auto w-full max-w-[1720px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="max-w-[620px]">
              <p className="text-[1rem] font-semibold tracking-[0.02em] text-[#667085]">Start here</p>
              <h2 className="mt-4 text-balance text-[3rem] font-semibold leading-[0.94] tracking-[-0.065em] text-[#111827] sm:text-[4rem]">
                Start with the pages people use most.
              </h2>
              <p className="mt-6 text-[1.14rem] leading-9 text-[#4b5563]">
                Move from quick answers into deeper docs and policies without leaving the same clean help surface.
              </p>
              <Link
                href="/help-center/docs"
                className="mt-7 inline-flex items-center gap-2 text-[1rem] font-medium text-[#111827]"
              >
                Browse documentation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {helpCenterFeaturedLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-t border-[#dbe3ec] pt-6 transition"
                >
                  <p className="text-[1.16rem] font-semibold tracking-[-0.02em] text-[#111827]">{item.label}</p>
                  <p className="mt-3 text-[1rem] leading-8 text-[#667085]">
                    Go straight to the answer.
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
