import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Sin imports con alias: este módulo también lo usan los scripts de scripts/ desde Node puro.

export type Db = Database.Database;

export const DEFAULT_DATABASE_PATH = './data/planicomida.db';
const MIGRATIONS_DIR = resolve(process.cwd(), 'db/migrations');
const MIGRATION_FILE = /^(\d{3})_.+\.sql$/;

export function schemaVersion(db: Db): number {
  return db.pragma('user_version', { simple: true }) as number;
}

function readMigrations(dir: string) {
  if (!existsSync(dir)) return [];

  const migrations = readdirSync(dir)
    .map((file) => ({ file, match: MIGRATION_FILE.exec(file) }))
    .filter(({ match }) => match)
    .map(({ file, match }) => ({ file, version: Number(match![1]) }))
    .sort((a, b) => a.version - b.version);

  migrations.forEach((m, i) => {
    if (m.version === migrations[i - 1]?.version) {
      throw new Error(`Hay dos migraciones con el número ${m.file.slice(0, 3)}`);
    }
  });
  return migrations;
}

/** Aplica, en orden y cada una en su transacción, las migraciones con número mayor a `user_version`. */
function migrate(db: Db, dir: string) {
  const current = schemaVersion(db);
  for (const { file, version } of readMigrations(dir)) {
    if (version <= current) continue;
    const sql = readFileSync(join(dir, file), 'utf8');
    try {
      db.transaction(() => {
        db.exec(sql);
        db.pragma(`user_version = ${version}`);
      })();
    } catch (error) {
      throw new Error(`Falló la migración ${file}: ${(error as Error).message}`, { cause: error });
    }
  }
}

export function openDb(path: string, migrationsDir = MIGRATIONS_DIR): Db {
  const inMemory = path === ':memory:';
  if (!inMemory) mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  if (!inMemory) db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    migrate(db, migrationsDir);
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

/** Base en memoria con las migraciones reales del proyecto. Una por test. */
export function createTestDb(): Db {
  return openDb(':memory:');
}

let instance: Db | undefined;

/** Conexión única del proceso, abierta (y migrada) en el primer uso. */
export function getDb(): Db {
  instance ??= openDb(process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH);
  return instance;
}
