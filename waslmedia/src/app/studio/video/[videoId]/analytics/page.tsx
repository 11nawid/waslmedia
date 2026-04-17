'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Clock3, MessageSquare, Share2, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchVideoAnalytics, subscribeToAnalyticsScope } from '@/lib/analytics/client';
import type { VideoAnalytics } from '@/lib/analytics/types';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';
import { EmptyState } from '@/components/empty-state';

const analyticsTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'reach', label: 'Reach' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'audience', label: 'Audience' },
] as const;

type AnalyticsTab = (typeof analyticsTabs)[number]['value'];
const rangeOptions = [7, 28, 90] as const;

function MetricTile({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border-border/70 px-6 py-5 lg:border-r last:border-r-0">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function AnalyticsLoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-14 w-[420px]" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[520px] rounded-[28px]" />
        <Skeleton className="h-[320px] rounded-[28px]" />
      </div>
    </div>
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
    <div className="rounded-[24px] border border-dashed border-border/70 bg-secondary/15 px-6 py-8">
      <EmptyState
        icon={BarChart3}
        title={title}
        description={description}
        compact
        className="max-w-none px-0 py-0"
      />
    </div>
  );
}

export default function VideoWorkbenchAnalyticsPage() {
  const { video } = useVideoWorkbench();
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [selectedRange, setSelectedRange] = useState<string | number>('lifetime');

  useEffect(() => {
    if (!video) {
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const nextAnalytics = await fetchVideoAnalytics(video.id, selectedRange);
        if (!active) {
          return;
        }
        setAnalytics(nextAnalytics);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load().catch(console.error);
    const unsubscribe = subscribeToAnalyticsScope(`analytics:video:${video.id}`, () => {
      load().catch(console.error);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [selectedRange, video]);

  const chartData = useMemo(
    () =>
      (analytics?.dailyMetrics || []).map((point, index) => ({
        ...point,
        day: index + 1,
        label:
          point.date === analytics?.dailyMetrics?.[analytics.dailyMetrics.length - 1]?.date
            ? 'Now'
            : new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })),
    [analytics]
  );

  const realtimeViews = useMemo(
    () => (analytics?.dailyMetrics || []).slice(-2).reduce((sum, point) => sum + point.views, 0),
    [analytics]
  );

  const publishedSummary = video?.uploadedAt ? `${video.uploadedAt} - Now` : 'Since published';
  const selectedViews = chartData.reduce((sum, point) => sum + point.views, 0);

  if (!video || loading || !analytics) {
    return <AnalyticsLoadingState />;
  }

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Video analytics"
        description={`Track how ${video.category === 'Shorts' ? 'this Short' : 'this video'} is performing across views, engagement, and audience response.`}
        aside={
          <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Date range</p>
            <p className="mt-1 text-sm font-semibold">{analytics.range.label}</p>
            <p className="text-xs text-muted-foreground">{selectedRange === 'lifetime' ? publishedSummary : `Showing the last ${selectedRange} days`}</p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {rangeOptions.map((days) => (
                <Button key={days} variant={selectedRange === days ? 'secondary' : 'ghost'} className="rounded-full px-4" onClick={() => setSelectedRange(days)}>
                  {days}D
                </Button>
              ))}
              <Button variant={selectedRange === 'lifetime' ? 'secondary' : 'ghost'} className="rounded-full px-4" onClick={() => setSelectedRange('lifetime')}>
                Lifetime
              </Button>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-border/70 pb-2">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <WorkbenchSurface>
              <CardHeader className="pb-0">
                <CardTitle className="text-4xl leading-tight">
              This {video.category === 'Shorts' ? 'Short' : 'video'} has gotten {(selectedRange === 'lifetime' ? analytics.totals.views : selectedViews).toLocaleString()} views in {analytics.range.label.toLowerCase()}
                </CardTitle>
              </CardHeader>
          <CardContent className="pt-6">
            {activeTab === 'overview' ? (
              <div className="space-y-8">
                <div className="grid gap-0 overflow-hidden rounded-[24px] border border-border/70 lg:grid-cols-3">
                  <MetricTile title="Views" value={(selectedRange === 'lifetime' ? analytics.totals.views : selectedViews).toLocaleString()} description="Qualified views recorded for this selected range." />
                  <MetricTile title="Unique viewers" value={analytics.uniqueViewers.toLocaleString()} description="Different viewers counted from signed-in and anonymous viewer keys." />
                  <MetricTile title="Returning viewers" value={analytics.returningViewers.toLocaleString()} description="Viewers who came back for repeat watch sessions." />
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="workbench-views" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 20,
                        }}
                      />
                      <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#workbench-views)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}

            {activeTab === 'reach' ? (
              <div className="grid items-start gap-4 md:grid-cols-2">
                <WorkbenchSurface className="rounded-[24px]">
                  <CardHeader>
                    <CardTitle className="text-xl">Reach signals</CardTitle>
                    <CardDescription>How viewers are discovering and sharing this content.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-secondary/40 p-4">
                      <p className="text-sm text-muted-foreground">Shares</p>
                      <p className="mt-2 text-3xl font-semibold">{analytics.totals.shares.toLocaleString()}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{analytics.rates.shareRate}% share rate</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/40 p-4">
                      <p className="text-sm text-muted-foreground">Visibility</p>
                      <p className="mt-2 text-3xl font-semibold capitalize">{video.visibility}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Current publishing status</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/40 p-4">
                      <p className="text-sm text-muted-foreground">Recent momentum</p>
                      <p className="mt-2 text-3xl font-semibold">{realtimeViews.toLocaleString()}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Views in the last 48 hours</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/40 p-4">
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="mt-2 text-3xl font-semibold">{video.category}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Current discovery context</p>
                    </div>
                  </CardContent>
                </WorkbenchSurface>
                <WorkbenchSurface className="rounded-[24px]">
                  <CardHeader>
                    <CardTitle className="text-xl">How viewers found this content</CardTitle>
                    <CardDescription>Qualified view sources in {analytics.range.label.toLowerCase()}.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analytics.trafficSources.length > 0 ? analytics.trafficSources.map((source, index) => {
                      const total = analytics.trafficSources.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? (source.value / total) * 100 : 0;
                      return (
                        <div key={source.label} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{source.label}</span>
                            <span>{source.value.toLocaleString()}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                            <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: ['#8b7dff', '#6d64f4', '#bfa5ff', '#4d48d8'][index % 4] }} />
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-muted-foreground">Traffic sources will appear here after more qualified views are recorded.</p>}
                  </CardContent>
                </WorkbenchSurface>
              </div>
            ) : null}

            {activeTab === 'engagement' ? (
              <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
                  <ThumbsUp className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-3xl font-semibold">{analytics.totals.likes.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{analytics.rates.likeRate}% like rate</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
                  <ThumbsDown className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-3xl font-semibold">{analytics.totals.dislikes.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{analytics.rates.dislikeRate}% dislike rate</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-3xl font-semibold">{analytics.totals.comments.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{analytics.rates.commentRate}% comment rate</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
                  <Share2 className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-3xl font-semibold">{analytics.totals.shares.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{analytics.rates.engagementRate}% total engagement</p>
                </div>
              </div>
            ) : null}

            {activeTab === 'audience' ? (
              <div className="grid items-start gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-6">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-xl font-semibold">Audience readiness</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This workspace now tracks unique viewers, repeat viewers, source attribution, and viewer countries for this content.
                  </p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-6">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-xl font-semibold">Current audience settings</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>Audience restriction: {video.audience === 'madeForKids' ? 'Made for kids' : 'Standard audience'}</li>
                    <li>Comments: {video.commentsEnabled ? 'Enabled' : 'Disabled'}</li>
                    <li>Likes visibility: {video.showLikes ? 'Visible to viewers' : 'Hidden from viewers'}</li>
                  </ul>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-6">
                  <h3 className="text-xl font-semibold">Viewer countries</h3>
                  <div className="mt-4 space-y-3">
                    {analytics.viewerCountries.length > 0 ? analytics.viewerCountries.map((country, index) => {
                      const total = analytics.viewerCountries.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? (country.value / total) * 100 : 0;
                      return (
                        <div key={country.label} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{country.label}</span>
                            <span>{country.value.toLocaleString()}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                            <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: ['#8b7dff', '#6d64f4', '#bfa5ff', '#4d48d8'][index % 4] }} />
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-muted-foreground">Viewer countries will appear after viewers watch with a known location context.</p>}
                  </div>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-6">
                  <h3 className="text-xl font-semibold">Device types</h3>
                  <div className="mt-4 space-y-3">
                    {analytics.deviceTypes.length > 0 ? analytics.deviceTypes.map((device, index) => {
                      const total = analytics.deviceTypes.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? (device.value / total) * 100 : 0;
                      return (
                        <div key={device.label} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{device.label}</span>
                            <span>{device.value.toLocaleString()}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-secondary/60">
                            <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: ['#8b7dff', '#6d64f4', '#bfa5ff', '#4d48d8'][index % 4] }} />
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-muted-foreground">Device-type reporting will appear as more viewers watch this content.</p>}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </WorkbenchSurface>

        <div className="space-y-6">
          <WorkbenchSurface>
            <CardHeader>
              <CardTitle>Realtime</CardTitle>
              <CardDescription>Updating live</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-4xl font-semibold">{realtimeViews.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Views in the last 48 hours</p>
              {chartData.some((point) => point.views > 0) ? (
                <div className="h-24 rounded-2xl border border-border/70 bg-secondary/30 p-4">
                  <div className="flex h-full items-end gap-2">
                    {chartData.slice(-8).map((point) => (
                      <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-full bg-primary/70"
                          style={{ height: `${Math.max((point.views / Math.max(realtimeViews, 1)) * 100, point.views > 0 ? 12 : 4)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <AnalyticsPlaceholder
                  title="Realtime playback is still quiet"
                  description="As viewers watch this content, a compact 48-hour bar chart will appear here."
                />
              )}
              <Button asChild className="rounded-full px-5">
                <Link href={`/studio/video/${video.id}/analytics/advanced?report=views`}>See more</Link>
              </Button>
            </CardContent>
          </WorkbenchSurface>

          <WorkbenchSurface className="rounded-[28px]" >
            <CardHeader id="recent-activity">
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest signals collected for this content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.recentActivity.length > 0 ? (
                analytics.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="rounded-2xl bg-secondary/30 px-4 py-3">
                    <p className="text-sm font-medium">{activity.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{activity.createdAt}</p>
                  </div>
                ))
              ) : (
                <AnalyticsPlaceholder
                  title="Recent activity will show up here"
                  description="New comments, shares, and viewer activity will appear once this content starts getting engagement."
                />
              )}
              <Button asChild variant="secondary" className="rounded-full px-5">
                <Link href={`/studio/video/${video.id}/analytics/advanced?report=activity`}>See more</Link>
              </Button>
            </CardContent>
          </WorkbenchSurface>
        </div>
      </div>
    </div>
  );
}
