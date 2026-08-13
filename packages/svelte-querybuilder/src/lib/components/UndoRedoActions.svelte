<!--
  @component
  Default "undo"/"redo" buttons, rendered in the header of the outermost group when the
  `showUndoRedo` prop is enabled.

  Port of React Query Builder's `UndoRedoActions`. `schema.history` owns the undo/redo stacks;
  they are always recorded, so there is nothing to opt into.

  The buttons themselves are rendered with the `actionElement` control element, so a replacement
  applies here too.
-->
<script lang="ts">
  import { TestID } from '@react-querybuilder/core';
  import Control from '../internal/Control.svelte';
  import type { UndoRedoActionsProps } from '../types/props.js';

  const props: UndoRedoActionsProps = $props();

  const history = $derived(props.schema.history);
  const actionElement = $derived(props.schema.controls.actionElement);

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
  <Control
    control={actionElement}
    props={{
      ...common,
      testID: TestID.undoAction,
      label: props.labels?.undo,
      title: props.titles?.undo,
      className: props.classNames?.undo,
      handleOnClick: () => history.undo(),
      disabled: props.disabled || !history.canUndo,
    }} />
  <Control
    control={actionElement}
    props={{
      ...common,
      testID: TestID.redoAction,
      label: props.labels?.redo,
      title: props.titles?.redo,
      className: props.classNames?.redo,
      handleOnClick: () => history.redo(),
      disabled: props.disabled || !history.canRedo,
    }} />
</div>
