
'use client';
import type { Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

interface LatestCommentsCardProps {
    comments: Comment[];
}

export function LatestCommentsCard({ comments }: LatestCommentsCardProps) {
    return (
        <Card className="overflow-hidden rounded-none border-0 border-b border-border/50 bg-transparent shadow-none sm:rounded-[30px] sm:border sm:border-border/70 sm:bg-gradient-to-br sm:from-background sm:via-background sm:to-secondary/20 sm:shadow-[0_18px_70px_-50px_rgba(15,23,42,0.5)]">
            <CardHeader className="px-0 pb-4 pt-0 sm:px-6 sm:pt-6">
                <CardTitle>Latest comments</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">Recent channel comments that need your attention.</p>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0 sm:px-6 sm:pb-6">
                {comments.length > 0 ? (
                    <div className="space-y-4">
                        {comments.map(comment => (
                            <div key={comment.id} className="border-b border-border/50 pb-4 text-sm sm:rounded-[22px] sm:border sm:border-border/70 sm:bg-background/80 sm:p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={comment.authorImageUrl} alt={comment.authorName} />
                                        <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold">{comment.authorName}</span>
                                    <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                                </div>
                                <p className="line-clamp-3 leading-6 text-foreground/90">{comment.text}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="border-l-2 border-dashed border-border/70 pl-4 text-sm text-muted-foreground sm:rounded-[22px] sm:border sm:bg-secondary/30 sm:px-4 sm:py-6">
                      No new comments to show right now.
                    </div>
                )}
                 <div className="pt-2">
                    <Button variant="secondary" asChild className="rounded-full">
                        <Link href="/studio/community">View all comments</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
