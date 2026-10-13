import { getDb, schemaVersion } from '../src/lib/db.ts';
import { runSeed } from './lib.ts';

const db = getDb();
runSeed(db);
console.log(`Base lista (schema v${schemaVersion(db)}).`);
db.close();
