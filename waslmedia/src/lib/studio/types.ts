import type { Channel } from '@/lib/types';

export interface ChannelSettings extends Channel {}

export interface UploadDefaults {
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  category: string;
  tags: string;
}
