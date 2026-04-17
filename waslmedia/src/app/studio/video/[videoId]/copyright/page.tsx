'use client';

import { Copyright } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';

export default function VideoWorkbenchCopyrightPage() {
  const { video } = useVideoWorkbench();

  if (!video) {
    return null;
  }

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Copyright"
        description="Review ownership-related context for this upload without leaving the dedicated video workspace."
      />

      <WorkbenchSurface>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copyright className="h-5 w-5 text-primary" />
            Current status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
            <p className="text-sm text-muted-foreground">Claim status</p>
            <p className="mt-2 text-2xl font-semibold">Clear</p>
            <p className="mt-2 text-xs text-muted-foreground">No internal copyright claims are attached to this content.</p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
            <p className="text-sm text-muted-foreground">Credits</p>
            <p className="mt-2 text-sm text-foreground/90">{video.credits || 'No credits saved'}</p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
            <p className="text-sm text-muted-foreground">Visibility</p>
            <p className="mt-2 text-2xl font-semibold capitalize">{video.visibility}</p>
          </div>
        </CardContent>
      </WorkbenchSurface>
    </div>
  );
}
