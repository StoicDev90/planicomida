import { z } from 'astro/zod';
import type { Db } from '@/lib/db';
import { fieldErrors, type ErrorCode } from '@/lib/http';
import { loginLimiter, type RateLimiter } from '@/lib/rate-limit';
import {
  authenticate,
  createSession,
  deleteExpiredSessions,
  EmailTakenError,
  registerUser,
  type User,
} from '@/services/auth';

const Email = z
  .string({ error: 'Ingresá tu email' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Ingresá un email válido'));

export const RegisterBody = z.object({
  email: Email,
  name: z
    .string({ error: 'Ingresá tu nombre' })
    .trim()
    .min(1, 'Ingresá tu nombre')
    .max(60, 'Máximo 60 caracteres'),
  password: z
    .string({ error: 'Ingresá una contraseña' })
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres'),
});

export const LoginBody = z.object({
  email: Email,
  password: z.string({ error: 'Ingresá tu contraseña' }).min(1, 'Ingresá tu contraseña').max(128),
});

export type FlowSuccess = { ok: true; user: User; token: string; expiresAt: Date };
export type FlowFailure = {
  ok: false;
  status: 400 | 401 | 409 | 429;
  code: ErrorCode;
  message: string;
  fields?: Record<string, string>;
};
export type FlowResult = FlowSuccess | FlowFailure;

export async function registerFlow(db: Db, raw: unknown, now = new Date()): Promise<FlowResult> {
  const parsed = RegisterBody.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION',
      message: 'Revisá los datos',
      fields: fieldErrors(parsed.error),
    };
  }

  let user: User;
  try {
    user = await registerUser(db, parsed.data);
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return {
        ok: false,
        status: 409,
        code: 'CONFLICT',
        message: 'Ya hay una cuenta con ese email',
        fields: { email: 'Ya hay una cuenta con ese email' },
      };
    }
    throw error;
  }

  const { token, expiresAt } = createSession(db, user.id, now);
  return { ok: true, user, token, expiresAt };
}

export async function loginFlow(
  db: Db,
  raw: unknown,
  ip: string,
  now = new Date(),
  limiter: RateLimiter = loginLimiter,
): Promise<FlowResult> {
  const parsed = LoginBody.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION',
      message: 'Revisá los datos',
      fields: fieldErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const key = `${ip}|${data.email}`;
  if (limiter.isBlocked(key, now.getTime())) {
    return {
      ok: false,
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Demasiados intentos. Probá de nuevo en 15 minutos.',
    };
  }

  const user = await authenticate(db, data.email, data.password);
  if (!user) {
    limiter.recordFailure(key, now.getTime());
    return {
      ok: false,
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Email o contraseña incorrectos',
    };
  }

  limiter.reset(key);
  deleteExpiredSessions(db, now);
  const { token, expiresAt } = createSession(db, user.id, now);
  return { ok: true, user, token, expiresAt };
}
