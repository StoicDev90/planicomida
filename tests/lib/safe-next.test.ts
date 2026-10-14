import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/safe-next';

describe('safeNext', () => {
  it.each([
    ['/app/planner', '/app/planner'],
    ['/app/lista?semana=2026-10-12', '/app/lista?semana=2026-10-12'],
    ['/app', '/app'],
    [null, '/app/planner'],
    [undefined, '/app/planner'],
    ['', '/app/planner'],
    ['https://evil.com', '/app/planner'],
    ['//evil.com', '/app/planner'],
    ['/application', '/app/planner'],
    ['/app/../admin', '/app/planner'],
    ['/app\\evil', '/app/planner'],
    ['/login', '/app/planner'],
  ])('safeNext(%j) => %j', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
