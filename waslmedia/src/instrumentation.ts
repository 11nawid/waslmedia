export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || !process.env.NEXT_RUNTIME) {
    try {
      const { assertRuntimeConfiguration } = await import('@/server/utils/runtime-config');
      const { ensureDatabaseSetup } = await import('@/db/bootstrap');
      assertRuntimeConfiguration();
      await ensureDatabaseSetup();
      console.log('Database bootstrap ready.');
    } catch (error) {
      console.error('Database bootstrap failed during app startup.', error);
    }
  }
}
