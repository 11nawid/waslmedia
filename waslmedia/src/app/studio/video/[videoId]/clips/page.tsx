'use client';

import { Scissors } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';

function parseClipIdeas(rawTimestamps: string) {
  return rawTimestamps
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function VideoWorkbenchClipsPage() {
  const { video } = useVideoWorkbench();

  if (!video) {
    return null;
  }

  const clipIdeas = parseClipIdeas(video.timestamps || '');

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Clips"
        description="Use saved timestamps and highlights as the foundation for future clip creation."
      />

      <WorkbenchSurface>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Suggested clip moments
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {clipIdeas.length > 0 ? (
            clipIdeas.map((idea, index) => (
              <div key={`${idea}-${index}`} className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Clip idea {index + 1}</p>
                <p className="mt-2 text-sm text-foreground/90">{idea}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Add timestamps in the Details page to generate clip ideas for editors and short-form follow-up content.
            </p>
          )}
        </CardContent>
      </WorkbenchSurface>
    </div>
  );
}
