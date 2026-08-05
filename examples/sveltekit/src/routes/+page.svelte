<script lang="ts">
  import { QueryBuilder } from 'svelte-querybuilder';
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

<QueryBuilder {fields} bind:query showNotToggle showCloneButtons showLockButtons showShiftActions />

<h2>formatQuery, on the server</h2>
<pre data-testid="server-sql">{data.sql}</pre>

<h2>formatQuery, on the client</h2>
<pre data-testid="client-json">{JSON.stringify(query, null, 2)}</pre>
