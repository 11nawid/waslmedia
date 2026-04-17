import { dbPool } from './pool';
import { ensureDatabaseSetup } from './bootstrap';

async function runSchema() {
  await ensureDatabaseSetup();
  await dbPool.end();
  console.log('Database bootstrap completed successfully.');
}

runSchema().catch((error) => {
  console.error('Failed to bootstrap database.', error);
  process.exit(1);
});
