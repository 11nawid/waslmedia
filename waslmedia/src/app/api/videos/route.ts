import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import {
  createVideo,
  getPaginatedFeedVideos,
  getPaginatedHistoryVideos,
  getPaginatedLikedVideos,
  getPaginatedPublicVideos,
  getPaginatedSubscribedVideos,
  getPaginatedVideosByAuthorId,
  getVideosByAuthorId,
  getPaginatedWatchLaterVideos,
  hydrateVideoIds,
} from '@/server/services/videos';
import { publishRealtimeEvent } from '@/server/realtime/events';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();

  const searchParams = request.nextUrl.searchParams;
  const authorId = searchParams.get('authorId');
  const mode = searchParams.get('mode');
  const ids = searchParams.get('ids');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const search = searchParams.get('search') || undefined;
  const contentTypeParam = searchParams.get('contentType');
  const visibilityParam = searchParams.get('visibility');
  const audienceParam = searchParams.get('audience');
  const sortByParam = searchParams.get('sortBy');
  const limit = limitParam ? Number(limitParam) : 24;
  const offset = offsetParam ? Number(offsetParam) : 0;
  const user = await getCurrentAuthUser();

  if (ids) {
    const videos = await hydrateVideoIds(ids.split(',').filter(Boolean));
    return NextResponse.json({ videos });
  }

  if (authorId) {
    const contentType =
      contentTypeParam === 'videos' || contentTypeParam === 'shorts' ? contentTypeParam : undefined;
    const visibility =
      visibilityParam === 'public' || visibilityParam === 'private' || visibilityParam === 'unlisted'
        ? visibilityParam
        : undefined;
    const audience =
      audienceParam === 'madeForKids' || audienceParam === 'notMadeForKids' ? audienceParam : undefined;
    const sortBy =
      sortByParam === 'oldest' || sortByParam === 'most-viewed' || sortByParam === 'newest'
        ? sortByParam
        : undefined;
    const authorLimit = limitParam ? Number(limitParam) : null;
    const authorOffset = offsetParam ? Number(offsetParam) : null;

    if (authorLimit !== null || authorOffset !== null || search || contentType || visibility || audience || sortBy) {
      const result = await getPaginatedVideosByAuthorId(authorId, {
        publicOnly: !user || user.id !== authorId,
        search,
        contentType,
        visibility,
        audience,
        sortBy,
        limit: authorLimit ?? 30,
        offset: authorOffset ?? 0,
      });
      return NextResponse.json({
        items: result.videos,
        videos: result.videos,
        pagination: result.pagination,
      });
    }

    const videos = await getVideosByAuthorId(authorId, {
      publicOnly: !user || user.id !== authorId,
    });
    return NextResponse.json({ videos });
  }

  if (mode === 'liked') {
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const orderedIds = searchParams.get('orderedIds')?.split(',').filter(Boolean);
    if (orderedIds?.length) {
      const items = await hydrateVideoIds(orderedIds.slice(offset, offset + limit));
      return NextResponse.json({
        items,
        videos: items,
        pagination: {
          total: orderedIds.length,
          limit,
          offset,
          count: items.length,
          hasNextPage: offset + items.length < orderedIds.length,
          hasPreviousPage: offset > 0,
        },
      });
    }

    const result = await getPaginatedLikedVideos(user.id, { limit, offset });
    return NextResponse.json({
      items: result.videos,
      videos: result.videos,
      pagination: result.pagination,
    });
  }

  if (mode === 'watch-later') {
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const result = await getPaginatedWatchLaterVideos(user.id, { limit, offset });
    return NextResponse.json({
      items: result.videos,
      videos: result.videos,
      pagination: result.pagination,
    });
  }

  if (mode === 'history') {
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const result = await getPaginatedHistoryVideos(user.id, { limit, offset });
    return NextResponse.json({
      items: result.videos,
      videos: result.videos,
      pagination: result.pagination,
    });
  }

  if (mode === 'subscribed') {
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const result = await getPaginatedSubscribedVideos(user.id, { limit, offset });
    return NextResponse.json({
      items: result.videos,
      videos: result.videos,
      pagination: result.pagination,
    });
  }

  const contentType =
    contentTypeParam === 'videos' || contentTypeParam === 'shorts' ? contentTypeParam : undefined;
  const sortByFilter =
    sortByParam === 'viewcount' || sortByParam === 'rating' || sortByParam === 'uploaddate'
      ? sortByParam
      : undefined;
  const result =
    contentType || sortByFilter
      ? await getPaginatedFeedVideos({
          limit,
          offset,
          contentType,
          filters: sortByFilter
            ? {
                uploadDate: 'anytime',
                type: 'all',
                duration: 'any',
                sortBy: sortByFilter,
              }
            : undefined,
        })
      : await getPaginatedPublicVideos({ limit, offset });
  return NextResponse.json({
    items: result.videos,
    videos: result.videos,
    pagination: result.pagination,
  });
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  try {
    const video = await createVideo({
      authorId: user.id,
      title: body.title,
      description: body.description,
      thumbnailUrl: body.thumbnailUrl,
      videoUrl: body.videoUrl,
      sourceBucket: body.sourceBucket,
      sourceObjectKey: body.sourceObjectKey,
      duration: body.duration,
      visibility: body.visibility,
      audience: body.audience,
      tags: body.tags,
      language: body.language,
      category: body.category,
      commentsEnabled: body.commentsEnabled,
      showLikes: body.showLikes,
      summary: body.summary,
      timestamps: body.timestamps,
      credits: body.credits,
    });

    publishRealtimeEvent(`studio:${user.id}`, 'videos.updated');
    publishRealtimeEvent(`analytics:${user.id}`, 'analytics.updated');
    publishRealtimeEvent(`studio:${user.id}`, 'analytics.updated');
    publishRealtimeEvent(`channel:${user.id}`, 'channel.updated');

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'VIDEO_CREATE_FAILED';
    const knownClientError =
      message === 'LONG_VIDEO_DURATION_LIMIT_EXCEEDED' ||
      message === 'SHORT_DURATION_LIMIT_EXCEEDED' ||
      message === 'LONG_VIDEO_DAILY_LIMIT_REACHED' ||
      message === 'SHORT_DAILY_LIMIT_REACHED' ||
      message === 'UPLOAD_MEDIA_METADATA_MISSING';

    return NextResponse.json(
      { error: message },
      {
        status: knownClientError ? 400 : 500,
      }
    );
  }
}
