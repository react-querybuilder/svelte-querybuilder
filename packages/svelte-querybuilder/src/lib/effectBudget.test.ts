import { describe, expect, it } from 'vitest';

// Every published source file, as text. Tests and test harnesses excluded.
const sources = import.meta.glob<string>(
  ['./**/*.svelte', './**/*.ts', '!./**/*.test.ts', '!./**/*.test.svelte', '!./**/*.test-d.ts'],
  { query: '?raw', import: 'default', eager: true }
);

/**
 * Where `$effect` is allowed, and how many times. Prefer `$derived`; raising a count here needs
 * a reason in review. `valueEditorEffect` resets a value after an operator/type change, which is
 * genuinely a side effect.
 */
const effectBudget: Record<string, number> = { './reactive/valueEditorEffect.svelte.ts': 1 };

describe('$effect budget', () => {
  it('matches the allow-list exactly', () => {
    const actual: Record<string, number> = {};
    for (const [path, text] of Object.entries(sources)) {
      const n = text.match(/\$effect(\.pre)?\s*\(/g)?.length ?? 0;
      if (n > 0) actual[path] = n;
    }
    expect(actual).toEqual(effectBudget);
  });
});
