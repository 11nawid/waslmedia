import { CheckCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UploadStep } from './upload-dialog-config';

export async function getVideoFileDuration(sourceFile: File) {
  const metadata = await inspectVideoFile(sourceFile);
  return metadata.durationLabel;
}

export async function inspectVideoFile(sourceFile: File) {
  const videoElement = document.createElement('video');
  videoElement.preload = 'metadata';
  videoElement.src = URL.createObjectURL(sourceFile);

  return new Promise<{
    durationSeconds: number;
    durationLabel: string;
    width: number;
    height: number;
    isPortrait: boolean;
    isShortCandidate: boolean;
  }>((resolve, reject) => {
    videoElement.onloadedmetadata = () => {
      const durationSeconds = videoElement.duration;
      URL.revokeObjectURL(videoElement.src);
      resolve({
        durationSeconds,
        durationLabel: formatVideoDuration(durationSeconds),
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        isPortrait: videoElement.videoHeight >= videoElement.videoWidth,
        isShortCandidate: durationSeconds <= 120 && videoElement.videoHeight >= videoElement.videoWidth,
      });
    };

    videoElement.onerror = () => {
      URL.revokeObjectURL(videoElement.src);
      reject(new Error('VIDEO_METADATA_FAILED'));
    };
  });
}

export async function generateVideoThumbnailFile(
  sourceFile: File,
  options?: { atSeconds?: number; width?: number; quality?: number }
) {
  const atSeconds = Math.max(0.05, options?.atSeconds ?? 0.2);
  const quality = Math.min(1, Math.max(0.5, options?.quality ?? 0.9));

  const objectUrl = URL.createObjectURL(sourceFile);
  const videoElement = document.createElement('video');
  videoElement.preload = 'metadata';
  videoElement.src = objectUrl;
  videoElement.muted = true;
  videoElement.playsInline = true;

  return new Promise<File>((resolve, reject) => {
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      URL.revokeObjectURL(objectUrl);
      videoElement.removeAttribute('src');
      videoElement.load();
    };

    videoElement.onerror = () => {
      cleanup();
      reject(new Error('VIDEO_THUMBNAIL_GENERATION_FAILED'));
    };

    videoElement.onloadedmetadata = () => {
      const targetTime = Math.min(Math.max(atSeconds, 0.05), Math.max(videoElement.duration - 0.05, 0.05));
      videoElement.currentTime = targetTime;
    };

    videoElement.onseeked = () => {
      const width = options?.width || videoElement.videoWidth || 1280;
      const scale = width / (videoElement.videoWidth || width);
      const height = Math.max(1, Math.round((videoElement.videoHeight || 720) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) {
        cleanup();
        reject(new Error('VIDEO_THUMBNAIL_GENERATION_FAILED'));
        return;
      }

      context.drawImage(videoElement, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            reject(new Error('VIDEO_THUMBNAIL_GENERATION_FAILED'));
            return;
          }

          const baseName = sourceFile.name.replace(/\.[^/.]+$/, '') || 'thumbnail';
          resolve(new File([blob], `${baseName}-thumbnail.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
  });
}

export function formatVideoDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getUploadStatusMessage(input: {
  isEditing: boolean;
  uploadStatus: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
}): ReactNode {
  if (input.isEditing) {
    return 'Editing video details.';
  }

  switch (input.uploadStatus) {
    case 'uploading':
      return 'Uploading video...';
    case 'processing':
      return 'Processing... This may take a few moments.';
    case 'success':
      return (
        <span className="flex items-center gap-2 text-emerald-500">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Checks complete. No issues found.
        </span>
      );
    case 'error':
      return 'Upload failed. Please try again.';
    default:
      return '';
  }
}

export function getPublishMessage(input: {
  isEditing: boolean;
  visibility: 'private' | 'public' | 'unlisted';
}) {
  if (input.isEditing) {
    return 'Your changes have been saved.';
  }

  switch (input.visibility) {
    case 'public':
      return 'Your video has been published.';
    case 'private':
      return 'Your video has been saved as private.';
    case 'unlisted':
      return 'Your video is now unlisted.';
  }
}
