
'use client';
import type { Channel } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { toggleSubscription } from '@/lib/data';
import { Check } from 'lucide-react';
import { getViewerAnalyticsContext } from '@/lib/analytics/viewer-context';
import { buildChannelHref } from '@/lib/channel-links';

interface ChannelListCardProps {
    channel: Channel;
    variant?: 'default' | 'search';
}


export function ChannelListCard({ channel, variant = 'default' }: ChannelListCardProps) {
    const { userProfile: user, isSubscribedTo } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const channelHref = buildChannelHref(channel.handle || channel.id);

    const isSubscribed = user ? isSubscribedTo(channel.id) : false;

    const handleSubscribe = async () => {
        if (!user) {
            toast({ title: 'Please sign in to subscribe.' });
            return;
        }

        startTransition(async () => {
            try {
                const analyticsContext = getViewerAnalyticsContext('search');
                await toggleSubscription(channel.id, user.uid, {
                    sourceContext: analyticsContext.source,
                    subscriberCountry: analyticsContext.viewerCountry,
                });
            } catch (error) {
                toast({ title: "Something went wrong", variant: "destructive" });
            }
        });
    };

    function formatSubscribers(count: number): string {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
        if (count >= 1000) return `${Math.floor(count/1000)}K subscribers`;
        return `${count} subscribers`;
    }
    
    const SubscribeButton = () => (
        <Button 
            onClick={handleSubscribe} 
            disabled={isPending || !user}
            variant={isSubscribed ? 'secondary' : 'primary'} 
            className="rounded-full"
        >
            {isSubscribed ? <><Check className="mr-2" /> Subscribed</> : 'Subscribe'}
        </Button>
    )

    if (variant === 'search') {
         return (
             <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-6">
                    <Link href={channelHref}>
                        <Avatar className="w-24 h-24">
                            <AvatarImage src={channel.profilePictureUrl} alt={channel.name} data-ai-hint="channel avatar" />
                            <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div>
                        <Link href={channelHref} className="text-xl font-semibold">{channel.name}</Link>
                        <p className="text-sm text-muted-foreground">{channel.handle} &bull; {formatSubscribers(channel.subscriberCount)}</p>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{channel.description || 'No description available.'}</p>
                    </div>
                </div>
                <SubscribeButton />
            </div>
         )
    }

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
                <Link href={channelHref}>
                    <Avatar className="w-20 h-20">
                        <AvatarImage src={channel.profilePictureUrl} alt={channel.name} data-ai-hint="channel avatar" />
                        <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Link>
                <div>
                    <Link href={channelHref} className="text-lg font-semibold">{channel.name}</Link>
                    <p className="text-sm text-muted-foreground">{channel.handle}</p>
                    <p className="text-sm text-muted-foreground">{formatSubscribers(channel.subscriberCount)}</p>
                </div>
            </div>
            <SubscribeButton />
        </div>
    )
}
