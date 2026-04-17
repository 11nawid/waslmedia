'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarDays, ChartColumnBig, Filter, LineChart, ListFilter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChannelAnalyticsData } from '@/hooks/use-channel-analytics-data';
import { AdvancedAnalyticsShell, AdvancedControlButton, AdvancedControlGroup } from '@/components/studio/advanced-analytics-shell';
import { EmptyState } from '@/components/empty-state';
import { VideoThumbnail } from '@/components/video-thumbnail';

type ChannelAdvancedReport =
  | 'top-content'
  | 'traffic-sources'
  | 'audience'
  | 'countries'
  | 'devices'
  | 'formats';
type ChartMode = 'line' | 'bar';
type Granularity = 'daily' | 'weekly';

const chartColors = ['#8b7dff', '#6d64f4', '#bfa5ff', '#4d48d8', '#6d738c', '#4f5568'];
type BreakdownRow = { label: string; value: number; video?: { thumbnailUrl: string; title: string } };
const reportMeta: Record<ChannelAdvancedReport, { label: string; description: string }> = {
  'top-content': { label: 'Top content', description: 'Views by content in the selected range' },
  'traffic-sources': { label: 'Traffic sources', description: 'How viewers are finding your channel' },
  audience: { label: 'Audience', description: 'Viewer and subscriber behavior' },
  countries: { label: 'Countries', description: 'Where your viewers and subscribers are coming from' },
  devices: { label: 'Devices', description: 'How viewers are watching your channel' },
  formats: { label: 'Formats', description: 'How Videos and Shorts contribute to your channel views' },
};

function formatLabel(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupDailyMetrics<T extends { date: string; views: number; likes: number; comments: number; shares: number }>(
  points: T[],
  granularity: Granularity
) {
  if (granularity === 'daily') {
    return points.map((point) => ({ ...point, label: formatLabel(point.date) }));
  }

  const grouped = new Map<string, { label: string; views: number; likes: number; comments: number; shares: number }>();
  points.forEach((point) => {
    const date = new Date(point.date);
    const weekKey = `${date.getFullYear()}-${Math.ceil((date.getDate() + (new Date(date.getFullYear(), date.getMonth(), 1).getDay() || 7) - 1) / 7)}`;
    const current = grouped.get(weekKey) || { label: `Week of ${formatLabel(point.date)}`, views: 0, likes: 0, comments: 0, shares: 0 };
    current.views += Number(point.views || 0);
    current.likes += Number(point.likes || 0);
    current.comments += Number(point.comments || 0);
    current.shares += Number(point.shares || 0);
    grouped.set(weekKey, current);
  });
  return Array.from(grouped.values());
}

export function ChannelAnalyticsAdvanced({ initialReport = 'top-content' }: { initialReport?: string }) {
  const [selectedRange, setSelectedRange] = useState(28);
  const [report, setReport] = useState<ChannelAdvancedReport>(
    (Object.keys(reportMeta) as ChannelAdvancedReport[]).includes(initialReport as ChannelAdvancedReport)
      ? (initialReport as ChannelAdvancedReport)
      : 'top-content'
  );
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [query, setQuery] = useState('');
  const { data, loading } = useChannelAnalyticsData(selectedRange);

  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }
    return groupDailyMetrics(
      data.dailyMetrics.map((point) => ({
        ...point,
        views: Number(point.views || 0),
        likes: Number(point.likes || 0),
        comments: Number(point.comments || 0),
        shares: Number(point.shares || 0),
      })),
      granularity
    );
  }, [data, granularity]);

  const filteredVideos = useMemo(() => {
    if (!data) {
      return [];
    }
    const normalizedQuery = query.trim().toLowerCase();
    return [...data.videos]
      .filter((video) => !normalizedQuery || video.title.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => Number(right.viewCount || 0) - Number(left.viewCount || 0));
  }, [data, query]);

  const breakdownRows = useMemo<BreakdownRow[]>(() => {
    if (!data) {
      return [];
    }

    if (report === 'traffic-sources') return data.trafficSources;
    if (report === 'devices') return data.deviceTypes;
    if (report === 'countries') return data.viewerCountries;
    if (report === 'formats') return data.formatViews;
    if (report === 'audience') {
      return [
        { label: 'Unique viewers', value: data.uniqueViewers },
        { label: 'Returning viewers', value: data.returningViewers },
        { label: 'New viewers', value: data.newViewers },
        { label: 'Subscribers', value: data.totalSubscribers },
      ];
    }

      return filteredVideos.map((video) => ({
        label: video.title,
        value: Number(video.viewCount || 0),
        video: { thumbnailUrl: video.thumbnailUrl, title: video.title },
      }));
  }, [data, filteredVideos, report]);

  const chartKey = report === 'audience' ? 'views' : 'views';

  return (
    <AdvancedAnalyticsShell
      backHref="/studio/analytics"
      title="Advanced mode"
      subtitle={reportMeta[report].description}
      controls={
        <>
          <AdvancedControlGroup label="Report">
            {Object.entries(reportMeta).map(([value, meta]) => (
              <AdvancedControlButton
                key={value}
                label="Report"
                value={meta.label}
                active={report === value}
                onClick={() => setReport(value as ChannelAdvancedReport)}
              />
            ))}
          </AdvancedControlGroup>
          <AdvancedControlGroup label="Date range">
            {[7, 28, 90, 365].map((days) => (
              <AdvancedControlButton
                key={days}
                label="Range"
                value={`Last ${days} days`}
                icon={<CalendarDays className="h-4 w-4" />}
                active={selectedRange === days}
                onClick={() => setSelectedRange(days)}
              />
            ))}
          </AdvancedControlGroup>
          <AdvancedControlGroup label="Chart style">
            <AdvancedControlButton label="View" value="Line chart" active={chartMode === 'line'} icon={<LineChart className="h-4 w-4" />} onClick={() => setChartMode('line')} />
            <AdvancedControlButton label="View" value="Bar chart" active={chartMode === 'bar'} icon={<ChartColumnBig className="h-4 w-4" />} onClick={() => setChartMode('bar')} />
          </AdvancedControlGroup>
          <AdvancedControlGroup label="Breakdown">
            <AdvancedControlButton label="Granularity" value={granularity === 'daily' ? 'Daily' : 'Weekly'} icon={<ListFilter className="h-4 w-4" />} onClick={() => setGranularity((current) => (current === 'daily' ? 'weekly' : 'daily'))} />
          </AdvancedControlGroup>
          <AdvancedControlGroup label="Filter">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for content"
                className="rounded-[20px] border-border/70 pl-11"
              />
            </div>
          </AdvancedControlGroup>
        </>
      }
    >
      {loading || !data ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="rounded-[30px] border-border/70 bg-card/70"><CardContent className="h-[520px]" /></Card>
          <Card className="rounded-[30px] border-border/70 bg-card/70"><CardContent className="h-[520px]" /></Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className="rounded-[30px] border-border/70 bg-card/70">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{reportMeta[report].label}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{reportMeta[report].description}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  {granularity === 'daily' ? 'Daily' : 'Weekly'}
                </div>
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
                        <Bar dataKey={chartKey} radius={[14, 14, 0, 0]}>
                          {chartData.map((item, index) => (
                            <Cell key={`${item.label}-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="advanced-channel-views" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b7dff" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#8b7dff" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 20 }} />
                        <Area type="monotone" dataKey={chartKey} stroke="#8b7dff" fill="url(#advanced-channel-views)" strokeWidth={3} />
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
                    <div key={`${row.label}-${index}`} className="space-y-3 rounded-[24px] border border-border/70 bg-secondary/25 p-4">
                      {row.video ? (
                        <div className="flex gap-3">
                          <div className="relative aspect-video w-28 overflow-hidden rounded-2xl border border-border/70">
                        <VideoThumbnail thumbnailUrl={row.video.thumbnailUrl} alt={row.video.title} sizes="112px" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 font-medium">{row.video.title}</p>
                            <p className="mt-2 text-sm text-muted-foreground">{Number(row.value || 0).toLocaleString()} views</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{row.label}</p>
                          <p className="text-sm text-muted-foreground">{Number(row.value || 0).toLocaleString()}</p>
                        </div>
                      )}
                      <div className="h-3 overflow-hidden rounded-full bg-background/80">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }} />
                      </div>
                    </div>
                  );
                }) : (
                  <EmptyState
                    icon={BarChart3}
                    title="No matching analytics rows"
                    description="Try a different report or clear the content filter to see more rows here."
                    compact
                    className="px-0 py-12"
                  />
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
                    <th className="border-b border-border/70 px-4 py-3 text-left">Content / label</th>
                    <th className="border-b border-border/70 px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.slice(0, 12).map((row, index) => (
                    <tr key={`${row.label}-table-${index}`} className="bg-card/40">
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
