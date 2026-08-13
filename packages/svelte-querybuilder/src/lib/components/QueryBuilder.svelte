<!--
  @component
  The query builder.

  Port of React Query Builder's `QueryBuilder`/`QueryBuilderInternal`. All state lives in runes
  (see `createQueryBuilderState`).

  The query can be driven three ways:

  - `bind:query` — two-way binding.
  - `query` + `onQueryChange` — controlled.
  - `defaultQuery`, or nothing at all — uncontrolled.
-->
<script
  lang="ts"
  generics="RG extends RuleGroupTypeAny = RuleGroupType, F extends FullField = FullField, O extends FullOperator = FullOperator, C extends FullCombinator = FullCombinator">
  import type {
    FullCombinator,
    FullField,
    FullOperator,
    RuleGroupType,
    RuleGroupTypeAny,
  } from '@react-querybuilder/core';
  import { rootPath } from '@react-querybuilder/core';
  import Control from '../internal/Control.svelte';
  import { setQueryBuilderContext } from '../reactive/context.svelte.js';
  import { createQueryBuilderState } from '../reactive/createQueryBuilderState.svelte.js';
  import type { QueryBuilderProps } from '../types/props.js';
  import { defaultControlElements } from './defaultControlElements.js';

  let { query = $bindable(), ...restProps }: QueryBuilderProps<RG, F, O, C> = $props();

  const getProps = () => ({ ...restProps, query }) as QueryBuilderProps;

  const state = createQueryBuilderState(getProps, {
    defaultControls: defaultControlElements,
    writeBack: nextQuery => {
      query = nextQuery;
    },
  });

  // `state.context` is a `$derived`, so it is re-created on every config change. Context is set
  // once, at initialization, so what goes in is a getter rather than the value: descendants read
  // through to the current value instead of capturing the first one.
  setQueryBuilderContext(() => state.context);
</script>

<div
  role="form"
  class={state.wrapperClassName}
  data-dnd={state.dndEnabledAttr}
  data-inlinecombinators={state.inlineCombinatorsAttr}>
  <Control
    control={state.schema.controls.ruleGroup}
    props={{
      translations: state.translations,
      ruleGroup: state.rootGroup,
      schema: state.schema,
      actions: state.actions,
      id: state.rootGroup.id,
      path: rootPath,
      disabled: state.rootGroupDisabled,
      shiftUpDisabled: true,
      shiftDownDisabled: true,
      parentDisabled: state.queryDisabled,
      context: restProps.context,
    }} />
</div>
