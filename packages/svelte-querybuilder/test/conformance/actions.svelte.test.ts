/**
 * The port-side half of the action conformance suite: the guard-sensitive sequences replayed
 * through `createQueryBuilderState`'s `actions`, rather than through a `QueryManager` configured
 * directly.
 *
 * This is what catches an option-mapping bug — a `disabled` array that never reaches
 * `disabledPaths`, or a `maxLevels` that defaults wrong. Three narrowings relative to
 * `actions.test.ts`:
 *
 * - Only the resulting query is asserted. `QueryBuilderProps` has no `onInvalidTarget`, so abort
 *   reasons are not observable here; a guard that fails to apply shows up anyway as a query that
 *   changed when it should not have.
 * - `id`s are stripped before comparing. The initial query is seeded through
 *   `resolveCandidateQuery`, which draws from the injected generator, so generated `id`s are
 *   offset by the seeding draws. That offset is an artifact of construction, not of mutation.
 * - Cases containing an `insert` op are skipped: `QueryActions` has no insert handler, so there
 *   is no prop-level path to exercise.
 *
 * The `updateResolvers` the fixtures were generated against are reproduced here through the prop
 * surface (`getDefaultOperator`, `getDefaultValue`, `getValueSources`, `getMatchModes`) instead
 * of being passed to `update` directly, which makes the mapping itself part of what is verified.
 *
 * `.svelte.test.ts` rather than `.test.ts` because `$effect.root` requires the Svelte compiler.
 */

import type {
  MatchModeOptions,
  Path,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleType,
  ValueSourceFullOptions,
} from '@react-querybuilder/core';
import { formatQuery, getPathOfID, isRuleGroup } from '@react-querybuilder/core';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { createQueryBuilderState } from '../../src/lib/reactive/createQueryBuilderState.svelte';
import type { QueryBuilderProps } from '../../src/lib/types';
import { loadFixture } from './cases';
import { createIdGenerator, queries, type QueryFixtureName } from './queries';
import type { ActionCase, Op, RunOptions } from './replay';

const fixture = await loadFixture<{ cases: ActionCase[] }>('actions.json');

const stripIDs = (query: RuleGroupTypeAny): unknown =>
  JSON.parse(formatQuery(query as RuleGroupType, 'json_without_ids'));

/**
 * `respectDisabled: false` has no prop equivalent, and `insert` has no action equivalent, so
 * those cases are skipped.
 */
const eligible = fixture.cases.filter(
  c =>
    c.options.respectDisabled !== false &&
    !c.ops.some(op => op.kind === 'insert') &&
    (c.options.disabledPaths !== undefined ||
      c.options.maxLevels !== undefined ||
      c.fixture === 'rootDisabled' ||
      c.fixture === 'withDisabled')
);

const valueSources: ValueSourceFullOptions = [{ name: 'value', value: 'value', label: 'Value' }];

const propsFor = (options: RunOptions): Partial<QueryBuilderProps> => ({
  ...(options.queryDisabled ? { disabled: true } : {}),
  ...(options.disabledPaths ? { disabled: options.disabledPaths } : {}),
  ...(options.maxLevels === undefined ? {} : { maxLevels: options.maxLevels }),
  // The prop-level equivalents of `replay.ts`'s `updateResolvers`.
  getDefaultOperator: '=',
  getDefaultValue: () => '',
  getValueSources: () => valueSources,
  getMatchModes: (): MatchModeOptions => [],
});

describe('conformance: actions through createQueryBuilderState', () => {
  it('has guard-sensitive cases to replay', () => {
    expect(eligible.length).toBeGreaterThan(5);
  });

  for (const { name, fixture: fixtureName, ops, options, expected } of eligible) {
    it(name, () => {
      let result!: RuleGroupTypeAny;

      // Built once. A fresh object on every `getProps()` call would read as a new `query` prop
      // on every derivation, reverting each mutation as fast as it was applied.
      //
      // The fixture corpus mixes `RuleGroupType` and `RuleGroupTypeIC`, which
      // `QueryBuilderProps` discriminates between. The cast collapses that here; the
      // discrimination itself is covered by `types.test-d.ts`.
      const props = {
        ...propsFor(options),
        query: structuredClone(queries[fixtureName as QueryFixtureName]),
        idGenerator: createIdGenerator(),
      } as QueryBuilderProps;

      const cleanup = $effect.root(() => {
        const state = createQueryBuilderState(() => props);

        /** Resolves an op target, which the fixtures express as either a path or an `id`. */
        const pathOf = (target: Path | string): Path | null =>
          typeof target === 'string' ? getPathOfID(target, state.query) : target;

        const applyOp = (op: Op): void => {
          switch (op.kind) {
            case 'add': {
              const parent = pathOf(op.parent);
              if (!parent) return;
              if (isRuleGroup(op.ruleOrGroup)) {
                state.actions.onGroupAdd(op.ruleOrGroup as never, parent);
              } else {
                state.actions.onRuleAdd(op.ruleOrGroup as RuleType, parent);
              }
              break;
            }
            case 'update': {
              const path = pathOf(op.target);
              // `UpdateableProperties` admits arbitrary strings; `QueryActions` names the
              // known ones. The fixtures only use known ones.
              if (path) state.actions.onPropChange(op.prop as 'value', op.value, path);
              break;
            }
            case 'remove': {
              const path = pathOf(op.target);
              if (!path) return;
              // `onRuleRemove` and `onGroupRemove` are the same handler; either will do.
              state.actions.onRuleRemove(path);
              break;
            }
            case 'move': {
              const from = pathOf(op.from);
              if (from) state.actions.moveRule(from, op.to as Path, op.clone);
              break;
            }
            case 'group': {
              const from = pathOf(op.from);
              const to = pathOf(op.to);
              if (from && to) state.actions.groupRule(from, to, op.clone);
              break;
            }
          }
        };

        for (const op of ops) {
          applyOp(op);
          flushSync();
        }

        result = state.query;
      });
      flushSync();
      cleanup();

      expect(stripIDs(result)).toEqual(stripIDs(expected.query));
    });
  }
});
