'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';

export default function VideoWorkbenchSettingsPage() {
  const { video, saveVideo, saving } = useVideoWorkbench();
  const { toast } = useToast();
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [showLikes, setShowLikes] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('private');
  const [audience, setAudience] = useState<'madeForKids' | 'notMadeForKids'>('notMadeForKids');

  useEffect(() => {
    if (!video) {
      return;
    }

    setCommentsEnabled(video.commentsEnabled);
    setShowLikes(video.showLikes);
    setVisibility(video.visibility || 'private');
    setAudience(video.audience || 'notMadeForKids');
  }, [video]);

  if (!video) {
    return null;
  }

  const handleSave = async () => {
    try {
      await saveVideo({
        commentsEnabled,
        showLikes,
        visibility,
        audience,
      });
      toast({ title: 'Video settings updated.' });
    } catch (error: any) {
      toast({ title: 'Could not update settings', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Video settings"
        description="Control viewer-facing behavior and moderation rules for this item."
        aside={
          <Button onClick={handleSave} className="rounded-full" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <WorkbenchSurface>
          <CardContent className="grid gap-6 p-6 lg:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={(value: 'public' | 'private' | 'unlisted') => setVisibility(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(value: 'madeForKids' | 'notMadeForKids') => setAudience(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notMadeForKids">Standard audience</SelectItem>
                    <SelectItem value="madeForKids">Made for kids</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
              <div className="flex items-start gap-4">
                <Checkbox id="commentsEnabled" checked={commentsEnabled} onCheckedChange={(checked) => setCommentsEnabled(Boolean(checked))} />
                <div>
                  <Label htmlFor="commentsEnabled" className="text-base font-semibold">Allow comments</Label>
                  <p className="mt-1 text-sm text-muted-foreground">Turn off comments if you want this video to stay read-only for viewers.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
              <div className="flex items-start gap-4">
                <Checkbox id="showLikes" checked={showLikes} onCheckedChange={(checked) => setShowLikes(Boolean(checked))} />
                <div>
                  <Label htmlFor="showLikes" className="text-base font-semibold">Show like counts publicly</Label>
                  <p className="mt-1 text-sm text-muted-foreground">Keep the like/dislike response visible on the watch page for viewers.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </WorkbenchSurface>

        <WorkbenchSurface>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current mode</p>
              <p className="mt-2 text-2xl font-semibold capitalize">{visibility}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              These settings affect the watch page, comments section, and how this content appears in feeds and Studio analytics.
            </p>
          </CardContent>
        </WorkbenchSurface>
      </div>
    </div>
  );
}
