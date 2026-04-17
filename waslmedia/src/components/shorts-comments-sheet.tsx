
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CommentsSection } from './comments-section';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from './ui/scroll-area';
import { CommentInput } from './comment-input';

interface ShortsCommentsSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    videoId: string | null;
    commentCount: number;
}

export function ShortsCommentsSheet({ isOpen, onOpenChange, videoId, commentCount }: ShortsCommentsSheetProps) {
    const isMobile = useIsMobile();
    
    if (!videoId) return null;

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="flex h-[80vh] flex-col border-border/80 bg-card text-card-foreground">
                    <DrawerHeader className="text-left">
                        <DrawerTitle className="text-xl">Comments ({commentCount})</DrawerTitle>
                    </DrawerHeader>
                    <ScrollArea className="flex-1 px-4">
                       <CommentsSection videoId={videoId} showInput={false} />
                    </ScrollArea>
                    <div className="border-t border-border/80 bg-background/70 p-4">
                        <CommentInput videoId={videoId} parentType="video" />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent 
                className="flex w-full max-w-md flex-col border-l border-border/80 bg-card/95 p-0 text-card-foreground backdrop-blur-sm" 
                side="right"
                hideCloseButton={true}
            >
                <SheetHeader className="border-b border-border/80 bg-background/60 p-4 text-left">
                    <SheetTitle className="text-xl">Comments ({commentCount})</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1 p-4">
                    <CommentsSection videoId={videoId} />
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
