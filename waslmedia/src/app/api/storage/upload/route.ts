import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { uploadObjectToStorage } from '@/lib/storage/server';
import { upsertUploadMediaMetadata } from '@/server/repositories/upload-media-metadata';
import { requireRouteUser } from '@/server/http/route-auth';
import { prepareUploadForStorage } from '@/server/services/upload-sanitizer';
import { readUploadIntent, verifyUploadIntent } from '@/server/utils/upload-intents';
import { probeVideoMetadata } from '@/server/utils/ffmpeg';
import {
  getDurationLimitErrorCode,
  isDurationAllowed,
} from '@/lib/video-upload/rules';

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  try {
    const formData = await request.formData();
    const token = String(formData.get('token') || '');
    const file = formData.get('file');

    if (!token || !(file instanceof File)) {
      return NextResponse.json({ error: 'INVALID_UPLOAD_REQUEST' }, { status: 400 });
    }

    const rawIntent = readUploadIntent(token);
    if (!rawIntent) {
      return NextResponse.json({ error: 'INVALID_UPLOAD_INTENT' }, { status: 403 });
    }

    const isSignupProfileUpload =
      rawIntent.bucket === 'profile' && rawIntent.objectKey.startsWith('signup-');

    const auth = isSignupProfileUpload ? { user: null, response: null } : await requireRouteUser();
    if (auth.response) {
      return auth.response;
    }

    const intent = isSignupProfileUpload
      ? rawIntent
      : verifyUploadIntent(token, auth.user!.id);

    if (!intent) {
      return NextResponse.json({ error: 'INVALID_UPLOAD_INTENT' }, { status: 403 });
    }

    const preparedUpload = await prepareUploadForStorage(file);

    try {
      let probedVideoMetadata:
        | {
            durationSeconds: number;
            width: number;
            height: number;
          }
        | null = null;

      if (intent.bucket === 'videos') {
        if (!auth.user || !intent.mediaKind || !preparedUpload.localPath) {
          return NextResponse.json({ error: 'INVALID_UPLOAD_REQUEST' }, { status: 400 });
        }

        probedVideoMetadata = await probeVideoMetadata(preparedUpload.localPath);
        if (!isDurationAllowed(intent.mediaKind, probedVideoMetadata.durationSeconds)) {
          return NextResponse.json({ error: getDurationLimitErrorCode(intent.mediaKind) }, { status: 400 });
        }
      }

      const result = await uploadObjectToStorage({
        bucket: intent.bucket,
        objectKey: intent.objectKey,
        body: preparedUpload.body,
        contentType: preparedUpload.contentType,
        contentLength: preparedUpload.contentLength,
      });

      if (intent.bucket === 'videos' && auth.user && intent.mediaKind && probedVideoMetadata) {
        await upsertUploadMediaMetadata({
          userId: auth.user.id,
          bucket: intent.bucket,
          objectKey: intent.objectKey,
          mediaKind: intent.mediaKind,
          durationSeconds: probedVideoMetadata.durationSeconds,
          width: probedVideoMetadata.width,
          height: probedVideoMetadata.height,
        });
      }

      return NextResponse.json(result);
    } finally {
      await preparedUpload.cleanup();
    }
  } catch (error) {
    if (error instanceof Error) {
      const knownError =
        error.message === 'LONG_VIDEO_DURATION_LIMIT_EXCEEDED' ||
        error.message === 'SHORT_DURATION_LIMIT_EXCEEDED' ||
        error.message === 'VIDEO_METADATA_FAILED';

      if (knownError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    console.error('Storage upload failed', error);
    return NextResponse.json({ error: 'STORAGE_UPLOAD_FAILED' }, { status: 500 });
  }
}
