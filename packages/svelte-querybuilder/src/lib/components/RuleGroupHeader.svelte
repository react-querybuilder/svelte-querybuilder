<!--
  @component
  The controls in a rule group's header, without the wrapping `<div>`.

  Port of React Query Builder's `RuleGroupHeaderComponents`. Internal rather than a control
  element; it is a separate component only so that `Rule` can reuse it for a subquery.
-->
<script lang="ts">
  import { TestID } from '@react-querybuilder/core';
  import Control from '../internal/Control.svelte';
  import type { RuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleGroupProps } from '../types/props.js';

  const { props, parts }: { props: RuleGroupProps; parts: RuleGroupParts } = $props();

  const schema = $derived(props.schema);
  const translations = $derived(props.translations);
  const path = $derived(props.path);
  const classNames = $derived(parts.classNames);
  const ruleGroup = $derived(parts.ruleGroup);

  const common = $derived({
    level: path.length,
    path,
    disabled: parts.disabled,
    context: props.context,
    validation: parts.validationResult,
    schema,
  });

  const shiftTitles = $derived(
    schema.showShiftActions
      ? {
          shiftUp: translations.shiftActionUp.title,
          shiftDown: translations.shiftActionDown.title,
        }
      : undefined
  );
  const shiftLabels = $derived(
    schema.showShiftActions
      ? {
          shiftUp: translations.shiftActionUp.label,
          shiftDown: translations.shiftActionDown.label,
        }
      : undefined
  );
  const undoRedoTitles = $derived(
    schema.showUndoRedo
      ? { undo: translations.undo.title, redo: translations.redo.title }
      : undefined
  );
  const undoRedoLabels = $derived(
    schema.showUndoRedo
      ? { undo: translations.undo.label, redo: translations.redo.label }
      : undefined
  );
  const undoRedoClassNames = $derived(
    schema.showUndoRedo ? { undo: classNames.undoAction, redo: classNames.redoAction } : undefined
  );

  const controls = $derived(schema.controls);
</script>

{#if schema.showShiftActions && path.length > 0}
  <Control
    control={controls.shiftActions}
    props={{
      ...common,
      testID: TestID.shiftActions,
      titles: shiftTitles,
      labels: shiftLabels,
      className: classNames.shiftActions,
      shiftUp: parts.shiftGroupUp,
      shiftDown: parts.shiftGroupDown,
      shiftUpDisabled: props.shiftUpDisabled,
      shiftDownDisabled: props.shiftDownDisabled,
      ruleOrGroup: ruleGroup,
    }} />
{/if}
{#if !schema.showCombinatorsBetweenRules && !schema.independentCombinators}
  <Control
    control={controls.combinatorSelector}
    props={{
      ...common,
      testID: TestID.combinators,
      options: schema.combinators,
      value: parts.combinator,
      title: translations.combinators.title,
      className: classNames.combinators,
      handleOnChange: parts.onCombinatorChange,
      rules: ruleGroup.rules,
      ruleGroup,
    }} />
{/if}
{#if schema.showNotToggle}
  <Control
    control={controls.notToggle}
    props={{
      ...common,
      testID: TestID.notToggle,
      className: classNames.notToggle,
      title: translations.notToggle.title,
      label: translations.notToggle.label,
      checked: ruleGroup.not,
      handleOnChange: parts.onNotToggleChange,
      ruleGroup,
    }} />
{/if}
<Control
  control={controls.addRuleAction}
  props={{
    ...common,
    testID: TestID.addRule,
    label: translations.addRule.label,
    title: translations.addRule.title,
    className: classNames.addRule,
    handleOnClick: parts.addRule,
    rules: ruleGroup.rules,
    ruleOrGroup: ruleGroup,
  }} />
{#if schema.maxLevels > path.length}
  <Control
    control={controls.addGroupAction}
    props={{
      ...common,
      testID: TestID.addGroup,
      label: translations.addGroup.label,
      title: translations.addGroup.title,
      className: classNames.addGroup,
      handleOnClick: parts.addGroup,
      rules: ruleGroup.rules,
      ruleOrGroup: ruleGroup,
    }} />
{/if}
{#if schema.showCloneButtons && path.length > 0}
  <Control
    control={controls.cloneGroupAction}
    props={{
      ...common,
      testID: TestID.cloneGroup,
      label: translations.cloneRuleGroup.label,
      title: translations.cloneRuleGroup.title,
      className: classNames.cloneGroup,
      handleOnClick: parts.cloneGroup,
      rules: ruleGroup.rules,
      ruleOrGroup: ruleGroup,
    }} />
{/if}
{#if schema.showLockButtons}
  <Control
    control={controls.lockGroupAction}
    props={{
      ...common,
      testID: TestID.lockGroup,
      label: translations.lockGroup.label,
      title: translations.lockGroup.title,
      className: classNames.lockGroup,
      handleOnClick: parts.toggleLockGroup,
      rules: ruleGroup.rules,
      disabledTranslation: props.parentDisabled ? undefined : translations.lockGroupDisabled,
      ruleOrGroup: ruleGroup,
    }} />
{/if}
{#if schema.showMuteButtons}
  <Control
    control={controls.muteGroupAction}
    props={{
      ...common,
      testID: TestID.muteGroup,
      label: ruleGroup.muted ? translations.unmuteGroup.label : translations.muteGroup.label,
      title: ruleGroup.muted ? translations.unmuteGroup.title : translations.muteGroup.title,
      className: classNames.muteGroup,
      handleOnClick: parts.toggleMuteGroup,
      rules: ruleGroup.rules,
      ruleOrGroup: ruleGroup,
    }} />
{/if}
{#if schema.showUndoRedo && path.length === 0}
  <Control
    control={controls.undoRedoActions}
    props={{
      ...common,
      testID: TestID.undoRedoActions,
      titles: undoRedoTitles,
      labels: undoRedoLabels,
      className: classNames.undoRedoActions,
      classNames: undoRedoClassNames,
      ruleOrGroup: ruleGroup,
    }} />
{/if}
{#if path.length > 0}
  <Control
    control={controls.removeGroupAction}
    props={{
      ...common,
      testID: TestID.removeGroup,
      label: translations.removeGroup.label,
      title: translations.removeGroup.title,
      className: classNames.removeGroup,
      handleOnClick: parts.removeGroup,
      rules: ruleGroup.rules,
      ruleOrGroup: ruleGroup,
    }} />
{/if}
