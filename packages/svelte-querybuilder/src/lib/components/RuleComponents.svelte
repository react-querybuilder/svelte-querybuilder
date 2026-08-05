<!--
  @component
  The controls that make up a rule, without the wrapping `<div>`.

  Port of React Query Builder's `RuleComponents`. When `subQuery`/`subQueryProps` are supplied
  (by `RuleSubQuery.svelte`), the subquery's group header and body are rendered in `<div>`s
  around the rule's own action buttons.
-->
<script lang="ts">
  import { TestID } from '@react-querybuilder/core';
  import type { RuleGroupParts } from '../reactive/ruleGroupParts.svelte.js';
  import type { RuleParts } from '../reactive/ruleParts.svelte.js';
  import type { RuleGroupProps, RuleProps } from '../types/props.js';
  import RuleGroupBody from './RuleGroupBody.svelte';
  import RuleGroupHeader from './RuleGroupHeader.svelte';

  const {
    props,
    parts,
    subQueryProps,
    subQueryParts,
  }: {
    props: RuleProps;
    parts: RuleParts;
    subQueryProps?: RuleGroupProps;
    subQueryParts?: RuleGroupParts;
  } = $props();

  const schema = $derived(props.schema);
  const rule = $derived(props.rule);
  const translations = $derived(props.translations);
  const path = $derived(props.path);
  const classNames = $derived(parts.classNames);
  const ctx = $derived(parts.ctx);

  const common = $derived({
    level: path.length,
    path,
    disabled: parts.disabled,
    context: props.context,
    validation: ctx.validationResult,
    schema,
    rule,
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

  const controls = $derived(schema.controls);
  const ShiftActionsControlElement = $derived(controls.shiftActions);
  const FieldSelectorControlElement = $derived(controls.fieldSelector);
  const MatchModeEditorControlElement = $derived(controls.matchModeEditor);
  const OperatorSelectorControlElement = $derived(controls.operatorSelector);
  const ValueSourceSelectorControlElement = $derived(controls.valueSourceSelector);
  const ValueEditorControlElement = $derived(controls.valueEditor);
  const CloneRuleActionControlElement = $derived(controls.cloneRuleAction);
  const LockRuleActionControlElement = $derived(controls.lockRuleAction);
  const MuteRuleActionControlElement = $derived(controls.muteRuleAction);
  const RemoveRuleActionControlElement = $derived(controls.removeRuleAction);
</script>

{#if schema.showShiftActions}
  <ShiftActionsControlElement
    {...common}
    testID={TestID.shiftActions}
    titles={shiftTitles}
    labels={shiftLabels}
    className={classNames.shiftActions}
    ruleOrGroup={rule}
    shiftUp={parts.shiftRuleUp}
    shiftDown={parts.shiftRuleDown}
    shiftUpDisabled={props.shiftUpDisabled}
    shiftDownDisabled={props.shiftDownDisabled} />
{/if}
{#if parts.showFieldSelector}
  <FieldSelectorControlElement
    {...common}
    testID={TestID.fields}
    options={schema.fields}
    title={translations.fields.title}
    value={rule.field}
    operator={rule.operator}
    className={classNames.fields}
    handleOnChange={parts.onChangeField} />
{/if}
{#if schema.autoSelectField || rule.field !== translations.fields.placeholderName}
  {#if subQueryParts}
    <MatchModeEditorControlElement
      {...common}
      testID={TestID.matchModeEditor}
      field={rule.field}
      fieldData={parts.fieldData}
      title={translations.matchMode.title}
      options={ctx.matchModes}
      thresholdPlaceholder={translations.matchThreshold.placeholderName}
      match={rule.match ?? { mode: 'all' }}
      className={classNames.matchMode}
      {classNames}
      handleOnChange={parts.onChangeMatchMode} />
  {:else}
    <OperatorSelectorControlElement
      {...common}
      testID={TestID.operators}
      field={rule.field}
      fieldData={parts.fieldData}
      title={translations.operators.title}
      options={ctx.operators}
      value={rule.operator}
      className={classNames.operators}
      handleOnChange={parts.onChangeOperator} />
    {#if parts.showValueControls}
      {#if parts.showValueSourceSelector}
        <ValueSourceSelectorControlElement
          {...common}
          testID={TestID.valueSourceSelector}
          field={rule.field}
          fieldData={parts.fieldData}
          title={translations.valueSourceSelector.title}
          options={ctx.valueSourceOptions}
          value={rule.valueSource ?? 'value'}
          className={classNames.valueSource}
          handleOnChange={parts.onChangeValueSource} />
      {/if}
      <ValueEditorControlElement
        {...common}
        testID={TestID.valueEditor}
        field={rule.field}
        fieldData={parts.fieldData}
        title={translations.value.title}
        operator={rule.operator}
        value={rule.value}
        valueSource={rule.valueSource ?? 'value'}
        type={ctx.valueEditorType}
        inputType={ctx.inputType}
        values={ctx.values}
        listsAsArrays={schema.listsAsArrays}
        parseNumbers={schema.parseNumbers}
        separator={parts.valueEditorSeparator}
        className={classNames.value}
        handleOnChange={parts.onChangeValue} />
    {/if}
  {/if}
{/if}
{#if subQueryParts && subQueryProps}
  <div class={subQueryParts.classNames.header}>
    <RuleGroupHeader props={subQueryProps} parts={subQueryParts} />
  </div>
{/if}
{#if schema.showCloneButtons}
  <CloneRuleActionControlElement
    {...common}
    testID={TestID.cloneRule}
    label={translations.cloneRule.label}
    title={translations.cloneRule.title}
    className={classNames.cloneRule}
    ruleOrGroup={rule}
    handleOnClick={parts.cloneRule} />
{/if}
{#if schema.showLockButtons}
  <LockRuleActionControlElement
    {...common}
    testID={TestID.lockRule}
    label={translations.lockRule.label}
    title={translations.lockRule.title}
    className={classNames.lockRule}
    ruleOrGroup={rule}
    handleOnClick={parts.toggleLockRule}
    disabledTranslation={props.parentDisabled ? undefined : translations.lockRuleDisabled} />
{/if}
{#if schema.showMuteButtons}
  <MuteRuleActionControlElement
    {...common}
    testID={TestID.muteRule}
    label={rule.muted ? translations.unmuteRule.label : translations.muteRule.label}
    title={rule.muted ? translations.unmuteRule.title : translations.muteRule.title}
    className={classNames.muteRule}
    ruleOrGroup={rule}
    handleOnClick={parts.toggleMuteRule} />
{/if}
<RemoveRuleActionControlElement
  {...common}
  testID={TestID.removeRule}
  label={translations.removeRule.label}
  title={translations.removeRule.title}
  className={classNames.removeRule}
  ruleOrGroup={rule}
  handleOnClick={parts.removeRule} />
{#if subQueryParts && subQueryProps}
  <div class={subQueryParts.classNames.body}>
    <RuleGroupBody props={subQueryProps} parts={subQueryParts} />
  </div>
{/if}
