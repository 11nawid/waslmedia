'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  ChevronDown,
  Dot,
  Eye,
  MessageSquare,
  Share2,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { useStudioAiStore } from '@/hooks/use-studio-ai-store';
import { EmptyState } from '@/components/empty-state';
import type { ChannelAnalytics } from '@/lib/analytics/types';
import { getStudioBootstrap } from '@/lib/studio/client';
import type { StudioAnalyticsBootstrapPage } from '@/lib/studio/bootstrap-types';
import { useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';

type AnalyticsTab = 'overview' | 'content' | 'audience' | 'trends';

const analyticsTabs: Array<{ value: AnalyticsTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'content', label: 'Content' },
  { value: 'audience', label: 'Audience' },
  { value: 'trends', label: 'Trends' },
];

const chartColors = ['#8b7dff', '#6d64f4', '#bfa5ff', '#4d48d8', '#6d738c', '#4f5568'];
const rangeOptions = [7, 28, 90, 365] as const;

function parseDurationToSeconds(duration?: string) {
  if (!duration) return 0;
  const parts = duration.split(':').map((part) => Number(part));
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDateLabel(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRangeLabelForDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const format = (value: Date) =>
    value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${format(start)} - ${format(end)}`;
}

function AnalyticsShell({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`self-start rounded-[28px] border-border/70 bg-card/65 shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-[1.85rem] font-bold tracking-tight">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SeeMoreButton({ href }: { href?: string }) {
  if (href) {
    return (
      <Button asChild variant="secondary" className="rounded-full px-5">
        <Link href={href}>See more</Link>
      </Button>
    );
  }

  return (
    <Button variant="secondary" className="rounded-full px-5">
      See more
    </Button>
  );
}

function EmptyAnalyticsPanel({
  title,
  subtitle,
  description,
  href,
}: {
  title: string;
  subtitle: string;
  description: string;
  href?: string;
}) {
  return (
    <AnalyticsShell title={title} description={subtitle}>
      <div className="space-y-5"><AnalyticsPlaceholder title={title} description={description} /><SeeMoreButton href={href} /></div>
    </AnalyticsShell>
  );
}

function AnalyticsPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/70 bg-secondary/15 px-6 py-8"><EmptyState icon={BarChart3} title={title} description={description} compact className="max-w-none px-0 py-0" /></div>
  );
}

function AnalyticsLoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><Skeleton className="h-12 w-72 rounded-full" /><Skeleton className="h-12 w-52 rounded-full" /></div>
      <Skeleton className="h-12 w-full max-w-[860px] rounded-full" />
      <Skeleton className="h-[540px] rounded-[28px]" />
      <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-[320px] rounded-[28px]" /><Skeleton className="h-[320px] rounded-[28px]" /></div>
    </div>
  );
}

export function ChannelAnalyticsDashboard({
  initialAnalytics,
  initialDays = 28,
}: {
  initialAnalytics: ChannelAnalytics;
  initialDays?: number;
}) {
  const [selectedRange, setSelectedRange] = useState<number>(initialDays);
  const [data, setData] = useState<ChannelAnalytics | null>(initialAnalytics);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const openPrompt = useStudioAiStore((state) => state.openPrompt);

  const refreshAnalytics = useCallback((days: number) => {
    setLoading(true);
    getStudioBootstrap<StudioAnalyticsBootstrapPage>('analytics', {
      days,
    })
      .then((bootstrap) => {
        setData(bootstrap.page.analytics);
      })
      .catch((error) => {
        console.error('Failed to refresh studio analytics', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedRange === initialDays) {
      setData(initialAnalytics);
      return;
    }

    refreshAnalytics(selectedRange);
  }, [initialAnalytics, initialDays, refreshAnalytics, selectedRange]);

  useStudioRealtimeEvent('analytics.updated', () => {
    if (selectedRange === 28) {
      refreshAnalytics(28);
    }
  });

  const derived = useMemo(() => {
    if (!data) return null;

    const regularVideos = data.videos.filter((video) => video.category !== 'Shorts');
    const shorts = data.videos.filter((video) => video.category === 'Shorts');
    const totalDurationSeconds = data.videos.reduce((sum, video) => sum + parseDurationToSeconds(video.duration), 0);
    const averageDurationSeconds = data.totalVideos > 0 ? totalDurationSeconds / data.totalVideos : 0;
    const dailyMetrics = data.dailyMetrics.map((point) => ({
      ...point,
      views: Number(point.views || 0),
      likes: Number(point.likes || 0),
      dislikes: Number(point.dislikes || 0),
      comments: Number(point.comments || 0),
      shares: Number(point.shares || 0),
      label: formatDateLabel(point.date),
    }));
    const totalRecentViews = dailyMetrics.reduce((sum, point) => sum + Number(point.views || 0), 0);
    const watchHours = (averageDurationSeconds * totalRecentViews) / 3600;
    const formatBreakdown = data.formatViews.map((item) => ({ name: item.label, views: Number(item.value || 0) }));
    const publishedContentBreakdown = [
      {
        name: 'Videos',
        count: regularVideos.filter((video) => {
          const timestamp = Date.parse(String(video.rawCreatedAt || video.uploadedAt || 0));
          return Number.isFinite(timestamp) && timestamp >= Date.now() - selectedRange * 24 * 60 * 60 * 1000;
        }).length,
      },
      {
        name: 'Shorts',
        count: shorts.filter((video) => {
          const timestamp = Date.parse(String(video.rawCreatedAt || video.uploadedAt || 0));
          return Number.isFinite(timestamp) && timestamp >= Date.now() - selectedRange * 24 * 60 * 60 * 1000;
        }).length,
      },
    ];
    const latestVideo = [...data.videos].sort(
      (left, right) =>
        Date.parse(String(right.rawCreatedAt || right.uploadedAt || 0)) -
        Date.parse(String(left.rawCreatedAt || left.uploadedAt || 0))
    )[0];
    const subscriberTrend = data.subscriberHistory.map((point) => ({ ...point, label: formatDateLabel(point.date) }));
    const topVideos = [...data.videos].sort((left, right) => Number(right.viewCount || 0) - Number(left.viewCount || 0)).slice(0, 5);

    return {
      watchHours,
      dailyMetrics,
      formatBreakdown,
      publishedContentBreakdown,
      latestVideo,
      subscriberTrend,
      topVideos,
      totalRecentViews,
    };
  }, [data, selectedRange]);

  if (loading || !data || !derived) {
    return <AnalyticsLoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Channel analytics</h1>
          <div className="flex flex-wrap gap-2">
            {[
              'How did viewers find my content?',
              'How many new viewers did I reach?',
              'Summarize my latest video performance',
            ].map((chip) => (
              <Button
                key={chip}
                variant="secondary"
                className="rounded-full px-5 text-sm"
                onClick={() => openPrompt(chip)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {chip}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 self-start">
          <div className="space-y-3 rounded-[22px] border border-border/70 bg-card/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{formatRangeLabelForDays(selectedRange)}</p>
            <p className="mt-1 flex items-center justify-end gap-2 text-sm font-semibold">
              {data.range.label}
              <ChevronDown className="h-4 w-4" />
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {rangeOptions.map((days) => (
                <Button
                  key={days}
                  variant={selectedRange === days ? 'secondary' : 'ghost'}
                  className="rounded-full px-4"
                  onClick={() => setSelectedRange(days)}
                >
                  {days}D
                </Button>
              ))}
              <Button
                variant={selectedRange >= 3650 ? 'secondary' : 'ghost'}
                className="rounded-full px-4"
                onClick={() => setSelectedRange(3650)}
              >
                Lifetime
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/70 pb-3">
        {analyticsTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <AnalyticsShell title={`Your channel got ${derived.totalRecentViews.toLocaleString()} views in ${data.range.label.toLowerCase()}`} description="Overview">
            <div className="space-y-6">
              <div className="grid overflow-hidden rounded-[24px] border border-border/70 md:grid-cols-3">
                <div className="border-b border-border/70 px-6 py-5 md:border-b-0 md:border-r">
                  <p className="text-sm text-muted-foreground">Views</p>
                  <p className="mt-2 text-4xl font-semibold">{derived.totalRecentViews.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-emerald-500">Updating from real playback events</p>
                </div>
                <div className="border-b border-border/70 px-6 py-5 md:border-b-0 md:border-r">
                  <p className="text-sm text-muted-foreground">Watch time (hours)</p>
                  <p className="mt-2 text-4xl font-semibold">{derived.watchHours.toFixed(1)}</p>
                  <p className="mt-2 text-xs text-amber-500">Estimated from recorded views and durations</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                  <p className="mt-2 text-4xl font-semibold">{data.totalSubscribers.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Current total subscribers</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={derived.dailyMetrics}>
                    <defs>
                      <linearGradient id="channel-views-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 20 }} />
                    <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#channel-views-gradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AnalyticsShell>

          <div className="space-y-6">
            <AnalyticsShell title="Realtime" description="Updating live">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-sky-400"><Dot className="h-6 w-6 -ml-2" />Updating live</div>
                <div>
                  <p className="text-5xl font-semibold">{data.totalSubscribers.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Subscribers</p>
                </div>
                <Button asChild variant="secondary" className="rounded-full px-5">
                  <Link href="/studio/analytics/live-subscribers">See live count</Link>
                </Button>
                <div className="border-t border-border/70 pt-5">
                  <p className="text-4xl font-semibold">{data.viewsLast48Hours.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Views · Last 48 hours</p>
                  <div className="mt-5 h-24 rounded-[20px] border border-border/70 bg-secondary/30 p-4">
                    <div className="flex h-full items-end gap-2">
                      {derived.dailyMetrics.slice(-8).map((point) => (
                        <div key={point.date} className="flex flex-1 items-end">
                          <div className="w-full rounded-full bg-primary/80" style={{ height: `${Math.max((point.views / Math.max(data.viewsLast48Hours, 1)) * 100, point.views > 0 ? 12 : 4)}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </AnalyticsShell>

            {derived.latestVideo ? (
              <AnalyticsShell title="Latest content" description="Most recent upload">
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-[22px] border border-border/70">
                  <VideoThumbnail thumbnailUrl={derived.latestVideo.thumbnailUrl} videoUrl={derived.latestVideo.videoUrl} alt={derived.latestVideo.title} sizes="340px" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{derived.latestVideo.uploadedAt}</p>
                    <p className="mt-2 line-clamp-2 text-lg font-semibold">{derived.latestVideo.title}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{derived.latestVideo.viewCount.toLocaleString()} views</span>
                      <span>{derived.latestVideo.commentCount.toLocaleString()} comments</span>
                      <span>{derived.latestVideo.likes.toLocaleString()} likes</span>
                    </div>
                  </div>
                  <Button asChild variant="secondary" className="rounded-full px-5">
                    <Link href={`/studio/video/${derived.latestVideo.id}/analytics`}>See more</Link>
                  </Button>
                </div>
              </AnalyticsShell>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === 'content' ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <AnalyticsShell title={data.newViewers.toLocaleString()} description={`New viewers · ${data.range.label}`}>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Unique viewers who only watched once in this time window.</p>
                <SeeMoreButton href="/studio/analytics/advanced?report=audience" />
              </div>
            </AnalyticsShell>
            <AnalyticsShell title={data.returningViewers.toLocaleString()} description={`Regular viewers · ${data.range.label}`}>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Viewers who came back for more than one qualified watch in this period.</p>
                <SeeMoreButton href="/studio/analytics/advanced?report=audience" />
              </div>
            </AnalyticsShell>
            <AnalyticsShell title={data.uniqueViewers.toLocaleString()} description={`Unique viewers · ${data.range.label}`}>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Distinct signed-in viewers and anonymous viewer keys that watched your content.</p>
                <SeeMoreButton href="/studio/analytics/advanced?report=audience" />
              </div>
            </AnalyticsShell>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AnalyticsShell title="Views" description={data.range.label}>
              <div className="space-y-5">
                {derived.formatBreakdown.length > 0 ? derived.formatBreakdown.map((item, index) => {
                  const percentage = derived.totalRecentViews > 0 ? (item.views / derived.totalRecentViews) * 100 : 0;
                  return (
                    <div key={item.name} className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.name}</span>
                        <span>{item.views.toLocaleString()} ({formatPercent(percentage)})</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index] }} />
                      </div>
                    </div>
                  );
                }) : <AnalyticsPlaceholder title="View format breakdown is still warming up" description="As more qualified views are recorded, this report will split watch traffic between Videos and Shorts." />}
                {derived.formatBreakdown.length > 0 ? <SeeMoreButton href="/studio/analytics/advanced?report=formats" /> : null}
              </div>
            </AnalyticsShell>

            <AnalyticsShell title="Published content" description={data.range.label}>
              <div className="space-y-5">
                {derived.publishedContentBreakdown.map((item, index) => (
                  <div key={item.name} className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                      <div className="h-full rounded-full" style={{ width: `${Math.max((item.count / Math.max(derived.publishedContentBreakdown.reduce((sum, entry) => sum + entry.count, 0), 1)) * 100, item.count > 0 ? 8 : 0)}%`, backgroundColor: chartColors[index + 2] }} />
                    </div>
                  </div>
                ))}
                <SeeMoreButton href="/studio/analytics/advanced?report=top-content" />
              </div>
            </AnalyticsShell>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <EmptyAnalyticsPanel title="Typical views" subtitle="First 28 days" description="Typical-view baselines will become more precise as more uploads build a deeper history across Videos and Shorts." href="/studio/analytics/advanced?report=top-content" />
            <AnalyticsShell title="Viewers across formats" description={`Returning viewers · ${data.range.label}`}>
              {derived.formatBreakdown.length > 0 ? (
                <div className="grid gap-4">
                  <p className="text-sm text-muted-foreground">Your current audience is spending most of its tracked views on these content formats.</p>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={derived.formatBreakdown.map((item) => ({ name: item.name, views: item.views }))}>
                        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 20 }} />
                        <Bar dataKey="views" radius={[999, 999, 999, 999]}>
                          {derived.formatBreakdown.map((item, index) => (
                            <Cell key={item.name} fill={chartColors[index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <SeeMoreButton href="/studio/analytics/advanced?report=formats" />
                </div>
              ) : (
                <AnalyticsPlaceholder title="Not enough format data yet" description="This card will light up once your channel gathers more qualified views across multiple content types." />
              )}
            </AnalyticsShell>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AnalyticsShell title="Impressions and how they led to watch time" description={data.range.label}>
              <AnalyticsPlaceholder
                title="Impression tracking is not enabled yet"
                description="Waslmedia is recording qualified views, countries, and traffic sources, but impression and CTR reporting will appear after impression logging is added."
              />
            </AnalyticsShell>

            <AnalyticsShell title="How viewers find you" description={`Views · ${data.range.label}`}>
              <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="mx-auto h-[220px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.trafficSources} dataKey="value" nameKey="label" innerRadius={55} outerRadius={88} paddingAngle={3}>
                        {data.trafficSources.map((entry, index) => (
                          <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 20 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {data.trafficSources.length > 0 ? data.trafficSources.map((source, index) => {
                    const percentage = derived.totalRecentViews > 0 ? (source.value / derived.totalRecentViews) * 100 : 0;
                    return (
                      <div key={source.label} className="grid gap-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{source.label}</span>
                          <span>{formatPercent(percentage)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }} />
                        </div>
                      </div>
                    );
                  }) : <AnalyticsPlaceholder title="No traffic source data yet" description="Once viewers reach your channel from search, home, links, and watch-page recommendations, the source mix will appear here." />}
                  {data.trafficSources.length > 0 ? <SeeMoreButton href="/studio/analytics/advanced?report=traffic-sources" /> : null}
                </div>
              </div>
            </AnalyticsShell>
          </div>
        </div>
      ) : null}

      {activeTab === 'audience' ? (
        <div className="space-y-6">
          <AnalyticsShell title="Audience" description={data.range.label}>
            <div className="grid gap-8">
              <div className="grid overflow-hidden rounded-[24px] border border-border/70 md:grid-cols-2">
                <div className="border-b border-border/70 px-6 py-5 md:border-b-0 md:border-r">
                  <p className="text-sm text-muted-foreground">Monthly audience</p>
                  <p className="mt-2 text-4xl font-semibold">{data.uniqueViewers.toLocaleString()}</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                  <p className="mt-2 text-4xl font-semibold">{data.totalSubscribers.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={derived.subscriberTrend}>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 20 }} />
                    <Area type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={3} fill="rgba(168,85,247,0.14)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <SeeMoreButton href="/studio/analytics/live-subscribers" />
            </div>
          </AnalyticsShell>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AnalyticsShell title="Audience by watch behavior" description={data.range.label}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-5">
                  <p className="text-sm text-muted-foreground">New viewers</p>
                  <p className="mt-3 text-3xl font-semibold">{data.newViewers.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Viewers who watched once in this range.</p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-5">
                  <p className="text-sm text-muted-foreground">Returning viewers</p>
                  <p className="mt-3 text-3xl font-semibold">{data.returningViewers.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Viewers who came back for repeat sessions.</p>
                </div>
              </div>
            </AnalyticsShell>
            <AnalyticsShell title="Popular with different audiences" description={`Views · ${data.range.label}`}>
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {['New', 'Casual', 'Regular'].map((label, index) => (
                    <Button key={label} variant={index === 0 ? 'secondary' : 'ghost'} className="rounded-full px-4">
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.trafficSources[0]
                    ? `${data.trafficSources[0].label} is currently your strongest audience acquisition path.`
                    : 'Nothing to show for these dates.'}
                </p>
              </div>
            </AnalyticsShell>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AnalyticsShell title="Watch time from subscribers" description={`Watch time · ${data.range.label}`}>
              {data.subscriberSources.length > 0 ? (
                <div className="space-y-4">
                  {data.subscriberSources.map((source, index) => {
                    const total = data.subscriberSources.reduce((sum, item) => sum + item.value, 0);
                    const percentage = total > 0 ? (source.value / total) * 100 : 0;
                    return (
                      <div key={source.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{source.label}</span>
                          <span>{source.value.toLocaleString()}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <AnalyticsPlaceholder title="No subscriber source data yet" description="As viewers subscribe from watch pages, channel pages, search, and links, their source will appear here." />
              )}
            </AnalyticsShell>
            <EmptyAnalyticsPanel title="What your audience watches" subtitle="Last 7 days" description="Not enough eligible audience data to show this report." href="/studio/analytics/advanced?report=audience" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <EmptyAnalyticsPanel title="Age and gender" subtitle={`Views · ${data.range.label}`} description="Not enough demographic data to show this report." href="/studio/analytics/advanced?report=audience" />
            <AnalyticsShell title="Device type" description={`Watchers · ${data.range.label}`}>
              <div className="space-y-4">
                {data.deviceTypes.length > 0 ? data.deviceTypes.map((format, index) => {
                  const total = data.deviceTypes.reduce((sum, item) => sum + item.value, 0);
                  const percentage = total > 0 ? (format.value / total) * 100 : 0;
                  return (
                    <div key={format.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{format.label}</span>
                        <span>{format.value.toLocaleString()} viewers</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index + 1] }} />
                      </div>
                    </div>
                  );
                }) : <AnalyticsPlaceholder title="Device data is still building" description="Device type is recorded from actual playback sessions, so this report will fill out naturally as more viewers watch." />}
                {data.deviceTypes.length > 0 ? (
                  <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Most of your tracked viewers currently watch on <span className="font-medium text-foreground">{data.deviceTypes[0].label}</span>.
                  </div>
                ) : null}
              </div>
            </AnalyticsShell>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AnalyticsShell title="Countries of viewers" description={`Views · ${data.range.label}`}>
              {data.viewerCountries.length > 0 ? (
                <div className="space-y-4">
                  {data.viewerCountries.map((country, index) => {
                    const total = data.viewerCountries.reduce((sum, item) => sum + item.value, 0);
                    const percentage = total > 0 ? (country.value / total) * 100 : 0;
                    return (
                      <div key={country.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{country.label}</span>
                          <span>{country.value.toLocaleString()}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }} />
                      </div>
                    </div>
                  );
                })}
                  <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Top viewer country right now: <span className="font-medium text-foreground">{data.viewerCountries[0].label}</span>.
                  </div>
                </div>
              ) : (
                <AnalyticsPlaceholder title="No viewer country data yet" description="Countries appear once qualified viewers watch while sharing a location context or profile country." />
              )}
            </AnalyticsShell>
            <AnalyticsShell title="Countries of subscribers" description={`Subscribers · ${data.range.label}`}>
              {data.subscriberCountries.length > 0 ? (
                <div className="space-y-4">
                  {data.subscriberCountries.map((country, index) => {
                    const total = data.subscriberCountries.reduce((sum, item) => sum + item.value, 0);
                    const percentage = total > 0 ? (country.value / total) * 100 : 0;
                    return (
                      <div key={country.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{country.label}</span>
                          <span>{country.value.toLocaleString()}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <AnalyticsPlaceholder title="No subscriber country data yet" description="As viewers subscribe with known country context, this report will show where your subscriber growth is coming from." />
              )}
            </AnalyticsShell>
          </div>
        </div>
      ) : null}

      {activeTab === 'trends' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <AnalyticsShell title="Top performing content" description={`Views · ${data.range.label}`}>
            <div className="space-y-4">
              {derived.topVideos.map((video, index) => (
                <div key={video.id} className="flex items-center gap-4 rounded-[22px] border border-border/70 bg-secondary/20 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">{index + 1}</div>
                  <div className="relative aspect-video w-36 overflow-hidden rounded-2xl border border-border/70">
                        <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="144px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold">{video.title}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {video.viewCount.toLocaleString()}</span>
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {video.commentCount.toLocaleString()}</span>
                      <span className="inline-flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> {video.shareCount.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" className="rounded-full">
                    <Link href={`/studio/video/${video.id}/analytics`}>
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </AnalyticsShell>

          <AnalyticsShell title="Recent engagement" description="Latest comments and subscribers">
            <div className="space-y-4">
              {data.latestComments.slice(0, 3).map((comment) => (
                <div key={comment.id} className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
                  <p className="text-sm font-semibold">{comment.authorName}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{comment.text}</p>
                </div>
              ))}
              {data.recentSubscribers.slice(0, 3).map((subscriber) => (
                <div key={subscriber.id} className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
                  <p className="text-sm font-semibold">{subscriber.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Recently subscribed to your channel</p>
                </div>
              ))}
              {data.latestComments.length === 0 && data.recentSubscribers.length === 0 ? (
                <AnalyticsPlaceholder
                  title="Recent engagement will show up here"
                  description="New comments, shares, and subscriber activity will appear once viewers start interacting with your latest uploads."
                />
              ) : null}
            </div>
          </AnalyticsShell>
        </div>
      ) : null}
    </div>
  );
}
