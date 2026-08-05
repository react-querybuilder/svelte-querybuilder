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
    subproperties: [{ name: 'name', label: 'Name' }],
  },
];

const subQuery: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'sr1', field: 'name', operator: '=', value: 'x' }],
};

const queryWith = (match: { mode: string; threshold?: number }): RuleGroupType => ({
  combinator: 'and',
  rules: [{ id: 'r1', field: 'tags', operator: '=', value: subQuery, match } as never],
});

describe('MatchModeEditor', () => {
  it('renders a mode selector in place of the operator selector', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: queryWith({ mode: 'all' }) } });

    const editor = screen.getAllByTestId(TestID.matchModeEditor)[0];
    expect(editor.tagName).toBe('SELECT');
    expect(editor).toHaveClass(sc.matchMode);
    expect(editor).toHaveValue('all');
    // The outer rule has no operator selector of its own; the subquery's rule does.
    expect(screen.getAllByTestId(TestID.operators)).toHaveLength(1);
    expect(screen.getAllByTestId(TestID.rule)[1]).toContainElement(
      screen.getByTestId(TestID.operators)
    );
  });

  it('renders no threshold editor for a mode that does not take one', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: queryWith({ mode: 'all' }) } });

    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('renders a threshold editor for `atLeast`/`atMost`/`exactly`', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: queryWith({ mode: 'atLeast', threshold: 2 }) },
    });

    const threshold = screen.getByRole('spinbutton');
    expect(threshold).toHaveValue(2);
    // `defaultTranslations.matchThreshold.placeholderName`.
    expect(threshold).toHaveAttribute('placeholder', '#');
  });

  it('defaults the threshold to 1 when switching to a mode that requires one', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: queryWith({ mode: 'all' }), onQueryChange },
    });

    await userEvent.selectOptions(screen.getAllByTestId(TestID.matchModeEditor)[0], 'atLeast');

    expect(onQueryChange.mock.lastCall![0].rules[0].match).toEqual({
      mode: 'atLeast',
      threshold: 1,
    });
  });

  it('preserves an existing threshold across a mode change', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: queryWith({ mode: 'atLeast', threshold: 3 }), onQueryChange },
    });

    await userEvent.selectOptions(screen.getAllByTestId(TestID.matchModeEditor)[0], 'atMost');

    expect(onQueryChange.mock.lastCall![0].rules[0].match).toEqual({
      mode: 'atMost',
      threshold: 3,
    });
  });

  it('parses the threshold as a number', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: queryWith({ mode: 'atLeast', threshold: 2 }), onQueryChange },
    });

    await userEvent.type(screen.getByRole('spinbutton'), '5');

    expect(onQueryChange.mock.lastCall![0].rules[0].match).toEqual({
      mode: 'atLeast',
      threshold: 25,
    });
  });

  it('uses the match-threshold placeholder translation', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: queryWith({ mode: 'atLeast', threshold: 2 }),
        translations: { matchThreshold: { placeholderName: 'how many?' } },
      },
    });

    expect(screen.getByRole('spinbutton')).toHaveAttribute('placeholder', 'how many?');
  });
});
