# Differences from React Query Builder

`svelte-querybuilder` is a port of [React Query Builder](https://react-querybuilder.js.org)'s UI layer. Both packages sit on top of the same logic layer, [`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core), so query shapes, field/operator configuration, validation, `formatQuery`, and the parsers all behave identically. What differs is the component layer and everything React-specific about it.

This page is the complete list of intentional divergences.

## Rendered output is identical

Element structure, document order, class names, `data-testid`s, and `data-path` attributes are intended to match React Query Builder exactly, and are verified against fixtures generated from the React package. If you find a DOM difference that is not listed here, it is a bug.

## Not implemented

| Feature                                                       | Status                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag-and-drop (`@react-querybuilder/dnd`)                     | Non-goal. `enableDragAndDrop` is not accepted; the root always renders `data-dnd="disabled"`.                                                                                                                          |
| UI-framework packages (Ant Design, Bootstrap, MUI, Chakra, …) | Non-goal. Use `controlElements` to supply your own components.                                                                                                                                                         |
| `@react-querybuilder/expr`, `@react-querybuilder/datetime` UI | Non-goal for v1.                                                                                                                                                                                                       |
| `useAsyncOptionList` / async option lists                     | Non-goal for v1. Resolve options before passing them as `fields`.                                                                                                                                                      |
| Deprecated props and their fallbacks                          | Dropped. `RuleGroupProps.combinator`/`rules`/`not` and `RuleProps.field`/`operator`/`value`/`valueSource` are not read; use `ruleGroup`/`rule`. Deprecated type aliases (`ActionWithRulesProps` and friends) are gone. |
| `ruleGroupHeaderElements` / `ruleGroupBodyElements`           | Dropped. Their upstream types are shaped around React hook returns. Replace the `ruleGroup` control element, or use snippets.                                                                                          |
| `DragHandle`                                                  | Dropped along with drag-and-drop.                                                                                                                                                                                      |

## State management

React Query Builder v8 keeps query state in a Redux store, addressed by a `qbId` registry, and exposes `dispatchQuery`/`useQueryBuilderQuery` for external access.

This package has no store and no registry. All state lives in a `QueryManager` instance owned by the component. To drive the query from outside the component tree, construct one yourself and pass it in:

```svelte
<script lang="ts">
  import { QueryBuilder, QueryManager } from 'svelte-querybuilder';

  const manager = new QueryManager({ combinator: 'and', rules: [] }, { fields, history: true });

  const clear = () => manager.setQuery({ combinator: 'and', rules: [] });
</script>

<QueryBuilder {fields} {manager} />
<button onclick={clear}>Clear</button>
<button onclick={() => manager.undo()} disabled={!manager.canUndo()}>Undo</button>
```

Consequences:

- No `qbId` prop, no `dispatchQuery`, no `useQueryBuilderQuery` equivalent.
- No `preserveQueryStateOnUnmount` — there is no store to preserve state in.
- Undo/redo needs no separate entry point. React splits it into `react-querybuilder/history`; here the component's manager is always constructed with history enabled, and `showUndoRedo` renders the controls.

## Query binding

React accepts `query` + `onQueryChange` (controlled) or `defaultQuery` (uncontrolled). Both work here, plus Svelte's two-way binding:

```svelte
<QueryBuilder {fields} bind:query />
```

Controlled mode compares the incoming query structurally, not just by reference, because a parent holding the query in `$state` hands back a reactive proxy that is never reference-equal to the object the query builder emitted.

## Customization

`controlElements` works as it does in React, with Svelte components instead of React ones:

```svelte
<QueryBuilder {fields} bind:query controlElements={{ valueEditor: MyValueEditor }} />
```

Passing `null` for a control renders nothing, same as React.

Snippets are accepted for translatable labels anywhere React accepts a `ReactNode` — the `LabelNode` type is `Snippet | string`:

```svelte
{#snippet addRuleLabel()}
  <PlusIcon /> Add rule
{/snippet}

<QueryBuilder {fields} bind:query translations={{ addRule: { label: addRuleLabel } }} />
```

> **Planned:** snippet props for each _component_ customization point (`ruleSnippet`, `valueEditorSnippet`, …), which will take precedence over the corresponding `controlElements` entry. Not implemented yet; use `controlElements` for now.

## Type-level differences

- `ReactNode` → `LabelNode` (`Snippet | string`).
- `ComponentType<P>` → Svelte's `Component<P>`.
- `Schema` drops `dispatchQuery` and `qbId`, and gains `manager: QueryManager`.
- `QueryBuilderProps` has defaults for all four type parameters (`RuleGroupType`, `FullField`, `FullOperator`, `FullCombinator`), so bare `QueryBuilderProps` is valid. React requires all four.
- `ActionProps.handleOnClick` and `ShiftActionsProps.shiftUp`/`shiftDown` take a DOM `MouseEvent`, not React's synthetic `MouseEvent`.
- `Controls['undoRedoActions']` is non-nullable. React keeps it nullable because no implementation ships in the base package.

## Reactivity

React's hooks have no direct equivalents, and the `useMemo` graphs in `Rule`/`RuleGroup` are not ported — Svelte's reactivity is fine-grained, so manual memoization is unnecessary. If you were reaching into `useRule`/`useRuleGroup` to build a custom component, the equivalents are `createRuleParts` and `createRuleGroupParts`, which take a props _getter_ rather than a props object.

## Known behavioral note

Structural manager options — `fields`, `operators`, `combinators`, and the boolean flags — are captured when the `QueryManager` is constructed. Changing them after mount updates rendering, but not the manager's own defaults for newly created rules. Recreating the manager would discard undo history, so this is deliberate; open an issue if you have a use case that needs it.
