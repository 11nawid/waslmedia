
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLiveCounterStore } from '@/hooks/use-live-counter-store';
import type { ChannelAnalytics } from '@/lib/analytics/types';
import { ArrowUp, Eye, Radio } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsSummaryCardProps {
    analytics: ChannelAnalytics;
}

export function AnalyticsSummaryCard({ analytics }: AnalyticsSummaryCardProps) {
    const { onOpen } = useLiveCounterStore();
    
    const subsInLast28Days = analytics.subscriberHistory
        .slice(-28)
        .reduce((sum, day) => sum + (day.change || 0), 0);

    return (
        <Card className="overflow-hidden rounded-none border-0 border-b border-border/50 bg-transparent shadow-none sm:rounded-[30px] sm:border sm:border-border/70 sm:bg-gradient-to-br sm:from-background sm:via-background sm:to-secondary/25 sm:shadow-[0_18px_70px_-50px_rgba(15,23,42,0.5)]">
            <CardHeader className="px-0 pb-4 pt-0 sm:px-6 sm:pt-6">
                <CardTitle>Channel analytics</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">Live totals and recent movement from the last 28 days.</p>
            </CardHeader>
            <CardContent className="space-y-5 px-0 pb-0 sm:px-6 sm:pb-6">
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="border-b border-border/50 pb-4 sm:rounded-[24px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                        <p className="text-sm text-muted-foreground">Current subscribers</p>
                        <p className="mt-2 text-4xl font-bold">{analytics.totalSubscribers.toLocaleString()}</p>
                        {subsInLast28Days !== 0 && (
                            <p className="mt-2 flex items-center text-sm text-emerald-500">
                                <ArrowUp className="w-4 h-4 mr-1" />
                                {subsInLast28Days > 0 && `+`}{subsInLast28Days.toLocaleString()} in last 28 days
                            </p>
                        )}
                    </div>
                    <div className="border-b border-border/50 pb-4 sm:rounded-[24px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                        <p className="text-sm text-muted-foreground">Total views</p>
                        <p className="mt-2 text-4xl font-bold">{analytics.totalViews.toLocaleString()}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{analytics.viewsLast48Hours.toLocaleString()} views in the last 48 hours</p>
                    </div>
                    <div className="pb-2 sm:rounded-[24px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                        <p className="text-sm text-muted-foreground">Audience activity</p>
                        <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Unique viewers</span>
                                <span className="font-semibold">{analytics.uniqueViewers.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Returning viewers</span>
                                <span className="font-semibold">{analytics.returningViewers.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Published videos</span>
                                <span className="font-semibold">{analytics.totalVideos.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4 sm:rounded-[24px] sm:border sm:border-border/70 sm:bg-background/70 sm:p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 sm:rounded-2xl">
                            <Radio className="h-5 w-5 animate-pulse text-red-500" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Realtime updates</p>
                            <p className="text-xs text-muted-foreground">Open the live counter for subscriber movement and recent view activity.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="rounded-full" onClick={onOpen}>
                            <Radio className="mr-2 h-4 w-4 text-red-500" />
                            See live count
                        </Button>
                        <Button variant="ghost" asChild className="rounded-full">
                            <Link href="/studio/analytics">
                                <Eye className="mr-2 h-4 w-4" />
                                Full analytics
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
