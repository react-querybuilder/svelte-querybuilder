import type { Field, RuleGroupType } from '@react-querybuilder/core';
import { QueryManager } from '@react-querybuilder/core';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { createRuleContext } from './ruleContext.svelte.js';
import { createRuleGroupContext } from './ruleGroupContext.svelte.js';

const fields: Field[] = [
  { name: 'f1', label: 'F1', datatype: 'text' },
  { name: 'f2', label: 'F2', values: [{ name: 'v', label: 'V' }], valueEditorType: 'select' },
];

const query: RuleGroupType = {
  combinator: 'and',
  id: 'root',
  rules: [
    { id: 'r1', field: 'f1', operator: '=', value: '' },
    { id: 'g1', combinator: 'or', rules: [] },
  ],
};

const withRoot = <T>(fn: () => T) => {
  let result!: T;
  const cleanup = $effect.root(() => {
    result = fn();
  });
  flushSync();
  return { result, cleanup };
};

describe('createRuleContext', () => {
  it('resolves the rule configuration and tracks query identity', () => {
    const manager = new QueryManager<RuleGroupType>(query, { fields });
    let reactiveQuery = $state.raw(manager.getQuery());
    manager.subscribe(() => {
      reactiveQuery = manager.getQuery();
    });

    const { result: context, cleanup } = withRoot(() =>
      createRuleContext(
        () => manager,
        () => [0],
        () => reactiveQuery
      )
    );

    expect(context.current?.fieldData).toHaveProperty('label', 'F1');
    expect(context.current?.valueEditorType).toBe('text');

    manager.update('field', 'f2', [0]);
    flushSync();

    expect(context.current?.fieldData).toHaveProperty('label', 'F2');
    expect(context.current?.valueEditorType).toBe('select');
    cleanup();
  });

  it('returns null for a path that is not a rule', () => {
    const manager = new QueryManager<RuleGroupType>(query, { fields });
    const { result: context, cleanup } = withRoot(() =>
      createRuleContext(
        () => manager,
        () => [1],
        () => manager.getQuery()
      )
    );
    expect(context.current).toBeNull();
    cleanup();
  });
});

describe('createRuleGroupContext', () => {
  it('resolves the group configuration and tracks query identity', () => {
    const manager = new QueryManager<RuleGroupType>(query, { fields });
    let reactiveQuery = $state.raw(manager.getQuery());
    manager.subscribe(() => {
      reactiveQuery = manager.getQuery();
    });

    const { result: context, cleanup } = withRoot(() =>
      createRuleGroupContext(
        () => manager,
        () => [1],
        () => reactiveQuery
      )
    );

    expect(context.current?.combinator).toBe('or');
    expect(context.current?.independentCombinators).toBe(false);

    manager.update('combinator', 'and', [1]);
    flushSync();

    expect(context.current?.combinator).toBe('and');
    cleanup();
  });

  it('resolves the root group by default and returns null for a rule', () => {
    const manager = new QueryManager<RuleGroupType>(query, { fields });
    const root = withRoot(() =>
      createRuleGroupContext(
        () => manager,
        () => [],
        () => manager.getQuery()
      )
    );
    expect(root.result.current?.combinator).toBe('and');
    root.cleanup();

    const notAGroup = withRoot(() =>
      createRuleGroupContext(
        () => manager,
        () => [0],
        () => manager.getQuery()
      )
    );
    expect(notAGroup.result.current).toBeNull();
    notAGroup.cleanup();
  });
});
