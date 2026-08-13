<!--
  @component
  Test-only harness: a parent that owns the query and hands it to `QueryBuilder` with
  `bind:query`, reporting every value it sees through `report`. Named `*.test.svelte` so the
  build strips it from `dist`.
-->
<script lang="ts">
  import type { FullField, RuleGroupType } from '@react-querybuilder/core';
  import QueryBuilder from './QueryBuilder.svelte';

  const {
    fields,
    report,
  }: { fields: FullField[]; report: (query: RuleGroupType | undefined) => void } = $props();

  let query = $state<RuleGroupType | undefined>();

  $effect(() => {
    report(query);
  });
</script>

<QueryBuilder {fields} bind:query />
