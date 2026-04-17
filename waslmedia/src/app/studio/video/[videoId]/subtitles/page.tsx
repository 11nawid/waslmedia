'use client';

import { Captions } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';

export default function VideoWorkbenchSubtitlesPage() {
  const { video } = useVideoWorkbench();

  if (!video) {
    return null;
  }

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Subtitles"
        description="Keep subtitle and chapter-ready notes close to the video workspace."
      />

      <WorkbenchSurface>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Captions className="h-5 w-5 text-primary" />
            Chapter and subtitle notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This workspace is ready for subtitle management. For now, your stored timestamps are shown here so editors can keep chapter markers and spoken cues together.
          </p>
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
            <pre className="whitespace-pre-wrap text-sm text-foreground/90">{video.timestamps || 'No subtitle or chapter notes saved yet.'}</pre>
          </div>
        </CardContent>
      </WorkbenchSurface>
    </div>
  );
}
