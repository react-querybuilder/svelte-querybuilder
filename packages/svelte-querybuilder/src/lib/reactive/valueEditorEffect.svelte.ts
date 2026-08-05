import type { InputType } from '@react-querybuilder/core';
import { getValueEditorReset } from '@react-querybuilder/core';
import { untrack } from 'svelte';

/**
 * The subset of `ValueEditorProps` that determines whether the value needs to be reset.
 */
export interface ValueEditorResetDeps {
  operator: string;
  // oxlint-disable-next-line typescript/no-explicit-any
  value: any;
  type?: string;
  inputType?: InputType | null;
  /** Set when an ancestor component has already applied the reset. */
  skipHook?: boolean;
  /** Applies the reset. */
  // oxlint-disable-next-line typescript/no-explicit-any
  handleOnChange: (value: any) => void;
}

/**
 * Installs the effect that collapses a rule's `value` when it stops representing a list—for
 * example when the operator changes from `in` or `between` to `=`, or when an `<input
 * type="number">` is handed a comma-containing string it can't display.
 *
 * Core decides _what_ the value should become (`getValueEditorReset`); this decides _when_.
 *
 * Three rules keep this from looping (`effect_update_depth_exceeded`):
 *
 * 1. Every dependency is read before the guard, so the tracked set is identical on every run
 *    regardless of which branch is taken.
 * 2. The write is wrapped in `untrack`, so `handleOnChange` reading state does not subscribe
 *    this effect to it.
 * 3. `getValueEditorReset` is idempotent: applying the reset produces a value for which it
 *    returns `reset: false`, so the follow-up run is a no-op.
 *
 * Must be called during component initialization.
 */
export const createValueEditorReset = (getDeps: () => ValueEditorResetDeps): void => {
  $effect(() => {
    // Read every dependency up front so tracking is stable across branches.
    const { operator, value, type, inputType, skipHook, handleOnChange } = getDeps();

    const { reset, value: nextValue } = getValueEditorReset({
      skipHook,
      type: type ?? undefined,
      operator,
      value,
      inputType,
    });

    if (reset) {
      untrack(() => handleOnChange(nextValue));
    }
  });
};
