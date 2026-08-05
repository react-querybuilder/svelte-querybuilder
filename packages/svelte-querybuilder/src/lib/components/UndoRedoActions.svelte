<!--
  @component
  Default "undo"/"redo" buttons, rendered in the header of the outermost group when the
  `showUndoRedo` prop is enabled.

  Port of React Query Builder's `UndoRedoActions`. The `QueryManager` on `schema` owns the
  history and is always constructed with `history: true`, so there is nothing to opt into.

  The buttons themselves are rendered with the `actionElement` control element, so a replacement
  applies here too.
-->
<script lang="ts">
  import { TestID } from '@react-querybuilder/core';
  import type { UndoRedoActionsProps } from '../types/props.js';

  const props: UndoRedoActionsProps = $props();

  const manager = $derived(props.schema.manager);
  const ActionElementControlElement = $derived(props.schema.controls.actionElement);

  // `canUndo`/`canRedo` are plain method calls on a stable object, so they carry no reactivity
  // of their own. `ruleOrGroup` is the outermost group, replaced on every commit, so reading it
  // is what makes these re-derive.
  const canUndo = $derived.by(() => {
    void props.ruleOrGroup;
    return manager.canUndo();
  });
  const canRedo = $derived.by(() => {
    void props.ruleOrGroup;
    return manager.canRedo();
  });

  const common = $derived({
    level: props.level,
    path: props.path,
    context: props.context,
    validation: props.validation,
    schema: props.schema,
    ruleOrGroup: props.ruleOrGroup,
  });
</script>

<div data-testid={props.testID} class={props.className}>
  <ActionElementControlElement
    {...common}
    testID={TestID.undoAction}
    label={props.labels?.undo}
    title={props.titles?.undo}
    className={props.classNames?.undo}
    handleOnClick={() => manager.undo()}
    disabled={props.disabled || !canUndo} />
  <ActionElementControlElement
    {...common}
    testID={TestID.redoAction}
    label={props.labels?.redo}
    title={props.titles?.redo}
    className={props.classNames?.redo}
    handleOnClick={() => manager.redo()}
    disabled={props.disabled || !canRedo} />
</div>
