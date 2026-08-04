import type { Field, RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { QueryManager, defaultOperators } from '@react-querybuilder/core';
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { QueryBuilderProps } from '../types/props';
import { createQueryBuilderState } from './createQueryBuilderState.svelte';

const fields: Field[] = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

/**
 * Runs `fn` inside an effect root, flushes pending effects, and returns both the result and a
 * `cleanup` function. Effects require a root when created outside a component.
 */
/** The `name` of each option in a flat option list. */
const names = (list: readonly unknown[]): string[] => list.map(o => (o as { name: string }).name);

const withRoot = <T>(fn: () => T): { result: T; cleanup: () => void; flush: () => void } => {
  let result!: T;
  const cleanup = $effect.root(() => {
    result = fn();
  });
  flushSync();
  return { result, cleanup, flush: () => flushSync() };
};

describe('createQueryBuilderState', () => {
  it('creates an empty root group when no query is provided', () => {
    const { result: state, cleanup } = withRoot(() => createQueryBuilderState(() => ({ fields })));
    expect(state.query.rules).toEqual([]);
    expect(state.query.combinator).toBe('and');
    expect(state.query.id).toEqual(expect.any(String));
    cleanup();
  });

  it('seeds from defaultQuery and adds ids', () => {
    const defaultQuery: RuleGroupType = {
      combinator: 'or',
      rules: [{ field: 'firstName', operator: '=', value: 'Steve' }],
    };
    const { result: state, cleanup } = withRoot(() =>
      createQueryBuilderState(() => ({ fields, defaultQuery }))
    );
    expect(state.query.combinator).toBe('or');
    expect(state.query.rules[0]).toHaveProperty('id', expect.any(String));
    cleanup();
  });

  it('seeds from the query prop', () => {
    const query: RuleGroupType = { combinator: 'and', rules: [], id: 'root' };
    const { result: state, cleanup } = withRoot(() =>
      createQueryBuilderState(() => ({ fields, query }))
    );
    expect(state.query).toBe(query);
    cleanup();
  });

  it('calls onQueryChange on mount', () => {
    const onQueryChange = vi.fn();
    const { result: state, cleanup } = withRoot(() =>
      createQueryBuilderState(() => ({ fields, onQueryChange }))
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith(state.query);
    cleanup();
  });

  it('does not call onQueryChange on mount when enableMountQueryChange is false', () => {
    const onQueryChange = vi.fn();
    const { cleanup } = withRoot(() =>
      createQueryBuilderState(() => ({ fields, onQueryChange, enableMountQueryChange: false }))
    );
    expect(onQueryChange).not.toHaveBeenCalled();
    cleanup();
  });

  it('updates the query, calls onQueryChange, and writes back on each commit', () => {
    const onQueryChange = vi.fn();
    const writeBack = vi.fn();
    const {
      result: state,
      cleanup,
      flush,
    } = withRoot(() => createQueryBuilderState(() => ({ fields, onQueryChange }), { writeBack }));
    onQueryChange.mockClear();
    writeBack.mockClear();

    state.actions.onRuleAdd(state.manager.createRule(), []);
    flush();

    expect(state.query.rules).toHaveLength(1);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith(state.query);
    expect(writeBack).toHaveBeenCalledWith(state.query);
    cleanup();
  });

  it('notifies once per batch', () => {
    const onQueryChange = vi.fn();
    const {
      result: state,
      cleanup,
      flush,
    } = withRoot(() => createQueryBuilderState(() => ({ fields, onQueryChange })));
    onQueryChange.mockClear();

    state.manager.batch(() => {
      state.manager.add(state.manager.createRule(), []);
      state.manager.add(state.manager.createRule(), []);
    });
    flush();

    expect(state.query.rules).toHaveLength(2);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('pushes a new query prop into the manager without looping', () => {
    const props = $state<QueryBuilderProps>({
      fields,
      query: { combinator: 'and', rules: [], id: 'q1' },
    });
    // Reassigns `query` on every change, the classic controlled-mode feedback-loop setup.
    props.onQueryChange = q => {
      props.query = q;
    };

    const { result: state, cleanup, flush } = withRoot(() => createQueryBuilderState(() => props));

    props.query = { combinator: 'or', rules: [], id: 'q2' };
    flush();

    expect(state.query.id).toBe('q2');
    expect(state.query.combinator).toBe('or');
    expect(state.manager.getQuery().id).toBe('q2');
    cleanup();
  });

  it('accepts a deeply reactive query prop', () => {
    // A parent holding the query in `$state` hands back a proxy, which the manager's deep
    // freeze rejects; the state layer snapshots it instead.
    const props = $state<QueryBuilderProps>({ fields });
    props.query = { combinator: 'and', id: 'proxied', rules: [] };

    const { result: state, cleanup, flush } = withRoot(() => createQueryBuilderState(() => props));
    expect(state.query.id).toBe('proxied');

    props.query = { combinator: 'or', id: 'proxied2', rules: [] };
    flush();
    expect(state.query.combinator).toBe('or');

    // Handing back the committed query (as a proxy) is a no-op, not a loop.
    const committed = state.query;
    props.query = { ...committed } as never;
    flush();
    expect(state.query).toBe(committed);
    cleanup();
  });

  it('uses an externally provided manager', () => {
    const manager = new QueryManager<RuleGroupType>(
      { combinator: 'and', rules: [], id: 'external' },
      { fields }
    );
    const {
      result: state,
      cleanup,
      flush,
    } = withRoot(() => createQueryBuilderState(() => ({ fields, manager })));

    expect(state.manager).toBe(manager);
    expect(state.query.id).toBe('external');

    manager.add(manager.createRule(), []);
    flush();
    expect(state.query.rules).toHaveLength(1);
    cleanup();
  });

  describe('schema', () => {
    it('exposes prepared option lists', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields }))
      );
      const { schema } = state;
      expect(schema.fields).toHaveLength(2);
      expect(schema.fieldMap.firstName).toHaveProperty('label', 'First Name');
      expect(names(schema.combinators)).toEqual(['and', 'or']);
      expect(schema.getOperators('firstName', { fieldData: schema.fieldMap.firstName! })).toEqual(
        defaultOperators
      );
      cleanup();
    });

    it('prepends placeholder options when autoSelectField is false', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({
          fields,
          autoSelectField: false,
          translations: { fields: { placeholderLabel: 'Pick one' } },
        }))
      );
      expect(state.schema.fields[0]).toHaveProperty('label', 'Pick one');
      cleanup();
    });

    it('defaults getInputType to text and honors the prop', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, getInputType: () => 'number' }))
      );
      const misc = { fieldData: state.schema.fieldMap.firstName! };
      expect(state.schema.getInputType('firstName', '=', misc)).toBe('number');
      cleanup();

      const bare = withRoot(() => createQueryBuilderState(() => ({ fields })));
      expect(bare.result.schema.getInputType('firstName', '=', misc)).toBe('text');
      bare.cleanup();
    });

    it('exposes the remaining resolvers', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({
          fields: [
            ...fields,
            { name: 'status', label: 'Status', values: [{ name: 'a', label: 'A' }] },
          ],
          getValues: () => [{ name: 'x', label: 'X' }],
          getValueSources: () => ['value', 'field'],
          getMatchModes: () => ['all'],
          getParameters: () => [{ name: 'p1', label: 'P1' }],
          getValueEditorSeparator: () => 'to',
          getRuleClassname: () => 'custom-rule',
          getRuleGroupClassname: () => 'custom-group',
          getSubQueryBuilderProps: () => ({ fields: [] }),
          getValueEditorType: () => 'select',
        }))
      );
      const { schema } = state;
      const fieldData = schema.fieldMap.firstName!;
      const misc = { fieldData };

      // `autoSelectValue` defaults to `false`, so a placeholder option is prepended.
      expect(names(schema.getValues('firstName', '=', misc))).toEqual(['~', 'x']);
      expect(names(schema.getValueSources('firstName', '=', misc))).toEqual(['value', 'field']);
      expect(names(schema.getMatchModes('firstName', misc))).toEqual(['all']);
      expect(names(schema.getParameters('firstName', '=', misc))).toEqual(['p1']);
      expect(schema.getValueEditorSeparator('firstName', 'between', misc)).toBe('to');
      expect(schema.getValueEditorType('firstName', '=', misc)).toBe('select');
      expect(schema.getRuleClassname({ field: 'firstName', operator: '=', value: '' }, misc)).toBe(
        'custom-rule'
      );
      expect(schema.getRuleGroupClassname(state.query)).toBe('custom-group');
      expect(schema.getSubQueryBuilderProps('firstName', misc)).toEqual({ fields: [] });
      expect(schema.getRuleDefaultOperator('firstName')).toBe('=');
      expect(schema.getRuleDefaultValue({ field: 'firstName', operator: '=', value: '' })).toBe(
        '~'
      );
      expect(schema.getQuery()).toBe(state.query);
      cleanup();
    });

    it('falls back to empty resolvers when the props are absent', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields }))
      );
      const { schema } = state;
      const misc = { fieldData: schema.fieldMap.firstName! };
      expect(schema.getValueEditorSeparator('firstName', 'between', misc)).toBe('');
      expect(schema.getRuleClassname({ field: 'firstName', operator: '=', value: '' }, misc)).toBe(
        ''
      );
      expect(schema.getRuleGroupClassname(state.query)).toBe('');
      expect(schema.getSubQueryBuilderProps('firstName', misc)).toEqual({});
      expect(schema.getParameters('firstName', '=', misc)).toEqual([]);
      expect(schema.accessibleDescriptionGenerator({ path: [], qbId: '' })).toEqual(
        expect.any(String)
      );
      cleanup();
    });

    it('creates rules and groups through the manager', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, addRuleToNewGroups: true }))
      );
      expect(state.schema.createRule()).toMatchObject({ field: 'firstName', operator: '=' });
      expect(state.schema.createRuleGroup().rules).toHaveLength(1);
      cleanup();
    });

    it('creates independent-combinator groups when the query is IC', () => {
      const query: RuleGroupTypeIC = { rules: [], id: 'ic' };
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, query }))
      );
      expect(state.independentCombinators).toBe(true);
      expect(state.schema.createRuleGroup()).not.toHaveProperty('combinator');
      cleanup();
    });
  });

  describe('miscellaneous', () => {
    it('derives the wrapper classname', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, controlClassnames: { queryBuilder: 'custom' } }))
      );
      expect(state.wrapperClassName).toBe('queryBuilder custom');
      cleanup();
    });

    it('adds the disabled classname when the whole query is disabled', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, disabled: true }))
      );
      expect(state.queryDisabled).toBe(true);
      expect(state.rootGroupDisabled).toBe(false);
      expect(state.wrapperClassName).toContain('queryBuilder-disabled');
      cleanup();
    });

    it('treats the root path in disabledPaths as a disabled root group', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, disabled: [[]] }))
      );
      expect(state.queryDisabled).toBe(false);
      expect(state.rootGroupDisabled).toBe(true);
      expect(state.schema.disabledPaths).toEqual([[]]);
      cleanup();
    });

    it('reports validation results', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, validator: () => false }))
      );
      expect(state.wrapperClassName).toContain('queryBuilder-invalid');
      expect(state.schema.validationMap).toEqual({});
      cleanup();
    });

    it('always reports drag-and-drop as disabled', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields }))
      );
      expect(state.dndEnabledAttr).toBe('disabled');
      expect(state.inlineCombinatorsAttr).toBe('disabled');
      cleanup();
    });

    it('enables inline combinators for IC queries and showCombinatorsBetweenRules', () => {
      const ic = withRoot(() =>
        createQueryBuilderState(() => ({
          fields,
          query: { rules: [], id: 'ic' } as RuleGroupTypeIC,
        }))
      );
      expect(ic.result.inlineCombinatorsAttr).toBe('enabled');
      ic.cleanup();

      const between = withRoot(() =>
        createQueryBuilderState(() => ({ fields, showCombinatorsBetweenRules: true }))
      );
      expect(between.result.inlineCombinatorsAttr).toBe('enabled');
      between.cleanup();
    });

    it('exposes config for the downstream context', () => {
      const { result: state, cleanup } = withRoot(() =>
        createQueryBuilderState(() => ({ fields, showNotToggle: true }))
      );
      expect(state.context.showNotToggle).toBe(true);
      expect(state.context.controlClassnames).toBe(state.classNames);
      expect(state.context.translations).toBe(state.translations);
      cleanup();
    });
  });
});
