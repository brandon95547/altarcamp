import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { closePool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seeds/seed.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp();

  // Migrations run at boot. With one service and one database, a separate migration step is
  // a way to forget; the runner is idempotent and takes a lock-free forward-only path.
  app.log.info('running migrations');
  const result = await migrate((message) => app.log.info(message));
  app.log.info(
    { applied: result.applied.length, alreadyApplied: result.skipped.length },
    'migrations complete',
  );

  await seed((message) => app.log.info(message));

  await app.listen({ port: config.PORT, host: config.HOST });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await closePool();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start Altar.Camp API');
  console.error(error);
  process.exit(1);
});
