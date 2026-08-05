<script lang="ts">
  import {
    formatQuery,
    QueryBuilder,
    type Field,
    type FormatQueryOptions,
    type RuleGroupType,
    type RuleGroupTypeIC,
  } from 'svelte-querybuilder';

  const fields: Field[] = [
    { name: 'firstName', label: 'First name', placeholder: 'Enter first name' },
    { name: 'lastName', label: 'Last name', placeholder: 'Enter last name' },
    { name: 'age', label: 'Age', inputType: 'number' },
    { name: 'isMusician', label: 'Is a musician', valueEditorType: 'checkbox', defaultValue: false },
    {
      name: 'instrument',
      label: 'Primary instrument',
      valueEditorType: 'select',
      values: [
        { name: 'Guitar', label: 'Guitar' },
        { name: 'Piano', label: 'Piano' },
        { name: 'Drums', label: 'Drums' },
        { name: 'Vocals', label: 'Vocals' },
      ],
      defaultValue: 'Guitar',
    },
    { name: 'birthdate', label: 'Birthdate', inputType: 'date' },
    {
      name: 'gender',
      label: 'Gender',
      operators: [{ name: '=', label: 'is' }],
      valueEditorType: 'radio',
      values: [
        { name: 'M', label: 'Male' },
        { name: 'F', label: 'Female' },
        { name: 'O', label: 'Other' },
      ],
    },
  ];

  // Two independently-bound queries so the "independent combinators" toggle can swap between the
  // two query *shapes* -- `combinator` on the group vs. combinators interleaved into `rules`.
  let query = $state<RuleGroupType>({
    combinator: 'and',
    not: false,
    rules: [
      { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
      { field: 'lastName', operator: 'in', value: 'Vai,Vaughan' },
      { field: 'age', operator: '>', value: '28' },
      {
        combinator: 'or',
        rules: [
          { field: 'isMusician', operator: '=', value: true },
          { field: 'instrument', operator: '=', value: 'Guitar' },
        ],
      },
      { field: 'birthdate', operator: 'between', value: '1954-10-03,1960-06-06' },
    ],
  });

  let queryIC = $state<RuleGroupTypeIC>({
    rules: [
      { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
      'and',
      { field: 'lastName', operator: 'in', value: 'Vai,Vaughan' },
      'or',
      {
        rules: [
          { field: 'age', operator: '>', value: '28' },
          'and',
          { field: 'instrument', operator: '=', value: 'Guitar' },
        ],
      },
    ],
  });

  let independentCombinators = $state(false);
  let showCombinatorsBetweenRules = $state(false);
  let showNotToggle = $state(true);
  let showShiftActions = $state(true);
  let showCloneButtons = $state(true);
  let showLockButtons = $state(true);
  let showMuteButtons = $state(false);
  let showUndoRedo = $state(true);
  let disabled = $state(false);
  let parseNumbers = $state(false);

  const flags = $derived({
    showCombinatorsBetweenRules,
    showNotToggle,
    showShiftActions,
    showCloneButtons,
    showLockButtons,
    showMuteButtons,
    showUndoRedo,
    disabled,
    parseNumbers,
  });

  const currentQuery = $derived<RuleGroupType | RuleGroupTypeIC>(
    independentCombinators ? queryIC : query
  );

  const formats = [
    ['SQL', 'sql'],
    ['MongoDB', 'mongodb_query'],
    ['CEL', 'cel'],
    ['JSONLogic', 'jsonlogic'],
  ] as const satisfies readonly (readonly [string, FormatQueryOptions['format']])[];

  const format = (f: FormatQueryOptions['format']) => {
    try {
      const result = formatQuery(currentQuery, { format: f, parseNumbers });
      return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    } catch (error) {
      return `// ${error instanceof Error ? error.message : String(error)}`;
    }
  };
</script>

<h1>svelte-querybuilder demo</h1>
<p class="subtitle">
  Running against library source. Edit anything under
  <code>packages/svelte-querybuilder/src/lib</code> and this page hot-reloads.
</p>

<div class="controls">
  <label><input type="checkbox" bind:checked={independentCombinators} /> independent combinators</label>
  <label>
    <input type="checkbox" bind:checked={showCombinatorsBetweenRules} disabled={independentCombinators} />
    showCombinatorsBetweenRules
  </label>
  <label><input type="checkbox" bind:checked={showNotToggle} /> showNotToggle</label>
  <label><input type="checkbox" bind:checked={showShiftActions} /> showShiftActions</label>
  <label><input type="checkbox" bind:checked={showCloneButtons} /> showCloneButtons</label>
  <label><input type="checkbox" bind:checked={showLockButtons} /> showLockButtons</label>
  <label><input type="checkbox" bind:checked={showMuteButtons} /> showMuteButtons</label>
  <label><input type="checkbox" bind:checked={showUndoRedo} /> showUndoRedo</label>
  <label><input type="checkbox" bind:checked={disabled} /> disabled</label>
  <label><input type="checkbox" bind:checked={parseNumbers} /> parseNumbers</label>
</div>

{#if independentCombinators}
  <QueryBuilder {fields} bind:query={queryIC} {...flags} />
{:else}
  <QueryBuilder {fields} bind:query {...flags} />
{/if}

<div class="output">
  <section>
    <h2>query</h2>
    <pre>{JSON.stringify(currentQuery, null, 2)}</pre>
  </section>
  {#each formats as [label, f] (f)}
    <section>
      <h2>{label}</h2>
      <pre>{format(f)}</pre>
    </section>
  {/each}
</div>
