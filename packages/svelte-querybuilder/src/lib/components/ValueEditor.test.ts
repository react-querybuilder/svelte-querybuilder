import type { Field, RuleGroupType } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const values = [
  { name: 'a', label: 'A' },
  { name: 'b', label: 'B' },
];

const queryWith = (rule: Record<string, unknown>): RuleGroupType =>
  ({ combinator: 'and', rules: [{ id: 'r1', ...rule }] }) as RuleGroupType;

const renderEditor = (field: Field, rule: Record<string, unknown>, props = {}) =>
  render(QueryBuilder, {
    props: { fields: [field], defaultQuery: queryWith({ field: field.name, ...rule }), ...props },
  });

describe('ValueEditor', () => {
  it('renders a text input by default', () => {
    renderEditor(
      { name: 'f1', label: 'F1', placeholder: 'Type here' },
      { operator: '=', value: 'v' }
    );

    const editor = screen.getByTestId(TestID.valueEditor);
    expect(editor).toHaveProperty('tagName', 'INPUT');
    expect(editor).toHaveAttribute('type', 'text');
    expect(editor).toHaveAttribute('placeholder', 'Type here');
    expect(editor).toHaveValue('v');
  });

  it('renders nothing for unary operators', () => {
    renderEditor({ name: 'f1', label: 'F1' }, { operator: 'null', value: '' });

    expect(screen.queryByTestId(TestID.valueEditor)).toBeNull();
  });

  it('renders a select', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', valueEditorType: 'select', values },
      { operator: '=', value: 'a' },
      { onQueryChange }
    );

    const editor = screen.getByTestId(TestID.valueEditor) as HTMLSelectElement;
    expect(editor.tagName).toBe('SELECT');
    expect(editor.value).toBe('a');

    await userEvent.selectOptions(editor, 'b');
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('b');
  });

  it('renders a multiselect', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', valueEditorType: 'multiselect', values },
      { operator: 'in', value: 'a' },
      { onQueryChange, listsAsArrays: true }
    );

    const editor = screen.getByTestId(TestID.valueEditor) as HTMLSelectElement;
    expect(editor.multiple).toBe(true);

    await userEvent.selectOptions(editor, ['a', 'b']);
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toEqual(['a', 'b']);
  });

  it('renders a textarea', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', valueEditorType: 'textarea' },
      { operator: '=', value: 'v' },
      { onQueryChange }
    );

    const editor = screen.getByTestId(TestID.valueEditor);
    expect(editor.tagName).toBe('TEXTAREA');

    await userEvent.type(editor, '!');
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('v!');
  });

  it('renders a checkbox', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', valueEditorType: 'checkbox' },
      { operator: '=', value: false },
      { onQueryChange }
    );

    const editor = screen.getByTestId(TestID.valueEditor);
    expect(editor).toHaveAttribute('type', 'checkbox');
    expect(editor).not.toBeChecked();

    await userEvent.click(editor);
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe(true);
  });

  it('renders radio buttons with associated labels', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', valueEditorType: 'radio', values },
      { operator: '=', value: 'a' },
      { onQueryChange }
    );

    const editor = screen.getByTestId(TestID.valueEditor);
    expect(editor.tagName).toBe('SPAN');
    // The first radio is the placeholder option (`autoSelectValue` defaults to `false`).
    const radios = editor.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(3);
    expect(radios[1]).toBeChecked();
    // Each input is associated with its own label.
    expect(screen.getByLabelText('B')).toBe(radios[2]);

    await userEvent.click(screen.getByLabelText('B'));
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('b');
  });

  it('renders a pair of text editors for "between"', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1' },
      { operator: 'between', value: '1,2' },
      { onQueryChange, getValueEditorSeparator: () => ' and ' }
    );

    const editor = screen.getByTestId(TestID.valueEditor);
    expect(editor.tagName).toBe('SPAN');
    expect(editor).toHaveTextContent('and');
    const inputs = editor.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');

    await userEvent.type(inputs[1], '3');
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('1,23');
  });

  it('renders a pair of selects for "between"', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', valueEditorType: 'select', values },
      { operator: 'between', value: 'a,b' },
      { onQueryChange }
    );

    // The nested selectors inherit the `value-editor` test ID, as they do upstream.
    const selects = screen.getAllByTestId(TestID.valueEditor)[0].querySelectorAll('select');
    expect(selects).toHaveLength(2);

    await userEvent.selectOptions(selects[0], 'b');
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('b,b');
  });

  it('parses numbers when configured', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', inputType: 'number' },
      { operator: '=', value: '' },
      { onQueryChange, parseNumbers: true }
    );

    await userEvent.type(screen.getByTestId(TestID.valueEditor), '12');
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe(12);
  });

  it('renders a bigint editor', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', inputType: 'bigint' },
      { operator: '=', value: '' },
      { onQueryChange, parseNumbers: true }
    );

    const editor = screen.getByTestId(TestID.valueEditor);
    await userEvent.type(editor, '9');
    expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe(9n);
  });

  it('collapses a list value when the operator no longer takes one', async () => {
    const onQueryChange = vi.fn();
    renderEditor(
      { name: 'f1', label: 'F1', inputType: 'number' },
      { operator: 'between', value: '1,2' },
      { onQueryChange }
    );

    await userEvent.selectOptions(screen.getByTestId(TestID.operators), '=');

    await vi.waitFor(() => {
      expect(onQueryChange.mock.lastCall![0].rules[0].value).toBe('1');
    });
  });
});
