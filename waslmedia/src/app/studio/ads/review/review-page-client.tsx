'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiSend } from '@/lib/api/client';

type ReviewItem = {
  campaign: {
    id: string;
    headline: string;
    sponsor: string;
    domain: string;
    status: string;
    reviewStatus: string;
    totalPaise: number;
    placement: string;
  } | null;
  creative: {
    title: string;
    description: string;
    thumbnailUrl: string;
    websiteUrl: string;
    ctaLabel: string;
  } | null;
};

export function ReviewPageClient() {
  const { toast } = useToast();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ queue: ReviewItem[] }>('/api/studio/ads/review', { cache: 'no-store' })
      .then((payload) => setQueue(payload.queue))
      .catch(() => setQueue([]));
  }, []);

  const review = async (campaignId: string, action: 'approved' | 'rejected') => {
    setSubmittingId(campaignId);
    try {
      const payload = await apiSend<{ queue: ReviewItem[] }>(`/api/studio/ads/${campaignId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes[campaignId] || null }),
      });
      setQueue(payload.queue);
      toast({ title: `Campaign ${action}`, description: 'Review queue updated.' });
    } catch (error) {
      toast({ title: 'Review failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Ad review queue</h1>
        <p className="mt-2 text-muted-foreground">Approve or reject paid campaigns waiting for manual review.</p>
      </div>

      {queue.length === 0 ? (
        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle>No pending ads</CardTitle>
            <CardDescription>The manual review queue is empty right now.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {queue.map((item) => {
        if (!item.campaign || !item.creative) {
          return null;
        }

        return (
          <Card key={item.campaign.id} className="rounded-[28px] border-border/70">
            <CardHeader>
              <CardTitle className="text-2xl font-black tracking-tight">{item.campaign.headline}</CardTitle>
              <CardDescription>
                {item.campaign.sponsor} · {item.campaign.domain} · {item.campaign.placement} · Rs {(item.campaign.totalPaise / 100).toLocaleString('en-IN')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[24px] border border-border/70 bg-secondary/10">
                {item.creative.thumbnailUrl ? (
                  <Image src={item.creative.thumbnailUrl} alt={item.creative.title} width={1280} height={720} className="aspect-video w-full object-cover" unoptimized />
                ) : (
                  <div className="grid aspect-video place-items-center text-sm text-muted-foreground">No thumbnail</div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-border/70 bg-secondary/10 p-4">
                  <p className="font-semibold">{item.creative.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.creative.description}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Website: <span className="font-medium text-foreground">{item.creative.websiteUrl}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    CTA: <span className="font-medium text-foreground">{item.creative.ctaLabel}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Reviewer notes"
                    value={notes[item.campaign.id] || ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.campaign!.id]: event.target.value }))}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-full" onClick={() => review(item.campaign!.id, 'approved')} disabled={submittingId === item.campaign.id}>
                    Approve
                  </Button>
                  <Button variant="destructive" className="rounded-full" onClick={() => review(item.campaign!.id, 'rejected')} disabled={submittingId === item.campaign.id}>
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
