import { closePool } from './pool.js';
import { migrate, reset } from './migrate.js';
import { seed } from './seeds/seed.js';

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    case 'migrate': {
      const result = await migrate();
      console.log(`Applied ${result.applied.length}, already applied ${result.skipped.length}.`);
      break;
    }
    case 'seed':
      await seed();
      break;
    case 'reset':
      await reset();
      await migrate();
      await seed();
      console.log('Database reset, migrated and seeded.');
      break;
    default:
      console.error('Usage: db:cli <migrate|seed|reset>');
      process.exitCode = 1;
  }
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
