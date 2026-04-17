import { mapPlaylist } from '@/server/mappers/content';
import {
  addVideoToPlaylist,
  createPlaylistRow,
  deletePlaylistRow,
  findPlaylistRowById,
  listPlaylistIdsContainingVideo,
  listPlaylistRowsByUser,
  listPlaylistVideoRows,
  removeVideoFromPlaylist,
  updatePlaylistRow,
} from '@/server/repositories/playlists';
import { hydrateVideoIds } from '@/server/services/videos';

async function buildPlaylist(row: NonNullable<Awaited<ReturnType<typeof findPlaylistRowById>>>) {
  const playlistVideos = await listPlaylistVideoRows(row.id);
  const videos = await hydrateVideoIds(playlistVideos.map((entry) => entry.videoId));

  return {
    ...mapPlaylist(row, {
      videoIds: videos.map((video) => video.id),
      videoCount: videos.length,
      firstVideoThumbnail: videos[0]?.thumbnailUrl,
    }),
    videos,
  };
}

export async function getUserPlaylists(userId: string) {
  const rows = await listPlaylistRowsByUser(userId);
  return Promise.all(
    rows.map(async (row) => {
      const playlistVideos = await listPlaylistVideoRows(row.id);
      const videos = await hydrateVideoIds(playlistVideos.map((entry) => entry.videoId));
      return mapPlaylist(row, {
        videoIds: videos.map((video) => video.id),
        videoCount: videos.length,
        firstVideoThumbnail: videos[0]?.thumbnailUrl,
      });
    })
  );
}

export async function getPlaylistById(playlistId: string) {
  const row = await findPlaylistRowById(playlistId);
  if (!row) {
    return null;
  }

  return buildPlaylist(row);
}

export async function createPlaylist(input: {
  userId: string;
  name: string;
  visibility: 'public' | 'private' | 'unlisted';
  description?: string;
  firstVideoId?: string;
}) {
  const id = await createPlaylistRow({
    creatorId: input.userId,
    name: input.name,
    description: input.description,
    visibility: input.visibility,
  });

  if (input.firstVideoId) {
    await addVideoToPlaylist(id, input.firstVideoId);
  }

  return getPlaylistById(id);
}

export async function updatePlaylist(
  userId: string,
  playlistId: string,
  updates: { name: string; description?: string; visibility: 'public' | 'private' | 'unlisted' }
) {
  await updatePlaylistRow(playlistId, userId, updates);
  return getPlaylistById(playlistId);
}

export async function deletePlaylist(userId: string, playlistId: string) {
  await deletePlaylistRow(playlistId, userId);
}

export async function toggleVideoInPlaylist(userId: string, playlistId: string, videoId: string, isInPlaylist: boolean) {
  const playlist = await findPlaylistRowById(playlistId);
  if (!playlist || playlist.creator_id !== userId) {
    throw new Error('PLAYLIST_NOT_FOUND');
  }

  if (isInPlaylist) {
    await removeVideoFromPlaylist(playlistId, videoId);
  } else {
    await addVideoToPlaylist(playlistId, videoId);
  }

  return getPlaylistById(playlistId);
}

export async function bulkAddToPlaylists(userId: string, playlistId: string, videoIds: string[]) {
  const playlist = await findPlaylistRowById(playlistId);
  if (!playlist || playlist.creator_id !== userId) {
    throw new Error('PLAYLIST_NOT_FOUND');
  }

  for (const videoId of videoIds) {
    await addVideoToPlaylist(playlistId, videoId);
  }

  return getPlaylistById(playlistId);
}

export async function getPlaylistVideoStatus(userId: string, videoId: string) {
  return listPlaylistIdsContainingVideo(userId, videoId);
}
