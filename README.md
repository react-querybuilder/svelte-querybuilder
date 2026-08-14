# svelte-querybuilder

A Svelte 5 query builder: a nested query structure built from a field/operator/value UI, backed by [`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core) — the same logic layer [React Query Builder](https://react-querybuilder.js.org) runs on, so query shapes, formatters, and parsers behave identically and the rendered DOM is class-compatible. The component API is Svelte's own.

## Install

```bash
npm i svelte-querybuilder
# OR yarn add / pnpm add / bun add
```

Requires Svelte 5.25 or later. `@react-querybuilder/core` comes along as a dependency, and the entire core API is re-exported from this package's barrel — you never need to install or import it directly.

## Quick start

```svelte
<script lang="ts">
  import { formatQuery, QueryBuilder, type Field, type RuleGroupType } from 'svelte-querybuilder';
  import 'svelte-querybuilder/dist/query-builder.css';

  const fields: Field[] = [
    { name: 'firstName', label: 'First name' },
    { name: 'lastName', label: 'Last name' },
    { name: 'age', label: 'Age', inputType: 'number' },
  ];

  let query = $state<RuleGroupType>({
    combinator: 'and',
    rules: [{ field: 'firstName', operator: 'beginsWith', value: 'Stev' }],
  });
</script>

<QueryBuilder {fields} bind:query />

<pre>{formatQuery(query, 'sql')}</pre>
```

## Driving the query

Three options, in increasing order of control:

| Approach                  | Use when                                                                |
| ------------------------- | ----------------------------------------------------------------------- |
| `defaultQuery`            | Uncontrolled — the component owns the query.                            |
| `bind:query`              | The common case. Two-way binding via `$bindable`.                       |
| `query` + `onQueryChange` | Fully controlled, e.g. when the query lives in a store or is validated. |

The `query` prop is an input, not the authority: it wins whenever it changes, and local edits stand in between. Pass a stable reference — rebuilding it on every read (`query={{ ...myQuery }}`) reverts every edit as fast as it is applied.

Undo/redo and history are built in; render the controls with `showUndoRedo`.

## Styling

```ts
import 'svelte-querybuilder/dist/query-builder.css';
// ...or the structural-only stylesheet:
import 'svelte-querybuilder/dist/query-builder-layout.css';
```

The DOM is class-compatible with React Query Builder, so existing RQB stylesheets and themes port over unchanged. See [`docs/styling.md`](./docs/styling.md).

## Docs

**Coming from React Query Builder?** Read [Differences from React Query Builder](./docs/differences-from-react-querybuilder.md) first. Your queries, field configuration, and CSS carry over unchanged; the component API is Svelte's, not React's.

- [Differences from React Query Builder](./docs/differences-from-react-querybuilder.md) — start here if you know RQB
- [Customization](./docs/customization.md) — snippets, `controls`, translations, context
- [Styling](./docs/styling.md)
- Concepts, field/operator configuration, query formats, and parsers: the [React Query Builder documentation](https://react-querybuilder.js.org/docs/intro) applies directly, since the logic layer is shared.

## Examples

- [`examples/sveltekit`](./examples/sveltekit) — SvelteKit, server-side rendering. Doubles as the repo's SSR gate (`bun run test:ssr`).

The development playground lives in the library package itself (`packages/svelte-querybuilder/src/routes`) and runs against library source: `bun run dev`.

## Non-goals

Not in v1, and not planned for the near term:

- Drag-and-drop
- UI-framework compatibility packages (Ant Design, Bootstrap, MUI, etc.)
- `@react-querybuilder/expr` / `@react-querybuilder/datetime` UI integrations
- Async option lists
- A Redux store or a `qbId` registry — hold the query yourself and use `bind:query`
- Deprecated props carried over from React Query Builder

## License

MIT
