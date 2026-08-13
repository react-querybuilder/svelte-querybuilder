<script lang="ts">
  import { QueryBuilder, type ActionProps } from 'svelte-querybuilder';
  import { fields, query as initialQuery } from '$lib/query';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let query = $state(initialQuery);
</script>

<h1>svelte-querybuilder + SvelteKit</h1>

<p>
  This page is server-rendered. The markup below is produced without a DOM, then hydrated on the
  client.
</p>

<QueryBuilder
  {fields}
  bind:query
  showNotToggle
  showCloneButtons
  showLockButtons
  showShiftActions>
  <!-- A control snippet, declared where it is used. -->
  {#snippet addRuleAction(props: ActionProps)}
    <button
      type="button"
      data-testid={props.testID}
      class={props.className}
      title={props.title}
      disabled={props.disabled}
      onclick={props.handleOnClick}>＋ {props.label}</button>
  {/snippet}
</QueryBuilder>

<h2>formatQuery, on the server</h2>
<pre data-testid="server-sql">{data.sql}</pre>

<h2>formatQuery, on the client</h2>
<pre data-testid="client-json">{JSON.stringify(query, null, 2)}</pre>
