import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '@/server/redis';
import { processVideoAssets } from '@/server/services/video-processing';

const VIDEO_PROCESSING_QUEUE = 'video-processing';

declare global {
  var __waslmediaVideoProcessingQueue: Queue<{ videoId: string }> | undefined;
}

function getQueue() {
  if (!globalThis.__waslmediaVideoProcessingQueue) {
    globalThis.__waslmediaVideoProcessingQueue = new Queue<{ videoId: string }>(VIDEO_PROCESSING_QUEUE, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });
  }

  return globalThis.__waslmediaVideoProcessingQueue;
}

export async function queueVideoProcessingJob(videoId: string) {
  const queue = getQueue();
  await queue.add(
    'process-video',
    { videoId },
    {
      jobId: videoId,
    }
  );
}

export function createVideoProcessingWorker() {
  return new Worker<{ videoId: string }>(
    VIDEO_PROCESSING_QUEUE,
    async (job) => {
      await processVideoAssets(job.data.videoId);
    },
    {
      connection: getRedisClient(),
      concurrency: 2,
    }
  );
}
