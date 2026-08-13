import type { FullField } from '@react-querybuilder/core';
import type { Component, Snippet } from 'svelte';
import type {
  ActionProps,
  CombinatorSelectorProps,
  FieldSelectorProps,
  InlineCombinatorProps,
  MatchModeEditorProps,
  NotToggleProps,
  OperatorSelectorProps,
  RuleGroupProps,
  RuleProps,
  ShiftActionsProps,
  UndoRedoActionsProps,
  ValueEditorProps,
  ValueSelectorProps,
  ValueSourceSelectorProps,
} from './props.js';

/**
 * A snippet packaged as a control element.
 *
 * Snippets and components are both plain functions at runtime with no way to tell them apart,
 * so a snippet used as a control is wrapped in this object. `typeof control === 'function'`
 * therefore means "component" and nothing else. Top-level snippet props are wrapped
 * automatically; this shape is only needed when putting a snippet in the `controls` object.
 *
 * @group Props
 */
// oxlint-disable-next-line typescript/no-explicit-any
export interface SnippetControl<P extends Record<string, any>> {
  snippet: Snippet<[P]>;
}

/**
 * A control element: a component, a snippet, or `null` to render nothing.
 *
 * @group Props
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type Control<P extends Record<string, any>> = Component<P> | SnippetControl<P>;

/**
 * The props each control element receives.
 *
 * This map is the single source of truth for the set of control keys and their prop types.
 * {@link ControlsProp}, {@link ControlSnippetProps}, and {@link Controls} are all derived from
 * it.
 *
 * There is no `dragHandle` entry: drag-and-drop is a non-goal. To customize the contents of a
 * group's header or body, use a snippet or a replacement `ruleGroup` control.
 *
 * @group Props
 */
export interface ControlPropsMap<F extends FullField, O extends string> {
  /**
   * Default control for all button-type controls.
   *
   * @default ActionElement
   */
  actionElement: ActionProps;
  /**
   * Adds a sub-group to the current group.
   *
   * @default ActionElement
   */
  addGroupAction: ActionProps;
  /**
   * Adds a rule to the current group.
   *
   * @default ActionElement
   */
  addRuleAction: ActionProps;
  /**
   * Clones the current group.
   *
   * @default ActionElement
   */
  cloneGroupAction: ActionProps;
  /**
   * Clones the current rule.
   *
   * @default ActionElement
   */
  cloneRuleAction: ActionProps;
  /**
   * Selects the `combinator` property for the current group, or the current independent
   * combinator value.
   *
   * @default ValueSelector
   */
  combinatorSelector: CombinatorSelectorProps;
  /**
   * Selects the `field` property for the current rule.
   *
   * @default ValueSelector
   */
  fieldSelector: FieldSelectorProps<F>;
  /**
   * A small wrapper around the `combinatorSelector` control.
   *
   * @default InlineCombinator
   */
  inlineCombinator: InlineCombinatorProps;
  /**
   * Locks the current group (sets the `disabled` property to `true`).
   *
   * @default ActionElement
   */
  lockGroupAction: ActionProps;
  /**
   * Locks the current rule (sets the `disabled` property to `true`).
   *
   * @default ActionElement
   */
  lockRuleAction: ActionProps;
  /**
   * Selects the `match` property for the current rule.
   *
   * @default MatchModeEditor
   */
  matchModeEditor: MatchModeEditorProps;
  /**
   * Mutes the current group (sets the `muted` property to `true`).
   *
   * @default ActionElement
   */
  muteGroupAction: ActionProps;
  /**
   * Mutes the current rule (sets the `muted` property to `true`).
   *
   * @default ActionElement
   */
  muteRuleAction: ActionProps;
  /**
   * Toggles the `not` property of the current group between `true` and `false`.
   *
   * @default NotToggle
   */
  notToggle: NotToggleProps;
  /**
   * Selects the `operator` property for the current rule.
   *
   * @default ValueSelector
   */
  operatorSelector: OperatorSelectorProps;
  /**
   * Removes the current group from its parent group's `rules` array.
   *
   * @default ActionElement
   */
  removeGroupAction: ActionProps;
  /**
   * Removes the current rule from its parent group's `rules` array.
   *
   * @default ActionElement
   */
  removeRuleAction: ActionProps;
  /**
   * Rule layout control.
   *
   * @default Rule
   */
  rule: RuleProps;
  /**
   * Rule group layout control.
   *
   * @default RuleGroup
   */
  ruleGroup: RuleGroupProps<F, O>;
  /**
   * Shifts the current rule/group up or down in the query hierarchy.
   *
   * @default ShiftActions
   */
  shiftActions: ShiftActionsProps;
  /**
   * Undo/redo buttons for the outermost group, rendered when the `showUndoRedo` prop is `true`.
   *
   * @default UndoRedoActions
   */
  undoRedoActions: UndoRedoActionsProps;
  /**
   * Updates the `value` property for the current rule.
   *
   * @default ValueEditor
   */
  valueEditor: ValueEditorProps<F, O>;
  /**
   * Default control for all value selector controls.
   *
   * @default ValueSelector
   */
  valueSelector: ValueSelectorProps;
  /**
   * Selects the `valueSource` property for the current rule.
   *
   * @default ValueSelector
   */
  valueSourceSelector: ValueSourceSelectorProps;
}

/**
 * The name of a control element implemented by this package.
 *
 * A subset of core's `ControlKey`, which also covers controls that only exist upstream
 * (`dragHandle`, `ruleGroupBodyElements`, `ruleGroupHeaderElements`).
 *
 * @group Props
 */
export type SvelteControlKey = keyof ControlPropsMap<FullField, string>;

/**
 * Replacement control elements, as a single object.
 *
 * The bulk escape hatch for consumers assembling configuration programmatically. Every key is
 * also available as a top-level snippet prop (see {@link ControlSnippetProps}), which is the
 * idiomatic form when writing markup; top-level snippets take precedence.
 *
 * `null` renders nothing. `actionElement` and `valueSelector` are bulk defaults for every
 * control core classifies as an `"action"` or a `"selector"` respectively.
 *
 * @group Props
 */
export type ControlsProp<F extends FullField, O extends string> = Partial<{
  [K in SvelteControlKey]: Control<ControlPropsMap<F, O>[K]> | null;
}>;

/**
 * Top-level snippet props, one per control element.
 *
 * ```svelte
 * <QueryBuilder {fields} bind:query>
 *   {#snippet valueEditor(props)}
 *     <MyEditor {...props} />
 *   {/snippet}
 * </QueryBuilder>
 * ```
 *
 * Snippets declared inside a component's tags become props of that name, but only at the top
 * level — which is why these are not nested under `controls`.
 *
 * There is no `null` form: omit the snippet to fall through to the next source, or pass
 * `controls={{ x: null }}` to render nothing.
 *
 * @group Props
 */
export type ControlSnippetProps<F extends FullField, O extends string> = Partial<{
  [K in SvelteControlKey]: Snippet<[ControlPropsMap<F, O>[K]]>;
}>;

/**
 * All control elements, finalized: every key is present. `null` means "render nothing".
 *
 * @group Props
 */
export type Controls<F extends FullField, O extends string> = {
  [K in SvelteControlKey]: Control<ControlPropsMap<F, O>[K]> | null;
};
