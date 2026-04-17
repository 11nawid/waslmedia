
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlaylistById } from '@/lib/data';
import type { Playlist, Video } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { GripVertical, Play, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from './ui/button';
import { VideoThumbnail } from './video-thumbnail';
import { buildVideoHref } from '@/lib/video-links';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';

interface PlaylistPanelProps {
  playlistId: string;
  currentVideoId: string;
}

function PlaylistVideoCard({ video, playlistId, isActive, index }: { video: Video; playlistId: string; isActive: boolean, index: number }) {
    const watchLink = buildVideoHref(video, { playlistId });

    return (
        <Link href={watchLink} className={cn("flex gap-2 p-2 rounded-lg hover:bg-secondary/70 group", isActive && "bg-secondary")}>
            <div className="flex items-center justify-center text-muted-foreground pr-2">
                {isActive ? (
                    <Play className="w-4 h-4 text-foreground" />
                ) : (
                    <span className="text-xs group-hover:hidden">{index + 1}</span>
                )}
                 <GripVertical className="w-5 h-5 hidden group-hover:block" />
            </div>
            <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md">
                <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="96px" />
                 <Badge variant="secondary" className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5">{video.duration}</Badge>
            </div>
            <div className="flex flex-col">
                <h3 className={cn("text-sm font-medium leading-tight line-clamp-2", isActive && "text-foreground")}>{video.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{video.channelName}</p>
            </div>
        </Link>
    );
}

export function PlaylistPanel({ playlistId, currentVideoId }: PlaylistPanelProps) {
    const [playlist, setPlaylist] = useState<(Playlist & { videos: Video[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        setLoading(true);
        trackGlobalForegroundTask(getPlaylistById(playlistId))
            .then(data => {
                setPlaylist(data);
            })
            .finally(() => setLoading(false));
    }, [playlistId]);

    if (loading) {
        return <Skeleton className="w-full h-auto min-h-[400px] rounded-lg" />;
    }

    if (!playlist) {
        return <div className="p-4 text-center text-muted-foreground border rounded-xl">Playlist not found.</div>;
    }
    
    const currentIndex = playlist.videos.findIndex(v => v.id === currentVideoId);

    return (
         <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="bg-secondary/50 rounded-xl border border-border w-full"
        >
            <div className="flex justify-between items-start p-4">
                <div>
                    <h2 className="text-xl font-bold line-clamp-2">{playlist.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{playlist.creatorName}</p>
                    <p className="text-sm text-muted-foreground">{currentIndex + 1} / {playlist.videoCount}</p>
                </div>
                 <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <ChevronDown className={cn("w-5 h-5 transition-transform", isOpen && "rotate-180")} />
                        <span className="sr-only">Toggle playlist</span>
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
                 <ScrollArea className="h-[400px] border-t border-border/50">
                    <div className="p-2 space-y-1">
                        {playlist.videos.map((video, index) => (
                            <PlaylistVideoCard 
                                key={video.id} 
                                video={video}
                                playlistId={playlistId} 
                                isActive={video.id === currentVideoId} 
                                index={index}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </CollapsibleContent>
        </Collapsible>
    );
}
