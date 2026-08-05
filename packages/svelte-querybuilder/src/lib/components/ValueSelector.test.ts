import type { RuleGroupType } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v' }],
};

describe('ValueSelector', () => {
  it('renders option groups', () => {
    render(QueryBuilder, {
      props: {
        fields: [
          { label: 'Group 1', options: [{ name: 'f1', label: 'F1' }] },
          { label: 'Group 2', options: [{ name: 'f2', label: 'F2' }] },
        ],
        defaultQuery: query,
      },
    });

    const fieldSelector = screen.getByTestId(TestID.fields);
    const optgroups = fieldSelector.querySelectorAll('optgroup');
    expect([...optgroups].map(og => og.label)).toEqual(['Group 1', 'Group 2']);
    expect(fieldSelector.querySelectorAll('option')).toHaveLength(2);
  });

  it('renders disabled options', () => {
    render(QueryBuilder, {
      props: {
        fields: [
          { name: 'f1', label: 'F1' },
          { name: 'f2', label: 'F2', disabled: true },
        ],
        defaultQuery: query,
      },
    });

    const options = screen.getByTestId(TestID.fields).querySelectorAll('option');
    expect(options[0]).toBeEnabled();
    expect(options[1]).toBeDisabled();
  });

  it('reports a multiple selection as a comma-joined string by default', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: {
        fields: [
          {
            name: 'f1',
            label: 'F1',
            valueEditorType: 'multiselect',
            values: [
              { name: 'a', label: 'A' },
              { name: 'b', label: 'B' },
            ],
          },
        ],
        defaultQuery: query,
        onQueryChange,
      },
    });

    await userEvent.selectOptions(screen.getByTestId(TestID.valueEditor), ['a', 'b']);

    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('a,b');
  });

  it('is disabled along with its rule', () => {
    render(QueryBuilder, {
      props: { fields: [{ name: 'f1', label: 'F1' }], defaultQuery: query, disabled: [[0]] },
    });

    expect(screen.getByTestId(TestID.fields)).toBeDisabled();
    expect(screen.getByTestId(TestID.operators)).toBeDisabled();
  });
});
