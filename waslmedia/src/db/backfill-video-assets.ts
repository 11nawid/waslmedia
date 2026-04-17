import 'dotenv/config';
import { ensureDatabaseSetup } from './bootstrap';
import { backfillLegacyVideoAssets } from '@/server/services/video-processing';
import { scrubVideoUrlsWithAssets } from '@/server/repositories/videos';

async function main() {
  await ensureDatabaseSetup();
  const result = await backfillLegacyVideoAssets(500);
  await scrubVideoUrlsWithAssets();
  console.log(`Queued ${result.queued} legacy videos for secure HLS packaging.`);
}

main().catch((error) => {
  console.error('Legacy video asset backfill failed.', error);
  process.exit(1);
});
