import { describe, expect, it } from 'vitest';
import * as sqb from './index.js';

describe('svelte-querybuilder barrel', () => {
  it('re-exports the core API', () => {
    expect(typeof sqb.QueryManager).toBe('function');
    expect(typeof sqb.formatQuery).toBe('function');
  });
});
