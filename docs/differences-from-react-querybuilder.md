# Differences from React Query Builder

If you know [React Query Builder](https://react-querybuilder.js.org), start here. This is the orientation page for everything you already know that still applies, and everything that doesn't.

## The mental model

`svelte-querybuilder` is a Svelte library that **shares a logic layer** with React Query Builder — not a transliteration of it. The two packages sit on the same [`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core), and they are held to two different standards:

|                                                                                                   | Contract                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Query shapes, field/operator config, validation, `formatQuery`, the parsers, i18n string keys** | **Identical.** Same package doing the work. RQB's documentation on any of these applies verbatim.                                                                                                                  |
| **Rendered DOM** — element structure, document order, class names, `data-testid`s, `data-path`    | **Identical, and tested.** Verified against fixtures recorded from the React package, down to each element's own text. Your RQB stylesheet, theme, and DOM-level tests port over unchanged. A difference is a bug. |
| **Component API** — prop names, control maps, lifecycle flags, generics                           | **Designed for Svelte.** Parity is explicitly not a goal. Where RQB's surface exists to work around React, this package does the Svelte-shaped thing instead.                                                      |

So: keep your queries, your field configuration, and your CSS. Expect to rewrite your markup.

The rest of this page is the complete list of intentional divergences.

## Quick mapping

| React Query Builder                               | Here                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `controlElements={{ valueEditor: MyEditor }}`     | `controls={{ valueEditor: MyEditor }}`, or a top-level `{#snippet valueEditor(props)}` |
| `<QueryBuilder query onQueryChange />`            | Same, or `bind:query`                                                                  |
| `defaultQuery`                                    | Same                                                                                   |
| `enableMountQueryChange`                          | Gone; derived from first principles ([below](#known-behavioral-note))                  |
| `useRule` / `useRuleGroup`                        | `createRuleParts` / `createRuleGroupParts` (take a props _getter_)                     |
| `dispatchQuery` / `useQueryBuilderQuery` / `qbId` | Gone; there is no store ([below](#state-management))                                   |
| `react-querybuilder/history`                      | Built in; `showUndoRedo` + `schema.history`                                            |
| `ReactNode` labels                                | `LabelNode = Snippet \| string`                                                        |
| `enableDragAndDrop`                               | Not accepted ([below](#not-implemented))                                               |

## Not implemented

| Feature                                                       | Status                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag-and-drop (`@react-querybuilder/dnd`)                     | Non-goal. `enableDragAndDrop` is not accepted; the root always renders `data-dnd="disabled"`.                                                                                                                          |
| UI-framework packages (Ant Design, Bootstrap, MUI, Chakra, …) | Non-goal. Use `controls` or a control snippet to supply your own components.                                                                                                                                           |
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

RQB's `controlElements` object is replaced by two channels, both keyed by the same control names:

```svelte
<!-- A snippet, on a top-level prop -->
<QueryBuilder {fields} bind:query>
  {#snippet valueEditor(props)}
    <MyInput value={props.value} oninput={e => props.handleOnChange(e.currentTarget.value)} />
  {/snippet}
</QueryBuilder>

<!-- A component, in the `controls` object -->
<QueryBuilder {fields} bind:query controls={{ valueEditor: MyValueEditor }} />
```

`{#snippet}` only becomes a prop when the name is top-level, which is why the control names are hoisted out of the object. Snippets and components are indistinguishable at runtime, which is why each channel is typed for one kind; a snippet can still go in `controls` wrapped as `{ snippet }`. `null` renders nothing, same as React. Top-level snippets take precedence over `controls`.

Snippets are also accepted for translatable labels anywhere React accepts a `ReactNode` — the `LabelNode` type is `Snippet | string`:

```svelte
{#snippet addRuleLabel()}
  <PlusIcon /> Add rule
{/snippet}

<QueryBuilder {fields} bind:query translations={{ addRule: { label: addRuleLabel } }} />
```

See [customization.md](./customization.md) for the full resolution order.

## Type-level differences

- `ReactNode` → `LabelNode` (`Snippet | string`).
- `ComponentType<P>` → Svelte's `Component<P>`.
- `Schema` drops `dispatchQuery` and `qbId`, and gains `history` (`canUndo`/`canRedo`/`undo`/`redo`/`clear`).
- `QueryBuilderProps` has defaults for all four type parameters (`RuleGroupType`, `FullField`, `FullOperator`, `FullCombinator`), so bare `QueryBuilderProps` is valid. React requires all four.
- `ActionProps.handleOnClick` and `ShiftActionsProps.shiftUp`/`shiftDown` take a DOM `MouseEvent`, not React's synthetic `MouseEvent`.
- `Controls` entries are uniformly nullable, `null` meaning "render nothing". Unlike React, `undoRedoActions` has a default implementation, so it is never unset.
- `ControlElementsProp` → `ControlsProp` (the `controls` prop), plus `ControlSnippetProps`, which has no React counterpart: one top-level `Snippet<[props]>` prop per control name.
- A resolved control is `Control<P> = Component<P> | { snippet: Snippet<[P]> }`, or `null` for "render nothing"; `ControlPropsMap` is the single source of truth for control names and their props.

## Reactivity

React's hooks have no direct equivalents, and the `useMemo` graphs in `Rule`/`RuleGroup` are not ported — Svelte's reactivity is fine-grained, so manual memoization is unnecessary. If you were reaching into `useRule`/`useRuleGroup` to build a custom component, the equivalents are `createRuleParts` and `createRuleGroupParts`, which take a props _getter_ rather than a props object.

## Known behavioral note

Structural options — `fields`, `operators`, `combinators`, `translations`, `maxLevels`, `disabled`, and the boolean flags — are derived from props, so changing one mid-session updates both the rendered selectors and the defaults assigned to newly created rules without touching the query or the undo/redo history. A config-only change does not fire `onQueryChange`.

`onQueryChange` fires once during initialization if and only if the initial query was **seeded or normalized** by the component — that is, no query was supplied, or one was supplied without `id`s and had to be prepared. A query handed over ready to use never triggers it. This replaces React's `enableMountQueryChange` flag, which no longer exists.
