import type { RuleGroupType } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [{ name: 'f1', label: 'F1' }];

const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v' }],
};

describe('ActionElement', () => {
  it('renders a button with the standard attributes', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query } });

    const addRule = screen.getByTestId(TestID.addRule);
    expect(addRule.tagName).toBe('BUTTON');
    expect(addRule).toHaveAttribute('type', 'button');
    expect(addRule).toHaveAttribute('title', 'Add rule');
    expect(addRule).toHaveTextContent('+ Rule');
    expect(addRule).toBeEnabled();
  });

  it('renders a snippet label', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: query,
        translations: {
          addRule: { label: createRawSnippet(() => ({ render: () => '<span>Add!</span>' })) },
        },
      },
    });

    expect(screen.getByTestId(TestID.addRule)).toHaveTextContent('Add!');
  });

  it('prefers the disabled translation for a locked rule', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v', disabled: true }],
        } satisfies RuleGroupType,
        showLockButtons: true,
      },
    });

    const lockRule = screen.getByTestId(TestID.lockRule);
    // A `disabledTranslation` keeps the button clickable so the lock can be released.
    expect(lockRule).toBeEnabled();
    expect(lockRule).toHaveAttribute('title', 'Unlock rule');
  });

  it('omits the disabled translation when the parent is disabled', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, disabled: true, showLockButtons: true },
    });

    const lockRule = screen.getByTestId(TestID.lockRule);
    expect(lockRule).toBeDisabled();
    expect(lockRule).toHaveAttribute('title', 'Lock rule');
  });

  it('unlocks a locked rule', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v', disabled: true }],
        } satisfies RuleGroupType,
        showLockButtons: true,
        onQueryChange,
      },
    });

    await userEvent.click(screen.getByTestId(TestID.lockRule));

    expect(onQueryChange.mock.lastCall![0].rules[0].disabled).toBe(false);
  });
});
