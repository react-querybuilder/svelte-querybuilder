<!--
  @component
  Default component for `RuleGroupType` and `RuleGroupTypeIC` objects.

  Port of React Query Builder's `RuleGroup`/`RuleGroupHeaderComponents`/
  `RuleGroupBodyComponents`/`useRuleGroup`. The header and body are inlined rather than split
  into `ruleGroupHeaderElements`/`ruleGroupBodyElements` components; those exist upstream to work
  around React's context typing.

  Nested groups and rules are rendered through `schema.controls`, so this component never
  imports itself and replacement components apply at every level.
-->
<script lang="ts">
  import type { RuleGroupTypeAny } from '@react-querybuilder/core';
  import {
    derivePathInfo,
    deriveRuleGroupClassNames,
    deriveRuleGroupContext,
    deriveRuleGroupOuterClassName,
    getParentPath,
    getValidationClassNames,
    isRuleGroup,
    TestID,
  } from '@react-querybuilder/core';
  import type { RuleGroupProps } from '../types/props';

  const props: RuleGroupProps = $props();

  const schema = $derived(props.schema);
  const translations = $derived(props.translations);
  const path = $derived(props.path);

  const disabled = $derived(!!props.parentDisabled || !!props.disabled);
  const muted = $derived(!!props.parentMuted || !!props.ruleGroup.muted);

  const ctx = $derived(
    deriveRuleGroupContext(props.ruleGroup, schema.combinators, {
      validationMap: schema.validationMap,
      id: props.id,
    })
  );

  /**
   * The group as rendered. A group with no `combinator` of its own resolves to the first
   * configured combinator, and the copy carries it so subcomponents see a consistent value.
   */
  const ruleGroup = $derived.by((): RuleGroupTypeAny => {
    if (schema.independentCombinators || props.ruleGroup.combinator === ctx.combinator) {
      return props.ruleGroup;
    }
    return { ...props.ruleGroup, combinator: ctx.combinator } as RuleGroupTypeAny;
  });

  const classNames = $derived(
    deriveRuleGroupClassNames({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
    })
  );

  const validationClassName = $derived(getValidationClassNames(ctx.validationResult));

  const outerClassName = $derived(
    deriveRuleGroupOuterClassName({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
      leadingClassNames: [schema.getRuleGroupClassname(ruleGroup), ctx.combinatorBasedClassName],
      disabled,
      muted,
      validationClassName,
    })
  );

  const pathsMemo = $derived(
    derivePathInfo(path, ruleGroup.rules.length, {
      disabled,
      disabledPaths: schema.disabledPaths,
    })
  );

  const accessibleDescription = $derived(
    // There is no `qbId` in this package; the default generator ignores it.
    schema.accessibleDescriptionGenerator({ path, qbId: '' })
  );

  // #region Handlers
  // oxlint-disable-next-line typescript/no-explicit-any
  const onCombinatorChange = (value: any) => {
    if (!disabled) props.actions.onPropChange('combinator', value, path);
  };

  // oxlint-disable-next-line typescript/no-explicit-any
  const onIndependentCombinatorChange = (value: any, index: number) => {
    if (!disabled) props.actions.onPropChange('combinator', value, [...path, index]);
  };

  const onNotToggleChange = (checked: boolean) => {
    if (!disabled) props.actions.onPropChange('not', checked, path);
  };

  /** The Svelte equivalent of `useStopEventPropagation`. */
  const stopPropagation =
    // oxlint-disable-next-line typescript/no-explicit-any
    (method: (event?: MouseEvent, context?: any) => void) =>
      // oxlint-disable-next-line typescript/no-explicit-any


      (event?: MouseEvent, context?: any) => {
        event?.preventDefault();
        event?.stopPropagation();
        method(event, context);
      };

  // oxlint-disable-next-line typescript/no-explicit-any
  const addRule = stopPropagation((_event, context?: any) => {
    if (!disabled) props.actions.onRuleAdd(schema.createRule(), path, context);
  });

  // oxlint-disable-next-line typescript/no-explicit-any
  const addGroup = stopPropagation((_event, context?: any) => {
    if (!disabled) props.actions.onGroupAdd(schema.createRuleGroup(), path, context);
  });

  const cloneGroup = stopPropagation(() => {
    if (!disabled) {
      props.actions.moveRule(path, [...getParentPath(path), path.at(-1)! + 1], true);
    }
  });

  const toggleLockGroup = stopPropagation(() => {
    props.actions.onPropChange('disabled', !disabled, path);
  });

  const toggleMuteGroup = stopPropagation(() => {
    props.actions.onPropChange('muted', !ruleGroup.muted, path);
  });

  const removeGroup = stopPropagation(() => {
    if (!disabled) props.actions.onGroupRemove(path);
  });

  const shiftGroupUp = stopPropagation(event => {
    if (!disabled && !props.shiftUpDisabled) props.actions.moveRule(path, 'up', event?.altKey);
  });

  const shiftGroupDown = stopPropagation(event => {
    if (!disabled && !props.shiftDownDisabled) props.actions.moveRule(path, 'down', event?.altKey);
  });
  // #endregion

  const common = $derived({
    level: path.length,
    path,
    disabled,
    context: props.context,
    validation: ctx.validationResult,
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
  const ShiftActionsControlElement = $derived(controls.shiftActions);
  const CombinatorSelectorControlElement = $derived(controls.combinatorSelector);
  const NotToggleControlElement = $derived(controls.notToggle);
  const AddRuleActionControlElement = $derived(controls.addRuleAction);
  const AddGroupActionControlElement = $derived(controls.addGroupAction);
  const CloneGroupActionControlElement = $derived(controls.cloneGroupAction);
  const LockGroupActionControlElement = $derived(controls.lockGroupAction);
  const MuteGroupActionControlElement = $derived(controls.muteGroupAction);
  const UndoRedoActionsControlElement = $derived(controls.undoRedoActions);
  const RemoveGroupActionControlElement = $derived(controls.removeGroupAction);
  const InlineCombinatorControlElement = $derived(controls.inlineCombinator);
  const RuleGroupControlElement = $derived(controls.ruleGroup);
  const RuleControlElement = $derived(controls.rule);
</script>

<div
  title={accessibleDescription}
  class={outerClassName}
  data-testid={TestID.ruleGroup}
  data-not={ruleGroup.not ? 'true' : undefined}
  data-rule-group-id={props.id}
  data-level={path.length}
  data-path={JSON.stringify(path)}>
  <div class={classNames.header}>
    {#if schema.showShiftActions && path.length > 0}
      <ShiftActionsControlElement
        {...common}
        testID={TestID.shiftActions}
        titles={shiftTitles}
        labels={shiftLabels}
        className={classNames.shiftActions}
        shiftUp={shiftGroupUp}
        shiftDown={shiftGroupDown}
        shiftUpDisabled={props.shiftUpDisabled}
        shiftDownDisabled={props.shiftDownDisabled}
        ruleOrGroup={ruleGroup} />
    {/if}
    {#if !schema.showCombinatorsBetweenRules && !schema.independentCombinators}
      <CombinatorSelectorControlElement
        {...common}
        testID={TestID.combinators}
        options={schema.combinators}
        value={ctx.combinator}
        title={translations.combinators.title}
        className={classNames.combinators}
        handleOnChange={onCombinatorChange}
        rules={ruleGroup.rules}
        {ruleGroup} />
    {/if}
    {#if schema.showNotToggle}
      <NotToggleControlElement
        {...common}
        testID={TestID.notToggle}
        className={classNames.notToggle}
        title={translations.notToggle.title}
        label={translations.notToggle.label}
        checked={ruleGroup.not}
        handleOnChange={onNotToggleChange}
        {ruleGroup} />
    {/if}
    <AddRuleActionControlElement
      {...common}
      testID={TestID.addRule}
      label={translations.addRule.label}
      title={translations.addRule.title}
      className={classNames.addRule}
      handleOnClick={addRule}
      rules={ruleGroup.rules}
      ruleOrGroup={ruleGroup} />
    {#if schema.maxLevels > path.length}
      <AddGroupActionControlElement
        {...common}
        testID={TestID.addGroup}
        label={translations.addGroup.label}
        title={translations.addGroup.title}
        className={classNames.addGroup}
        handleOnClick={addGroup}
        rules={ruleGroup.rules}
        ruleOrGroup={ruleGroup} />
    {/if}
    {#if schema.showCloneButtons && path.length > 0}
      <CloneGroupActionControlElement
        {...common}
        testID={TestID.cloneGroup}
        label={translations.cloneRuleGroup.label}
        title={translations.cloneRuleGroup.title}
        className={classNames.cloneGroup}
        handleOnClick={cloneGroup}
        rules={ruleGroup.rules}
        ruleOrGroup={ruleGroup} />
    {/if}
    {#if schema.showLockButtons}
      <LockGroupActionControlElement
        {...common}
        testID={TestID.lockGroup}
        label={translations.lockGroup.label}
        title={translations.lockGroup.title}
        className={classNames.lockGroup}
        handleOnClick={toggleLockGroup}
        rules={ruleGroup.rules}
        disabledTranslation={props.parentDisabled ? undefined : translations.lockGroupDisabled}
        ruleOrGroup={ruleGroup} />
    {/if}
    {#if schema.showMuteButtons}
      <MuteGroupActionControlElement
        {...common}
        testID={TestID.muteGroup}
        label={ruleGroup.muted ? translations.unmuteGroup.label : translations.muteGroup.label}
        title={ruleGroup.muted ? translations.unmuteGroup.title : translations.muteGroup.title}
        className={classNames.muteGroup}
        handleOnClick={toggleMuteGroup}
        rules={ruleGroup.rules}
        ruleOrGroup={ruleGroup} />
    {/if}
    {#if schema.showUndoRedo && path.length === 0}
      <UndoRedoActionsControlElement
        {...common}
        testID={TestID.undoRedoActions}
        titles={undoRedoTitles}
        labels={undoRedoLabels}
        className={classNames.undoRedoActions}
        classNames={undoRedoClassNames}
        ruleOrGroup={ruleGroup} />
    {/if}
    {#if path.length > 0}
      <RemoveGroupActionControlElement
        {...common}
        testID={TestID.removeGroup}
        label={translations.removeGroup.label}
        title={translations.removeGroup.title}
        className={classNames.removeGroup}
        handleOnClick={removeGroup}
        rules={ruleGroup.rules}
        ruleOrGroup={ruleGroup} />
    {/if}
  </div>
  <div class={classNames.body}>
    {#each ruleGroup.rules as r, idx (typeof r === 'string' ? [...pathsMemo[idx].path, r].join('-') : r.id)}
      {@const thisPath = pathsMemo[idx].path}
      {@const thisPathDisabled = pathsMemo[idx].disabled || (typeof r !== 'string' && !!r.disabled)}
      {@const shiftUpDisabled = path.length === 0 && idx === 0}
      {@const shiftDownDisabled = path.length === 0 && idx === ruleGroup.rules.length - 1}
      {#if idx > 0 && !schema.independentCombinators && schema.showCombinatorsBetweenRules}
        <InlineCombinatorControlElement
          options={schema.combinators}
          value={ctx.combinator}
          title={translations.combinators.title}
          className={classNames.combinators}
          handleOnChange={onCombinatorChange}
          rules={ruleGroup.rules}
          level={path.length}
          context={props.context}
          validation={ctx.validationResult}
          component={CombinatorSelectorControlElement}
          path={thisPath}
          {disabled}
          {schema}
          {ruleGroup} />
      {/if}
      {#if typeof r === 'string'}
        <InlineCombinatorControlElement
          options={schema.combinators}
          value={r}
          title={translations.combinators.title}
          className={classNames.combinators}
          handleOnChange={val => onIndependentCombinatorChange(val, idx)}
          rules={ruleGroup.rules}
          level={path.length}
          context={props.context}
          validation={ctx.validationResult}
          component={CombinatorSelectorControlElement}
          path={thisPath}
          disabled={thisPathDisabled}
          {schema}
          {ruleGroup} />
      {:else if isRuleGroup(r)}
        <RuleGroupControlElement
          id={r.id}
          {schema}
          actions={props.actions}
          path={thisPath}
          {translations}
          ruleGroup={r}
          disabled={thisPathDisabled}
          parentDisabled={props.parentDisabled || disabled}
          parentMuted={props.parentMuted || muted}
          {shiftUpDisabled}
          {shiftDownDisabled}
          context={props.context} />
      {:else}
        <RuleControlElement
          id={r.id}
          rule={r}
          {schema}
          actions={props.actions}
          path={thisPath}
          disabled={thisPathDisabled}
          parentDisabled={props.parentDisabled || disabled}
          parentMuted={props.parentMuted || muted}
          {translations}
          {shiftUpDisabled}
          {shiftDownDisabled}
          context={props.context} />
      {/if}
    {/each}
  </div>
</div>
