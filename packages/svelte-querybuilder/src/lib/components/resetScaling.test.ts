/**
 * Guards the mount cost of value-editor resets against the reaction-graph blowup fixed in
 * `withCommonProps`.
 *
 * Rules whose `value` no longer matches their `operator` make `getValueEditorReset` return
 * `reset: true`, and each reset commits a query change during mount. When control prop bags were
 * eagerly-evaluated object literals, every one of those commits dirtied every prop of every
 * control in the tree, so `n` reset-eligible rules cost O(n^2) with an enormous constant — the
 * `multiValue` a11y scenario took ~1s, most of it in Svelte's `mark_reactions`.
 *
 * This asserts SCALING, never a wall-clock budget: CI runners are slow and variable, and a fixed
 * millisecond threshold is exactly the flake that produced the 30s `testTimeout`. The ratio is
 * self-normalizing, so a uniformly slower machine does not move it.
 */

import { render } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [
  { name: 'f1', label: 'F1' },
  { name: 'f2', label: 'F2', inputType: 'number' },
];

const query = (resetCount: number) => ({
  id: 'root',
  combinator: 'and',
  // `value` is a list but `operator` is not, so `getValueEditorReset` returns `reset: true`.
  rules: Array.from({ length: resetCount }, (_, i) => ({
    id: `r${i}`,
    field: 'f1',
    operator: '=',
    value: ['a', 'b'],
  })),
});

/** Bounded settle. Each reset schedules another flush, so a single `tick()` is not enough. */
const settle = async () => {
  for (let i = 0; i < 12; i++) await tick();
};

const mountCost = async (resetCount: number): Promise<number> => {
  const props = {
    fields,
    listsAsArrays: true,
    defaultQuery: query(resetCount),
  } as unknown as ComponentProps<typeof QueryBuilder>;

  const start = performance.now();
  const { unmount } = render(QueryBuilder, { props });
  await settle();
  const elapsed = performance.now() - start;
  unmount();

  return elapsed;
};

/** Median over several runs, discarding the first as JIT warmup. */
const medianMountCost = async (resetCount: number): Promise<number> => {
  await mountCost(resetCount);
  const samples: number[] = [];
  for (let i = 0; i < 5; i++) samples.push(await mountCost(resetCount));

  return samples.toSorted((a, b) => a - b)[2];
};

describe('value-editor reset scaling', () => {
  it('stays roughly linear in the number of reset-eligible rules', async () => {
    const one = await medianMountCost(1);
    const four = await medianMountCost(4);

    // 4x the rules. Measures ~3-4x when linear, because fixed per-mount cost is amortized; the
    // regression measured ~15x. The threshold sits well clear of both.
    //
    // Noise can only inflate `one`, which shrinks the ratio, so this errs toward passing.
    expect(four / one).toBeLessThan(8);
  });
});
