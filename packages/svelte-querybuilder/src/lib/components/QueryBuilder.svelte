<!--
  @component
  The query builder.

  Port of React Query Builder's `QueryBuilder`/`QueryBuilderInternal`. All state lives in a
  `QueryManager` (see `createQueryBuilderState`).

  The query can be driven three ways:

  - `bind:query` — two-way binding.
  - `query` + `onQueryChange` — controlled.
  - `defaultQuery` — uncontrolled.
  - a `manager` prop — driven from outside the component tree entirely.
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
  import { setQueryBuilderContext } from '../reactive/context.svelte';
  import { createQueryBuilderState } from '../reactive/createQueryBuilderState.svelte';
  import type { QueryBuilderProps } from '../types/props';
  import { defaultControlElements } from './defaultControlElements';

  let { query = $bindable(), ...restProps }: QueryBuilderProps<RG, F, O, C> = $props();

  const getProps = () => ({ ...restProps, query }) as QueryBuilderProps;

  const state = createQueryBuilderState(getProps, {
    defaultControls: defaultControlElements,
    writeBack: nextQuery => {
      query = nextQuery;
    },
  });

  // `state.context` is a `$derived`, so it is re-created on every config change. Context is set
  // once, at initialization, hence the getter indirection: descendants read through to the
  // current value instead of capturing the first one.
  const contextValue = {} as Record<string, unknown>;
  for (const key of Object.keys(state.context)) {
    Object.defineProperty(contextValue, key, {
      enumerable: true,
      get: () => (state.context as Record<string, unknown>)[key],
    });
  }
  setQueryBuilderContext(contextValue as never);

  const RuleGroupControlElement = $derived(state.schema.controls.ruleGroup);
</script>

<div
  role="form"
  class={state.wrapperClassName}
  data-dnd={state.dndEnabledAttr}
  data-inlinecombinators={state.inlineCombinatorsAttr}>
  <RuleGroupControlElement
    translations={state.translations}
    ruleGroup={state.rootGroup}
    schema={state.schema}
    actions={state.actions}
    id={state.rootGroup.id}
    path={rootPath}
    disabled={state.rootGroupDisabled}
    shiftUpDisabled
    shiftDownDisabled
    parentDisabled={state.queryDisabled}
    context={restProps.context} />
</div>
