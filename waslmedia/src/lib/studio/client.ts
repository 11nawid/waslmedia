import type { ChannelSettings, UploadDefaults } from './types';
import type { Channel } from '@/lib/types';
import { uploadFileToStorage } from '@/lib/storage/client';
import { apiGet } from '@/lib/api/client';
import type { StudioBootstrap } from '@/lib/studio/bootstrap-types';

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export async function getOwnChannelSettings() {
  const response = await fetch('/api/channel/me', {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'CHANNEL_FETCH_FAILED');
  }

  return payload.channel as ChannelSettings | null;
}

export async function getPublicChannel(channelId: string) {
  const response = await fetch(`/api/channel/${encodeURIComponent(channelId)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'CHANNEL_FETCH_FAILED');
  }

  return payload.channel as Channel | null;
}

export async function updateOwnChannelSettings(input: {
  name: string;
  handle: string;
  description?: string;
  email?: string;
  country?: string;
  showCountry?: boolean;
  profilePicture?: File | null;
  bannerImage?: File | null;
}) {
  const body: Record<string, unknown> = {
    name: input.name,
    handle: input.handle,
    description: input.description || '',
    email: input.email || '',
    country: input.country || '',
    showCountry: Boolean(input.showCountry),
  };

  if (input.profilePicture instanceof File) {
    const uploaded = await uploadFileToStorage({
      bucket: 'profile',
      objectKey: input.profilePicture.name,
      file: input.profilePicture,
    });
    body.profilePictureStorageRef = uploaded.storageRef;
  } else if (input.profilePicture === null) {
    body.removeProfilePicture = true;
  }

  if (input.bannerImage instanceof File) {
    const uploaded = await uploadFileToStorage({
      bucket: 'banners',
      objectKey: input.bannerImage.name,
      file: input.bannerImage,
    });
    body.bannerStorageRef = uploaded.storageRef;
  } else if (input.bannerImage === null) {
    body.removeBannerImage = true;
  }

  const response = await fetch('/api/channel/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'CHANNEL_UPDATE_FAILED');
  }

  return payload.channel as ChannelSettings;
}

export async function getUploadDefaults() {
  const response = await fetch('/api/upload-defaults', {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'UPLOAD_DEFAULTS_FETCH_FAILED');
  }

  return payload.defaults as UploadDefaults | null;
}

export async function updateUploadDefaults(input: UploadDefaults) {
  const response = await fetch('/api/upload-defaults', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'UPLOAD_DEFAULTS_UPDATE_FAILED');
  }

  return payload.defaults as UploadDefaults;
}

export async function isHandleAvailable(handle: string) {
  const response = await fetch(`/api/auth/check-handle?handle=${encodeURIComponent(handle)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'HANDLE_CHECK_FAILED');
  }

  return Boolean(payload.available);
}

export async function getStudioBootstrap<TPage>(
  surface: string,
  params?: Record<string, string | number | boolean | null | undefined>
) {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiGet<StudioBootstrap<TPage>>(`/api/bootstrap/studio/${encodeURIComponent(surface)}${suffix}`);
}
