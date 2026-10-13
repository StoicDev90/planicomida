import { copyFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestDb, openDb, schemaVersion } from '@/lib/db';
import type { Database } from 'better-sqlite3';

const FIXTURES = join(import.meta.dirname, '../fixtures/migrations');

const opened: Database[] = [];
function track(db: Database) {
  opened.push(db);
  return db;
}
afterEach(() => opened.splice(0).forEach((db) => db.open && db.close()));

function tempMigrationsDir(extra: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pc-migrations-'));
  for (const file of ['001_items.sql', '002_tags.sql'])
    copyFileSync(join(FIXTURES, file), join(dir, file));
  for (const [file, sql] of Object.entries(extra)) writeFileSync(join(dir, file), sql);
  return dir;
}

function tables(db: Database) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .pluck()
    .all();
}

describe('openDb', () => {
  it('aplica todas las migraciones en una base nueva', () => {
    const db = track(openDb(':memory:', FIXTURES));
    expect(schemaVersion(db)).toBe(2);
    expect(tables(db)).toEqual(['items', 'tags']);
  });

  it('activa foreign_keys', () => {
    const db = track(openDb(':memory:', FIXTURES));
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(() => db.prepare('INSERT INTO tags (item_id) VALUES (99)').run()).toThrow(/FOREIGN KEY/);
  });

  it('crea la carpeta del archivo, usa WAL y no reaplica migraciones al reabrir', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'pc-db-')), 'nested', 'test.db');
    const dir = tempMigrationsDir();

    const first = openDb(path, dir);
    first.prepare("INSERT INTO items (name) VALUES ('tomate')").run();
    expect(first.pragma('journal_mode', { simple: true })).toBe('wal');
    first.close();
    expect(existsSync(path)).toBe(true);

    // Si se reaplicara 001, CREATE TABLE items fallaría
    const second = track(openDb(path, dir));
    expect(schemaVersion(second)).toBe(2);
    expect(second.prepare('SELECT count(*) FROM items').pluck().get()).toBe(1);
  });

  it('aplica solo las migraciones nuevas', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'pc-db-')), 'test.db');
    const dir = tempMigrationsDir();
    openDb(path, dir).close();

    writeFileSync(join(dir, '003_notes.sql'), 'CREATE TABLE notes (id INTEGER PRIMARY KEY);');
    const db = track(openDb(path, dir));
    expect(schemaVersion(db)).toBe(3);
    expect(tables(db)).toContain('notes');
  });

  it('hace rollback de una migración inválida e informa qué archivo falló', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'pc-db-')), 'test.db');
    const dir = tempMigrationsDir({
      '003_broken.sql': 'CREATE TABLE half (id INTEGER PRIMARY KEY); CREATE TABLE oops (;',
    });

    expect(() => openDb(path, dir)).toThrow(/003_broken\.sql/);

    const db = track(openDb(path, tempMigrationsDir()));
    expect(schemaVersion(db)).toBe(2);
    expect(tables(db)).not.toContain('half');
  });

  it('ignora archivos que no siguen el formato NNN_nombre.sql', () => {
    const dir = tempMigrationsDir({ 'README.md': '# nada', '.gitkeep': '', '4_bad.sql': 'x' });
    const db = track(openDb(':memory:', dir));
    expect(schemaVersion(db)).toBe(2);
  });

  it('rechaza dos migraciones con el mismo número', () => {
    const dir = tempMigrationsDir({ '002_dup.sql': 'SELECT 1;' });
    expect(() => openDb(':memory:', dir)).toThrow(/002/);
  });

  it('funciona sin carpeta de migraciones', () => {
    const db = track(openDb(':memory:', join(tmpdir(), 'no-existe-pc')));
    expect(schemaVersion(db)).toBe(0);
  });
});

describe('createTestDb', () => {
  it('crea una base en memoria con las migraciones reales del proyecto', () => {
    const db = track(createTestDb());
    expect(db.memory).toBe(true);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });
});
