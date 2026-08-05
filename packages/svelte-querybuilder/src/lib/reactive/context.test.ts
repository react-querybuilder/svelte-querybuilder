import { defaultTranslations, standardClassnames } from '@react-querybuilder/core';
import type { Snippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { snippetToComponent } from '../internal/snippetToComponent';
import {
  getQueryBuilderContext,
  mergeControlElements,
  mergeQueryBuilderConfig,
  mergeTranslations,
  nullComponent,
} from './context.svelte';

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

describe('mergeControlElements', () => {
  it('prefers props over context over defaults', () => {
    expect(
      mergeControlElements({ notToggle: A }, { notToggle: B }, { notToggle: C, rule: C }).notToggle
    ).toBe(A);
    expect(mergeControlElements({}, { notToggle: B }, { notToggle: C }).notToggle).toBe(B);
    expect(mergeControlElements({}, {}, { notToggle: C }).notToggle).toBe(C);
  });

  it('replaces null with a component that renders nothing', () => {
    expect(
      mergeControlElements({ notToggle: null }, { notToggle: B }, { notToggle: C }).notToggle
    ).toBe(nullComponent);
    expect(mergeControlElements({}, { notToggle: null }, { notToggle: C }).notToggle).toBe(
      nullComponent
    );
  });

  it('applies actionElement and valueSelector as bulk overrides', () => {
    const controls = mergeControlElements(
      { actionElement: A, valueSelector: B },
      {},
      { addRuleAction: C, fieldSelector: C, valueEditor: C, notToggle: C }
    );
    expect(controls.addRuleAction).toBe(A);
    expect(controls.shiftActions).toBe(A);
    expect(controls.fieldSelector).toBe(B);
    expect(controls.combinatorSelector).toBe(B);
    // Bulk overrides never apply to these.
    expect(controls.valueEditor).toBe(C);
    expect(controls.notToggle).toBe(C);
  });

  it('prefers a specific prop over a bulk override from context', () => {
    const controls = mergeControlElements({ addRuleAction: A }, { actionElement: B }, {});
    expect(controls.addRuleAction).toBe(A);
    expect(controls.addGroupAction).toBe(B);
  });

  it('prefers a snippet over a component at the same level', () => {
    const controls = mergeControlElements(
      { notToggle: A },
      {},
      { notToggle: C },
      { notToggleSnippet: snippetA }
    );
    expect(controls.notToggle).toBe(snippetToComponent(snippetA));
  });

  it('prefers a component from props over a snippet from context', () => {
    const controls = mergeControlElements(
      { notToggle: A },
      {},
      {},
      {},
      { notToggleSnippet: snippetA }
    );
    expect(controls.notToggle).toBe(A);
  });

  it('prefers a snippet from context over a default', () => {
    const controls = mergeControlElements(
      {},
      {},
      { notToggle: C },
      {},
      { notToggleSnippet: snippetA }
    );
    expect(controls.notToggle).toBe(snippetToComponent(snippetA));
  });

  it('honors a null component even when a snippet is inherited', () => {
    const controls = mergeControlElements(
      { notToggle: null },
      {},
      {},
      {},
      { notToggleSnippet: snippetA }
    );
    expect(controls.notToggle).toBe(nullComponent);
  });

  it('applies actionElementSnippet and valueSelectorSnippet as bulk overrides', () => {
    const controls = mergeControlElements(
      { addRuleAction: A },
      {},
      { valueEditor: C },
      { actionElementSnippet: snippetA, valueSelectorSnippet: snippetB }
    );
    // A keyed component beats a bulk snippet at the same level.
    expect(controls.addRuleAction).toBe(A);
    expect(controls.addGroupAction).toBe(snippetToComponent(snippetA));
    expect(controls.fieldSelector).toBe(snippetToComponent(snippetB));
    // Bulk overrides never apply to these.
    expect(controls.valueEditor).toBe(C);
  });

  it('omits keys with no resolution', () => {
    expect('notToggle' in mergeControlElements({}, {}, {})).toBe(false);
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
