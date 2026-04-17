'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  ChartColumnIncreasing,
  Eye,
  History,
  Megaphone,
  MonitorSmartphone,
  MousePointerClick,
  PauseCircle,
  PlayCircle,
  Plus,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCreateAdDialog } from '@/hooks/use-create-ad-dialog';
import { useStrictAdsDesktopAccess } from '@/hooks/use-strict-ads-desktop-access';
import { useToast } from '@/hooks/use-toast';
import {
  completeAdCheckoutClient,
  archiveAdCampaignClient,
  createAdOrderClient,
  deleteAdCampaignClient,
  getReadableRazorpayError,
  getStudioAdsOverviewClient,
  pauseAdCampaignClient,
  resubmitAdCampaignClient,
  resumeAdCampaignClient,
  startAdCheckoutRedirectFallback,
} from '@/lib/ads/client';
import { ADS_SYNC_EVENT } from '@/lib/ads/feed';
import type { StudioAdCampaign, StudioAdsOverview } from '@/lib/ads/types';
import { emitWalletSync } from '@/lib/wallet/client';
import { cn } from '@/lib/utils';

type AdsTab = 'overview' | 'campaign' | 'analytics' | 'creative';

const adsTabs: Array<{ value: AdsTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'creative', label: 'Creative' },
];

function formatCurrencyFromPaise(value: number) {
  return `Rs ${(value / 100).toLocaleString('en-IN')}`;
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function getCtr(clicks: number, impressions: number) {
  if (impressions <= 0) {
    return '0.00%';
  }

  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

function campaignNeedsResubmission(campaign: StudioAdCampaign) {
  return (
    campaign.paymentStatus === 'paid' &&
    campaign.reviewStatus === 'pending' &&
    campaign.status !== 'paid_pending_review' &&
    campaign.status !== 'active' &&
    campaign.status !== 'paused'
  );
}

function DesktopOnlyPlaceholder() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid h-24 w-24 place-items-center rounded-[28px] border border-border/70 bg-secondary/25">
          <MonitorSmartphone className="h-10 w-10 text-primary" />
        </div>
      </div>
      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em]">
        Studio ads
      </Badge>
      <h2 className="mt-5 text-3xl font-black tracking-tight">Ads creation is only available on PC or laptop</h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
        Use a desktop or laptop to create campaigns, continue payment, and manage sponsored ads in Studio.
      </p>
    </div>
  );
}

function EmptyAdsState({ onCreate, walletBalancePaise }: { onCreate: () => void; walletBalancePaise?: number }) {
  return (
    <div className="mx-auto flex min-h-[62vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid h-28 w-28 place-items-center rounded-[32px] border border-border/70 bg-secondary/25">
          <Megaphone className="h-12 w-12 text-primary" />
        </div>
      </div>

      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em]">
        Studio ads
      </Badge>
      <h2 className="mt-5 text-4xl font-black tracking-tight">Create your first sponsored campaign</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        Run one ad at a time in v1. Upload a landscape video, choose Home feed or Search, complete payment, and send
        it for review.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Review usually takes 2-3 days after payment, depending on creative readiness and policy checks.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Ad payments are generally final. If Waslmedia rejects a campaign before delivery or cannot run it for a
        platform-side reason, the default outcome is Waslmedia Wallet credit for a future eligible purchase.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button className="rounded-full px-5" onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create ad
        </Button>
        <Button variant="outline" className="rounded-full px-5" disabled>
          Review starts after payment and usually takes 2-3 days
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full bg-secondary/40 px-3 py-1">1 campaign max</span>
        <span className="rounded-full bg-secondary/40 px-3 py-1">Home + Search</span>
        <span className="rounded-full bg-secondary/40 px-3 py-1">2-3 day review</span>
        {walletBalancePaise && walletBalancePaise > 0 ? (
          <span className="rounded-full bg-secondary/40 px-3 py-1">Wallet {formatCurrencyFromPaise(walletBalancePaise)}</span>
        ) : null}
      </div>
    </div>
  );
}

function AdPreviewCard({ overview }: { overview: StudioAdsOverview }) {
  const campaign = overview.campaign;
  const creative = overview.creative;

  if (!campaign || !creative) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card">
      <div className="relative aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.15),_transparent_28%),linear-gradient(135deg,#421f7a_0%,#6d28d9_52%,#7c3aed_100%)] text-white">
        {creative.thumbnailUrl ? (
          <Image src={creative.thumbnailUrl} alt={creative.title} fill className="object-cover opacity-80" unoptimized />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.46)_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-black/20 font-semibold">
                {campaign.sponsor.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.26em] text-white/80">Sponsored</p>
                <p className="truncate text-sm font-semibold">{campaign.domain}</p>
              </div>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/35">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="max-w-[82%]">
            <p className="line-clamp-2 text-3xl font-black leading-[1.02]">{creative.title}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-border/70 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
            {campaign.sponsor.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-lg font-semibold">{campaign.headline}</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Sponsored</span>
              {' · '}
              {campaign.domain}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="rounded-full">Watch</Button>
              <Button className="rounded-full">{campaign.ctaLabel}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryTrendCard({ overview }: { overview: StudioAdsOverview }) {
  const maxValue = Math.max(1, ...overview.analytics.flatMap((point) => [point.impressions, point.clicks]));

  return (
    <Card className="rounded-[28px] border-border/70">
      <CardHeader>
        <CardTitle className="text-3xl font-black tracking-tight">7-day delivery trend</CardTitle>
        <CardDescription>Impressions and clicks for your one active campaign.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid h-44 grid-cols-7 items-end gap-3 rounded-[24px] border border-border/70 bg-secondary/15 px-4 pb-4 pt-6">
          {overview.analytics.map((point) => (
            <div key={point.date} className="flex min-w-0 flex-col items-center gap-3">
              <div className="flex h-full w-full items-end justify-center gap-1.5">
                <div className="w-4 rounded-full bg-primary/25" style={{ height: `${Math.max((point.impressions / maxValue) * 100, 6)}%` }} />
                <div className="w-4 rounded-full bg-primary" style={{ height: `${Math.max((point.clicks / maxValue) * 100, 6)}%` }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{new Date(point.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary/25" />Impressions</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" />Clicks</span>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({
  overview,
  onPauseResume,
  onArchive,
  actionPending,
}: {
  overview: StudioAdsOverview;
  onPauseResume: () => Promise<void>;
  onArchive: () => Promise<void>;
  actionPending: boolean;
}) {
  const campaign = overview.campaign;
  if (!campaign) {
    return null;
  }

  const ctr = getCtr(campaign.clicks, campaign.impressions);
  const spendPercent = campaign.totalPaise > 0 ? Math.min((campaign.spendPaise / campaign.totalPaise) * 100, 100) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Status', value: formatStatusLabel(campaign.status), Icon: Activity },
            { label: 'Budget', value: formatCurrencyFromPaise(campaign.totalPaise), Icon: Wallet },
            { label: 'Impressions', value: campaign.impressions.toLocaleString('en-IN'), Icon: Eye },
            { label: 'CTR', value: ctr, Icon: MousePointerClick },
          ].map(({ label, value, Icon }) => (
            <Card key={label} className="rounded-[24px] border-border/70">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-3xl font-semibold">{value}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  Live campaign snapshot
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-3xl font-black tracking-tight">{campaign.headline}</CardTitle>
              <Badge>{formatStatusLabel(campaign.status)}</Badge>
            </div>
            <CardDescription>Preview, pacing, delivery split, and campaign controls in one place.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
            <AdPreviewCard overview={overview} />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Placement', campaign.placement],
                  ['Review', campaign.reviewStatus],
                  ['Payment', campaign.paymentStatus],
                  ['Duration', `${campaign.durationDays} days`],
                  ['Start', campaign.startAt ? new Date(campaign.startAt).toLocaleDateString() : 'Pending'],
                  ['End', campaign.endAt ? new Date(campaign.endAt).toLocaleDateString() : 'Pending'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-[22px] border border-border/70 bg-secondary/15 p-4">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-xl font-semibold capitalize">{String(value)}</p>
                  </div>
                ))}
              </div>

              <Card className="rounded-[24px] border-border/70 bg-secondary/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">Budget pacing</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatCurrencyFromPaise(campaign.spendPaise)} spent from {formatCurrencyFromPaise(campaign.totalPaise)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">{Math.round(spendPercent)}% used</p>
                  </div>
                  <Progress value={spendPercent} className="mt-4 h-3 rounded-full bg-secondary/70" />
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-border/70 bg-secondary/10">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Megaphone className="h-4 w-4" />
                    Placement health
                  </div>
                  {overview.placementBreakdown.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-2.5 rounded-full bg-secondary/70" />
                      <p className="text-sm text-muted-foreground">{item.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full" onClick={onPauseResume} disabled={actionPending}>
                  {campaign.status === 'active' ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                  {campaign.status === 'active' ? 'Pause campaign' : 'Resume campaign'}
                </Button>
                <Button variant="secondary" className="rounded-full" onClick={() => window.open(campaign.ctaUrl, '_blank', 'noopener,noreferrer')}>
                  Visit website
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
                {(campaign.status === 'rejected' || campaign.status === 'completed' || campaign.status === 'archived') ? (
                  <Button variant="ghost" className="rounded-full" onClick={onArchive} disabled={actionPending}>
                    Archive
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <DeliveryTrendCard overview={overview} />
        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl font-black tracking-tight">Recent activity</CardTitle>
            <CardDescription>Campaign and delivery highlights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              `${campaign.impressions.toLocaleString('en-IN')} impressions delivered so far`,
              `${campaign.clicks.toLocaleString('en-IN')} clicks recorded from Watch + CTA actions`,
              `Review status is ${formatStatusLabel(campaign.reviewStatus)}`,
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[22px] border border-border/70 bg-secondary/10 p-4">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CampaignTab({ overview }: { overview: StudioAdsOverview }) {
  const campaign = overview.campaign;
  const creative = overview.creative;
  if (!campaign || !creative) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
      <Card className="rounded-[28px] border-border/70">
        <CardHeader>
          <CardTitle className="text-3xl font-black tracking-tight">Creative preview</CardTitle>
          <CardDescription>The exact sponsored card that appears in Home and Search.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdPreviewCard overview={overview} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle className="text-3xl font-black tracking-tight">Campaign details</CardTitle>
            <CardDescription>Everything tied to the one active ad slot for this channel.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              ['Website', creative.websiteUrl],
              ['CTA button', creative.ctaLabel],
              ['Package', campaign.packageName || 'Custom draft'],
              ['Destination domain', creative.sponsorDomain],
              ['Review notes', campaign.reviewNotes || 'No review notes yet'],
              ['Impression cap', campaign.impressionCap.toLocaleString('en-IN')],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 break-words text-lg font-semibold">{String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl font-black tracking-tight">Delivery quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>CTR strength</span>
                <span className="font-semibold">{getCtr(campaign.clicks, campaign.impressions)}</span>
              </div>
              <Progress value={Math.min((campaign.clicks / Math.max(campaign.impressions, 1)) * 1000, 100)} className="mt-2 h-3 rounded-full bg-secondary/70" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Delivery cap used</span>
                <span className="font-semibold">{Math.round((campaign.impressions / Math.max(campaign.impressionCap, 1)) * 100)}%</span>
              </div>
              <Progress value={Math.min((campaign.impressions / Math.max(campaign.impressionCap, 1)) * 100, 100)} className="mt-2 h-3 rounded-full bg-secondary/70" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsTab({ overview }: { overview: StudioAdsOverview }) {
  const campaign = overview.campaign;
  if (!campaign) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <DeliveryTrendCard overview={overview} />
        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle className="text-3xl font-black tracking-tight">Daily breakdown</CardTitle>
            <CardDescription>Daily impressions, clicks, dismissals, and watch previews.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {overview.analytics.map((point) => (
              <div key={point.date} className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
                <p className="font-semibold">{new Date(point.date).toLocaleDateString()}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Impressions</span><p className="mt-1 font-semibold">{point.impressions.toLocaleString('en-IN')}</p></div>
                  <div><span className="text-muted-foreground">Clicks</span><p className="mt-1 font-semibold">{point.clicks.toLocaleString('en-IN')}</p></div>
                  <div><span className="text-muted-foreground">Dismissals</span><p className="mt-1 font-semibold">{point.dismissals.toLocaleString('en-IN')}</p></div>
                  <div><span className="text-muted-foreground">Spend</span><p className="mt-1 font-semibold">{formatCurrencyFromPaise(point.spendPaise)}</p></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl font-black tracking-tight">Performance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Clicks', value: campaign.clicks.toLocaleString('en-IN'), Icon: MousePointerClick },
              { label: 'Watch previews', value: campaign.watchPreviews.toLocaleString('en-IN'), Icon: Activity },
              { label: 'Dismissals', value: campaign.dismissals.toLocaleString('en-IN'), Icon: BarChart3 },
              { label: 'Spend', value: formatCurrencyFromPaise(campaign.spendPaise), Icon: Wallet },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
                <p className="mt-3 text-3xl font-semibold">{String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CreativeTab({ overview }: { overview: StudioAdsOverview }) {
  const creative = overview.creative;
  const campaign = overview.campaign;
  if (!creative || !campaign) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
      <Card className="rounded-[28px] border-border/70">
        <CardHeader>
          <CardTitle className="text-3xl font-black tracking-tight">Creative assets</CardTitle>
          <CardDescription>Video, thumbnail, and copy currently attached to the campaign.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdPreviewCard overview={overview} />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Video duration', `${creative.videoDurationSeconds.toFixed(1)}s`],
              ['Video size', `${creative.videoWidth} × ${creative.videoHeight}`],
              ['Video type', creative.videoMimeType],
              ['Thumbnail source', creative.selectedThumbnailSource],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-lg font-semibold">{String(value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl font-black tracking-tight">Campaign copy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Title</p>
              <p className="mt-2 text-xl font-semibold">{creative.title}</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-2 text-sm leading-7 text-foreground">{creative.description}</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Destination website</p>
              <p className="mt-2 break-words text-lg font-semibold">{creative.websiteUrl}</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">CTA label</p>
              <p className="mt-2 text-lg font-semibold">{creative.ctaLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function nextStatusMessage(overview: StudioAdsOverview) {
  const campaign = overview.campaign;
  if (!campaign) {
    return null;
  }

  if (campaignNeedsResubmission(campaign)) {
    return 'Payment is already verified, but this ad still needs to be resubmitted before it can enter the manual review queue.';
  }

  if (campaign.paymentStatus !== 'paid') {
    return 'Finish payment to move this ad into the manual review queue.';
  }

  if (campaign.reviewStatus === 'pending') {
    return 'Payment is verified. Your ad is waiting for manual approval before it can go live. Review usually takes 2-3 days.';
  }

  if (campaign.reviewStatus === 'rejected') {
    return campaign.reviewNotes || 'The ad was rejected. Update the draft and submit it again.';
  }

  return 'This campaign is ready for full analytics and delivery management.';
}

function getTopStatusBanner(overview: StudioAdsOverview | null) {
  const campaign = overview?.campaign;
  if (!campaign) {
    return null;
  }

  if (campaignNeedsResubmission(campaign)) {
    return {
      tone: 'amber' as const,
      label: 'Resubmit required',
      title: 'Payment is verified, but this ad still needs to be resubmitted.',
      description: 'Open the draft changes and send it back to the review queue so admins can approve or reject it again.',
    };
  }

  if (campaign.paymentStatus !== 'paid') {
    return {
      tone: 'amber' as const,
      label: 'Payment required',
      title: campaign.packageId ? 'Complete payment to send this ad for review.' : 'Finish setup and choose a package to continue.',
      description:
        campaign.packageId
          ? 'Your campaign is saved, but Razorpay payment still needs to be completed before review can begin.'
          : 'Your campaign is still a draft. Update the setup, choose a package, and then complete payment.',
    };
  }

  if (campaign.reviewStatus === 'pending') {
    return {
      tone: 'blue' as const,
      label: 'Pending review',
      title: 'Your ad is waiting for manual approval.',
      description: 'Payment is verified. The campaign will stay hidden until an internal reviewer approves it. Review usually takes 2-3 days.',
    };
  }

  if (campaign.reviewStatus === 'rejected') {
    return {
      tone: 'rose' as const,
      label: 'Rejected',
      title: 'This ad was rejected and needs changes.',
      description: campaign.reviewNotes || 'Update the creative or details, then submit it again.',
    };
  }

  if (campaign.status === 'paused') {
    return {
      tone: 'slate' as const,
      label: 'Paused',
      title: 'Your ad is approved, but delivery is currently paused.',
      description: 'Resume the campaign when you want impressions and clicks to start again.',
    };
  }

  if (campaign.status === 'active') {
    return {
      tone: 'emerald' as const,
      label: 'Live',
      title: 'Your ad is active and eligible for delivery.',
      description: 'Impressions, clicks, pacing, and placement breakdowns are now available below.',
    };
  }

  return {
    tone: 'slate' as const,
    label: 'Campaign status',
    title: `Current status: ${formatStatusLabel(campaign.status)}`,
    description: nextStatusMessage(overview),
  };
}

function getDraftSetupStep(overview: StudioAdsOverview) {
  const campaign = overview.campaign;
  const creative = overview.creative;

  if (!campaign || !creative || !creative.videoStorageRef || !creative.thumbnailStorageRef) {
    return 'media' as const;
  }

  if (!creative.title.trim() || !creative.description.trim() || !creative.websiteUrl.trim() || !creative.ctaLabel.trim()) {
    return 'details' as const;
  }

  if (!campaign.packageId || campaign.paymentStatus !== 'paid') {
    return 'pricing' as const;
  }

  return 'details' as const;
}

function PendingCampaignTable({
  overview,
  onContinuePayment,
  onEdit,
  onResubmit,
  onDelete,
  onRefresh,
  actionPending,
}: {
  overview: StudioAdsOverview;
  onContinuePayment: () => Promise<void>;
  onEdit: () => void;
  onResubmit: () => Promise<void>;
  onDelete: () => Promise<void>;
  onRefresh: () => Promise<void>;
  actionPending: boolean;
}) {
  const campaign = overview.campaign;
  const creative = overview.creative;

  if (!campaign) {
    return null;
  }

  const rows = [
    ['Headline', campaign.headline],
    ['Campaign status', formatStatusLabel(campaign.status)],
    ['Payment status', formatStatusLabel(campaign.paymentStatus)],
    ['Review status', formatStatusLabel(campaign.reviewStatus)],
    ['Placement', formatStatusLabel(campaign.placement)],
    ['Package', campaign.packageName || 'Not selected yet'],
    ['Budget', formatCurrencyFromPaise(campaign.totalPaise || campaign.budgetPaise)],
    ['Website', creative?.websiteUrl || campaign.ctaUrl || '—'],
    ['CTA label', creative?.ctaLabel || campaign.ctaLabel || 'Start now'],
    ['Start date', campaign.startAt ? new Date(campaign.startAt).toLocaleString() : 'Not scheduled yet'],
    ['End date', campaign.endAt ? new Date(campaign.endAt).toLocaleString() : 'Not scheduled yet'],
    ['Review notes', campaign.reviewNotes || 'No review notes yet'],
  ] as const;

  const canContinuePayment = campaign.paymentStatus !== 'paid' && Boolean(campaign.packageId);
  const isLockedForReview = campaign.paymentStatus === 'paid' && campaign.reviewStatus === 'pending';
  const canResubmit = campaign.status === 'rejected' || campaignNeedsResubmission(campaign);
  const canEdit =
    campaign.status !== 'active' &&
    campaign.status !== 'archived' &&
    campaign.reviewStatus !== 'approved' &&
    !isLockedForReview;
  const canDelete =
    campaign.status !== 'active' &&
    campaign.status !== 'archived' &&
    campaign.reviewStatus !== 'approved' &&
    campaign.paymentStatus !== 'paid';

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <Card className="rounded-[28px] border-border/70">
        <CardHeader>
          <CardTitle className="text-3xl font-black tracking-tight">Campaign status</CardTitle>
          <CardDescription>
            This ad is not live yet, so analytics and delivery controls stay hidden until payment and approval are complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdPreviewCard overview={overview} />
          <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{nextStatusMessage(overview)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canContinuePayment ? (
              <Button className="rounded-full" onClick={() => void onContinuePayment()} disabled={actionPending}>
                <Wallet className="mr-2 h-4 w-4" />
                Continue payment
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="secondary" className="rounded-full" onClick={onEdit} disabled={actionPending}>
                {canResubmit ? 'Edit changes' : !canContinuePayment ? 'Continue setup' : 'Edit ad'}
              </Button>
            ) : null}
            {canResubmit ? (
              <Button variant="outline" className="rounded-full" onClick={() => void onResubmit()} disabled={actionPending}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resubmit for review
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="destructive" className="rounded-full" onClick={() => void onDelete()} disabled={actionPending}>
                Delete ad
              </Button>
            ) : null}
            <Button variant="outline" className="rounded-full" onClick={() => void onRefresh()} disabled={actionPending}>
              Refresh status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70">
        <CardHeader>
          <CardTitle className="text-3xl font-black tracking-tight">Ad status table</CardTitle>
          <CardDescription>Only the essential publishing state is shown until the campaign is approved.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[24px] border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-sm">
              <tbody className="divide-y divide-border/70 bg-card/40">
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td className="w-[220px] bg-secondary/20 px-4 py-3 font-medium text-muted-foreground">{label}</td>
                    <td className="px-4 py-3 text-foreground">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryCampaignCard({
  campaign,
  onEdit,
  onResubmit,
  onDelete,
}: {
  campaign: StudioAdCampaign;
  onEdit: (campaignId: string) => void;
  onResubmit: (campaignId: string) => Promise<void>;
  onDelete: (campaignId: string) => Promise<void>;
}) {
  const canResubmit = campaign.status === 'rejected';
  const isFinished = campaign.status === 'completed' || campaign.status === 'archived';

  return (
    <Card className="rounded-[28px] border-border/70">
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-start">
        <div className="overflow-hidden rounded-[24px] border border-border/70 bg-secondary/10">
          <div className="relative aspect-[16/10] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_34%),linear-gradient(135deg,#421f7a_0%,#6d28d9_52%,#7c3aed_100%)]">
            {campaign.thumbnailUrl ? (
              <Image src={campaign.thumbnailUrl} alt={campaign.headline} fill className="object-cover opacity-80" unoptimized />
            ) : null}
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-black tracking-tight">{campaign.headline}</h3>
            <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
              {formatStatusLabel(campaign.status)}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
              Review: {formatStatusLabel(campaign.reviewStatus)}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{campaign.description}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[20px] border border-border/70 bg-secondary/15 p-4">
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="mt-2 text-base font-semibold">
                {campaign.rejectionReasonLabel || (isFinished ? 'Campaign completed' : 'No review reason recorded')}
              </p>
              {campaign.rejectionCustomReason ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{campaign.rejectionCustomReason}</p>
              ) : null}
            </div>
            <div className="rounded-[20px] border border-border/70 bg-secondary/15 p-4">
              <p className="text-sm text-muted-foreground">Review details</p>
              <p className="mt-2 text-base font-semibold">
                {campaign.lastReviewedAt ? new Date(campaign.lastReviewedAt).toLocaleString() : 'No review timestamp'}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {campaign.reviewNotes || 'Open this record to review the previous moderation details and next steps.'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:w-[170px] lg:flex-col">
          {canResubmit ? (
            <>
              <Button variant="secondary" className="rounded-full" onClick={() => onEdit(campaign.id)}>
                Edit and resubmit
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => void onResubmit(campaign.id)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resubmit
              </Button>
            </>
          ) : null}
          <Button variant="destructive" className="rounded-full" onClick={() => void onDelete(campaign.id)}>
            Delete
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => window.open(campaign.ctaUrl, '_blank', 'noopener,noreferrer')}>
            Open website
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdsPageClient({
  canManageAds,
  initialOverview,
}: {
  canManageAds: boolean;
  initialOverview: StudioAdsOverview | null;
}) {
  const { onOpen } = useCreateAdDialog();
  const strictDesktopAdsAccess = useStrictAdsDesktopAccess(canManageAds);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdsTab>('overview');
  const [overview, setOverview] = useState<StudioAdsOverview | null>(initialOverview);
  const [actionPending, setActionPending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setOverview(initialOverview);
  }, [initialOverview]);

  useEffect(() => {
    if (!strictDesktopAdsAccess) {
      return;
    }

    let active = true;
    const syncOverview = async () => {
      try {
        const next = await getStudioAdsOverviewClient();
        if (active) {
          setOverview(next);
        }
      } catch {
        // keep current state
      }
    };

    window.addEventListener(ADS_SYNC_EVENT, syncOverview);
    return () => {
      active = false;
      window.removeEventListener(ADS_SYNC_EVENT, syncOverview);
    };
  }, [strictDesktopAdsAccess]);

  const refreshOverview = async () => {
    if (!strictDesktopAdsAccess) {
      return;
    }

    const next = await getStudioAdsOverviewClient();
    setOverview(next);
  };

  const handlePauseResume = async () => {
    if (!overview?.campaign) {
      return;
    }

    setActionPending(true);
    try {
      const next =
        overview.campaign.status === 'active'
          ? await pauseAdCampaignClient(overview.campaign.id)
          : await resumeAdCampaignClient(overview.campaign.id);
      setOverview(next);
    } finally {
      setActionPending(false);
    }
  };

  const handleArchive = async () => {
    if (!overview?.campaign) {
      return;
    }

    setActionPending(true);
    try {
      const next = await archiveAdCampaignClient(overview.campaign.id);
      setOverview(next);
    } finally {
      setActionPending(false);
    }
  };

  const handleContinuePayment = async () => {
    if (!overview?.campaign?.packageId) {
      toast({
        title: 'Package missing',
        description: 'This draft does not have a payment package yet. Reopen ad creation and choose a package first.',
        variant: 'destructive',
      });
      return;
    }

    setActionPending(true);
    let blockedCheckoutFallbackPayload:
      | {
          campaignId: string;
          title: string;
          orderId: string;
          amountPaise: number;
          currency: string;
          keyId: string;
          customer?: {
            name?: string;
            email?: string;
          };
        }
      | null = null;
    try {
      const order = await createAdOrderClient(overview.campaign.id, overview.campaign.packageId);
      if (order.payment.kind === 'wallet' && order.overview) {
        setOverview(order.overview);
        if (order.payment.walletCreditPaise > 0) {
          emitWalletSync({
            type: 'transaction',
            transaction: {
              id: `local-wallet-${order.orderId}`,
              type: 'debit',
              amountPaise: order.payment.walletCreditPaise,
              balanceAfterPaise: order.overview.walletBalancePaise,
              referenceType: 'ad_order_wallet_debit',
              referenceId: order.orderId,
              relatedCampaignId: overview.campaign.id,
              notes: 'Applied wallet balance to ad campaign payment.',
              createdAt: new Date().toISOString(),
            },
            balancePaise: order.overview.walletBalancePaise,
            totalDebitedDeltaPaise: order.payment.walletCreditPaise,
          });
        }
        toast({
          title: 'Paid from wallet',
          description:
            order.overview.campaign?.reviewStatus === 'pending'
              ? 'Your wallet balance covered this ad and it is now waiting for manual review. Review usually takes 2-3 days.'
              : 'Your wallet balance covered this ad campaign.',
        });
        return;
      }

      if (!order.razorpay) {
        throw new Error('RAZORPAY_ORDER_MISSING');
      }

      blockedCheckoutFallbackPayload = {
        campaignId: overview.campaign.id,
        title: overview.campaign.headline,
        orderId: order.razorpay.orderId,
        amountPaise: order.razorpay.amountPaise,
        currency: order.razorpay.currency,
        keyId: order.razorpay.keyId,
        customer: order.razorpay.customer,
      };
      const paid = await completeAdCheckoutClient({
        campaignId: overview.campaign.id,
        title: overview.campaign.headline,
        orderId: order.razorpay.orderId,
        amountPaise: order.razorpay.amountPaise,
        currency: order.razorpay.currency,
        keyId: order.razorpay.keyId,
        customer: order.razorpay.customer,
      });
      if (paid.kind === 'redirected') {
        return;
      }
      setOverview(paid.overview);
      if (order.payment.walletCreditPaise > 0) {
        emitWalletSync({
          type: 'transaction',
          transaction: {
            id: `local-wallet-${order.orderId}`,
            type: 'debit',
            amountPaise: order.payment.walletCreditPaise,
            balanceAfterPaise: paid.overview.walletBalancePaise,
            referenceType: 'ad_order_wallet_debit',
            referenceId: order.orderId,
            relatedCampaignId: overview.campaign.id,
            notes: 'Applied wallet balance to ad campaign payment.',
            createdAt: new Date().toISOString(),
          },
          balancePaise: paid.overview.walletBalancePaise,
          totalDebitedDeltaPaise: order.payment.walletCreditPaise,
        });
      }
      toast({
        title: 'Payment received',
        description:
          paid.overview.campaign?.reviewStatus === 'pending'
            ? 'Your ad is now waiting for manual review. Review usually takes 2-3 days.'
            : 'Your ad campaign is now live.',
      });
    } catch (error) {
      await refreshOverview().catch(() => null);
      const paymentError = getReadableRazorpayError(error);
      const message = paymentError.code;
      if (message === 'RAZORPAY_CHECKOUT_BLOCKED' && blockedCheckoutFallbackPayload) {
        startAdCheckoutRedirectFallback(blockedCheckoutFallbackPayload);
        return;
      }
      toast({
        title:
          message === 'RAZORPAY_CHECKOUT_DISMISSED'
            ? 'Payment not completed'
            : paymentError.title,
        description:
          message === 'RAZORPAY_CHECKOUT_DISMISSED'
            ? 'The ad is still saved. You can continue payment from this page anytime.'
            : message === 'RAZORPAY_CHECKOUT_BLOCKED'
              ? 'The ad is still saved. Allow Razorpay checkout in the browser, then try Continue payment again.'
              : 'The ad is still saved. Try continuing payment again in a moment.',
        variant: message === 'RAZORPAY_CHECKOUT_DISMISSED' ? 'default' : 'destructive',
      });
    } finally {
      setActionPending(false);
    }
  };

  const handleEdit = () => {
    if (!overview) {
      return;
    }
    const targetCampaignId = overview.campaign?.id || overview.history[0]?.id || null;
    onOpen({
      mode: 'edit',
      initialStep: getDraftSetupStep(overview),
      campaignId: targetCampaignId,
    });
  };

  const handleEditHistory = (campaignId: string) => {
    onOpen({
      mode: 'edit',
      initialStep: 'details',
      campaignId,
    });
  };

  const handleResubmit = async (campaignId?: string) => {
    const targetCampaignId = campaignId || overview?.campaign?.id;
    if (!targetCampaignId) {
      return;
    }

    setActionPending(true);
    try {
      const next = await resubmitAdCampaignClient(targetCampaignId);
      setOverview(next);
      setShowHistory(false);
      toast({
        title: 'Campaign resubmitted',
        description:
          next.campaign?.paymentStatus === 'paid'
            ? 'Your updated ad is back in the review queue. Review usually takes 2-3 days.'
            : 'Your draft was reopened. Complete payment to send it for review.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AD_RESUBMIT_FAILED';
      toast({
        title: 'Could not resubmit ad',
        description:
          message === 'AD_CAMPAIGN_NOT_REJECTED'
            ? 'Only rejected ads can be resubmitted from history.'
            : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setActionPending(false);
    }
  };

  const handleDelete = async () => {
    if (!overview?.campaign) {
      return;
    }

    setActionPending(true);
    try {
      const result = await deleteAdCampaignClient(overview.campaign.id);
      setOverview(result.overview);
      if (result.refundedAmountPaise && result.refundedAmountPaise > 0) {
        emitWalletSync({
          type: 'transaction',
          transaction: {
            id: `local-wallet-refund-${overview.campaign.id}`,
            type: 'credit',
            amountPaise: result.refundedAmountPaise,
            balanceAfterPaise: result.overview.walletBalancePaise,
            referenceType: 'ad_campaign_delete_refund',
            referenceId: overview.campaign.id,
            relatedCampaignId: overview.campaign.id,
            notes: `Refund for deleted ${overview.campaign.status} ad campaign.`,
            createdAt: new Date().toISOString(),
          },
          balancePaise: result.overview.walletBalancePaise,
          totalCreditedDeltaPaise: result.refundedAmountPaise,
        });
      }
      toast({
        title: 'Ad removed',
        description:
          result.refundedAmountPaise && result.refundedAmountPaise > 0
            ? `${formatCurrencyFromPaise(result.refundedAmountPaise)} was returned to your ad wallet.`
            : 'Your unfinished ad was removed. You can create a fresh one anytime.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AD_DELETE_FAILED';
      toast({
        title: 'Could not delete ad',
        description:
          message === 'AD_CAMPAIGN_DELETE_NOT_ALLOWED'
            ? 'Paid or approved ads cannot be deleted from this screen.'
            : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setActionPending(false);
    }
  };

  const handleDeleteHistory = async (campaignId: string) => {
    setActionPending(true);
    try {
      const result = await deleteAdCampaignClient(campaignId);
      setOverview(result.overview);
      if (result.refundedAmountPaise && result.refundedAmountPaise > 0) {
        emitWalletSync({
          type: 'transaction',
          transaction: {
            id: `local-wallet-refund-${campaignId}`,
            type: 'credit',
            amountPaise: result.refundedAmountPaise,
            balanceAfterPaise: result.overview.walletBalancePaise,
            referenceType: 'ad_campaign_delete_refund',
            referenceId: campaignId,
            relatedCampaignId: campaignId,
            notes: 'Refund for deleted historical ad campaign.',
            createdAt: new Date().toISOString(),
          },
          balancePaise: result.overview.walletBalancePaise,
          totalCreditedDeltaPaise: result.refundedAmountPaise,
        });
      }
      toast({
        title: 'Previous ad removed',
        description:
          result.refundedAmountPaise && result.refundedAmountPaise > 0
            ? `${formatCurrencyFromPaise(result.refundedAmountPaise)} was added back to your ad wallet.`
            : 'The historical ad was deleted and the one-ad slot is now available again if no current campaign remains.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AD_DELETE_FAILED';
      toast({
        title: 'Could not delete ad',
        description:
          message === 'AD_CAMPAIGN_DELETE_NOT_ALLOWED'
            ? 'This ad can’t be deleted from history right now.'
            : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setActionPending(false);
    }
  };

  const topStatusBanner = useMemo(() => getTopStatusBanner(overview), [overview]);
  const history = overview?.history || [];
  const hasHistory = history.length > 0;
  const currentCampaign = overview?.campaign || null;
  const activeOverview = overview && currentCampaign ? overview : null;

  const showFullDashboard = Boolean(
    currentCampaign &&
      currentCampaign.paymentStatus === 'paid' &&
      currentCampaign.reviewStatus === 'approved'
  );

  if (!strictDesktopAdsAccess) {
    return <DesktopOnlyPlaceholder />;
  }

  if (!currentCampaign && !hasHistory) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyAdsState onCreate={() => onOpen({ mode: 'create' })} walletBalancePaise={overview?.walletBalancePaise || 0} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]">
            Studio ads
          </Badge>
          <h1 className="text-4xl font-black tracking-tight">Manage your sponsored campaign</h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            Real campaign creation, real review states, real delivery analytics, and one ad per channel in v1.
          </p>
          {topStatusBanner && currentCampaign ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]',
                  topStatusBanner.tone === 'amber' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  topStatusBanner.tone === 'blue' && 'border-sky-500/30 bg-sky-500/10 text-sky-300',
                  topStatusBanner.tone === 'rose' && 'border-rose-500/30 bg-rose-500/10 text-rose-300',
                  topStatusBanner.tone === 'emerald' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                  topStatusBanner.tone === 'slate' && 'border-border/70 bg-secondary/30'
                )}
              >
                {topStatusBanner.label}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">
                {formatStatusLabel(currentCampaign.status)}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">
                Payment: {formatStatusLabel(currentCampaign.paymentStatus)}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">
                Review: {formatStatusLabel(currentCampaign.reviewStatus)}
              </Badge>
            </div>
          ) : null}
        </div>
        <div className="self-start">
          <div className="flex flex-wrap gap-2">
            {overview && overview.walletBalancePaise > 0 ? (
              <Badge variant="outline" className="rounded-full px-4 py-2 text-sm">
                <Wallet className="mr-2 h-4 w-4" />
                Wallet {formatCurrencyFromPaise(overview.walletBalancePaise)}
              </Badge>
            ) : null}
            {hasHistory ? (
              <Button
                variant="outline"
                className="rounded-full px-5"
                onClick={() => setShowHistory((value) => !value)}
              >
                <History className="mr-2 h-4 w-4" />
                {showHistory ? 'Hide rejected & previous' : 'Rejected & previous'}
              </Button>
            ) : null}
            <Button className="rounded-full px-5" onClick={() => onOpen({ mode: 'create' })} disabled={!overview?.canCreateAd}>
              <Plus className="mr-2 h-4 w-4" />
              {overview?.canCreateAd === false ? '1 ad limit reached' : 'Create ad'}
            </Button>
          </div>
        </div>
      </div>

      {!currentCampaign && hasHistory ? (
        <div className="space-y-6">
          {!showHistory ? (
            <div className="mx-auto flex min-h-[54vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative grid h-24 w-24 place-items-center rounded-[28px] border border-border/70 bg-secondary/25">
                  <History className="h-10 w-10 text-primary" />
                </div>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em]">
                Studio ads
              </Badge>
              <h2 className="mt-5 text-3xl font-black tracking-tight">You don’t have a current active ad</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Your previous campaign was moved out of the main Ads workspace. Open rejected and previous ads to review the decision, edit it, and resubmit when you’re ready.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button className="rounded-full px-5" onClick={() => setShowHistory(true)}>
                  <History className="mr-2 h-4 w-4" />
                  Open rejected & previous
                </Button>
              </div>
            </div>
          ) : null}
          {showHistory ? (
            <Card className="rounded-[28px] border-border/70">
              <CardHeader>
                <CardTitle className="text-3xl font-black tracking-tight">Rejected & previous ads</CardTitle>
                <CardDescription>
                  Rejected campaigns move here so your main Ads workspace stays focused on the one current campaign.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {history.map((item) => (
                  <HistoryCampaignCard
                    key={item.id}
                    campaign={item}
                    onEdit={handleEditHistory}
                    onResubmit={handleResubmit}
                    onDelete={handleDeleteHistory}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeOverview && !showFullDashboard ? (
        <PendingCampaignTable
          overview={activeOverview}
          onContinuePayment={handleContinuePayment}
          onEdit={handleEdit}
          onResubmit={() => handleResubmit()}
          onDelete={handleDelete}
          onRefresh={refreshOverview}
          actionPending={actionPending}
        />
      ) : null}

      {currentCampaign && showFullDashboard ? (
        <div className="flex flex-wrap gap-2 border-b border-border/70 pb-3">
          {adsTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {activeOverview && showFullDashboard && activeTab === 'overview' ? (
        <OverviewTab overview={activeOverview} onPauseResume={handlePauseResume} onArchive={handleArchive} actionPending={actionPending} />
      ) : null}
      {activeOverview && showFullDashboard && activeTab === 'campaign' ? <CampaignTab overview={activeOverview} /> : null}
      {activeOverview && showFullDashboard && activeTab === 'analytics' ? <AnalyticsTab overview={activeOverview} /> : null}
      {activeOverview && showFullDashboard && activeTab === 'creative' ? <CreativeTab overview={activeOverview} /> : null}

      {currentCampaign && hasHistory && showHistory ? (
        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl font-black tracking-tight">Rejected & previous ads</CardTitle>
            <CardDescription>
              Older campaigns and removed creatives stay here for reference and resubmission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.map((item) => (
              <HistoryCampaignCard key={item.id} campaign={item} onEdit={handleEditHistory} onResubmit={handleResubmit} onDelete={handleDeleteHistory} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
