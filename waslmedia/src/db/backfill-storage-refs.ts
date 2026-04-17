import 'dotenv/config';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildStorageReference, parseStorageUrl } from '@/lib/storage/shared';

type BackfillTarget = {
  table: string;
  keyColumn: string;
  valueColumn: string;
};

const TARGETS: BackfillTarget[] = [
  { table: 'users', keyColumn: 'id', valueColumn: 'photo_url' },
  { table: 'channels', keyColumn: 'user_id', valueColumn: 'profile_picture_url' },
  { table: 'channels', keyColumn: 'user_id', valueColumn: 'banner_url' },
  { table: 'posts', keyColumn: 'id', valueColumn: 'image_url' },
  { table: 'audio_tracks', keyColumn: 'id', valueColumn: 'url' },
  { table: 'videos', keyColumn: 'id', valueColumn: 'thumbnail_url' },
];

async function backfillTarget(target: BackfillTarget) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT ${target.keyColumn} AS row_id, ${target.valueColumn} AS row_value
     FROM ${target.table}
     WHERE ${target.valueColumn} IS NOT NULL
       AND ${target.valueColumn} <> ''`
  );

  let updated = 0;
  for (const row of rows) {
    const currentValue = String(row.row_value || '');
    if (!currentValue || currentValue.startsWith('storage://')) {
      continue;
    }

    const parsed = parseStorageUrl(currentValue);
    if (!parsed) {
      continue;
    }

    const nextValue = buildStorageReference(parsed.bucket, parsed.objectKey);
    await dbPool.query(
      `UPDATE ${target.table}
       SET ${target.valueColumn} = ?
       WHERE ${target.keyColumn} = ?`,
      [nextValue, row.row_id]
    );
    updated += 1;
  }

  return updated;
}

async function main() {
  await ensureDatabaseSetup();
  const results = await Promise.all(TARGETS.map(backfillTarget));
  const total = results.reduce((sum, current) => sum + current, 0);
  console.log(`Backfilled ${total} legacy storage URL references to storage:// refs.`);
}

main().catch((error) => {
  console.error('Storage reference backfill failed.', error);
  process.exit(1);
});
