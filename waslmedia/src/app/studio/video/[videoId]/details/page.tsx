'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';
import { buildVideoHref } from '@/lib/video-links';

export default function VideoWorkbenchDetailsPage() {
  const { video, saveVideo, saving } = useVideoWorkbench();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('People & Blogs');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('private');
  const [audience, setAudience] = useState<'madeForKids' | 'notMadeForKids'>('notMadeForKids');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [timestamps, setTimestamps] = useState('');
  const [credits, setCredits] = useState('');

  useEffect(() => {
    if (!video) {
      return;
    }

    setTitle(video.title);
    setDescription(video.description || '');
    setCategory(video.category || 'People & Blogs');
    setVisibility(video.visibility || 'private');
    setAudience(video.audience || 'notMadeForKids');
    setTags(video.tags.join(', '));
    setSummary(video.summary || '');
    setTimestamps(video.timestamps || '');
    setCredits(video.credits || '');
  }, [video]);

  if (!video) {
    return null;
  }

  const handleSave = async () => {
    try {
      await saveVideo({
        title,
        description,
        category,
        visibility,
        audience,
        tags: tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        summary,
        timestamps,
        credits,
      });
      toast({ title: 'Video details saved.' });
    } catch (error: any) {
      toast({ title: 'Could not save details', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Video details"
        description="Update the title, description, audience settings, and metadata that shape how this content appears across the app."
        aside={
          <div className="flex items-center gap-3">
            <Button variant="secondary" asChild className="rounded-full">
              <Link href={buildVideoHref(video)} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                View live
              </Link>
            </Button>
            <Button onClick={handleSave} className="rounded-full" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <WorkbenchSurface>
          <CardContent className="grid gap-6 p-6 lg:p-8">
            <div className="grid gap-2">
              <Label htmlFor="video-title">Title</Label>
              <Input id="video-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="video-description">Description</Label>
              <Textarea
                id="video-description"
                rows={7}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
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

            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="video-category">Category</Label>
                <Input id="video-category" value={category} onChange={(event) => setCategory(event.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="video-tags">Tags</Label>
                <Input id="video-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="travel, vlog, tutorial" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="video-summary">Summary</Label>
              <Textarea id="video-summary" rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="video-timestamps">Timestamps</Label>
              <Textarea
                id="video-timestamps"
                rows={5}
                value={timestamps}
                onChange={(event) => setTimestamps(event.target.value)}
                placeholder="0:00 Intro&#10;0:45 Main moment&#10;2:10 Final takeaway"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="video-credits">Credits</Label>
              <Textarea id="video-credits" rows={3} value={credits} onChange={(event) => setCredits(event.target.value)} />
            </div>
          </CardContent>
        </WorkbenchSurface>

        <WorkbenchSurface>
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</p>
              <p className="mt-2 text-2xl font-semibold capitalize">{visibility}</p>
              <p className="mt-1 text-sm text-muted-foreground">Published {video.uploadedAt}</p>
            </div>
            <div className="rounded-2xl bg-secondary/30 p-4">
              <p className="text-sm text-muted-foreground">Performance snapshot</p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Views</span>
                  <span className="font-medium">{video.viewCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Comments</span>
                  <span className="font-medium">{video.commentCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Likes</span>
                  <span className="font-medium">{video.likes.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </WorkbenchSurface>
      </div>
    </div>
  );
}
