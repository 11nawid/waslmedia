'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChannelAnalytics } from '@/lib/analytics/types';
import { BarChart3, Globe2, MonitorSmartphone, Users } from 'lucide-react';

function BreakdownList({
  title,
  icon: Icon,
  items,
  suffix = '',
}: {
  title: string;
  icon: typeof Globe2;
  items: { label: string; value: number }[];
  suffix?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="border-b border-border/50 pb-4 sm:rounded-[24px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:rounded-2xl">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} tracked` : 'Waiting for more data'}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.slice(0, 4).map((item) => {
            const share = total > 0 ? Math.max(4, Math.round((item.value / total) * 100)) : 0;
            return (
              <div key={`${title}-${item.label}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-foreground/90">{item.label}</span>
                  <span className="shrink-0 font-medium text-foreground">
                    {item.value.toLocaleString()}
                    {suffix}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-l-2 border-dashed border-border/70 pl-4 text-sm text-muted-foreground sm:rounded-[20px] sm:border sm:bg-secondary/30 sm:px-4 sm:py-6">
          Not enough audience data yet. This panel will fill in as Waslmedia records more views.
        </div>
      )}
    </div>
  );
}

export function PerformanceInsightsCard({ analytics }: { analytics: ChannelAnalytics }) {
  return (
    <Card className="overflow-hidden rounded-none border-0 border-b border-border/50 bg-transparent shadow-none sm:rounded-[30px] sm:border sm:border-border/70 sm:bg-gradient-to-br sm:from-background sm:via-background sm:to-secondary/20 sm:shadow-[0_18px_70px_-50px_rgba(15,23,42,0.5)]">
      <CardHeader className="px-0 pb-4 pt-0 sm:px-6 sm:pt-6">
        <CardTitle>Performance insights</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Real-time audience signals from your latest Waslmedia channel activity.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 px-0 pb-0 sm:px-6 sm:pb-6 md:grid-cols-2">
        <BreakdownList title="Top traffic sources" icon={Users} items={analytics.trafficSources} />
        <BreakdownList title="Viewer countries" icon={Globe2} items={analytics.viewerCountries} />
        <BreakdownList title="Device mix" icon={MonitorSmartphone} items={analytics.deviceTypes} />
        <BreakdownList title="Formats watched" icon={BarChart3} items={analytics.formatViews} />
      </CardContent>
    </Card>
  );
}
