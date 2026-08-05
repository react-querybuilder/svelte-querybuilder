import type { RuleGroupType } from '@react-querybuilder/core';
import { standardClassnames as sc, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [
  {
    name: 'tags',
    label: 'Tags',
    matchModes: true,
    subproperties: [
      { name: 'name', label: 'Name' },
      { name: 'count', label: 'Count' },
    ],
  },
  { name: 'f1', label: 'F1' },
];

const subQuery: RuleGroupType = {
  id: 'sg',
  combinator: 'and',
  rules: [{ id: 'sr1', field: 'name', operator: '=', value: 'x' }],
};

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'tags', operator: '=', value: subQuery, match: { mode: 'all' } }],
};

const outerRule = () => screen.getAllByTestId(TestID.rule)[0];

describe('RuleSubQuery', () => {
  it('marks the rule as having a subquery', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query } });

    expect(outerRule()).toHaveClass(sc.hasSubQuery);
  });

  it('renders the subquery group header and body inside the rule', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query } });

    // No nested `rule-group` element: the subquery's header and body are rendered directly into
    // the rule, exactly as React Query Builder does.
    expect(screen.getAllByTestId(TestID.ruleGroup)).toHaveLength(1);

    const children = [...outerRule().children];
    const header = children.find(c => c.classList.contains(sc.header))!;
    const body = children.find(c => c.classList.contains(sc.body))!;
    expect(header).toBeDefined();
    expect(body).toBeDefined();
    // Header before the rule's own remove button, body after it.
    expect(children.indexOf(header)).toBeLessThan(
      children.indexOf(screen.getAllByTestId(TestID.removeRule)[0])
    );
    expect(children.indexOf(body)).toBe(children.length - 1);
    expect(body).toContainElement(screen.getAllByTestId(TestID.rule)[1]);
  });

  it('offers the field\u2019s subproperties in the subquery', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query } });

    const subFieldSelector = screen.getAllByTestId(TestID.fields)[1];
    expect([...subFieldSelector.querySelectorAll('option')].map(o => o.value)).toEqual([
      'name',
      'count',
    ]);
  });

  it('writes subquery changes back to the rule value', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: query, onQueryChange } });

    await userEvent.selectOptions(screen.getAllByTestId(TestID.fields)[1], 'count');

    const value = onQueryChange.mock.lastCall![0].rules[0].value;
    expect(value.rules[0].field).toBe('count');
  });

  it('adds a rule to the subquery', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: query, onQueryChange } });

    // The first add-rule button belongs to the root group; the second to the subquery.
    await userEvent.click(screen.getAllByTestId(TestID.addRule)[1]);

    expect(onQueryChange.mock.lastCall![0].rules[0].value.rules).toHaveLength(2);
    expect(onQueryChange.mock.lastCall![0].rules).toHaveLength(1);
  });

  it('seeds a rule whose value is not yet a query', () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [{ id: 'r1', field: 'tags', operator: '=', value: '' }],
        } satisfies RuleGroupType,
        onQueryChange,
      },
    });

    expect(onQueryChange.mock.lastCall![0].rules[0].value).toMatchObject({ combinator: 'and' });
  });

  it('disables the subquery along with the rule', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, disabled: true } });

    expect(screen.getAllByTestId(TestID.fields)[1]).toBeDisabled();
    expect(screen.getAllByTestId(TestID.addRule)[1]).toBeDisabled();
  });

  it('switches back to an operator selector when the field no longer supports match modes', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query } });

    expect(screen.queryAllByTestId(TestID.matchModeEditor).length).toBeGreaterThan(0);

    await userEvent.selectOptions(screen.getAllByTestId(TestID.fields)[0], 'f1');

    expect(screen.queryByTestId(TestID.matchModeEditor)).toBeNull();
    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(1);
    expect(outerRule()).not.toHaveClass(sc.hasSubQuery);
  });
});
