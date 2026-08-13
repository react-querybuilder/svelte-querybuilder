import type { RuleGroupType } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { ActionProps, ValueEditorProps } from '../types/props.js';
import CustomValueEditor from './CustomValueEditor.test.svelte';
import QueryBuilder from './QueryBuilder.svelte';
import SnippetHarness from './SnippetHarness.test.svelte';

const fields = [
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
];

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'firstName', operator: '=', value: 'Steve' }],
};

const valueEditor = createRawSnippet((props: () => ValueEditorProps) => ({
  render: () => `<span data-testid="custom-value-editor"></span>`,
  setup: (node: Element) => {
    $effect(() => {
      node.textContent = `${props().field}:${props().value}`;
    });
  },
}));

const actionElement = createRawSnippet((props: () => ActionProps) => ({
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

describe('control snippet props', () => {
  it('renders a snippet in place of the default component', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, valueEditor } });

    expect(screen.getByTestId('custom-value-editor')).toHaveTextContent('firstName:Steve');
    expect(screen.queryByTestId(TestID.valueEditor)).toBeNull();
  });

  it('stays reactive to prop changes', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, valueEditor } });

    await userEvent.selectOptions(screen.getByTestId(TestID.fields), 'lastName');

    expect(screen.getByTestId('custom-value-editor')).toHaveTextContent('lastName:');
  });

  it('takes precedence over a `controls` entry', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, valueEditor, controls: { valueEditor: null } },
    });

    expect(screen.getByTestId('custom-value-editor')).toBeInTheDocument();
  });

  it('applies an `actionElement` snippet to every action control', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, { props: { fields, defaultQuery: query, actionElement, onQueryChange } });

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
      props: { fields, defaultQuery: query, valueEditor },
    });
    const before = screen.getByTestId('custom-value-editor');

    await rerender({ fields, defaultQuery: query, valueEditor, showNotToggle: true });

    expect(screen.getByTestId('custom-value-editor')).toBe(before);
  });
});

describe('snippets declared in markup', () => {
  it('renders a snippet passed as a direct child of QueryBuilder', async () => {
    render(SnippetHarness, { props: { fields, defaultQuery: query } });

    const editor = screen.getByTestId('markup-value-editor');
    expect(editor).toHaveValue('Steve');
    expect(screen.queryByTestId(TestID.valueEditor)).toBeNull();

    await userEvent.type(editor, 'n');

    expect(screen.getByTestId('markup-value-editor')).toHaveValue('Steven');
  });

  it('wires up a snippet that acts on the query', async () => {
    render(SnippetHarness, { props: { fields, defaultQuery: query } });

    await userEvent.click(screen.getByTestId('markup-remove-rule'));

    expect(screen.queryByTestId(TestID.rule)).toBeNull();
  });
});

describe('the `controls` prop', () => {
  it('renders a replacement component', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, controls: { valueEditor: CustomValueEditor } },
    });

    expect(screen.getByTestId('custom-component-value-editor')).toHaveValue('Steve');
    expect(screen.queryByTestId(TestID.valueEditor)).toBeNull();
  });

  it('renders a wrapped snippet', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, controls: { valueEditor: { snippet: valueEditor } } },
    });

    expect(screen.getByTestId('custom-value-editor')).toHaveTextContent('firstName:Steve');
  });

  it('yields to a top-level snippet of the same name', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: query,
        valueEditor,
        controls: { valueEditor: CustomValueEditor },
      },
    });

    expect(screen.getByTestId('custom-value-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-component-value-editor')).toBeNull();
  });
});
