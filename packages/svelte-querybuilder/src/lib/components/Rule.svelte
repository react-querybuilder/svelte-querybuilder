<!--
  @component
  Default component for `RuleType` objects.

  Port of React Query Builder's `Rule`/`RuleComponents`/`useRule`. The `useMemo` graph collapses
  into a handful of `$derived`s—Svelte's reactivity is already fine-grained.

  Milestone A gap: rules whose field supports match modes (subqueries) render the
  `matchModeEditor` control but not the nested rule group. See step 5 of the implementation plan.
-->
<script lang="ts">
  import type { FullField, RuleContextResolvers } from '@react-querybuilder/core';
  import {
    deriveRuleClassNames,
    deriveRuleContext,
    deriveRuleOuterClassName,
    getParentPath,
    getValidationClassNames,
    isPojo,
    lc,
    TestID,
  } from '@react-querybuilder/core';
  import type { RuleProps } from '../types/props';

  const props: RuleProps = $props();

  const schema = $derived(props.schema);
  const rule = $derived(props.rule);
  const translations = $derived(props.translations);
  const path = $derived(props.path);

  const disabled = $derived(!!props.parentDisabled || !!props.disabled);
  const muted = $derived(!!props.parentMuted || !!rule.muted);

  const classNames = $derived(
    deriveRuleClassNames({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
    })
  );

  // Resolved from `schema` rather than `schema.manager.getRuleContext(path)` so that a
  // replacement `rule` component can render a rule that is not in the manager's query.
  const resolvers = $derived({
    fields: schema.fields,
    fieldMap: schema.fieldMap,
    getInputType: schema.getInputType,
    getMatchModes: schema.getMatchModes,
    getOperators: schema.getOperators,
    getParameters: schema.getParameters,
    getValueEditorType: schema.getValueEditorType,
    getValues: schema.getValues,
    getValueSources: schema.getValueSources,
    getSubQueryBuilderProps: schema.getSubQueryBuilderProps,
  } as unknown as RuleContextResolvers<FullField>);

  const ctx = $derived(
    deriveRuleContext(rule, resolvers, { validationMap: schema.validationMap, id: props.id })
  );

  const fieldData = $derived(ctx.fieldData);
  const valueEditorSeparator = $derived(
    schema.getValueEditorSeparator(rule.field, rule.operator, { fieldData })
  );

  const hasSubQuery = $derived(ctx.matchModes.length > 0);

  const validationClassName = $derived(getValidationClassNames(ctx.validationResult));

  const outerClassName = $derived(
    deriveRuleOuterClassName({
      classNames: schema.classNames,
      suppressStandardClassnames: schema.suppressStandardClassnames,
      leadingClassNames: [
        schema.getRuleClassname(rule, { fieldData }),
        fieldData?.className ?? '',
        ctx.operatorObject?.className ?? '',
      ],
      disabled,
      muted,
      hasSubQuery,
      validationClassName,
    })
  );

  // #region Handlers
  // oxlint-disable-next-line typescript/no-explicit-any
  const changeHandler = (prop: string) => (value: any, context?: any) => {
    if (!disabled) props.actions.onPropChange(prop as never, value, path, context);
  };

  const onChangeField = $derived(changeHandler('field'));
  const onChangeOperator = $derived(changeHandler('operator'));
  const onChangeMatchMode = $derived(changeHandler('match'));
  const onChangeValueSource = $derived(changeHandler('valueSource'));
  const onChangeValue = $derived(changeHandler('value'));

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
  const cloneRule = stopPropagation((_event, context?: any) => {
    if (!disabled) {
      props.actions.moveRule(path, [...getParentPath(path), path.at(-1)! + 1], true, context);
    }
  });

  // oxlint-disable-next-line typescript/no-explicit-any
  const toggleLockRule = stopPropagation((_event, context?: any) => {
    props.actions.onPropChange('disabled', !disabled, path, context);
  });

  // oxlint-disable-next-line typescript/no-explicit-any
  const toggleMuteRule = stopPropagation((_event, context?: any) => {
    props.actions.onPropChange('muted', !rule.muted, path, context);
  });

  const removeRule = stopPropagation(() => {
    if (!disabled) props.actions.onRuleRemove(path);
  });

  // oxlint-disable-next-line typescript/no-explicit-any
  const shiftRuleUp = stopPropagation((event, context?: any) => {
    if (!disabled && !props.shiftUpDisabled) {
      props.actions.moveRule(path, 'up', event?.altKey, context);
    }
  });

  // oxlint-disable-next-line typescript/no-explicit-any
  const shiftRuleDown = stopPropagation((event, context?: any) => {
    if (!disabled && !props.shiftDownDisabled) {
      props.actions.moveRule(path, 'down', event?.altKey, context);
    }
  });
  // #endregion

  const common = $derived({
    level: path.length,
    path,
    disabled,
    context: props.context,
    validation: ctx.validationResult,
    schema,
    rule,
  });

  const showFieldSelector = $derived(
    !(
      schema.fields.length === 1 &&
      isPojo(schema.fields[0]) &&
      'value' in schema.fields[0] &&
      schema.fields[0].value === ''
    )
  );

  const showValueControls = $derived(
    (schema.autoSelectOperator || rule.operator !== translations.operators.placeholderName) &&
      !ctx.hideValueControls
  );

  const showValueSourceSelector = $derived(
    !['null', 'notnull'].includes(lc(`${rule.operator}`)) && ctx.valueSources.length > 1
  );

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

<div
  data-testid={TestID.rule}
  class={outerClassName}
  data-rule-id={props.id}
  data-level={path.length}
  data-path={JSON.stringify(path)}>
  {#if schema.showShiftActions}
    <ShiftActionsControlElement
      {...common}
      testID={TestID.shiftActions}
      titles={shiftTitles}
      labels={shiftLabels}
      className={classNames.shiftActions}
      ruleOrGroup={rule}
      shiftUp={shiftRuleUp}
      shiftDown={shiftRuleDown}
      shiftUpDisabled={props.shiftUpDisabled}
      shiftDownDisabled={props.shiftDownDisabled} />
  {/if}
  {#if showFieldSelector}
    <FieldSelectorControlElement
      {...common}
      testID={TestID.fields}
      options={schema.fields}
      title={translations.fields.title}
      value={rule.field}
      operator={rule.operator}
      className={classNames.fields}
      handleOnChange={onChangeField} />
  {/if}
  {#if schema.autoSelectField || rule.field !== translations.fields.placeholderName}
    {#if hasSubQuery}
      <MatchModeEditorControlElement
        {...common}
        testID={TestID.matchModeEditor}
        field={rule.field}
        {fieldData}
        title={translations.matchMode.title}
        options={ctx.matchModes}
        thresholdPlaceholder={translations.matchThreshold.placeholderName}
        match={rule.match ?? { mode: 'all' }}
        className={classNames.matchMode}
        {classNames}
        handleOnChange={onChangeMatchMode} />
    {:else}
      <OperatorSelectorControlElement
        {...common}
        testID={TestID.operators}
        field={rule.field}
        {fieldData}
        title={translations.operators.title}
        options={ctx.operators}
        value={rule.operator}
        className={classNames.operators}
        handleOnChange={onChangeOperator} />
      {#if showValueControls}
        {#if showValueSourceSelector}
          <ValueSourceSelectorControlElement
            {...common}
            testID={TestID.valueSourceSelector}
            field={rule.field}
            {fieldData}
            title={translations.valueSourceSelector.title}
            options={ctx.valueSourceOptions}
            value={rule.valueSource ?? 'value'}
            className={classNames.valueSource}
            handleOnChange={onChangeValueSource} />
        {/if}
        <ValueEditorControlElement
          {...common}
          testID={TestID.valueEditor}
          field={rule.field}
          {fieldData}
          title={translations.value.title}
          operator={rule.operator}
          value={rule.value}
          valueSource={rule.valueSource ?? 'value'}
          type={ctx.valueEditorType}
          inputType={ctx.inputType}
          values={ctx.values}
          listsAsArrays={schema.listsAsArrays}
          parseNumbers={schema.parseNumbers}
          separator={valueEditorSeparator}
          className={classNames.value}
          handleOnChange={onChangeValue} />
      {/if}
    {/if}
  {/if}
  {#if schema.showCloneButtons}
    <CloneRuleActionControlElement
      {...common}
      testID={TestID.cloneRule}
      label={translations.cloneRule.label}
      title={translations.cloneRule.title}
      className={classNames.cloneRule}
      ruleOrGroup={rule}
      handleOnClick={cloneRule} />
  {/if}
  {#if schema.showLockButtons}
    <LockRuleActionControlElement
      {...common}
      testID={TestID.lockRule}
      label={translations.lockRule.label}
      title={translations.lockRule.title}
      className={classNames.lockRule}
      ruleOrGroup={rule}
      handleOnClick={toggleLockRule}
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
      handleOnClick={toggleMuteRule} />
  {/if}
  <RemoveRuleActionControlElement
    {...common}
    testID={TestID.removeRule}
    label={translations.removeRule.label}
    title={translations.removeRule.title}
    className={classNames.removeRule}
    ruleOrGroup={rule}
    handleOnClick={removeRule} />
</div>
