
'use client';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { VideoThumbnail } from '@/components/video-thumbnail';

interface LatestVideoCardProps {
    video: Video;
}

export function LatestVideoCard({ video }: LatestVideoCardProps) {
    const { onOpen } = useUploadDialog();
    return (
        <Card className="overflow-hidden rounded-none border-0 border-b border-border/50 bg-transparent shadow-none sm:rounded-[30px] sm:border sm:border-border/70 sm:bg-gradient-to-br sm:from-background sm:via-background sm:to-secondary/25 sm:shadow-[0_18px_70px_-50px_rgba(15,23,42,0.5)]">
            <CardHeader className="px-0 pb-4 pt-0 sm:px-6 sm:pt-6">
                <CardTitle>Latest video performance</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">Your newest upload with live performance metrics and quick actions.</p>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0 sm:px-6 sm:pb-6">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-background/80 sm:rounded-[24px] sm:border sm:border-border/70">
                    <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="300px" />
                </div>
                <div>
                    <h3 className="line-clamp-2 font-semibold">{video.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Uploaded {video.uploadedAt}. Use this panel to jump into analytics or quickly update the video.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="border-b border-border/50 pb-4 sm:rounded-[22px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Views</p>
                        <p className="mt-2 text-2xl font-bold">{video.viewCount.toLocaleString()}</p>
                    </div>
                    <div className="border-b border-border/50 pb-4 sm:rounded-[22px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">Likes</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold">{video.likes.toLocaleString()}</p>
                    </div>
                     <div className="pb-4 sm:rounded-[22px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">Comments</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold">{video.commentCount.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex flex-wrap justify-between gap-3 pt-2">
                    <Button variant="secondary" asChild className="rounded-full">
                        <Link href={`/studio/video/${video.id}/analytics`}>Go to video analytics</Link>
                    </Button>
                     <Button variant="ghost" className="rounded-full" onClick={() => onOpen(video)}>
                        Edit video
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
