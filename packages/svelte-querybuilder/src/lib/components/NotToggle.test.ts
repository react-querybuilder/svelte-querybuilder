import type { RuleGroupType } from '@react-querybuilder/core';
import { standardClassnames as sc, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [{ name: 'f1', label: 'F1' }];
const rule = (id: string) => ({ id, field: 'f1', operator: '=', value: 'v' });

const query: RuleGroupType = { combinator: 'and', rules: [rule('r1')] };

describe('NotToggle', () => {
  it('renders a labeled checkbox associated with its own input', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, showNotToggle: true } });

    const toggle = screen.getByTestId(TestID.notToggle);
    expect(toggle.tagName).toBe('LABEL');
    expect(toggle).toHaveClass(sc.notToggle);
    expect(toggle).toHaveTextContent('Not');

    const input = toggle.querySelector('input')!;
    expect(input).toHaveAttribute('type', 'checkbox');
    expect(input.id).toBeTruthy();
    expect(toggle).toHaveAttribute('for', input.id);
    expect(input).not.toBeChecked();
  });

  it('reflects the group `not` property', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: { ...query, not: true }, showNotToggle: true },
    });

    expect(screen.getByTestId(TestID.notToggle).querySelector('input')).toBeChecked();
  });

  it('updates the query when toggled', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, showNotToggle: true, onQueryChange },
    });

    await userEvent.click(screen.getByTestId(TestID.notToggle).querySelector('input')!);

    expect(onQueryChange.mock.lastCall![0]).toMatchObject({ not: true });
  });

  it('is disabled along with its group', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, showNotToggle: true, disabled: true },
    });

    expect(screen.getByTestId(TestID.notToggle).querySelector('input')).toBeDisabled();
  });
});
