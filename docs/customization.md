# Customization

Every part of the rendered tree can be replaced. There are three levels, in order of increasing reach:

1. **Translations** — change the text (or markup) of a label or tooltip.
2. **Snippets and `controls`** — replace an individual control.
3. **Context** — apply either of the above to every query builder in a subtree.

Before replacing a component, check whether [styling](./styling.md) gets you there.

## Translations

`translations` overrides the text of every label, title, and placeholder. Labels are typed `LabelNode = Snippet | string`, so any label can be either plain text or a snippet:

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

Every control has one name — `valueEditor`, `removeRuleAction`, `ruleGroup`, and so on — and two ways to supply a replacement: a snippet on the top-level prop of that name, or a component in the `controls` object.

The split is not arbitrary. Snippets and components are both plain functions at runtime with no reliable way to tell them apart, so each channel is typed for exactly one kind. Snippets get the top-level prop because a `{#snippet}` declared inside a component's tags only becomes a prop when the name is top-level — it cannot populate a nested object.

### Snippet props

The snippet takes one argument: the props object the default component would have received.

```svelte
<QueryBuilder {fields} bind:query>
  {#snippet valueEditor(props)}
    <input
      class={props.className}
      value={props.value}
      disabled={props.disabled}
      oninput={e => props.handleOnChange(e.currentTarget.value)} />
  {/snippet}
</QueryBuilder>
```

Snippets are the better fit when the replacement is small, needs values from the surrounding scope, or is only used once.

### The `controls` prop

Pass a Svelte component instead. Better fit when the replacement is reusable or needs its own state:

```svelte
<script lang="ts">
  import MyValueEditor from './MyValueEditor.svelte';
</script>

<QueryBuilder {fields} bind:query controls={{ valueEditor: MyValueEditor }} />
```

`null` renders nothing:

```svelte
<QueryBuilder {fields} bind:query controls={{ lockRuleAction: null }} />
```

A snippet can go in `controls` too, wrapped in `{ snippet }`, for configuration assembled programmatically:

```svelte
<QueryBuilder {fields} bind:query controls={{ valueEditor: { snippet: myRawSnippet } }} />
```

### Bulk overrides

`actionElement` replaces every button-type control at once (`addRuleAction`, `removeGroupAction`, `shiftActions`, …), and `valueSelector` replaces every `<select>`-type control (`fieldSelector`, `operatorSelector`, `combinatorSelector`, `valueSourceSelector`). Both work as a snippet prop or a `controls` entry. Neither applies to `valueEditor`, `rule`, `ruleGroup`, `inlineCombinator`, `notToggle`, or `matchModeEditor`.

Which controls are "actions" and which are "selectors" comes from core's `controlKind` map, not from the shape of the name — `shiftActions` and `undoRedoActions` are composites and are not bulk-action targets despite the plural suffix.

## Resolution order

Each control key is resolved independently. Levels are tried in order — props, then inherited context, then the package defaults — and within a level:

1. the keyed snippet (the `valueEditor` prop)
2. the keyed entry (`controls.valueEditor`), where `null` means "render nothing" and stops the search
3. the bulk snippet (the `valueSelector` prop)
4. the bulk entry (`controls.valueSelector`)

So a snippet passed to `QueryBuilder` beats a component passed to `QueryBuilder`, which beats anything inherited from context, which beats the default.

## Applying customization to a subtree

Context carries configuration — `controls`, `controlClassnames`, `translations`, and the boolean flags — down to every query builder below it, including the subquery builders that match modes create.

A query builder publishes its _resolved_ controls to its descendants, so a nested builder inherits whatever the outer one ended up with, and still overrides it per key with its own props.

```svelte
<script lang="ts">
  import { setQueryBuilderContext } from 'svelte-querybuilder';
  import MyValueEditor from './MyValueEditor.svelte';

  // `setQueryBuilderContext` takes a *getter*, not a value.
  setQueryBuilderContext(() => ({
    controls: { valueEditor: MyValueEditor },
    translations: { addRule: { label: 'Add' } },
    showNotToggle: true,
  }));
</script>
```

Context is set once, during component initialization, so the argument is a getter rather than a value. Descendants call it from inside their own derivations, which is what keeps reactive values live:

```svelte
let showNotToggle = $state(true); // Read inside the getter, so descendants see every change.
setQueryBuilderContext(() => ({showNotToggle}));
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

Keep `data-testid`, `class`, and `title` if you want the standard stylesheets and any tests written against the standard DOM to keep working.

Replacing `rule` or `ruleGroup` wholesale is a larger job, because those components own the class names, the accessible description, and the child paths. Rather than recomputing any of that, use `createRuleParts`/`createRuleGroupParts`. Both take a props _getter_:

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

Hold the query yourself and bind it. There is no `manager` prop — query state is a rune owned by the component, and `bind:query` is the supported way in and out:

```svelte
<script lang="ts">
  import { QueryBuilder, add } from 'svelte-querybuilder';

  let query = $state({ combinator: 'and', rules: [] });

  // Core's pure query tools are re-exported from the barrel. `freeze: false` because immer's
  // deep freeze throws on the Svelte `$state` proxies the query is made of.
  const addRule = () =>
    (query = add(query, { field: 'firstName', operator: '=', value: '' }, [], { freeze: false }));
</script>

<button onclick={addRule}>Add rule</button>
<QueryBuilder {fields} bind:query />
```

Undo/redo is internal to the component; render its controls with `showUndoRedo` rather than driving it from outside.

## Classnames

`controlClassnames` appends to the standard classes rather than replacing them, so `queryBuilder-invalid` and friends keep working:

```svelte
<QueryBuilder {fields} bind:query controlClassnames={{ rule: 'my-rule', queryBuilder: 'my-qb' }} />
```

To drop the standard classes entirely, pass `suppressStandardClassnames`.
