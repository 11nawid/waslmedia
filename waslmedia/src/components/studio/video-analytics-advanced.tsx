'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarDays, ChartColumnBig, LineChart, ListFilter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchVideoAnalytics, subscribeToAnalyticsScope } from '@/lib/analytics/client';
import type { VideoAnalytics } from '@/lib/analytics/types';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { AdvancedAnalyticsShell, AdvancedControlButton, AdvancedControlGroup } from '@/components/studio/advanced-analytics-shell';
import { EmptyState } from '@/components/empty-state';

type VideoAdvancedReport = 'views' | 'traffic' | 'engagement' | 'audience' | 'countries' | 'devices' | 'activity';
type ChartMode = 'line' | 'bar';
type RangeValue = 7 | 28 | 90 | 'lifetime';
type VideoBreakdownRow = { label: string; value: number; meta?: string };

const chartColors = ['#8b7dff', '#6d64f4', '#bfa5ff', '#4d48d8', '#6d738c', '#4f5568'];
const reportMeta: Record<VideoAdvancedReport, { label: string; description: string }> = {
  views: { label: 'Views by content', description: 'Daily performance for this specific video or Short' },
  traffic: { label: 'How viewers found this content', description: 'Traffic source breakdown for this content' },
  engagement: { label: 'Engagement', description: 'Likes, comments, dislikes, and shares' },
  audience: { label: 'Audience', description: 'Unique and returning viewers for this content' },
  countries: { label: 'Viewer countries', description: 'Where this content is being watched from' },
  devices: { label: 'Device types', description: 'What devices viewers are using for this content' },
  activity: { label: 'Recent activity', description: 'Latest events collected for this content' },
};

function formatLabel(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function VideoAnalyticsAdvanced({ initialReport = 'views' }: { initialReport?: string }) {
  const { video } = useVideoWorkbench();
  const [selectedRange, setSelectedRange] = useState<RangeValue>(28);
  const [report, setReport] = useState<VideoAdvancedReport>(
    (Object.keys(reportMeta) as VideoAdvancedReport[]).includes(initialReport as VideoAdvancedReport)
      ? (initialReport as VideoAdvancedReport)
      : 'views'
  );
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [query, setQuery] = useState('');
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!video) {
      return;
    }

    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const nextAnalytics = await fetchVideoAnalytics(video.id, selectedRange);
        if (active) {
          setAnalytics(nextAnalytics);
        }
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
      (analytics?.dailyMetrics || []).map((point) => ({
        ...point,
        label: formatLabel(point.date),
        views: Number(point.views || 0),
        likes: Number(point.likes || 0),
        comments: Number(point.comments || 0),
        shares: Number(point.shares || 0),
      })),
    [analytics]
  );

  const breakdownRows = useMemo<VideoBreakdownRow[]>(() => {
    if (!analytics) {
      return [];
    }
    const normalizedQuery = query.trim().toLowerCase();

    if (report === 'traffic') {
      return analytics.trafficSources.filter((row) => !normalizedQuery || row.label.toLowerCase().includes(normalizedQuery));
    }
    if (report === 'countries') {
      return analytics.viewerCountries.filter((row) => !normalizedQuery || row.label.toLowerCase().includes(normalizedQuery));
    }
    if (report === 'devices') {
      return analytics.deviceTypes.filter((row) => !normalizedQuery || row.label.toLowerCase().includes(normalizedQuery));
    }
    if (report === 'engagement') {
      return [
        { label: 'Likes', value: analytics.totals.likes },
        { label: 'Comments', value: analytics.totals.comments },
        { label: 'Shares', value: analytics.totals.shares },
        { label: 'Dislikes', value: analytics.totals.dislikes },
      ].filter((row) => !normalizedQuery || row.label.toLowerCase().includes(normalizedQuery));
    }
    if (report === 'audience') {
      return [
        { label: 'Unique viewers', value: analytics.uniqueViewers },
        { label: 'Returning viewers', value: analytics.returningViewers },
      ].filter((row) => !normalizedQuery || row.label.toLowerCase().includes(normalizedQuery));
    }
    if (report === 'activity') {
      return analytics.recentActivity
        .filter((row) => !normalizedQuery || row.label.toLowerCase().includes(normalizedQuery))
        .map((row) => ({ label: row.label, value: row.value, meta: row.createdAt }));
    }

    return chartData
      .filter((row) => !normalizedQuery || row.label.toLowerCase().includes(normalizedQuery))
      .map((row) => ({ label: row.label, value: row.views }));
  }, [analytics, chartData, query, report]);

  return (
    <AdvancedAnalyticsShell
      backHref={video ? `/studio/video/${video.id}/analytics` : '/studio/analytics'}
      title="Advanced mode"
      subtitle={reportMeta[report].description}
      controls={
        <>
          <AdvancedControlGroup label="Controls">
            {Object.entries(reportMeta).map(([value, meta]) => (
              <AdvancedControlButton key={value} label="Report" value={meta.label} active={report === value} onClick={() => setReport(value as VideoAdvancedReport)} />
            ))}
          </AdvancedControlGroup>
          <AdvancedControlGroup label="Date range">
            {([7, 28, 90, 'lifetime'] as RangeValue[]).map((rangeValue) => (
              <AdvancedControlButton
                key={rangeValue}
                label="Range"
                value={rangeValue === 'lifetime' ? 'Lifetime' : `Last ${rangeValue} days`}
                icon={<CalendarDays className="h-4 w-4" />}
                active={selectedRange === rangeValue}
                onClick={() => setSelectedRange(rangeValue)}
              />
            ))}
          </AdvancedControlGroup>
          <AdvancedControlGroup label="Chart style">
            <AdvancedControlButton label="View" value="Line chart" icon={<LineChart className="h-4 w-4" />} active={chartMode === 'line'} onClick={() => setChartMode('line')} />
            <AdvancedControlButton label="View" value="Bar chart" icon={<ChartColumnBig className="h-4 w-4" />} active={chartMode === 'bar'} onClick={() => setChartMode('bar')} />
          </AdvancedControlGroup>
          <AdvancedControlGroup label="Filter">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search in this report" className="rounded-[20px] border-border/70 pl-11" />
            </div>
            <AdvancedControlButton label="Grouping" value="Daily" icon={<ListFilter className="h-4 w-4" />} onClick={() => {}} />
          </AdvancedControlGroup>
        </>
      }
    >
      {loading || !analytics || !video ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="rounded-[30px] border-border/70 bg-card/70"><CardContent className="h-[520px]" /></Card>
          <Card className="rounded-[30px] border-border/70 bg-card/70"><CardContent className="h-[520px]" /></Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className="rounded-[30px] border-border/70 bg-card/70">
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl">{reportMeta[report].label}</CardTitle>
                <p className="text-sm text-muted-foreground">{video.title}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartMode === 'bar' ? (
                      <BarChart data={chartData}>
                        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 20 }} />
                        <Bar dataKey={report === 'engagement' ? 'likes' : 'views'} radius={[14, 14, 0, 0]}>
                          {chartData.map((item, index) => (
                            <Cell key={`${item.label}-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="advanced-video-views" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b7dff" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#8b7dff" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 20 }} />
                        <Area type="monotone" dataKey={report === 'engagement' ? 'likes' : 'views'} stroke="#8b7dff" fill="url(#advanced-video-views)" strokeWidth={3} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle className="text-2xl">Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {breakdownRows.length > 0 ? breakdownRows.map((row, index) => {
                  const total = breakdownRows.reduce((sum, item) => sum + Number(item.value || 0), 0);
                  const percentage = total > 0 ? (Number(row.value || 0) / total) * 100 : 0;
                  return (
                    <div key={`${row.label}-${index}`} className="space-y-2 rounded-[24px] border border-border/70 bg-secondary/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{row.label}</p>
                        <p className="text-sm text-muted-foreground">{Number(row.value || 0).toLocaleString()}</p>
                      </div>
                      {row.meta ? <p className="text-xs text-muted-foreground">{row.meta}</p> : null}
                      <div className="h-3 overflow-hidden rounded-full bg-background/80">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }} />
                      </div>
                    </div>
                  );
                }) : (
                  <EmptyState icon={BarChart3} title="No rows match this report" description="Try a different report or clear the filter to see more advanced analytics rows." compact className="px-0 py-12" />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[30px] border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="text-2xl">Detailed rows</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-[22px] border border-border/70 text-sm">
                <thead className="bg-secondary/30 text-muted-foreground">
                  <tr>
                    <th className="border-b border-border/70 px-4 py-3 text-left">Label</th>
                    <th className="border-b border-border/70 px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.slice(0, 20).map((row, index) => (
                    <tr key={`${row.label}-${index}-table`}>
                      <td className="border-b border-border/70 px-4 py-3">{row.label}</td>
                      <td className="border-b border-border/70 px-4 py-3 text-right">{Number(row.value || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </AdvancedAnalyticsShell>
  );
}
