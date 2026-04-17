import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

export function ensureFfmpegPath() {
  const bundledPath = typeof ffmpegPath === 'string' ? ffmpegPath : '';
  if (bundledPath && existsSync(bundledPath)) {
    return bundledPath;
  }

  const fallbackPath = join(
    process.cwd(),
    'node_modules',
    'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  );

  if (existsSync(fallbackPath)) {
    return fallbackPath;
  }

  throw new Error('FFMPEG_NOT_AVAILABLE');
}

export function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(ensureFfmpegPath(), args, { windowsHide: true });
    let stderr = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `FFMPEG_EXIT_${code}`));
    });
  });
}

export async function probeVideoMetadata(inputPath: string) {
  const ffmpegOutput = await new Promise<string>((resolve, reject) => {
    const ffmpeg = spawn(
      ensureFfmpegPath(),
      ['-hide_banner', '-i', inputPath, '-map', '0:v:0', '-frames:v', '1', '-f', 'null', '-'],
      { windowsHide: true }
    );
    let stderr = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(stderr);
        return;
      }

      reject(new Error(stderr.trim() || `FFMPEG_PROBE_EXIT_${code}`));
    });
  });

  const durationMatch = ffmpegOutput.match(/Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const dimensionMatch = ffmpegOutput.match(/Video:.*?(\d{2,5})x(\d{2,5})/);

  if (!durationMatch || !dimensionMatch) {
    throw new Error('VIDEO_METADATA_FAILED');
  }

  const hours = Number(durationMatch[1] || 0);
  const minutes = Number(durationMatch[2] || 0);
  const seconds = Number(durationMatch[3] || 0);
  const durationSeconds = Math.max(0, Math.floor(hours * 3600 + minutes * 60 + seconds));
  const width = Number(dimensionMatch[1] || 0);
  const height = Number(dimensionMatch[2] || 0);

  if (!Number.isFinite(durationSeconds) || durationSeconds < 0 || width <= 0 || height <= 0) {
    throw new Error('VIDEO_METADATA_FAILED');
  }

  return {
    durationSeconds,
    width,
    height,
  };
}
