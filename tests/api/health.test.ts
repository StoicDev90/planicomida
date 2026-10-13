import type { APIContext } from 'astro';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

describe('GET /api/health', () => {
  it('abre la base configurada y devuelve la versión del esquema', async () => {
    vi.stubEnv('DATABASE_PATH', join(mkdtempSync(join(tmpdir(), 'pc-health-')), 'h.db'));
    const { GET } = await import('@/pages/api/health');

    const res = await GET({} as APIContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.schemaVersion).toEqual(expect.any(Number));
  });
});
