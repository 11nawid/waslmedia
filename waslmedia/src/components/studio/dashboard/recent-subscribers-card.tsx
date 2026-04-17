
'use client';

import type { Channel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { useRecentSubscribersDialog } from '@/hooks/use-recent-subscribers-dialog-store';
import { buildChannelHref } from '@/lib/channel-links';

interface RecentSubscribersCardProps {
    subscribers: Channel[];
}

export function RecentSubscribersCard({ subscribers }: RecentSubscribersCardProps) {
    const { onOpen } = useRecentSubscribersDialog();
    const visibleSubscribers = subscribers.slice(0, 4);

    return (
        <Card className="overflow-hidden rounded-none border-0 border-b border-border/50 bg-transparent shadow-none sm:rounded-[30px] sm:border sm:border-border/70 sm:bg-gradient-to-br sm:from-background sm:via-background sm:to-secondary/20 sm:shadow-[0_18px_70px_-50px_rgba(15,23,42,0.5)]">
            <CardHeader className="px-0 pb-4 pt-0 sm:px-6 sm:pt-6">
                <CardTitle>Recent subscribers</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">People who recently subscribed to your channel.</p>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0 sm:px-6 sm:pb-6">
                {subscribers.length > 0 ? (
                    <div className="space-y-4">
                        {visibleSubscribers.map(subscriber => (
                            <div key={subscriber.id} className="flex items-center justify-between border-b border-border/50 pb-4 sm:rounded-[22px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                                <Link href={buildChannelHref(subscriber.handle || subscriber.id)} className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={subscriber.profilePictureUrl} alt={subscriber.name} />
                                        <AvatarFallback>{subscriber.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm">{subscriber.name}</p>
                                        <p className="text-xs text-muted-foreground">{subscriber.subscriberCount.toLocaleString()} subscribers</p>
                                    </div>
                                </Link>
                                <Button variant="primary" size="sm" className="rounded-full">Subscribe</Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="border-l-2 border-dashed border-border/70 pl-4 text-sm text-muted-foreground sm:rounded-[22px] sm:border sm:bg-secondary/30 sm:px-4 sm:py-6">
                      No active subscribers to show right now.
                    </div>
                )}
                <div className="pt-2">
                    <Button variant="secondary" onClick={onOpen} className="rounded-full">
                      See all
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
