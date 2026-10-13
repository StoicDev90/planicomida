import type { APIRoute } from 'astro';
import { getDb, schemaVersion } from '@/lib/db';
import { json } from '@/lib/http';

export const GET: APIRoute = () => json({ ok: true, schemaVersion: schemaVersion(getDb()) });
