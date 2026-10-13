import { existsSync, readFileSync } from 'node:fs';
import type { Db } from '../src/lib/db.ts';

const SEED_FILE = 'db/seed.sql';

/** Ejecuta db/seed.sql si existe. Que sea idempotente es responsabilidad del seed (INSERT OR IGNORE, etc.). */
export function runSeed(db: Db): void {
  if (!existsSync(SEED_FILE)) {
    console.log(`No hay ${SEED_FILE} todavía: no hay nada para sembrar.`);
    return;
  }
  db.exec(readFileSync(SEED_FILE, 'utf8'));
  console.log(`Seed aplicado (${SEED_FILE}).`);
}
