<!--
  @component
  Test-only harness: control snippets declared as direct children of `QueryBuilder`, which is
  the idiomatic Svelte form and only works because control props are top-level. Named
  `*.test.svelte` so the build strips it from `dist`.
-->
<script lang="ts">
  import type { RuleGroupType } from '@react-querybuilder/core';
  import type { ActionProps, QueryBuilderProps, ValueEditorProps } from '../types/props.js';
  import QueryBuilder from './QueryBuilder.svelte';

  const {
    fields,
    defaultQuery,
  }: { fields: QueryBuilderProps['fields']; defaultQuery: RuleGroupType } = $props();
</script>

<QueryBuilder {fields} {defaultQuery}>
  {#snippet valueEditor(props: ValueEditorProps)}
    <input
      data-testid="markup-value-editor"
      value={props.value}
      oninput={e => props.handleOnChange(e.currentTarget.value)} />
  {/snippet}
  {#snippet removeRuleAction(props: ActionProps)}
    <button type="button" data-testid="markup-remove-rule" onclick={() => props.handleOnClick()}>
      x
    </button>
  {/snippet}
</QueryBuilder>
