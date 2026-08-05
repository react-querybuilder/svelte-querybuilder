import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { standardClassnames as sc, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [{ name: 'f1', label: 'F1' }];
const rule = (id: string) => ({ id, field: 'f1', operator: '=', value: id });

describe('InlineCombinator', () => {
  it('wraps the combinator selector in a `betweenRules` div', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [rule('r1'), rule('r2')],
        } satisfies RuleGroupType,
        showCombinatorsBetweenRules: true,
      },
    });

    const inline = screen.getByTestId(TestID.inlineCombinator);
    expect(inline.tagName).toBe('DIV');
    expect(inline).toHaveClass(sc.betweenRules);
    const selector = screen.getByTestId(TestID.combinators);
    expect(inline).toContainElement(selector);
    expect(selector).toHaveClass(sc.combinators);
  });

  it('renders one between each pair of rules and none before the first', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [rule('r1'), rule('r2'), rule('r3')],
        } satisfies RuleGroupType,
        showCombinatorsBetweenRules: true,
      },
    });

    expect(screen.getAllByTestId(TestID.inlineCombinator)).toHaveLength(2);
    const body = screen.getByTestId(TestID.ruleGroup).querySelector(`.${sc.body}`)!;
    expect([...body.children].map(c => c.getAttribute('data-testid'))).toEqual([
      TestID.rule,
      TestID.inlineCombinator,
      TestID.rule,
      TestID.inlineCombinator,
      TestID.rule,
    ]);
  });

  it('changes the group combinator', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [rule('r1'), rule('r2')],
        } satisfies RuleGroupType,
        showCombinatorsBetweenRules: true,
        onQueryChange,
      },
    });

    await userEvent.selectOptions(screen.getByTestId(TestID.combinators), 'or');

    expect(onQueryChange.mock.lastCall![0]).toMatchObject({ combinator: 'or' });
  });

  it('changes only its own combinator in an independent-combinators query', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          rules: [rule('r1'), 'and', rule('r2'), 'and', rule('r3')],
        } satisfies RuleGroupTypeIC,
        onQueryChange,
      },
    });

    const selectors = screen.getAllByTestId(TestID.combinators);
    expect(selectors).toHaveLength(2);

    await userEvent.selectOptions(selectors[1], 'or');

    expect(onQueryChange.mock.lastCall![0].rules[1]).toBe('and');
    expect(onQueryChange.mock.lastCall![0].rules[3]).toBe('or');
  });
});
