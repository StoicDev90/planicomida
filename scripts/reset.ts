import { rmSync } from 'node:fs';
import { DEFAULT_DATABASE_PATH, getDb, schemaVersion } from '../src/lib/db.ts';
import { runSeed } from './lib.ts';

if (process.env.NODE_ENV === 'production') {
  console.error('db:reset no se puede usar con NODE_ENV=production.');
  process.exit(1);
}

const path = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
for (const file of [path, `${path}-wal`, `${path}-shm`]) rmSync(file, { force: true });
console.log(`Base borrada: ${path}`);

const db = getDb();
runSeed(db);
console.log(
  `Base recreada (schema v${schemaVersion(db)}). Si npm run dev está corriendo, reinicialo.`,
);
db.close();
