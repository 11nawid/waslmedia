'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/video-card';
import type { Video } from '@/lib/types';

type FilterKey = 'all' | 'related' | 'for-you' | 'channel' | 'recent';

const filterChips: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'related', label: 'Related' },
  { key: 'for-you', label: 'For you' },
  { key: 'channel', label: 'From channel' },
  { key: 'recent', label: 'Recently uploaded' },
];

function getRelatedScore(candidate: Video, currentVideo: Video) {
  let score = 0;

  if (candidate.authorId && currentVideo.authorId && candidate.authorId === currentVideo.authorId) {
    score += 10;
  }

  if (candidate.category && currentVideo.category && candidate.category === currentVideo.category) {
    score += 6;
  }

  const sharedTags = candidate.tags.filter((tag) => currentVideo.tags.includes(tag)).length;
  score += sharedTags * 3;

  if (candidate.language && currentVideo.language && candidate.language === currentVideo.language) {
    score += 2;
  }

  return score;
}

function sortByRecent(a: Video, b: Video) {
  const aTime = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
  const bTime = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;
  return bTime - aTime;
}

export function WatchSuggestionsPanel({
  currentVideo,
  suggestedVideos,
}: {
  currentVideo: Video;
  suggestedVideos: Video[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filteredVideos = useMemo(() => {
    const base = suggestedVideos.filter((video) => video.id !== currentVideo.id);

    if (activeFilter === 'all') {
      return base;
    }

    if (activeFilter === 'channel') {
      const channelMatches = base.filter(
        (video) => video.authorId && currentVideo.authorId && video.authorId === currentVideo.authorId
      );
      return channelMatches.length > 0 ? channelMatches : base;
    }

    if (activeFilter === 'recent') {
      return [...base].sort(sortByRecent);
    }

    if (activeFilter === 'related') {
      const related = base
        .map((video) => ({ video, score: getRelatedScore(video, currentVideo) }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || right.video.viewCount - left.video.viewCount)
        .map((entry) => entry.video);

      return related.length > 0 ? related : base;
    }

    return [...base].sort((left, right) => {
      const rightScore = getRelatedScore(right, currentVideo) + right.viewCount / 1000;
      const leftScore = getRelatedScore(left, currentVideo) + left.viewCount / 1000;
      return rightScore - leftScore;
    });
  }, [activeFilter, currentVideo, suggestedVideos]);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {filterChips.map((chip) => (
          <Button
            key={chip.key}
            variant={chip.key === activeFilter ? 'primary' : 'secondary'}
            className="shrink-0 rounded-lg"
            onClick={() => setActiveFilter(chip.key)}
          >
            {chip.label}
          </Button>
        ))}
      </div>
      <div className="space-y-4">
        {filteredVideos.map((video) => (
          <VideoCard key={`${activeFilter}-${video.id}`} video={video} variant="list" sourceContext={`watch-${activeFilter}`} />
        ))}
      </div>
    </>
  );
}
