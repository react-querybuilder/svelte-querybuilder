import type { RuleGroupType } from '@react-querybuilder/core';
import { QueryManager, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

const altFields = [
  { name: 'age', label: 'Age' },
  { name: 'height', label: 'Height' },
];

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'firstName', operator: '=', value: 'Steve' }],
};

const optionValues = (select: HTMLElement) =>
  [...(select as HTMLSelectElement).querySelectorAll('option')].map(o => o.value);

const optionLabels = (select: HTMLElement) =>
  [...(select as HTMLSelectElement).querySelectorAll('option')].map(o => o.textContent);

const innerAddGroup = () => screen.getAllByTestId(TestID.addGroup)[1];

const subSelector = () => screen.getAllByTestId(TestID.fields).at(-1)!;

const subFields = (subproperties: { name: string; label: string }[]) => [
  { name: 'tags', label: 'Tags', matchModes: true, subproperties },
];

/**
 * Structural options reach the manager through `reconfigure`, so a changed prop updates the
 * option lists in place without discarding the query, the undo/redo history, or subscribers.
 */
describe('QueryBuilder reconfiguration', () => {
  it('updates the field selector when `fields` changes', async () => {
    const { rerender } = render(QueryBuilder, { props: { fields, defaultQuery: query } });

    expect(optionValues(screen.getByTestId(TestID.fields))).toEqual(['firstName', 'lastName']);

    await rerender({ fields: altFields, defaultQuery: query });

    expect(optionValues(screen.getByTestId(TestID.fields))).toEqual(['age', 'height']);
  });

  it('uses the new `fields` for rules added after the change', async () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, onQueryChange },
    });

    await rerender({ fields: altFields, defaultQuery: query, onQueryChange });
    await userEvent.click(screen.getByTestId(TestID.addRule));

    const nextQuery = onQueryChange.mock.lastCall![0] as RuleGroupType;
    expect(nextQuery.rules).toHaveLength(2);
    expect((nextQuery.rules[1] as { field: string }).field).toBe('age');
  });

  it('updates the operator selector when `operators` changes', async () => {
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, operators: [{ name: '=', label: 'is' }] },
    });

    expect(optionValues(screen.getByTestId(TestID.operators))).toEqual(['=']);

    await rerender({
      fields,
      defaultQuery: query,
      operators: [
        { name: '=', label: 'is' },
        { name: '!=', label: 'is not' },
      ],
    });

    expect(optionValues(screen.getByTestId(TestID.operators))).toEqual(['=', '!=']);
  });

  it('updates the combinator selector when `combinators` changes', async () => {
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, combinators: [{ name: 'and', label: 'AND' }] },
    });

    expect(optionValues(screen.getByTestId(TestID.combinators))).toEqual(['and']);

    await rerender({
      fields,
      defaultQuery: query,
      combinators: [
        { name: 'and', label: 'AND' },
        { name: 'or', label: 'OR' },
      ],
    });

    expect(optionValues(screen.getByTestId(TestID.combinators))).toEqual(['and', 'or']);
  });

  it('updates placeholder options when `translations` changes', async () => {
    const props = {
      fields,
      defaultQuery: { combinator: 'and', rules: [{ field: '~', operator: '=', value: '' }] },
      autoSelectField: false,
    };
    const { rerender } = render(QueryBuilder, { props });

    expect(optionLabels(screen.getByTestId(TestID.fields))).toContain('------');

    await rerender({
      ...props,
      translations: { fields: { placeholderLabel: 'Choisir un champ' } },
    });

    expect(optionLabels(screen.getByTestId(TestID.fields))).toContain('Choisir un champ');
  });

  it('honors a changed `maxLevels`', async () => {
    const onQueryChange = vi.fn();
    const nested: RuleGroupType = {
      combinator: 'and',
      rules: [
        { id: 'r1', field: 'firstName', operator: '=', value: 'Steve' },
        { id: 'g1', combinator: 'and', rules: [] },
      ],
    };
    const props = { fields, defaultQuery: nested, maxLevels: 1, onQueryChange };
    const { rerender } = render(QueryBuilder, { props });

    onQueryChange.mockClear();
    await userEvent.click(innerAddGroup());
    expect(onQueryChange).not.toHaveBeenCalled();

    await rerender({ ...props, maxLevels: 2 });
    await userEvent.click(innerAddGroup());

    const next = onQueryChange.mock.lastCall![0] as RuleGroupType;
    expect((next.rules[1] as RuleGroupType).rules).toHaveLength(1);
  });

  it('honors a changed `disabled` boolean', async () => {
    const onQueryChange = vi.fn();
    const props = { fields, defaultQuery: query, disabled: true, onQueryChange };
    const { rerender } = render(QueryBuilder, { props });

    await rerender({ ...props, disabled: false });
    onQueryChange.mockClear();
    await userEvent.click(screen.getByTestId(TestID.addRule));

    expect(onQueryChange).toHaveBeenCalled();
  });

  it('honors a changed `disabled` path array', async () => {
    const onQueryChange = vi.fn();
    const props = { fields, defaultQuery: query, disabled: [] as number[][], onQueryChange };
    const { rerender } = render(QueryBuilder, { props });

    await rerender({ ...props, disabled: [[]] });
    onQueryChange.mockClear();
    await userEvent.click(screen.getByTestId(TestID.addRule));

    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('preserves undo history across a reconfiguration', async () => {
    const onQueryChange = vi.fn();
    const props = { fields, defaultQuery: query, showUndoRedo: true, onQueryChange };
    const { rerender } = render(QueryBuilder, { props });

    await userEvent.click(screen.getByTestId(TestID.addRule));
    expect((onQueryChange.mock.lastCall![0] as RuleGroupType).rules).toHaveLength(2);

    await rerender({ ...props, fields: altFields });

    const undo = screen.getByTestId(TestID.undoAction);
    expect(undo).toBeEnabled();
    await userEvent.click(undo);

    const restored = onQueryChange.mock.lastCall![0] as RuleGroupType;
    expect(restored.rules).toHaveLength(1);
    expect((restored.rules[0] as { field: string }).field).toBe('firstName');
  });

  it('does not fire `onQueryChange` for a config-only change', async () => {
    const onQueryChange = vi.fn();
    const props = { fields, defaultQuery: query, onQueryChange };
    const { rerender } = render(QueryBuilder, { props });

    onQueryChange.mockClear();
    await rerender({ ...props, fields: altFields });

    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('never reconfigures an externally supplied manager', async () => {
    const manager = new QueryManager(query, { fields });
    const reconfigure = vi.spyOn(manager, 'reconfigure');
    const { rerender } = render(QueryBuilder, { props: { fields, manager } });

    await rerender({ fields: altFields, manager });

    expect(reconfigure).not.toHaveBeenCalled();
    expect(optionValues(screen.getByTestId(TestID.fields))).toEqual(['firstName', 'lastName']);
  });

  it('updates a subquery builder when `subproperties` change', async () => {
    const subQuery: RuleGroupType = {
      id: 'sg',
      combinator: 'and',
      rules: [{ id: 'sr1', field: 'name', operator: '=', value: 'x' }],
    };
    const outerQuery: RuleGroupType = {
      combinator: 'and',
      rules: [{ id: 'r1', field: 'tags', operator: '=', value: subQuery, match: { mode: 'all' } }],
    };
    const props = {
      fields: subFields([
        { name: 'name', label: 'Name' },
        { name: 'count', label: 'Count' },
      ]),
      defaultQuery: outerQuery,
    };
    const { rerender } = render(QueryBuilder, { props });

    expect(optionValues(subSelector())).toEqual(['name', 'count']);

    await rerender({
      ...props,
      fields: subFields([
        { name: 'name', label: 'Name' },
        { name: 'color', label: 'Color' },
      ]),
    });

    expect(optionValues(subSelector())).toEqual(['name', 'color']);
  });
});
