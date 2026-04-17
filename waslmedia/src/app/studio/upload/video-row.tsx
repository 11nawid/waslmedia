'use client';

import Link from 'next/link';
import { BarChart3, Eye, MessageSquare, Pencil, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Video } from '@/lib/types';
import { VideoActionsMenu } from './video-actions-menu';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { buildVideoHref, isShortVideo } from '@/lib/video-links';

interface VideoRowProps {
  video: Video;
  isSelected: boolean;
  onSelectionChange: (id: string, checked: boolean) => void;
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
  showSelectionControl?: boolean;
}

export function VideoRow({
  video,
  isSelected,
  onSelectionChange,
  onEdit,
  onDelete,
  showSelectionControl = true,
}: VideoRowProps) {
  const isMobile = useIsMobile();
  const liveHref = buildVideoHref(video);
  const contentLabel = isShortVideo(video) ? 'Short' : 'Video';

  if (isMobile) {
    return (
      <div className="flex items-start gap-3 border-b p-3">
        {showSelectionControl ? (
          <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectionChange(video.id, !!checked)} className="mt-1 flex-shrink-0" />
        ) : null}
        <div className="relative w-24 h-14 shrink-0 bg-secondary rounded-md">
          <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="96px" className="rounded-md" />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <p className="line-clamp-2 font-medium text-sm break-words">{video.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{contentLabel} • {video.uploadedAt}</p>
          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mt-2 text-xs text-muted-foreground">
            <span>{video.viewCount} views</span>
            <span>&bull;</span>
            <span>{video.commentCount || 0} comments</span>
            <span>&bull;</span>
            <span>{video.likes} likes</span>
          </div>
        </div>
        <div className="flex-shrink-0 self-start">
          <VideoActionsMenu
            video={video}
            analyticsHref={`/studio/video/${video.id}/analytics`}
            shareHref={liveHref}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_minmax(300px,4fr)_repeat(6,minmax(100px,1fr))] items-center px-4 py-2 border-b text-sm group">
      <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectionChange(video.id, !!checked)} />
      <div className="pl-4 flex items-center gap-4">
        <div className="relative w-32 h-20 shrink-0">
          <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="128px" className="rounded-md" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="line-clamp-2 hover:text-foreground/80 break-words">{video.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={liveHref} className="hover:text-foreground p-2 rounded-full hover:bg-secondary" target="_blank">
              <Eye className="w-4 h-4" />
            </Link>
            <Link href={`/studio/video/${video.id}/analytics`} className="hover:text-foreground p-2 rounded-full hover:bg-secondary" aria-label={`Open analytics for ${video.title}`}>
              <BarChart3 className="w-4 h-4" />
            </Link>
            <button className="hover:text-foreground p-2 rounded-full hover:bg-secondary" onClick={() => onEdit(video)}>
              <Pencil className="w-4 h-4" />
            </button>
            <VideoActionsMenu
              video={video}
              analyticsHref={`/studio/video/${video.id}/analytics`}
              shareHref={liveHref}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>
      <div className="capitalize">{video.visibility}</div>
      <div>{video.audience === 'madeForKids' ? 'Made for Kids' : 'None'}</div>
      <div>{video.uploadedAt}</div>
      <div>{video.viewCount}</div>
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span>{video.commentCount || 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <ThumbsUp className="w-4 h-4 text-muted-foreground" /> <span>{video.likes}</span>
        <ThumbsDown className="w-4 h-4 text-muted-foreground" /> <span>{video.dislikes}</span>
      </div>
    </div>
  );
}
