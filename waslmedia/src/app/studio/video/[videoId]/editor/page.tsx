'use client';

import Link from 'next/link';
import { ExternalLink, PencilLine, Scissors, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';
import { buildVideoHref } from '@/lib/video-links';

export default function VideoWorkbenchEditorPage() {
  const { video } = useVideoWorkbench();

  if (!video) {
    return null;
  }

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Editor"
        description="A focused workspace for creative follow-up actions around this video."
        aside={
          <Button variant="secondary" asChild className="rounded-full">
            <Link href={buildVideoHref(video)} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview watch page
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <WorkbenchSurface>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PencilLine className="h-5 w-5 text-primary" />
              Metadata polish
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tighten the title, description, timestamps, and credits from the Details page to improve clarity and discoverability.
          </CardContent>
        </WorkbenchSurface>

        <WorkbenchSurface>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Scissors className="h-5 w-5 text-primary" />
              Clip planning
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the Clips section to map moments worth repurposing into short-form follow-up content.
          </CardContent>
        </WorkbenchSurface>

        <WorkbenchSurface>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <WandSparkles className="h-5 w-5 text-primary" />
              Iteration loop
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pair the analytics and comments sections together to decide what to improve in the next revision or next upload.
          </CardContent>
        </WorkbenchSurface>
      </div>
    </div>
  );
}
