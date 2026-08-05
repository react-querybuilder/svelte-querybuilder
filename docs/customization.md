# Customization

Every part of the rendered tree can be replaced. There are three levels, in order of increasing reach:

1. **Translations** — change the text (or markup) of a label or tooltip.
2. **Snippets and `controlElements`** — replace an individual control.
3. **Context** — apply either of the above to every query builder in a subtree.

The DOM this package renders is class-compatible with React Query Builder, so before replacing a component, check whether [styling](./styling.md) gets you there.

## Translations

`translations` overrides the text of every label, title, and placeholder. Labels are typed `LabelNode = Snippet | string`, so anywhere React Query Builder accepts a `ReactNode`, this package accepts a snippet:

```svelte
<script lang="ts">
  import { QueryBuilder } from 'svelte-querybuilder';

  let query = $state({ combinator: 'and', rules: [] });
</script>

{#snippet addRuleLabel()}
  <span aria-hidden="true">＋</span> Add rule
{/snippet}

<QueryBuilder
  {fields}
  bind:query
  translations={{
    addRule: { label: addRuleLabel, title: 'Add a rule to this group' },
    fields: { placeholderLabel: 'Choose a field…' },
  }} />
```

Titles are plain strings — they end up in a `title` attribute, which cannot hold markup.

## Replacing a control

Each control has two interchangeable customization points: a snippet prop and a `controlElements` entry.

### Snippet props

For every key `x` of `controlElements` there is an `xSnippet` prop. The snippet takes one argument: the props object the default component would have received.

```svelte
{#snippet valueEditorSnippet(props)}
  <input
    class={props.className}
    value={props.value}
    disabled={props.disabled}
    oninput={e => props.handleOnChange(e.currentTarget.value)} />
{/snippet}

<QueryBuilder {fields} bind:query {valueEditorSnippet} />
```

Snippets are the better fit when the replacement is small, needs values from the surrounding scope, or is only used once.

### `controlElements`

Pass a Svelte component instead. This is the React Query Builder-compatible form, and the better fit when the replacement is reusable or needs its own state:

```svelte
<script lang="ts">
  import MyValueEditor from './MyValueEditor.svelte';
</script>

<QueryBuilder {fields} bind:query controlElements={{ valueEditor: MyValueEditor }} />
```

Passing `null` renders nothing:

```svelte
<QueryBuilder {fields} bind:query controlElements={{ lockRuleAction: null }} />
```

### Bulk overrides

`actionElement`/`actionElementSnippet` replaces every button-type control at once (`addRuleAction`, `removeGroupAction`, `shiftActions`, …), and `valueSelector`/`valueSelectorSnippet` replaces every `<select>`-type control (`fieldSelector`, `operatorSelector`, `combinatorSelector`, `valueSourceSelector`). Neither applies to `valueEditor`, `rule`, `ruleGroup`, `inlineCombinator`, `notToggle`, or `matchModeEditor`.

## Resolution order

Each control key is resolved independently. Levels are tried in order — props, then inherited context, then the package defaults — and within a level:

1. the keyed snippet (`valueEditorSnippet`)
2. the keyed component (`controlElements.valueEditor`), where `null` means "render nothing" and stops the search
3. the bulk snippet (`valueSelectorSnippet`)
4. the bulk component (`controlElements.valueSelector`)

So a snippet passed to `QueryBuilder` beats a component passed to `QueryBuilder`, which beats anything inherited from context, which beats the default.

## Applying customization to a subtree

Context carries configuration — `controlElements`, `controlClassnames`, `translations`, and the boolean flags — down to every query builder below it, including the subquery builders that match modes create.

```svelte
<script lang="ts">
  import { setQueryBuilderContext } from 'svelte-querybuilder';
  import MyValueEditor from './MyValueEditor.svelte';

  setQueryBuilderContext({
    controlElements: { valueEditor: MyValueEditor },
    translations: { addRule: { label: 'Add' } },
    showNotToggle: true,
  });
</script>
```

Context is set once, during component initialization. If any value has to stay reactive, pass an object of getters rather than a plain snapshot:

```svelte
setQueryBuilderContext({
  get showNotToggle() {
    return showNotToggle;
  },
});
```

Props always win over context, per key.

## Writing a replacement component

Replacement components receive the same props the default does; the types are exported from the package barrel:

```svelte
<!-- MyValueEditor.svelte -->
<script lang="ts">
  import type { ValueEditorProps } from 'svelte-querybuilder';

  const props: ValueEditorProps = $props();
</script>

<input
  data-testid={props.testID}
  class={props.className}
  title={props.title}
  value={props.value}
  disabled={props.disabled}
  oninput={e => props.handleOnChange(e.currentTarget.value)} />
```

Keep `data-testid`, `class`, and `title` if you want to stay compatible with RQB stylesheets and with tests written against the standard DOM.

Replacing `rule` or `ruleGroup` wholesale is a larger job, because those components own the class names, the accessible description, and the child paths. Rather than recomputing any of that, use `createRuleParts`/`createRuleGroupParts` — the Svelte equivalents of React Query Builder's `useRule`/`useRuleGroup`. Both take a props _getter_:

```svelte
<script lang="ts">
  import { createRuleParts, type RuleProps } from 'svelte-querybuilder';

  const props: RuleProps = $props();
  const parts = createRuleParts(() => props);
</script>

<div class={parts.outerClassName} data-path={JSON.stringify(props.path)}>
  <!-- … -->
</div>
```

## Driving the query from outside

There is no `qbId` and no Redux store. To manipulate the query from outside the component tree, construct a `QueryManager` and pass it in:

```svelte
<script lang="ts">
  import { QueryBuilder, QueryManager } from 'svelte-querybuilder';

  const manager = new QueryManager({ combinator: 'and', rules: [] }, { history: true });
</script>

<button onclick={() => manager.undo()}>Undo</button>
<QueryBuilder {fields} {manager} />
```

## Classnames

`controlClassnames` appends to the standard classes rather than replacing them, so `queryBuilder-invalid` and friends keep working:

```svelte
<QueryBuilder {fields} bind:query controlClassnames={{ rule: 'my-rule', queryBuilder: 'my-qb' }} />
```

To drop the standard classes entirely, pass `suppressStandardClassnames`.
