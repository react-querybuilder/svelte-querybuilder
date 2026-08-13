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

This package has no store, no registry, and no `QueryManager`. Query state is a Svelte rune owned by the component; the query itself is manipulated with the same pure functions React Query Builder uses (`add`, `remove`, `update`, `move`), re-exported from this package's barrel.

Consequences:

- No `qbId` prop, no `dispatchQuery`, no `useQueryBuilderQuery` equivalent.
- No `preserveQueryStateOnUnmount` — there is no store to preserve state in.
- No `manager` prop and no `schema.manager`. To drive the query from outside the component tree, hold it yourself and use `bind:query`, or pass `query` + `onQueryChange`.
- Undo/redo needs no separate entry point. React splits it into `react-querybuilder/history`; here history is always on and `showUndoRedo` renders the controls. `schema.history` exposes `canUndo`, `canRedo`, `undo`, `redo`, and `clear`.

## Query binding

React accepts `query` + `onQueryChange` (controlled) or `defaultQuery` (uncontrolled). Both work here, plus Svelte's two-way binding:

```svelte
<QueryBuilder {fields} bind:query />
```

Controlled mode compares the incoming query structurally, not just by reference, because a parent holding the query in `$state` hands back a reactive proxy that is never reference-equal to the object the query builder emitted.

The `query` prop is an _input_, not the authority: it wins whenever it **changes**, and local edits stand in between. That covers every driving mode — a controlled consumer updates the prop from `onQueryChange`, an uncontrolled one never passes it at all, and `bind:query` does both.

> [!WARNING]
> Do not rebuild the `query` prop as a fresh object on every read. An expression like
> `query={structuredClone(myQuery)}` or `query={{ ...myQuery }}` produces a new, structurally
> stale object each time the prop is read, which is indistinguishable from a prop the consumer
> deliberately changed. It wins every time, reverting each edit as fast as it is applied — the
> builder will appear frozen. Pass a stable reference and reassign it only when the query
> actually changes.

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

Every control element also has a snippet prop — `valueEditorSnippet`, `ruleSnippet`, `actionElementSnippet`, and so on — which takes precedence over the corresponding `controlElements` entry:

```svelte
{#snippet valueEditorSnippet(props)}
  <MyInput value={props.value} oninput={e => props.handleOnChange(e.currentTarget.value)} />
{/snippet}

<QueryBuilder {fields} bind:query {valueEditorSnippet} />
```

React has no equivalent; `controlElements` is its only component-level customization point. See [customization.md](./customization.md) for the full resolution order.

## Type-level differences

- `ReactNode` → `LabelNode` (`Snippet | string`).
- `ComponentType<P>` → Svelte's `Component<P>`.
- `Schema` drops `dispatchQuery` and `qbId`, and gains `history` (`canUndo`/`canRedo`/`undo`/`redo`/`clear`).
- `QueryBuilderProps` has defaults for all four type parameters (`RuleGroupType`, `FullField`, `FullOperator`, `FullCombinator`), so bare `QueryBuilderProps` is valid. React requires all four.
- `ActionProps.handleOnClick` and `ShiftActionsProps.shiftUp`/`shiftDown` take a DOM `MouseEvent`, not React's synthetic `MouseEvent`.
- `Controls['undoRedoActions']` is non-nullable. React keeps it nullable because no implementation ships in the base package.
- `ControlSnippets` has no React counterpart: for every key `x` of `ControlElementsProp` there is an `xSnippet` prop taking `Snippet<[props]>`.

## Reactivity

React's hooks have no direct equivalents, and the `useMemo` graphs in `Rule`/`RuleGroup` are not ported — Svelte's reactivity is fine-grained, so manual memoization is unnecessary. If you were reaching into `useRule`/`useRuleGroup` to build a custom component, the equivalents are `createRuleParts` and `createRuleGroupParts`, which take a props _getter_ rather than a props object.

## Known behavioral note

Structural options — `fields`, `operators`, `combinators`, `translations`, `maxLevels`, `disabled`, and the boolean flags — are derived from props, so changing one mid-session updates both the rendered selectors and the defaults assigned to newly created rules without touching the query or the undo/redo history. A config-only change does not fire `onQueryChange`.

`onQueryChange` fires once during initialization if and only if the initial query was **seeded or normalized** by the component — that is, no query was supplied, or one was supplied without `id`s and had to be prepared. A query handed over ready to use never triggers it. This replaces React's `enableMountQueryChange` flag, which no longer exists.
