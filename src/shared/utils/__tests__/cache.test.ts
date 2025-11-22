/* global describe, it, expect */
import { buildCacheHash } from '../cache.js';

describe('cache utils', () => {
  it('produces stable hash for identical objects with different key order', () => {
    const first = buildCacheHash({ limit: 10, search: 'abc', isActive: true });
    const second = buildCacheHash({ search: 'abc', isActive: true, limit: 10 });

    expect(first).toBe(second);
  });

  it('produces different hash for different values', () => {
    const base = buildCacheHash({ limit: 10, search: 'abc' });
    const changed = buildCacheHash({ limit: 10, search: 'abcd' });

    expect(base).not.toBe(changed);
  });
});

