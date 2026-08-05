import type { RuleGroupType } from '@react-querybuilder/core';
import { defaultTranslations, standardClassnames as sc, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [{ name: 'f1', label: 'F1' }];
const rule = (id: string) => ({ id, field: 'f1', operator: '=', value: id });

const query: RuleGroupType = { combinator: 'and', rules: [rule('r1'), rule('r2'), rule('r3')] };

const shiftActionsFor = (index: number) =>
  screen.getAllByTestId(TestID.shiftActions)[index].querySelectorAll('button');

describe('ShiftActions', () => {
  it('renders an up and a down button with the standard classname', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, showShiftActions: true } });

    const container = screen.getAllByTestId(TestID.shiftActions)[0];
    expect(container).toHaveClass(sc.shiftActions);
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent(defaultTranslations.shiftActionUp.label!);
    expect(buttons[1]).toHaveTextContent(defaultTranslations.shiftActionDown.label!);
    expect(buttons[0]).toHaveAttribute('title', defaultTranslations.shiftActionUp.title!);
    expect(buttons[0]).toHaveAttribute('type', 'button');
  });

  it('disables shifting past either end of the root group', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, showShiftActions: true } });

    expect(shiftActionsFor(0)[0]).toBeDisabled();
    expect(shiftActionsFor(0)[1]).not.toBeDisabled();
    expect(shiftActionsFor(2)[0]).not.toBeDisabled();
    expect(shiftActionsFor(2)[1]).toBeDisabled();
  });

  it('shifts a rule down', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, showShiftActions: true, onQueryChange },
    });

    await userEvent.click(shiftActionsFor(0)[1]);

    expect(onQueryChange.mock.lastCall![0].rules.map((r: { id: string }) => r.id)).toEqual([
      'r2',
      'r1',
      'r3',
    ]);
  });

  it('shifts a rule up', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, showShiftActions: true, onQueryChange },
    });

    await userEvent.click(shiftActionsFor(2)[0]);

    expect(onQueryChange.mock.lastCall![0].rules.map((r: { id: string }) => r.id)).toEqual([
      'r1',
      'r3',
      'r2',
    ]);
  });

  it('is disabled along with the query', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, showShiftActions: true, disabled: true },
    });

    for (const button of shiftActionsFor(1)) expect(button).toBeDisabled();
  });

  it('is not rendered in the root group header', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: { combinator: 'and', rules: [] } satisfies RuleGroupType,
        showShiftActions: true,
      },
    });

    expect(screen.queryByTestId(TestID.shiftActions)).toBeNull();
  });
});
