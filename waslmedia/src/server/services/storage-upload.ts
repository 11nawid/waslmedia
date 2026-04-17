import { randomUUID } from 'node:crypto';
import { buildStorageReference } from '@/lib/storage/shared';
import { createUploadIntent, isAllowedUploadBucket } from '@/server/utils/upload-intents';
import type { UploadMediaKind } from '@/lib/video-upload/rules';

type UploadIntentScope = 'default' | 'signup-profile';

export async function createClientUploadIntent(input: {
  bucket: string;
  filename: string;
  contentType: string;
  scope?: UploadIntentScope;
  userId?: string | null;
  mediaKind?: UploadMediaKind | null;
}) {
  const scope = input.scope || 'default';
  const bucket = typeof input.bucket === 'string' ? input.bucket : '';
  const filename = typeof input.filename === 'string' ? input.filename : '';
  const contentType =
    typeof input.contentType === 'string' ? input.contentType : 'application/octet-stream';

  if (!isAllowedUploadBucket(bucket) || !filename) {
    return { error: 'INVALID_UPLOAD_REQUEST' as const, status: 400 };
  }

  if (bucket === 'videos' && input.mediaKind !== 'long' && input.mediaKind !== 'short') {
    return { error: 'INVALID_UPLOAD_REQUEST' as const, status: 400 };
  }

  if (scope === 'signup-profile') {
    if (bucket !== 'profile' || !contentType.startsWith('image/')) {
      return { error: 'INVALID_UPLOAD_REQUEST' as const, status: 400 };
    }
  } else if (!input.userId) {
    return { error: 'UNAUTHORIZED' as const, status: 401 };
  }

  const ownerKey =
    scope === 'signup-profile'
      ? `signup-${randomUUID()}`
      : input.userId!;

  const intent = createUploadIntent({
    userId: ownerKey,
    bucket,
    filename,
    mediaKind: input.mediaKind || null,
  });

  return {
    status: 200,
    payload: {
      ...intent,
      storageRef: buildStorageReference(intent.bucket, intent.objectKey),
    },
  };
}
