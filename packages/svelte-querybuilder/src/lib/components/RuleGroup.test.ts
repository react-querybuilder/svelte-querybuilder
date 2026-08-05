import type { RuleGroupType, RuleGroupTypeIC } from '@react-querybuilder/core';
import { standardClassnames as sc, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [{ name: 'f1', label: 'F1' }];

const rule = (id: string) => ({ id, field: 'f1', operator: '=', value: 'v' });

const nested: RuleGroupType = {
  combinator: 'and',
  rules: [rule('r1'), { id: 'g1', combinator: 'or', rules: [rule('r2')] }],
};

describe('RuleGroup', () => {
  it('marks a negated group', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: { combinator: 'and', not: true, rules: [rule('r1')] } satisfies RuleGroupType,
      },
    });

    expect(screen.getByTestId(TestID.ruleGroup)).toHaveAttribute('data-not', 'true');
  });

  it('renders the combinator-based classname', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: { combinator: 'or', rules: [rule('r1')] } satisfies RuleGroupType,
        combinators: [
          { name: 'and', label: 'AND' },
          { name: 'or', label: 'OR', className: 'combinator-or' },
        ],
      },
    });

    expect(screen.getByTestId(TestID.ruleGroup)).toHaveClass('combinator-or');
  });

  it('applies `getRuleGroupClassname` and `getRuleClassname`', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: nested,
        getRuleGroupClassname: () => 'from-group-fn',
        getRuleClassname: () => 'from-rule-fn',
      },
    });

    expect(screen.getAllByTestId(TestID.ruleGroup)[0]).toHaveClass('from-group-fn');
    expect(screen.getAllByTestId(TestID.rule)[0]).toHaveClass('from-rule-fn');
  });

  it('renders the flag-gated controls', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: nested,
        showNotToggle: true,
        showShiftActions: true,
        showUndoRedo: true,
        showCombinatorsBetweenRules: true,
      },
    });

    // The corresponding components arrive in milestone B; until then the flags only affect
    // whether the combinator selector is rendered in the header.
    expect(screen.queryByTestId(TestID.combinators)).toBeNull();
  });

  it('marks inline combinators on the wrapper', () => {
    const { container } = render(QueryBuilder, {
      props: { fields, defaultQuery: nested, showCombinatorsBetweenRules: true },
    });

    expect(container.querySelector('div[role="form"]')).toHaveAttribute(
      'data-inlinecombinators',
      'enabled'
    );
  });

  it('marks inline combinators for independent-combinator queries', () => {
    const { container } = render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: { rules: [rule('r1'), 'and', rule('r2')] } satisfies RuleGroupTypeIC,
      },
    });

    expect(container.querySelector('div[role="form"]')).toHaveAttribute(
      'data-inlinecombinators',
      'enabled'
    );
  });

  it('clones a group', async () => {
    render(QueryBuilder, { props: { fields, defaultQuery: nested, showCloneButtons: true } });

    await userEvent.click(screen.getByTestId(TestID.cloneGroup));

    expect(screen.getAllByTestId(TestID.ruleGroup)).toHaveLength(3);
  });

  it('locks a group', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: nested, showLockButtons: true, onQueryChange },
    });

    await userEvent.click(screen.getAllByTestId(TestID.lockGroup)[1]);

    expect(onQueryChange.mock.lastCall![0].rules[1].disabled).toBe(true);
  });

  it('mutes and unmutes a group', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: nested, showMuteButtons: true, onQueryChange },
    });

    const muteGroup = screen.getAllByTestId(TestID.muteGroup)[1];
    expect(muteGroup).toHaveAttribute('title', 'Mute group');

    await userEvent.click(muteGroup);
    expect(onQueryChange.mock.lastCall![0].rules[1].muted).toBe(true);
    expect(screen.getAllByTestId(TestID.ruleGroup)[1]).toHaveClass(sc.muted);
    expect(screen.getAllByTestId(TestID.muteGroup)[1]).toHaveAttribute('title', 'Unmute group');

    await userEvent.click(screen.getAllByTestId(TestID.muteGroup)[1]);
    expect(onQueryChange.mock.lastCall![0].rules[1].muted).toBe(false);
  });

  it('mutes a rule', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: nested, showMuteButtons: true, onQueryChange },
    });

    await userEvent.click(screen.getAllByTestId(TestID.muteRule)[0]);

    expect(onQueryChange.mock.lastCall![0].rules[0].muted).toBe(true);
    expect(screen.getAllByTestId(TestID.rule)[0]).toHaveClass(sc.muted);
  });

  it('renders a value source selector when more than one source is available', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: {
        fields: [
          { name: 'f1', label: 'F1', valueSources: ['value', 'field'] },
          { name: 'f2', label: 'F2' },
        ],
        defaultQuery: { combinator: 'and', rules: [rule('r1')] } satisfies RuleGroupType,
        onQueryChange,
      },
    });

    const selector = screen.getByTestId(TestID.valueSourceSelector) as HTMLSelectElement;
    expect(selector.value).toBe('value');

    await userEvent.selectOptions(selector, 'field');
    expect(onQueryChange.mock.lastCall![0].rules[0].valueSource).toBe('field');
    // The value editor becomes a field selector.
    expect(screen.getByTestId(TestID.valueEditor).tagName).toBe('SELECT');
  });

  it('hides the value controls for operators that take no value', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [{ id: 'r1', field: 'f1', operator: 'null', value: '' }],
        } satisfies RuleGroupType,
      },
    });

    expect(screen.queryByTestId(TestID.valueEditor)).toBeNull();
  });

  it('hides the field selector when there is only a placeholder field', () => {
    render(QueryBuilder, {
      props: { fields: [], defaultQuery: { combinator: 'and', rules: [] } satisfies RuleGroupType },
    });

    expect(screen.queryByTestId(TestID.fields)).toBeNull();
  });
});
