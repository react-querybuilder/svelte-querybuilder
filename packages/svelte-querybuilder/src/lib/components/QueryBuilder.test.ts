import type { RuleGroupType } from '@react-querybuilder/core';
import { defaultCombinators, standardClassnames as sc, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

const flatQuery: RuleGroupType = {
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'firstName', operator: '=', value: 'Steve' },
    { id: 'r2', field: 'lastName', operator: '=', value: 'Vai' },
  ],
};

const nestedQuery: RuleGroupType = {
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'firstName', operator: '=', value: 'Steve' },
    {
      id: 'g1',
      combinator: 'or',
      rules: [{ id: 'r2', field: 'lastName', operator: '=', value: 'Vai' }],
    },
  ],
};

describe('QueryBuilder', () => {
  it('renders the standard structure', () => {
    const { container } = render(QueryBuilder, { props: { fields, defaultQuery: flatQuery } });

    const wrapper = container.querySelector('div[role="form"]')!;
    expect(wrapper).toHaveClass(sc.queryBuilder);
    expect(wrapper).toHaveAttribute('data-dnd', 'disabled');
    expect(wrapper).toHaveAttribute('data-inlinecombinators', 'disabled');

    const group = screen.getByTestId(TestID.ruleGroup);
    expect(group).toHaveClass(sc.ruleGroup);
    expect(group).toHaveAttribute('data-path', '[]');
    expect(group).toHaveAttribute('data-level', '0');
    expect(group).toHaveAttribute('title', 'Query builder');
    expect(group.querySelector(`.${sc.header}`)).toBeInTheDocument();
    expect(group.querySelector(`.${sc.body}`)).toBeInTheDocument();

    const rules = screen.getAllByTestId(TestID.rule);
    expect(rules).toHaveLength(2);
    expect(rules[0]).toHaveAttribute('data-path', '[0]');
    expect(rules[1]).toHaveAttribute('data-path', '[1]');
    expect(rules[0]).toHaveAttribute('data-rule-id', 'r1');
  });

  it('renders each rule subcomponent in order', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery } });

    const rule = screen.getAllByTestId(TestID.rule)[0];
    expect([...rule.children].map(c => c.getAttribute('data-testid'))).toEqual([
      TestID.fields,
      TestID.operators,
      TestID.valueEditor,
      TestID.removeRule,
    ]);
  });

  it('renders nested groups', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: nestedQuery } });

    const groups = screen.getAllByTestId(TestID.ruleGroup);
    expect(groups).toHaveLength(2);
    expect(groups[1]).toHaveAttribute('data-path', '[1]');
    expect(groups[1]).toHaveAttribute('data-level', '1');
    expect(groups[1]).toHaveAttribute('title', 'Rule group at path 1');
    // Nested groups get a remove button; the root does not.
    expect(screen.getAllByTestId(TestID.removeGroup)).toHaveLength(1);
  });

  it('populates the field and operator selectors', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery } });

    const fieldSelector = screen.getAllByTestId(TestID.fields)[0] as HTMLSelectElement;
    expect(fieldSelector.value).toBe('firstName');
    expect([...fieldSelector.options].map(o => o.value)).toEqual(['firstName', 'lastName']);

    const combinatorSelector = screen.getByTestId(TestID.combinators) as HTMLSelectElement;
    expect(combinatorSelector.value).toBe('and');
    expect([...combinatorSelector.options].map(o => o.value)).toEqual(
      defaultCombinators.map(c => c.name)
    );
  });

  it('adds a rule', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery, onQueryChange } });

    await userEvent.click(screen.getByTestId(TestID.addRule));

    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(3);
    // Once on mount (`enableMountQueryChange` defaults to `true`), once for the addition.
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange.mock.lastCall![0].rules).toHaveLength(3);
  });

  it('adds a group', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery } });

    await userEvent.click(screen.getByTestId(TestID.addGroup));

    expect(screen.getAllByTestId(TestID.ruleGroup)).toHaveLength(2);
  });

  it('removes a rule', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery } });

    await userEvent.click(screen.getAllByTestId(TestID.removeRule)[0]);

    const rules = screen.getAllByTestId(TestID.rule);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toHaveAttribute('data-rule-id', 'r2');
  });

  it('removes a group', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: nestedQuery } });

    await userEvent.click(screen.getByTestId(TestID.removeGroup));

    expect(screen.getAllByTestId(TestID.ruleGroup)).toHaveLength(1);
  });

  it('changes the field, resetting the operator and value', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery, onQueryChange } });

    await userEvent.selectOptions(screen.getAllByTestId(TestID.fields)[0], 'lastName');

    expect(onQueryChange.mock.lastCall![0].rules[0]).toMatchObject({
      field: 'lastName',
      operator: '=',
      value: '',
    });
  });

  it('changes the operator', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery, onQueryChange } });

    await userEvent.selectOptions(screen.getAllByTestId(TestID.operators)[0], 'contains');

    expect(onQueryChange.mock.lastCall![0].rules[0].operator).toBe('contains');
  });

  it('changes the combinator', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery, onQueryChange } });

    await userEvent.selectOptions(screen.getByTestId(TestID.combinators), 'or');

    expect(onQueryChange.mock.lastCall![0].combinator).toBe('or');
  });

  it('changes a value', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery, onQueryChange } });

    const valueEditor = screen.getAllByTestId(TestID.valueEditor)[0];
    await userEvent.clear(valueEditor);
    await userEvent.type(valueEditor, 'Joe');

    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('Joe');
  });

  it('renders clone, lock, mute, and shift controls when enabled', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: nestedQuery,
        showCloneButtons: true,
        showLockButtons: true,
        showMuteButtons: true,
      },
    });

    expect(screen.getAllByTestId(TestID.cloneRule)).toHaveLength(2);
    expect(screen.getAllByTestId(TestID.cloneGroup)).toHaveLength(1);
    expect(screen.getAllByTestId(TestID.lockRule)).toHaveLength(2);
    expect(screen.getAllByTestId(TestID.lockGroup)).toHaveLength(2);
    expect(screen.getAllByTestId(TestID.muteRule)).toHaveLength(2);
    expect(screen.getAllByTestId(TestID.muteGroup)).toHaveLength(2);
  });

  it('clones a rule', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery, showCloneButtons: true } });

    await userEvent.click(screen.getAllByTestId(TestID.cloneRule)[0]);

    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(3);
  });

  it('locks a rule', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: flatQuery, showLockButtons: true, onQueryChange },
    });

    await userEvent.click(screen.getAllByTestId(TestID.lockRule)[0]);

    expect(onQueryChange.mock.lastCall![0].rules[0].disabled).toBe(true);
    expect(screen.getAllByTestId(TestID.rule)[0]).toHaveClass(sc.disabled);
  });

  it('disables everything when `disabled` is `true`', () => {
    const { container } = render(QueryBuilder, {
      props: { fields, defaultQuery: flatQuery, disabled: true },
    });

    expect(container.querySelector('div[role="form"]')).toHaveClass(sc.disabled);
    for (const control of container.querySelectorAll('button, select, input')) {
      expect(control).toBeDisabled();
    }
  });

  it('disables the rule at a disabled path', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: flatQuery, disabled: [[1]] } });

    expect(screen.getAllByTestId(TestID.rule)[0]).not.toHaveClass(sc.disabled);
    expect(screen.getAllByTestId(TestID.rule)[1]).toHaveClass(sc.disabled);
  });

  it('does not add a rule to a disabled group', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: flatQuery, disabled: true, onQueryChange },
    });

    await userEvent.click(screen.getByTestId(TestID.addRule));

    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(2);
  });

  it('applies validation classnames', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: flatQuery, validator: () => ({ r1: false, r2: true }) },
    });

    expect(screen.getAllByTestId(TestID.rule)[0]).toHaveClass(sc.invalid);
    expect(screen.getAllByTestId(TestID.rule)[1]).toHaveClass(sc.valid);
  });

  it('suppresses standard classnames', () => {
    const { container } = render(QueryBuilder, {
      props: { fields, defaultQuery: flatQuery, suppressStandardClassnames: true },
    });

    expect(container.querySelector('div[role="form"]')).not.toHaveClass(sc.queryBuilder);
    expect(screen.getByTestId(TestID.ruleGroup)).not.toHaveClass(sc.ruleGroup);
  });

  it('applies custom classnames and translations', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: flatQuery,
        controlClassnames: { addRule: 'custom-add-rule' },
        translations: { addRule: { label: 'Add a rule', title: 'Adds a rule' } },
      },
    });

    const addRule = screen.getByTestId(TestID.addRule);
    expect(addRule).toHaveClass('custom-add-rule');
    expect(addRule).toHaveTextContent('Add a rule');
    expect(addRule).toHaveAttribute('title', 'Adds a rule');
  });

  it('hides the add-group button beyond `maxLevels`', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: nestedQuery, maxLevels: 1 } });

    expect(screen.getAllByTestId(TestID.addGroup)).toHaveLength(1);
  });

  it('reflects an updated `query` prop', async () => {
    const { rerender } = render(QueryBuilder, { props: { fields, query: flatQuery } });
    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(2);

    await rerender({
      fields,
      query: { combinator: 'and', rules: [flatQuery.rules[0]] } satisfies RuleGroupType,
    });

    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(1);
  });

  it('is driven by an external manager', async () => {
    const { QueryManager } = await import('@react-querybuilder/core');
    const manager = new QueryManager(flatQuery, { fields });

    render(QueryBuilder, { props: { fields, manager } });
    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(2);

    manager.remove([0]);
    await vi.waitFor(() => expect(screen.getAllByTestId(TestID.rule)).toHaveLength(1));

    await userEvent.click(screen.getByTestId(TestID.addRule));
    expect(manager.getQuery().rules).toHaveLength(2);
  });

  it('renders independent combinators without a combinator selector', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          rules: [
            { id: 'r1', field: 'firstName', operator: '=', value: 'Steve' },
            'and',
            { id: 'r2', field: 'lastName', operator: '=', value: 'Vai' },
          ],
        },
      },
    });

    expect(screen.queryByTestId(TestID.combinators)).toBeNull();
    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(2);
  });

  it('accepts a replacement control element', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: flatQuery, controlElements: { removeRuleAction: null } },
    });

    expect(screen.queryByTestId(TestID.removeRule)).toBeNull();
  });
});
