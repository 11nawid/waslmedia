import { createVideoProcessingWorker } from '@/server/jobs/video-processing-queue';

const worker = createVideoProcessingWorker();

worker.on('completed', (job) => {
  console.log(`Processed video assets for ${job.data.videoId}`);
});

worker.on('failed', (job, error) => {
  console.error(`Video processing failed for ${job?.data.videoId || 'unknown'}`, error);
});
