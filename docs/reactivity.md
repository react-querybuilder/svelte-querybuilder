# Reactivity notes

Most apps never need this page. It covers the cases where Svelte's reactivity model shows through the component API: driving the query from outside, publishing context, and writing custom controls or replacement `rule`/`ruleGroup` components.

## Keep the `query` reference stable

The `query` prop is an _input_, not the authority: whenever it **changes**, it wins over local edits. "Changes" means a new reference that is also structurally different from what the builder last rendered.

So don't build a new object each time the prop is read:

```svelte
<!-- Wrong: a fresh, stale copy on every read. Every edit is reverted immediately. -->
<QueryBuilder {fields} query={{ ...myQuery }} onQueryChange={q => (myQuery = q)} />

<!-- Right -->
<QueryBuilder {fields} query={myQuery} onQueryChange={q => (myQuery = q)} />
<QueryBuilder {fields} bind:query={myQuery} />
```

Reassign the variable only when the query actually changes.

## `$state` vs. `$state.raw` for the query

Both work. Queries are immutable and replaced wholesale, so `$state.raw` is the better fit: no deep proxy, and reference equality means what it says. With deep `$state`, the builder hands the query back to you and gets a proxy of it in return. It recognizes that proxy by structure, so nothing breaks; it just costs a comparison.

If you edit the query yourself with core's tools (`add`, `update`, …) and it holds `$state` proxies, pass `{ freeze: false }`. Immer's deep freeze throws on Svelte proxies.

## Context is a getter

`setQueryBuilderContext` takes a function, not a value, and `getQueryBuilderContext()` returns that function. Svelte context is set once, during component initialization, but the configuration it carries changes over time. Calling the getter _inside_ a `$derived` or the template is what makes the read reactive:

```ts
const getContext = getQueryBuilderContext();
// Right: re-read, and tracked, on every evaluation.
const showNotToggle = $derived(getContext?.()?.showNotToggle ?? false);
// Wrong: captures the value at init and never updates.
const snapshot = getContext?.()?.showNotToggle;
```

Nested builders, including the subquery builders that match modes create, rely on this to inherit changes from the outer builder. See [customization.md](./customization.md#applying-customization-to-a-subtree).

## Control props are getter-backed

Built-in components pass props to each control as an object whose properties are getters. A control only depends on the props it actually reads, so a change to one rule's value doesn't re-run every other control's derivations. On large queries this makes mounting much faster (about 40x in the reset-heavy benchmark).

For custom controls, this means:

- **Read props where you use them**: in the template, in `$derived`, or in an event handler. A leaf control can destructure `$props()`, since it reads everything during render anyway.
- **Don't copy a prop into a plain variable at init** (`const v = props.value`). It won't update, and Svelte warns about it (`state_referenced_locally`).
- **When forwarding props to another component, don't destructure.** Keep `const props = $props()` and pass `props.x` where it's needed. Destructuring reads every prop immediately, which subscribes the component to all of them.
- **`{...props}` is fine when you need everything.** It reads every getter, so the target depends on everything, which is correct if it uses everything.

## Replacement `rule` / `ruleGroup` components

`createRuleParts` and `createRuleGroupParts` take a props _getter_ (`() => props`), for the same reason context does: the parts are `$derived` from props and must read them late. Pass `() => props`, not `props`.

## `context` is `unknown`

The free-form `context` prop, and the `context` argument to the `on*` callbacks and `handleOnClick`, are typed `unknown`. Narrow before use:

```ts
const ctx = props.context as { locale?: string } | undefined;
```
