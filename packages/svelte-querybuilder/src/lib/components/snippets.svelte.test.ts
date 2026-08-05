import type { RuleGroupType } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { ActionProps, ValueEditorProps } from '../types/props';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'firstName', operator: '=', value: 'Steve' }],
};

const valueEditorSnippet = createRawSnippet((props: () => ValueEditorProps) => ({
  render: () => `<span data-testid="custom-value-editor"></span>`,
  setup: (node: Element) => {
    $effect(() => {
      node.textContent = `${props().field}:${props().value}`;
    });
  },
}));

const actionElementSnippet = createRawSnippet((props: () => ActionProps) => ({
  render: () => `<button type="button" class="custom-action"></button>`,
  setup: (element: Element) => {
    const node = element as HTMLButtonElement;
    $effect(() => {
      node.dataset.testid = props().testID ?? '';
      node.textContent = typeof props().label === 'string' ? (props().label as string) : '';
    });
    node.addEventListener('click', event => props().handleOnClick(event));
  },
}));

describe('snippet props', () => {
  it('renders a snippet in place of the default component', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, valueEditorSnippet } });

    expect(screen.getByTestId('custom-value-editor')).toHaveTextContent('firstName:Steve');
    expect(screen.queryByTestId(TestID.valueEditor)).toBeNull();
  });

  it('stays reactive to prop changes', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, valueEditorSnippet } });

    await userEvent.selectOptions(screen.getByTestId(TestID.fields), 'lastName');

    expect(screen.getByTestId('custom-value-editor')).toHaveTextContent('lastName:');
  });

  it('takes precedence over a controlElements entry', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: query,
        valueEditorSnippet,
        controlElements: { valueEditor: null },
      },
    });

    expect(screen.getByTestId('custom-value-editor')).toBeInTheDocument();
  });

  it('applies actionElementSnippet to every action control', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, actionElementSnippet, onQueryChange },
    });

    const addRule = screen.getByTestId(TestID.addRule);
    expect(addRule).toHaveClass('custom-action');
    expect(screen.getByTestId(TestID.addGroup)).toHaveClass('custom-action');
    expect(screen.getByTestId(TestID.removeRule)).toHaveClass('custom-action');

    await userEvent.click(addRule);

    expect(onQueryChange).toHaveBeenCalled();
    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(2);
  });

  it('does not remount the tree when unrelated props change', async () => {
    const { rerender } = render(QueryBuilder, {
      props: { fields, defaultQuery: query, valueEditorSnippet },
    });
    const before = screen.getByTestId('custom-value-editor');

    await rerender({ fields, defaultQuery: query, valueEditorSnippet, showNotToggle: true });

    expect(screen.getByTestId('custom-value-editor')).toBe(before);
  });
});
