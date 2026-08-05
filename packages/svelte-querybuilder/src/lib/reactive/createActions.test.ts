import type { Field, RuleGroupType, RuleType } from '@react-querybuilder/core';
import { QueryManager } from '@react-querybuilder/core';
import { describe, expect, it, vi } from 'vitest';
import type { QueryBuilderProps } from '../types/props.js';
import { createActions } from './createActions.svelte.js';

const fields: Field[] = [
  { name: 'f1', label: 'F1' },
  { name: 'f2', label: 'F2' },
];

const setup = (
  props: QueryBuilderProps = {},
  query: RuleGroupType = {
    combinator: 'and',
    id: 'root',
    rules: [
      { id: 'r1', field: 'f1', operator: '=', value: 'v1' },
      { id: 'r2', field: 'f2', operator: '=', value: 'v2' },
    ],
  }
) => {
  const manager = new QueryManager<RuleGroupType>(query, { fields });
  const actions = createActions(() => ({ fields, ...props }), manager);
  return { manager, actions };
};

const rule = (id: string): RuleType => ({ id, field: 'f1', operator: '=', value: 'new' });

describe('createActions', () => {
  describe('onRuleAdd', () => {
    it('adds a rule', () => {
      const { manager, actions } = setup();
      actions.onRuleAdd(rule('r3'), []);
      expect(manager.getQuery().rules).toHaveLength(3);
    });

    it('respects a veto from onAddRule', () => {
      const { manager, actions } = setup({ onAddRule: () => false });
      actions.onRuleAdd(rule('r3'), []);
      expect(manager.getQuery().rules).toHaveLength(2);
    });

    it('adds the replacement returned by onAddRule', () => {
      const onAddRule = vi.fn(() => rule('replacement'));
      const { manager, actions } = setup({ onAddRule });
      actions.onRuleAdd(rule('r3'), [], 'ctx');
      expect(manager.getQuery().rules.at(-1)).toHaveProperty('id', 'replacement');
      expect(onAddRule).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r3' }),
        [],
        expect.objectContaining({ id: 'root' }),
        'ctx'
      );
    });
  });

  describe('onGroupAdd', () => {
    it('adds a group', () => {
      const { manager, actions } = setup();
      actions.onGroupAdd(manager.createRuleGroup(), []);
      expect(manager.getQuery().rules).toHaveLength(3);
    });

    it('respects a veto from onAddGroup', () => {
      const { manager, actions } = setup({ onAddGroup: () => false });
      actions.onGroupAdd(manager.createRuleGroup(), []);
      expect(manager.getQuery().rules).toHaveLength(2);
    });

    it('adds the replacement returned by onAddGroup', () => {
      const replacement: RuleGroupType = { id: 'g9', combinator: 'or', rules: [] };
      const { manager, actions } = setup({ onAddGroup: () => replacement });
      actions.onGroupAdd(manager.createRuleGroup(), []);
      expect(manager.getQuery().rules.at(-1)).toHaveProperty('id', 'g9');
    });
  });

  describe('onPropChange', () => {
    it('updates a property', () => {
      const { manager, actions } = setup();
      actions.onPropChange('value', 'updated', [0]);
      expect(manager.getRule([0])).toHaveProperty('value', 'updated');
    });

    it('resets the operator and value when the field changes', () => {
      const { manager, actions } = setup();
      actions.onPropChange('field', 'f2', [0]);
      expect(manager.getRule([0])).toMatchObject({ field: 'f2', value: '' });
    });
  });

  describe('remove', () => {
    it('removes rules and groups', () => {
      const { manager, actions } = setup();
      actions.onRuleRemove([0]);
      expect(manager.getQuery().rules).toHaveLength(1);
      actions.onGroupRemove([0]);
      expect(manager.getQuery().rules).toHaveLength(0);
    });

    it('respects a veto from onRemove', () => {
      const onRemove = vi.fn(() => false);
      const { manager, actions } = setup({ onRemove });
      actions.onRuleRemove([0]);
      expect(manager.getQuery().rules).toHaveLength(2);
      expect(onRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1' }),
        [0],
        expect.objectContaining({ id: 'root' }),
        undefined
      );
    });

    it('ignores an unresolvable path', () => {
      const { manager, actions } = setup({ onRemove: () => true });
      actions.onRuleRemove([9]);
      expect(manager.getQuery().rules).toHaveLength(2);
    });
  });

  describe('moveRule', () => {
    it('moves a rule', () => {
      const { manager, actions } = setup();
      actions.moveRule([0], 'down');
      expect(manager.getQuery().rules.map(r => (r as RuleType).id)).toEqual(['r2', 'r1']);
    });

    it('clones a rule', () => {
      const { manager, actions } = setup();
      actions.moveRule([0], [2], true);
      expect(manager.getQuery().rules).toHaveLength(3);
    });

    it('respects a veto from onMoveRule', () => {
      const { manager, actions } = setup({ onMoveRule: () => false });
      actions.moveRule([0], 'down');
      expect(manager.getQuery().rules.map(r => (r as RuleType).id)).toEqual(['r1', 'r2']);
    });

    it('applies the replacement query returned by onMoveRule', () => {
      const replacement: RuleGroupType = { id: 'replaced', combinator: 'and', rules: [] };
      const onMoveRule = vi.fn((..._args: unknown[]) => replacement);
      const { manager, actions } = setup({ onMoveRule });
      actions.moveRule([0], 'down', false, 'ctx');
      expect(manager.getQuery().id).toBe('replaced');
      const [ruleArg, from, to, query, nextQuery, options, context] = onMoveRule.mock.calls[0]!;
      expect(ruleArg).toHaveProperty('id', 'r1');
      expect(from).toEqual([0]);
      expect(to).toBe('down');
      expect(query).toHaveProperty('id', 'root');
      expect((nextQuery as RuleGroupType).rules.map(r => (r as RuleType).id)).toEqual(['r2', 'r1']);
      expect(options).toEqual({ clone: false });
      expect(context).toBe('ctx');
      // The preview must not have touched the manager before the callback ran.
      expect(query).not.toBe(nextQuery);
    });

    it('routes groups to onMoveGroup', () => {
      const onMoveGroup = vi.fn(() => true);
      const onMoveRule = vi.fn(() => true);
      const { actions } = setup(
        { onMoveGroup, onMoveRule },
        {
          combinator: 'and',
          id: 'root',
          rules: [
            { id: 'g1', combinator: 'and', rules: [] },
            { id: 'r1', field: 'f1', operator: '=', value: '' },
          ],
        }
      );
      actions.moveRule([0], 'down');
      expect(onMoveGroup).toHaveBeenCalledTimes(1);
      expect(onMoveRule).not.toHaveBeenCalled();
    });

    it('does nothing when the move is a no-op', () => {
      const onMoveRule = vi.fn(() => true);
      const { manager, actions } = setup({ onMoveRule });
      const before = manager.getQuery();
      actions.moveRule([0], 'up');
      expect(manager.getQuery()).toBe(before);
      expect(onMoveRule).not.toHaveBeenCalled();
    });

    it('ignores an unresolvable path', () => {
      const { manager, actions } = setup();
      const before = manager.getQuery();
      actions.moveRule([9], 'up');
      expect(manager.getQuery()).toBe(before);
    });
  });

  describe('groupRule', () => {
    it('groups two rules', () => {
      const { manager, actions } = setup();
      actions.groupRule([0], [1]);
      const target = manager.getQuery().rules[0] as RuleGroupType;
      expect(target.rules).toHaveLength(2);
    });

    it('respects a veto from onGroupRule', () => {
      const { manager, actions } = setup({ onGroupRule: () => false });
      actions.groupRule([0], [1]);
      expect(manager.getQuery().rules).toHaveLength(2);
    });

    it('applies the replacement query returned by onGroupRule', () => {
      const replacement: RuleGroupType = { id: 'replaced', combinator: 'and', rules: [] };
      const { manager, actions } = setup({ onGroupRule: () => replacement });
      actions.groupRule([0], [1]);
      expect(manager.getQuery().id).toBe('replaced');
    });

    it('routes groups to onGroupGroup', () => {
      const onGroupGroup = vi.fn(() => true);
      const { actions } = setup(
        { onGroupGroup },
        {
          combinator: 'and',
          id: 'root',
          rules: [
            { id: 'g1', combinator: 'and', rules: [] },
            { id: 'r1', field: 'f1', operator: '=', value: '' },
          ],
        }
      );
      actions.groupRule([0], [1]);
      expect(onGroupGroup).toHaveBeenCalledTimes(1);
    });

    it('ignores an unresolvable path', () => {
      const { manager, actions } = setup();
      const before = manager.getQuery();
      actions.groupRule([9], [1]);
      expect(manager.getQuery()).toBe(before);
    });
  });

  it('honors the manager guards without duplicating them', () => {
    const manager = new QueryManager<RuleGroupType>(
      {
        combinator: 'and',
        id: 'root',
        rules: [{ id: 'r1', field: 'f1', operator: '=', value: '' }],
      },
      { fields, queryDisabled: true }
    );
    const actions = createActions(() => ({ fields }), manager);
    const before = manager.getQuery();
    actions.onRuleAdd(rule('r2'), []);
    actions.onRuleRemove([0]);
    actions.onPropChange('value', 'x', [0]);
    expect(manager.getQuery()).toBe(before);
  });
});
