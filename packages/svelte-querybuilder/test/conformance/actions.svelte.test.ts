/**
 * The port-side half of the action conformance suite: the guard-sensitive sequences replayed
 * through the manager `createQueryBuilderState` builds from `QueryBuilderProps`, rather than
 * through a manager configured directly.
 *
 * This is what catches an option-mapping bug — a `disabled` array that never reaches
 * `disabledPaths`, or a `maxLevels` that defaults wrong. Two narrowings relative to
 * `actions.test.ts`:
 *
 * - Only the resulting query is asserted. `QueryBuilderProps` has no `onInvalidTarget`, so abort
 *   reasons are not observable here; a guard that fails to apply shows up anyway as a query that
 *   changed when it should not have.
 * - `id`s are stripped before comparing. `createQueryBuilderState` seeds its manager through
 *   `resolveCandidateQuery`, which draws from the injected generator, so generated `id`s are
 *   offset by the seeding draws. That offset is an artifact of construction, not of mutation.
 *
 * `.svelte.test.ts` rather than `.test.ts` because `$effect.root` requires the Svelte compiler.
 */

import { formatQuery } from '@react-querybuilder/core';
import type { RuleGroupType, RuleGroupTypeAny } from '@react-querybuilder/core';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { createQueryBuilderState } from '../../src/lib/reactive/createQueryBuilderState.svelte';
import type { QueryBuilderProps } from '../../src/lib/types';
import { loadFixture } from './cases';
import { createIdGenerator, queries, type QueryFixtureName } from './queries';
import { replay, type ActionCase, type RunOptions, type RunResult } from './replay';

const fixture = await loadFixture<{ cases: ActionCase[] }>('actions.json');

const stripIDs = (query: RuleGroupTypeAny): unknown =>
  JSON.parse(formatQuery(query as RuleGroupType, 'json_without_ids'));

/** `respectDisabled: false` has no prop equivalent, so those cases are skipped. */
const eligible = fixture.cases.filter(
  c =>
    c.options.respectDisabled !== false &&
    (c.options.disabledPaths !== undefined ||
      c.options.maxLevels !== undefined ||
      c.fixture === 'rootDisabled' ||
      c.fixture === 'withDisabled')
);

const propsFor = (options: RunOptions): Partial<QueryBuilderProps> => ({
  ...(options.queryDisabled ? { disabled: true } : {}),
  ...(options.disabledPaths ? { disabled: options.disabledPaths } : {}),
  ...(options.maxLevels === undefined ? {} : { maxLevels: options.maxLevels }),
});

describe('conformance: actions through createQueryBuilderState', () => {
  it('has guard-sensitive cases to replay', () => {
    expect(eligible.length).toBeGreaterThan(5);
  });

  for (const { name, fixture: fixtureName, ops, options, expected } of eligible) {
    it(name, () => {
      let result!: RunResult;

      const cleanup = $effect.root(() => {
        result = replay(ops, () => {
          const state = createQueryBuilderState(
            () =>
              ({
                ...propsFor(options),
                query: structuredClone(queries[fixtureName as QueryFixtureName]),
                idGenerator: createIdGenerator(),
                // The fixture corpus mixes `RuleGroupType` and `RuleGroupTypeIC`, which
                // `QueryBuilderProps` discriminates between. The cast collapses that here; the
                // discrimination itself is covered by `types.test-d.ts`.
              }) as QueryBuilderProps
          );
          return state.manager;
        });
      });
      flushSync();
      cleanup();

      expect(stripIDs(result.query)).toEqual(stripIDs(expected.query));
    });
  }
});
