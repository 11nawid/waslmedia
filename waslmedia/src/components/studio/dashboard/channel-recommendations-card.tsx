'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChannelAnalytics } from '@/lib/analytics/types';
import type { Comment, Video } from '@/lib/types';
import { ArrowRight, Lightbulb, MessageCircleMore, Sparkles } from 'lucide-react';

type Recommendation = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

function buildRecommendations(input: {
  analytics: ChannelAnalytics;
  latestVideo: Video | null;
  latestComments: Comment[];
}): Recommendation[] {
  const { analytics, latestVideo, latestComments } = input;
  const recommendations: Recommendation[] = [];
  const topSource = analytics.trafficSources[0];
  const topCountry = analytics.viewerCountries[0];

  if (analytics.totalVideos === 0) {
    recommendations.push({
      title: 'Upload your first video',
      description: 'Publishing one real upload is the fastest way to unlock richer analytics and viewer patterns.',
      href: '/studio/upload',
      cta: 'Open content',
    });
  }

  if (latestComments.length > 0) {
    recommendations.push({
      title: 'Reply to recent comments',
      description: `${latestComments.length} recent comments are waiting. Responding quickly can help turn viewers into subscribers.`,
      href: '/studio/community',
      cta: 'Open community',
    });
  }

  if (topSource && /direct|unknown/i.test(topSource.label)) {
    recommendations.push({
      title: 'Grow beyond direct traffic',
      description:
        'Most current views are coming from direct or unknown sources. Improve titles, descriptions, and channel branding so Waslmedia search can surface your content more often.',
      href: '/studio/customisation',
      cta: 'Improve channel',
    });
  }

  if (analytics.viewsLast48Hours === 0 && latestVideo) {
    recommendations.push({
      title: 'Reactivate your latest upload',
      description: `Your latest video "${latestVideo.title}" has no views in the last 48 hours. Sharing it again or refreshing its title can help restart momentum.`,
      href: `/studio/video/${latestVideo.id}/analytics`,
      cta: 'View analytics',
    });
  }

  if (topCountry) {
    recommendations.push({
      title: 'Double down on your strongest audience',
      description: `${topCountry.label} is currently your top viewer country. Consider titles, captions, or posting times that match that audience more closely.`,
      href: '/studio/analytics',
      cta: 'See audience data',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Keep posting consistently',
      description: 'Your dashboard is healthy. Continue publishing, checking analytics, and responding to viewers to build momentum.',
      href: '/studio/analytics',
      cta: 'Open analytics',
    });
  }

  return recommendations.slice(0, 4);
}

export function ChannelRecommendationsCard({
  analytics,
  latestVideo,
  latestComments,
}: {
  analytics: ChannelAnalytics;
  latestVideo: Video | null;
  latestComments: Comment[];
}) {
  const recommendations = buildRecommendations({ analytics, latestVideo, latestComments });

  return (
    <Card className="overflow-hidden rounded-none border-0 border-b border-border/50 bg-transparent shadow-none sm:rounded-[30px] sm:border sm:border-border/70 sm:bg-gradient-to-br sm:from-background sm:via-background sm:to-primary/5 sm:shadow-[0_18px_70px_-50px_rgba(15,23,42,0.5)]">
      <CardHeader className="px-0 pb-4 pt-0 sm:px-6 sm:pt-6">
        <CardTitle>Recommended next moves</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Suggestions built from your real Waslmedia views, comments, uploads, and audience signals.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0 sm:px-6 sm:pb-6">
        {recommendations.map((recommendation, index) => (
          <div
            key={`${recommendation.title}-${index}`}
            className="border-b border-border/50 pb-4 sm:rounded-[24px] sm:border sm:border-border/70 sm:bg-background/85 sm:p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{recommendation.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{recommendation.description}</p>
            </div>
            <Button asChild variant="ghost" className="h-auto rounded-full px-3 py-2 text-primary hover:bg-primary/10">
              <Link href={recommendation.href}>
                {recommendation.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
