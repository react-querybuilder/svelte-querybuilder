import { defaultTranslations, standardClassnames } from '@react-querybuilder/core';
import type { Snippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import {
  getQueryBuilderContext,
  mergeControls,
  mergeQueryBuilderConfig,
  mergeTranslations,
} from './context.svelte.js';

// Stand-ins for snippets; the merge logic never renders them.
// oxlint-disable-next-line typescript/no-explicit-any
const snippetA = (() => {}) as unknown as Snippet<[any]>;
// oxlint-disable-next-line typescript/no-explicit-any
const snippetB = (() => {}) as unknown as Snippet<[any]>;

// Stand-ins for components; the merge logic never renders them.
const A = (() => ({})) as never;
const B = (() => ({})) as never;
const C = (() => ({})) as never;

describe('getQueryBuilderContext', () => {
  it('returns undefined outside of component initialization', () => {
    expect(getQueryBuilderContext()).toBeUndefined();
  });
});

describe('mergeControls', () => {
  it('prefers props over context over defaults', () => {
    expect(
      mergeControls({ notToggle: A }, {}, { notToggle: B }, { notToggle: C, rule: C }).notToggle
    ).toBe(A);
    expect(mergeControls({}, {}, { notToggle: B }, { notToggle: C }).notToggle).toBe(B);
    expect(mergeControls({}, {}, {}, { notToggle: C }).notToggle).toBe(C);
  });

  it('treats null as an explicit "render nothing" that stops the search', () => {
    expect(
      mergeControls({ notToggle: null }, {}, { notToggle: B }, { notToggle: C }).notToggle
    ).toBeNull();
    expect(mergeControls({}, {}, { notToggle: null }, { notToggle: C }).notToggle).toBeNull();
  });

  it('applies actionElement and valueSelector as bulk overrides', () => {
    const controls = mergeControls(
      { actionElement: A, valueSelector: B },
      {},
      {},
      { addRuleAction: C, fieldSelector: C, valueEditor: C, notToggle: C }
    );
    expect(controls.addRuleAction).toBe(A);
    expect(controls.cloneRuleAction).toBe(A);
    expect(controls.fieldSelector).toBe(B);
    expect(controls.combinatorSelector).toBe(B);
    // Bulk overrides never apply to these. `shiftActions`/`undoRedoActions` are composite
    // controls despite the plural suffix, which is why classification comes from core's
    // `controlKind` map rather than from the shape of the key.
    expect(controls.shiftActions).toBeNull();
    expect(controls.undoRedoActions).toBeNull();
    expect(controls.valueEditor).toBe(C);
    expect(controls.notToggle).toBe(C);
  });

  it('prefers a specific prop over a bulk override from context', () => {
    const controls = mergeControls({ addRuleAction: A }, {}, { actionElement: B }, {});
    expect(controls.addRuleAction).toBe(A);
    expect(controls.addGroupAction).toBe(B);
  });

  it('prefers a snippet over a component at the same level', () => {
    const controls = mergeControls({ notToggle: A }, { notToggle: snippetA }, {}, { notToggle: C });
    expect(controls.notToggle).toEqual({ snippet: snippetA });
  });

  it('prefers a component from props over a component from context', () => {
    expect(mergeControls({ notToggle: A }, {}, { notToggle: B }, {}).notToggle).toBe(A);
  });

  it('prefers a snippet from props over a default', () => {
    expect(mergeControls({}, { notToggle: snippetA }, {}, { notToggle: C }).notToggle).toEqual({
      snippet: snippetA,
    });
  });

  it('honors a null entry even when a snippet is inherited from context', () => {
    // Snippets only exist at the props level, so a context-level null is not shadowed by one.
    expect(mergeControls({}, {}, { notToggle: null }, { notToggle: C }).notToggle).toBeNull();
  });

  it('applies bulk snippets as overrides', () => {
    const controls = mergeControls(
      { addRuleAction: A },
      { actionElement: snippetA, valueSelector: snippetB },
      {},
      { valueEditor: C }
    );
    // A keyed component beats a bulk snippet at the same level.
    expect(controls.addRuleAction).toBe(A);
    expect(controls.addGroupAction).toEqual({ snippet: snippetA });
    expect(controls.fieldSelector).toEqual({ snippet: snippetB });
    // Bulk overrides never apply to these.
    expect(controls.valueEditor).toBe(C);
  });

  it('resolves every key, unresolved ones to null', () => {
    const controls = mergeControls({}, {}, {}, {});
    expect('notToggle' in controls).toBe(true);
    expect(controls.notToggle).toBeNull();
    // Controls that only exist upstream are never included.
    expect('dragHandle' in controls).toBe(false);
  });
});

describe('mergeTranslations', () => {
  it('falls back to the defaults', () => {
    expect(mergeTranslations().addRule.label).toBe(defaultTranslations.addRule.label);
  });

  it('prefers props over context, per property', () => {
    const merged = mergeTranslations(
      { addRule: { label: 'props' } },
      { addRule: { label: 'context', title: 'context title' } }
    );
    expect(merged.addRule.label).toBe('props');
    expect(merged.addRule.title).toBe('context title');
  });
});

describe('mergeQueryBuilderConfig', () => {
  it('concatenates classnames, context first', () => {
    const { classNames } = mergeQueryBuilderConfig({
      props: { controlClassnames: { queryBuilder: 'p' } },
      context: { controlClassnames: { queryBuilder: 'c' } },
    });
    expect(classNames.queryBuilder).toBe('c p');
  });

  it('resolves flags with prop precedence and standard defaults', () => {
    const config = mergeQueryBuilderConfig({
      props: { showNotToggle: true },
      context: { showNotToggle: false, showCloneButtons: true },
    });
    expect(config.showNotToggle).toBe(true);
    expect(config.showCloneButtons).toBe(true);
    expect(config.showLockButtons).toBe(false);
    expect(config.resetOnFieldChange).toBe(true);
    expect(config.autoSelectField).toBe(true);
  });

  it('never enables drag-and-drop', () => {
    expect(mergeQueryBuilderConfig({}).enableDragAndDrop).toBe(false);
  });

  it('produces the standard query builder classname unmodified', () => {
    expect(mergeQueryBuilderConfig({}).classNames.queryBuilder).toBe('');
    expect(standardClassnames.queryBuilder).toBe('queryBuilder');
  });
});
