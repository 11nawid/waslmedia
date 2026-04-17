import type { Channel } from '@/lib/types';
import { mapChannel, mapPlaylist } from '@/server/mappers/content';
import {
  countPublicChannelSettingsByQuery,
  findChannelSettingsByHandleOrId,
  listPublicChannelSettingsByQuery,
} from '@/server/repositories/channel-settings';
import { listPublicPlaylistRowsByUser, listPlaylistVideoRows } from '@/server/repositories/playlists';
import { getPostsByAuthorId } from '@/server/services/posts';
import { getVideosByAuthorId, hydrateVideoIds } from '@/server/services/videos';

export async function getPublicChannelByHandleOrId(handleOrId: string): Promise<Channel | null> {
  const row = await findChannelSettingsByHandleOrId(handleOrId);

  if (!row) {
    return null;
  }

  const [videos, posts, playlistRows] = await Promise.all([
    getVideosByAuthorId(row.user_id, { publicOnly: true }),
    getPostsByAuthorId(row.user_id),
    listPublicPlaylistRowsByUser(row.user_id),
  ]);

  const playlists = await Promise.all(
    playlistRows.map(async (playlistRow) => {
      const playlistVideos = await listPlaylistVideoRows(playlistRow.id);
      const videos = await hydrateVideoIds(playlistVideos.map((entry) => entry.videoId));

      return mapPlaylist(playlistRow, {
        videoIds: videos.map((video) => video.id),
        videoCount: videos.length,
        firstVideoThumbnail: videos[0]?.thumbnailUrl,
      });
    })
  );

  const totalViews = videos.reduce((sum, video) => sum + video.viewCount, 0);

  return mapChannel(row, {
    videos,
    posts,
    playlists,
    totalViews,
  });
}

export async function getPaginatedPublicChannelsByQuery(query: string, options?: { limit?: number; offset?: number }) {
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 50));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listPublicChannelSettingsByQuery(query, limit, offset),
    countPublicChannelSettingsByQuery(query),
  ]);

  return {
    channels: rows.map((row) => mapChannel(row)),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}
