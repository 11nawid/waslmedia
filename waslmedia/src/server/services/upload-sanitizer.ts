import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { runFfmpeg } from '@/server/utils/ffmpeg';

type PreparedUpload = {
  body: NonNullable<PutObjectCommandInput['Body']>;
  contentType: string;
  contentLength: number;
  cleanup: () => Promise<void>;
  metadataStripped: boolean;
  localPath?: string;
};

function getMimeTypeForExtension(extension: string, fallback: string) {
  switch (extension) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.webm':
      return 'video/webm';
    case '.mkv':
      return 'video/x-matroska';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    case '.aac':
      return 'audio/aac';
    case '.flac':
      return 'audio/flac';
    default:
      return fallback;
  }
}

function extensionOrDefault(fileName: string, fallback: string) {
  const extension = extname(fileName).toLowerCase();
  return extension || fallback;
}

function isSanitizableMimeType(contentType: string) {
  return contentType.startsWith('video/') || contentType.startsWith('image/') || contentType.startsWith('audio/');
}

function getVideoSanitizationConfig(fileName: string) {
  const extension = extensionOrDefault(fileName, '.mp4');
  const outputPath = `sanitized${extension}`;
  const args = [
    '-y',
    '-i',
    'input',
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-c',
    'copy',
  ];

  if (extension === '.mp4' || extension === '.m4v' || extension === '.mov') {
    args.push('-movflags', '+faststart');
  }

  args.push(outputPath);

  return {
    outputFileName: outputPath,
    contentType: getMimeTypeForExtension(extension, 'video/mp4'),
    buildArgs: (inputPath: string, outputFilePath: string) =>
      args.map((value) => (value === 'input' ? inputPath : value === outputPath ? outputFilePath : value)),
  };
}

function getAudioSanitizationConfig(fileName: string, contentType: string) {
  const extension = extensionOrDefault(fileName, '.bin');
  const outputPath = `sanitized${extension}`;

  return {
    outputFileName: outputPath,
    contentType,
    buildArgs: (inputPath: string, outputFilePath: string) => [
      '-y',
      '-i',
      inputPath,
      '-map_metadata',
      '-1',
      '-map_chapters',
      '-1',
      '-c',
      'copy',
      outputFilePath,
    ],
  };
}

function getImageSanitizationConfig(fileName: string, contentType: string) {
  const extension = extensionOrDefault(fileName, '.png');

  if (extension === '.jpg' || extension === '.jpeg') {
    return {
      outputFileName: 'sanitized.jpg',
      contentType: 'image/jpeg',
      buildArgs: (inputPath: string, outputFilePath: string) => [
        '-y',
        '-i',
        inputPath,
        '-map_metadata',
        '-1',
        '-frames:v',
        '1',
        '-c:v',
        'mjpeg',
        '-q:v',
        '2',
        outputFilePath,
      ],
    };
  }

  if (extension === '.webp') {
    return {
      outputFileName: 'sanitized.webp',
      contentType: 'image/webp',
      buildArgs: (inputPath: string, outputFilePath: string) => [
        '-y',
        '-i',
        inputPath,
        '-map_metadata',
        '-1',
        '-frames:v',
        '1',
        '-c:v',
        'libwebp',
        '-quality',
        '90',
        outputFilePath,
      ],
    };
  }

  const outputFileName =
    contentType === 'image/png' || extension === '.png'
      ? 'sanitized.png'
      : 'sanitized.png';

  return {
    outputFileName,
    contentType: 'image/png',
    buildArgs: (inputPath: string, outputFilePath: string) => [
      '-y',
      '-i',
      inputPath,
      '-map_metadata',
      '-1',
      '-frames:v',
      '1',
      '-c:v',
      'png',
      outputFilePath,
    ],
  };
}

function getSanitizationPlan(file: File) {
  const contentType = file.type || 'application/octet-stream';
  if (contentType.startsWith('video/')) {
    return getVideoSanitizationConfig(file.name);
  }

  if (contentType.startsWith('image/')) {
    return getImageSanitizationConfig(file.name, contentType);
  }

  if (contentType.startsWith('audio/')) {
    return getAudioSanitizationConfig(file.name, contentType);
  }

  return null;
}

export async function prepareUploadForStorage(file: File): Promise<PreparedUpload> {
  const contentType = file.type || 'application/octet-stream';

  if (!isSanitizableMimeType(contentType)) {
    return {
      body: Readable.fromWeb(file.stream() as unknown as NodeReadableStream),
      contentType,
      contentLength: file.size,
      cleanup: async () => {},
      metadataStripped: false,
      localPath: undefined,
    };
  }

  const plan = getSanitizationPlan(file);
  if (!plan) {
    throw new Error('UNSUPPORTED_MEDIA_SANITIZATION');
  }

  const workspace = await mkdtemp(join(tmpdir(), 'waslmedia-upload-'));
  const inputPath = join(workspace, `input${extensionOrDefault(file.name, '.bin')}`);
  const outputPath = join(workspace, plan.outputFileName);

  try {
    await pipeline(
      Readable.fromWeb(file.stream() as unknown as NodeReadableStream),
      createWriteStream(inputPath)
    );

    await runFfmpeg(plan.buildArgs(inputPath, outputPath));
    const outputStats = await stat(outputPath);

    return {
      body: createReadStream(outputPath),
      contentType: plan.contentType,
      contentLength: outputStats.size,
      cleanup: async () => {
        await rm(workspace, { recursive: true, force: true });
      },
      metadataStripped: true,
      localPath: outputPath,
    };
  } catch (error) {
    await rm(workspace, { recursive: true, force: true });
    throw error;
  }
}
