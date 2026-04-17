import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { createVideoAssetRow, findVideoAssetByVideoId, updateVideoAssetRow } from '@/server/repositories/video-assets';
import { queueVideoProcessingJob } from '@/server/jobs/video-processing-queue';
import { findVideoRowById, listLegacyVideoSourceRows, updateVideoRow } from '@/server/repositories/videos';
import { getObjectFromStorage, uploadObjectToStorage } from '@/lib/storage/server';
import { parseStorageUrl } from '@/lib/storage/shared';
import { runFfmpeg } from '@/server/utils/ffmpeg';

const VIDEO_BUCKET = 'videos';
const SEGMENT_DURATION_SECONDS = 6;

const HLS_RENDITIONS = [
  { id: '360p', width: 640, height: 360, bandwidth: 800000 },
  { id: '720p', width: 1280, height: 720, bandwidth: 2200000 },
  { id: '1080p', width: 1920, height: 1080, bandwidth: 4500000 },
] as const;

interface GeneratedRendition {
  id: string;
  width: number;
  height: number;
  bandwidth: number;
  playlistKey: string;
}

function getDurationSeconds(duration: string | undefined) {
  if (!duration) {
    return 0;
  }

  const parts = duration.split(':').map((part) => Number(part) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

async function writeStorageObjectToFile(bucket: string, objectKey: string, targetPath: string) {
  const response = await getObjectFromStorage({ bucket, objectKey });
  if (!response.Body) {
    throw new Error('SOURCE_NOT_FOUND');
  }

  const arrayBuffer = await response.Body.transformToByteArray();
  await writeFile(targetPath, Buffer.from(arrayBuffer));
}

async function walkFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const currentPath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(currentPath)));
      continue;
    }

    files.push(currentPath);
  }

  return files;
}

function buildMasterPlaylist(renditions: GeneratedRendition[]) {
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...renditions.flatMap((rendition) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.width}x${rendition.height}`,
      `variant/${rendition.id}`,
    ]),
    '',
  ].join('\n');
}

async function generateRendition(inputPath: string, outputDir: string, width: number, height: number) {
  await mkdir(outputDir, { recursive: true });

  const scaleFilter =
    `scale=w='trunc(iw*min(1,min(${width}/iw,${height}/ih))/2)*2':` +
    `h='trunc(ih*min(1,min(${width}/iw,${height}/ih))/2)*2'`;

  await runFfmpeg([
    '-y',
    '-i',
    inputPath,
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-vf',
    scaleFilter,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-g',
    '48',
    '-keyint_min',
    '48',
    '-sc_threshold',
    '0',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ac',
    '2',
    '-ar',
    '48000',
    '-hls_time',
    String(SEGMENT_DURATION_SECONDS),
    '-hls_playlist_type',
    'vod',
    '-hls_segment_filename',
    join(outputDir, 'segment_%03d.ts'),
    join(outputDir, 'index.m3u8'),
  ]);
}

async function generateThumbnail(inputPath: string, outputPath: string) {
  await runFfmpeg([
    '-y',
    '-ss',
    '00:00:01',
    '-i',
    inputPath,
    '-map_metadata',
    '-1',
    '-frames:v',
    '1',
    '-vf',
    'scale=1280:-2',
    outputPath,
  ]);
}

async function uploadGeneratedMedia(rootOutputPath: string, videoId: string) {
  const opaquePrefix = `${videoId}/${randomUUID()}`;
  const files = await walkFiles(rootOutputPath);
  const uploaded: Record<string, string> = {};

  for (const filePath of files) {
    const objectKey = `${opaquePrefix}/${relative(rootOutputPath, filePath).replace(/\\/g, '/')}`;
    const body = await readFile(filePath);
    const extension = basename(filePath).split('.').pop()?.toLowerCase();
    const contentType =
      extension === 'm3u8'
        ? 'application/vnd.apple.mpegurl'
        : extension === 'ts'
          ? 'video/mp2t'
          : extension === 'jpg'
            ? 'image/jpeg'
            : 'application/octet-stream';

    await uploadObjectToStorage({
      bucket: VIDEO_BUCKET,
      objectKey,
      body,
      contentType,
    });

    uploaded[relative(rootOutputPath, filePath).replace(/\\/g, '/')] = objectKey;
  }

  return uploaded;
}

export async function processVideoAssets(videoId: string) {
  const asset = await findVideoAssetByVideoId(videoId);
  const video = await findVideoRowById(videoId);

  if (!asset || !video) {
    return;
  }

  const workspace = await mkdtemp(join(tmpdir(), 'waslmedia-hls-'));
  try {
    await updateVideoAssetRow(videoId, {
      transcode_status: 'processing',
      last_error: null,
    });

    const sourceExtension = asset.source_object_key.split('.').pop() || 'mp4';
    const sourcePath = join(workspace, `source.${sourceExtension}`);
    const hlsRoot = join(workspace, 'hls');
    const thumbnailPath = join(workspace, 'thumbnail.jpg');

    await writeStorageObjectToFile(asset.source_bucket, asset.source_object_key, sourcePath);

    const renditions: GeneratedRendition[] = [];
    for (const rendition of HLS_RENDITIONS) {
      const renditionDir = join(hlsRoot, rendition.id);
      await generateRendition(sourcePath, renditionDir, rendition.width, rendition.height);
      renditions.push({
        ...rendition,
        playlistKey: '',
      });
    }

    await generateThumbnail(sourcePath, thumbnailPath);
    await writeFile(join(hlsRoot, 'master.m3u8'), buildMasterPlaylist(renditions));

    const uploaded = await uploadGeneratedMedia(workspace, videoId);
    const uploadedRenditions = renditions.map((rendition) => ({
      ...rendition,
      playlistKey: uploaded[`hls/${rendition.id}/index.m3u8`],
    }));

    await updateVideoAssetRow(videoId, {
      manifest_bucket: VIDEO_BUCKET,
      manifest_object_key: uploaded['hls/master.m3u8'],
      thumbnail_bucket: VIDEO_BUCKET,
      thumbnail_object_key: uploaded['thumbnail.jpg'],
      transcode_status: 'ready',
      renditions_json: JSON.stringify(uploadedRenditions),
      duration_seconds: asset.duration_seconds || getDurationSeconds(video.duration),
      processed_at: new Date(),
      last_error: null,
    });

    if (!video.thumbnail_url) {
      await updateVideoRow(videoId, { thumbnail_url: '' });
    }
  } catch (error) {
    await updateVideoAssetRow(videoId, {
      transcode_status: 'failed',
      last_error: error instanceof Error ? error.message : 'VIDEO_PROCESSING_FAILED',
      processed_at: null,
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function queueVideoAssetProcessing(videoId: string) {
  await queueVideoProcessingJob(videoId);
}

export async function ensureVideoAssetForExistingVideo(videoId: string) {
  const [asset, video] = await Promise.all([findVideoAssetByVideoId(videoId), findVideoRowById(videoId)]);
  if (asset || !video?.video_url) {
    return asset;
  }

  const source = parseStorageUrl(video.video_url);
  if (!source) {
    return null;
  }

  await createVideoAssetRow({
    videoId,
    sourceBucket: source.bucket,
    sourceObjectKey: source.objectKey,
    durationSeconds: getDurationSeconds(video.duration),
  });
  await updateVideoRow(videoId, { video_url: '' });
  await queueVideoAssetProcessing(videoId);
  return findVideoAssetByVideoId(videoId);
}

export async function backfillLegacyVideoAssets(limit = 100) {
  const rows = await listLegacyVideoSourceRows(limit);
  let queued = 0;

  for (const row of rows) {
    const source = parseStorageUrl(row.video_url || '');
    if (!source) {
      continue;
    }

    await createVideoAssetRow({
      videoId: row.id,
      sourceBucket: source.bucket,
      sourceObjectKey: source.objectKey,
      durationSeconds: getDurationSeconds(row.duration),
    });
    await updateVideoRow(row.id, { video_url: '' });
    await queueVideoAssetProcessing(row.id);
    queued += 1;
  }

  return { queued };
}
