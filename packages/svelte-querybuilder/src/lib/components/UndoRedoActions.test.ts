import type { RuleGroupType } from '@react-querybuilder/core';
import { QueryManager, standardClassnames as sc, TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryBuilder from './QueryBuilder.svelte';

const fields = [{ name: 'f1', label: 'F1' }];
const query: RuleGroupType = {
  combinator: 'and',
  rules: [{ id: 'r1', field: 'f1', operator: '=', value: 'v' }],
};

describe('UndoRedoActions', () => {
  it('renders undo and redo buttons in the root group header only', () => {
    render(QueryBuilder, {
      props: {
        fields,
        defaultQuery: {
          combinator: 'and',
          rules: [{ id: 'g1', combinator: 'or', rules: [] }],
        } satisfies RuleGroupType,
        showUndoRedo: true,
      },
    });

    expect(screen.getAllByTestId(TestID.undoRedoActions)).toHaveLength(1);
    expect(screen.getByTestId(TestID.undoRedoActions)).toHaveClass(sc.undoRedoActions);
    expect(screen.getByTestId(TestID.undoAction)).toHaveClass(sc.undoAction);
    expect(screen.getByTestId(TestID.redoAction)).toHaveClass(sc.redoAction);
  });

  it('starts with both buttons disabled', () => {
    render(QueryBuilder, { props: { fields, defaultQuery: query, showUndoRedo: true } });

    expect(screen.getByTestId(TestID.undoAction)).toBeDisabled();
    expect(screen.getByTestId(TestID.redoAction)).toBeDisabled();
  });

  it('undoes and redoes a change', async () => {
    const onQueryChange = vi.fn();
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, showUndoRedo: true, onQueryChange },
    });

    await userEvent.click(screen.getByTestId(TestID.addRule));
    expect(onQueryChange.mock.lastCall![0].rules).toHaveLength(2);
    expect(screen.getByTestId(TestID.undoAction)).not.toBeDisabled();
    expect(screen.getByTestId(TestID.redoAction)).toBeDisabled();

    await userEvent.click(screen.getByTestId(TestID.undoAction));
    expect(onQueryChange.mock.lastCall![0].rules).toHaveLength(1);
    expect(screen.getByTestId(TestID.undoAction)).toBeDisabled();
    expect(screen.getByTestId(TestID.redoAction)).not.toBeDisabled();

    await userEvent.click(screen.getByTestId(TestID.redoAction));
    expect(onQueryChange.mock.lastCall![0].rules).toHaveLength(2);
  });

  it('drives an externally-held manager', async () => {
    // An external manager brings its own options: history is opt-in there, unlike the manager
    // the query builder creates for itself.
    const manager = new QueryManager<RuleGroupType>(query, { history: true });
    render(QueryBuilder, { props: { fields, manager, showUndoRedo: true } });

    manager.add({ field: 'f1', operator: '=', value: 'v2' }, []);
    expect(manager.getQuery().rules).toHaveLength(2);

    await userEvent.click(screen.getByTestId(TestID.undoAction));

    expect(manager.getQuery().rules).toHaveLength(1);
    expect(screen.getAllByTestId(TestID.rule)).toHaveLength(1);
  });

  it('is disabled along with the query', () => {
    render(QueryBuilder, {
      props: { fields, defaultQuery: query, showUndoRedo: true, disabled: true },
    });

    expect(screen.getByTestId(TestID.undoAction)).toBeDisabled();
    expect(screen.getByTestId(TestID.redoAction)).toBeDisabled();
  });
});
