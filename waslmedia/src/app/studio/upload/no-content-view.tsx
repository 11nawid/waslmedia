'use client';

import { Clapperboard } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

export function NoContentView({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <EmptyState
      icon={Clapperboard}
      title="No content yet"
      description="Start building your channel by uploading your first video or Short. Your content will appear here as soon as you publish it."
      actionLabel="Upload content"
      onAction={onUploadClick}
      compact
      className="border-none bg-transparent shadow-none"
    />
  );
}
