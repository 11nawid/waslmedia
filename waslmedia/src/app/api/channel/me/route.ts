import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { DEFAULT_BANNER, DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';
import { deleteObjectFromStorage } from '@/lib/storage/server';
import { parseStorageUrl } from '@/lib/storage/shared';
import { getCurrentAuthUser } from '@/server/services/auth';
import {
  findChannelSettingsByUserId,
  isHandleTaken,
  updateChannelSettings,
} from '@/server/repositories/channel-settings';
import { resolveStoredAssetUrl } from '@/server/utils/protected-asset';

function mapChannel(row: Awaited<ReturnType<typeof findChannelSettingsByUserId>>) {
  if (!row) {
    return null;
  }

  return {
    id: row.user_id,
    uid: row.user_id,
    name: row.name,
    handle: row.handle,
    profilePictureUrl: resolveStoredAssetUrl(row.profile_picture_url, DEFAULT_PROFILE_PICTURE),
    bannerUrl: resolveStoredAssetUrl(row.banner_url, DEFAULT_BANNER),
    subscriberCount: row.subscriber_count || 0,
    description: row.description || '',
    email: row.contact_email || '',
    country: row.country || '',
    showCountry: Boolean(row.show_country),
    joinedAt: row.joined_at ? new Date(row.joined_at).toISOString() : undefined,
    videos: [],
    posts: [],
    playlists: [],
    totalViews: 0,
  };
}

export async function GET() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const channel = mapChannel(await findChannelSettingsByUserId(user.id));
  return NextResponse.json({ channel });
}

export async function PUT(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const currentChannel = await findChannelSettingsByUserId(user.id);
  if (!currentChannel) {
    return NextResponse.json({ error: 'CHANNEL_NOT_FOUND' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const name = String(body.name || '').trim();
  const handle = String(body.handle || '').trim().replace(/^@/, '');
  const description = String(body.description || '').trim();
  const contactEmail = String(body.email || '').trim();
  const country = String(body.country || '').trim();
  const showCountry = Boolean(body.showCountry);
  const profilePictureStorageRef =
    typeof body.profilePictureStorageRef === 'string' ? body.profilePictureStorageRef.trim() : '';
  const bannerStorageRef = typeof body.bannerStorageRef === 'string' ? body.bannerStorageRef.trim() : '';
  const removeProfilePicture = body.removeProfilePicture === true;
  const removeBannerImage = body.removeBannerImage === true;

  if (!name || name.length < 3) {
    return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 });
  }

  if (!handle || handle.length < 3 || !/^[a-zA-Z0-9_]+$/.test(handle)) {
    return NextResponse.json({ error: 'INVALID_HANDLE' }, { status: 400 });
  }

  const currentHandle = currentChannel.handle.replace(/^@/, '');
  if (handle !== currentHandle) {
    const taken = await isHandleTaken(handle, user.id);
    if (taken) {
      return NextResponse.json({ error: 'HANDLE_ALREADY_EXISTS' }, { status: 409 });
    }
  }

  let profilePictureUrl = currentChannel.profile_picture_url || DEFAULT_PROFILE_PICTURE;
  let bannerUrl = currentChannel.banner_url || DEFAULT_BANNER;

  if (profilePictureStorageRef) {
    const parsedPrevious = parseStorageUrl(profilePictureUrl);
    if (parsedPrevious && parsedPrevious.bucket === 'profile') {
      await deleteObjectFromStorage(parsedPrevious.bucket, parsedPrevious.objectKey).catch(() => null);
    }
    profilePictureUrl = profilePictureStorageRef;
  } else if (removeProfilePicture) {
    const parsedProfile = parseStorageUrl(profilePictureUrl);
    if (parsedProfile && parsedProfile.bucket === 'profile') {
      await deleteObjectFromStorage(parsedProfile.bucket, parsedProfile.objectKey).catch(() => null);
    }
    profilePictureUrl = DEFAULT_PROFILE_PICTURE;
  }

  if (bannerStorageRef) {
    const parsedPrevious = parseStorageUrl(bannerUrl);
    if (parsedPrevious && parsedPrevious.bucket === 'banners') {
      await deleteObjectFromStorage(parsedPrevious.bucket, parsedPrevious.objectKey).catch(() => null);
    }
    bannerUrl = bannerStorageRef;
  } else if (removeBannerImage) {
    const parsedBanner = parseStorageUrl(bannerUrl);
    if (parsedBanner && parsedBanner.bucket === 'banners') {
      await deleteObjectFromStorage(parsedBanner.bucket, parsedBanner.objectKey).catch(() => null);
    }
    bannerUrl = DEFAULT_BANNER;
  }

  const updatedChannel = await updateChannelSettings(user.id, {
    name,
    handle,
    profilePictureUrl,
    bannerUrl,
    description,
    contactEmail,
    country,
    showCountry,
  });

  return NextResponse.json({ channel: mapChannel(updatedChannel) });
}
