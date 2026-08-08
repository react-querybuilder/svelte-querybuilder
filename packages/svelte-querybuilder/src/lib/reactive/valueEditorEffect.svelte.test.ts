import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { ValueEditorResetDeps } from './valueEditorEffect.svelte.js';
import { createValueEditorReset } from './valueEditorEffect.svelte.js';

/**
 * Cross-implementation anchor: the `multiValue` conformance scenario
 * (`test/conformance/scenarios.ts`, cases `multiValue × inline` in both `classnames.json` and
 * `classnames-post-flush.json`) contains the only two rules upstream for which
 * `getValueEditorReset` returns `reset: true`. Those cases pin the *rendered surface* on both
 * sides of a flush; the reset's actual behavior is pinned here, because upstream's mount-query-
 * change effect clobbers the mount-time reset, so no render layer can observe it landing. The
 * first two tests below (operator change `in`/`between` → `=`) are that substitute assertion.
 */

/**
 * Installs the effect over a reactive props object and returns both, plus a flush helper.
 */
const setup = (initial: Omit<ValueEditorResetDeps, 'handleOnChange'>) => {
  const handleOnChange = vi.fn((value: unknown) => {
    props.value = value;
  });
  const props = $state<ValueEditorResetDeps>({ ...initial, handleOnChange });
  const cleanup = $effect.root(() => {
    createValueEditorReset(() => props);
  });
  flushSync();
  return { props, handleOnChange, cleanup, flush: () => flushSync() };
};

describe('createValueEditorReset', () => {
  it('collapses a multi-value array when the operator is no longer multi-value', () => {
    const { props, handleOnChange, flush, cleanup } = setup({
      operator: 'in',
      value: ['twelve', 'fourteen'],
    });
    expect(handleOnChange).not.toHaveBeenCalled();

    props.operator = '=';
    flush();

    expect(handleOnChange).toHaveBeenCalledExactlyOnceWith('twelve');
    expect(props.value).toBe('twelve');
    cleanup();
  });

  it('collapses a comma-joined between value when the operator changes', () => {
    const { props, handleOnChange, flush, cleanup } = setup({
      operator: 'between',
      value: '12,14',
      inputType: 'number',
    });
    expect(handleOnChange).not.toHaveBeenCalled();

    props.operator = '=';
    flush();

    expect(handleOnChange).toHaveBeenCalledExactlyOnceWith('12');
    cleanup();
  });

  it('does not reset when entering a multi-value operator', () => {
    const { props, handleOnChange, flush, cleanup } = setup({ operator: '=', value: 'twelve' });

    props.operator = 'between';
    flush();
    props.operator = 'in';
    flush();

    expect(handleOnChange).not.toHaveBeenCalled();
    cleanup();
  });

  it('does not reset a multiselect', () => {
    const { props, handleOnChange, flush, cleanup } = setup({
      operator: 'in',
      value: ['a', 'b'],
      type: 'multiselect',
    });

    props.operator = '=';
    flush();

    expect(handleOnChange).not.toHaveBeenCalled();
    cleanup();
  });

  it('does nothing when skipHook is true', () => {
    const { props, handleOnChange, flush, cleanup } = setup({
      operator: 'in',
      value: ['a', 'b'],
      skipHook: true,
    });

    props.operator = '=';
    flush();

    expect(handleOnChange).not.toHaveBeenCalled();
    cleanup();
  });

  it('never reruns itself: the reset value is stable', () => {
    const { props, handleOnChange, flush, cleanup } = setup({ operator: 'in', value: ['a', 'b'] });

    props.operator = '=';
    flush();
    // A second flush would loop if the effect tracked its own write non-idempotently.
    flush();

    expect(handleOnChange).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('reacts to a field change that swaps the input type', () => {
    const { props, handleOnChange, flush, cleanup } = setup({
      operator: '=',
      value: '12,14',
      inputType: 'text',
    });
    expect(handleOnChange).not.toHaveBeenCalled();

    props.inputType = 'number';
    flush();

    expect(handleOnChange).toHaveBeenCalledExactlyOnceWith('12');
    cleanup();
  });

  it('reacts to a value-source flip that replaces the value with a list', () => {
    const { props, handleOnChange, flush, cleanup } = setup({ operator: '=', value: 'a' });

    // Switching `valueSource` to "field"/"parameter" reseeds the value; if that lands an array
    // on a single-value operator, it collapses.
    props.value = ['f1', 'f2'];
    flush();

    expect(handleOnChange).toHaveBeenCalledExactlyOnceWith('f1');
    cleanup();
  });
});
