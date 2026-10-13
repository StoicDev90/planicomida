import { describe, expect, it } from 'vitest';

describe('setup de tests', () => {
  it('resuelve el alias @/ a src/', async () => {
    const modules = import.meta.glob('@/styles/*.css');
    expect(Object.keys(modules).length).toBeGreaterThan(0);
  });
});
