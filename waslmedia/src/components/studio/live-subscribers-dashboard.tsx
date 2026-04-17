'use client';

import Link from 'next/link';
import { ArrowLeft, Dot, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChannelAnalyticsData } from '@/hooks/use-channel-analytics-data';

function formatDateLabel(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function LiveSubscribersDashboard() {
  const { data, loading } = useChannelAnalyticsData();

  if (loading || !data) {
    return (
      <div className="space-y-8 p-6">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-[280px] rounded-[32px]" />
        <Skeleton className="h-[320px] rounded-[32px]" />
      </div>
    );
  }

  const trend = data.subscriberHistory.map((point) => ({
    ...point,
    label: formatDateLabel(point.date),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Dot className="h-8 w-8 -ml-3 text-sky-400" />
          <span className="text-sm text-sky-400">Updating live</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/studio/analytics">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/studio/analytics">
              <X className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="border-b border-border/70 pb-16 pt-6 text-center">
        <div className="mx-auto flex w-fit flex-col items-center gap-4">
          <Avatar className="h-20 w-20 border border-border/70">
            <AvatarImage src={data.channel?.profilePictureUrl || undefined} alt={data.channel?.name || 'Channel'} />
            <AvatarFallback>{data.channel?.name?.charAt(0) || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-2xl font-bold">{data.channel?.name || 'Your channel'}</p>
          </div>
          <div>
            <p className="text-8xl font-black tracking-tight">{data.totalSubscribers.toLocaleString()}</p>
            <p className="mt-3 text-2xl text-muted-foreground">Subscribers</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Channel growth</p>
              <p className="text-sm text-muted-foreground">Total subscribers</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-card/70 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {trend.length > 0 ? `${trend[0]?.label} - ${trend[trend.length - 1]?.label}` : 'Last 28 days'}
              </p>
              <p className="mt-1 text-sm font-semibold">Last 28 days</p>
            </div>
          </div>

          <div className="rounded-[32px] border border-border/70 bg-card/65 p-6">
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 20,
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#22c1f1" strokeWidth={3} fill="rgba(34,193,241,0.12)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
