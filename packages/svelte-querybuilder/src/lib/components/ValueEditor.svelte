<!--
  @component
  Default `valueEditor` component.

  Port of React Query Builder's `ValueEditor`. The reset effect lives in
  `createValueEditorReset` (the one piece with a timing hazard); the rest is derived here.
-->
<script lang="ts">
  import type { FullField } from '@react-querybuilder/core';
  import {
    coerceBigIntValue,
    coerceInputType,
    deriveRuleClassName,
    getFirstOption,
    getMultiValueUpdate,
    getParseNumberMethod,
    parseNumber,
    toArray,
  } from '@react-querybuilder/core';
  import Label from '../internal/Label.svelte';
  import { createValueEditorReset } from '../reactive/valueEditorEffect.svelte';
  import type { ValueEditorProps, ValueSelectorProps } from '../types/props';

  const props: ValueEditorProps<FullField, string> = $props();

  /** Stable prefix for `radio` input ids, so each `<label for>` association is unique. */
  const uid = $props.id();

  const type = $derived(props.type ?? 'text');
  const values = $derived(props.values ?? []);
  const placeholderText = $derived(props.fieldData?.placeholder ?? '');

  const SelectorComponent = $derived(
    props.selectorComponent ?? props.schema.controls.valueSelector
  );

  createValueEditorReset(() => ({
    operator: props.operator,
    value: props.value,
    type: props.type ?? undefined,
    inputType: props.inputType,
    skipHook: props.skipHook,
    handleOnChange: props.handleOnChange,
  }));

  const valueAsArray = $derived(toArray(props.value, { retainEmptyStrings: true }));
  const parseNumberMethod = $derived(
    getParseNumberMethod({ parseNumbers: props.parseNumbers, inputType: props.inputType })
  );
  const valueListItemClassName = $derived(
    deriveRuleClassName('valueListItem', {
      classNames: props.schema.classNames,
      suppressStandardClassnames: props.schema.suppressStandardClassnames,
    })
  );
  const inputTypeCoerced = $derived(coerceInputType(props.inputType, props.operator));

  const multiValueHandler = (val: unknown, idx: number) => {
    props.handleOnChange(
      getMultiValueUpdate({
        value: val,
        index: idx,
        valueAsArray,
        operator: props.operator,
        values,
        listsAsArrays: props.listsAsArrays,
        parseNumberMethod,
      })
    );
  };

  const bigIntValueHandler = (v: unknown) => {
    props.handleOnChange(coerceBigIntValue(v, parseNumberMethod));
  };

  /**
   * The props forwarded to the selector component: everything except the props this component
   * consumes itself.
   */
  const propsForValueSelector = $derived({
    path: props.path,
    level: props.level,
    context: props.context,
    validation: props.validation,
    testID: props.testID,
    schema: props.schema,
    field: props.field,
    fieldData: props.fieldData,
    rule: props.rule,
  } as unknown as ValueSelectorProps);

  const isBetween = $derived(
    (props.operator === 'between' || props.operator === 'notBetween') &&
      (type === 'select' || type === 'text')
  );
</script>

{#snippet separator()}<Label label={props.separator} />{/snippet}

{#if props.operator === 'null' || props.operator === 'notNull'}
  <!-- No value editor for unary operators. -->
{:else if isBetween}
  <span data-testid={props.testID} class={props.className} title={props.title}>
    {#each [0, 1] as i (i)}
      {#if i === 1}{@render separator()}{/if}
      {#if type === 'text'}
        <input
          type={inputTypeCoerced}
          placeholder={placeholderText}
          value={valueAsArray[i] ?? ''}
          class={valueListItemClassName}
          disabled={props.disabled}
          oninput={e => multiValueHandler(e.currentTarget.value, i)} />
      {:else}
        <SelectorComponent
          {...propsForValueSelector}
          className={valueListItemClassName}
          handleOnChange={v => multiValueHandler(v, i)}
          disabled={props.disabled}
          value={valueAsArray[i] ?? getFirstOption(values)}
          options={values}
          listsAsArrays={props.listsAsArrays} />
      {/if}
    {/each}
  </span>
{:else if type === 'select' || type === 'multiselect'}
  <SelectorComponent
    {...propsForValueSelector}
    testID={props.testID}
    className={props.className}
    title={props.title}
    handleOnChange={props.handleOnChange}
    disabled={props.disabled}
    value={props.value}
    options={values}
    multiple={type === 'multiselect'}
    listsAsArrays={props.listsAsArrays} />
{:else if type === 'textarea'}
  <textarea
    data-testid={props.testID}
    placeholder={placeholderText}
    value={props.value}
    title={props.title}
    class={props.className}
    disabled={props.disabled}
    oninput={e => props.handleOnChange(e.currentTarget.value)}></textarea>
{:else if type === 'switch' || type === 'checkbox'}
  <input
    data-testid={props.testID}
    type="checkbox"
    class={props.className}
    title={props.title}
    onchange={e => props.handleOnChange(e.currentTarget.checked)}
    checked={!!props.value}
    disabled={props.disabled} />
{:else if type === 'radio'}
  <span data-testid={props.testID} class={props.className} title={props.title}>
    {#each values as v (v.name)}
      {@const id = `${uid}-${v.name}`}
      <label for={id}>
        <input
          {id}
          type="radio"
          value={v.name}
          disabled={props.disabled}
          checked={props.value === v.name}
          onchange={e => props.handleOnChange(e.currentTarget.value)} />
        {v.label}
      </label>
    {/each}
  </span>
{:else if props.inputType === 'bigint'}
  <!-- Deliberately keyed off the uncoerced `inputType`. -->
  <input
    data-testid={props.testID}
    type={inputTypeCoerced}
    placeholder={placeholderText}
    value={`${props.value}`}
    title={props.title}
    class={props.className}
    disabled={props.disabled}
    oninput={e => bigIntValueHandler(e.currentTarget.value)} />
{:else}
  <input
    data-testid={props.testID}
    type={inputTypeCoerced}
    placeholder={placeholderText}
    value={props.value}
    title={props.title}
    class={props.className}
    disabled={props.disabled}
    oninput={e =>
      props.handleOnChange(
        parseNumber(e.currentTarget.value, { parseNumbers: parseNumberMethod })
      )} />
{/if}
