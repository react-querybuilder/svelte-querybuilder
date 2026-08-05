# svelte-querybuilder

A Svelte 5 port of [React Query Builder](https://react-querybuilder.js.org). Builds a nested query structure from a field/operator/value UI, backed by [`@react-querybuilder/core`](https://www.npmjs.com/package/@react-querybuilder/core).

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

Four options, in increasing order of control:

| Approach                  | Use when                                                                |
| ------------------------- | ----------------------------------------------------------------------- |
| `defaultQuery`            | Uncontrolled — the component owns the query.                            |
| `bind:query`              | The common case. Two-way binding via `$bindable`.                       |
| `query` + `onQueryChange` | Fully controlled, e.g. when the query lives in a store or is validated. |
| `manager`                 | A `QueryManager` you construct and hold, driven from outside the tree.  |

The `manager` prop replaces React Query Builder's `qbId` registry and `dispatchQuery`. Undo/redo, history, and programmatic mutation all go through the manager.

## Styling

```ts
import 'svelte-querybuilder/dist/query-builder.css';
// ...or the structural-only stylesheet:
import 'svelte-querybuilder/dist/query-builder-layout.css';
```

The DOM is class-compatible with React Query Builder, so existing RQB stylesheets and themes port over unchanged. See [`docs/styling.md`](./docs/styling.md).

## Docs

- [Differences from React Query Builder](./docs/differences-from-react-querybuilder.md)
- [Customization](./docs/customization.md)
- [Styling](./docs/styling.md)
- Concepts, field/operator configuration, query formats, and parsers: the [React Query Builder documentation](https://react-querybuilder.js.org/docs/intro) applies directly, since the logic layer is shared.

## Examples

- [`examples/demo`](./examples/demo) — Vite + Svelte, running against library source. `bun run --filter @svelte-querybuilder/example-demo dev`
- [`examples/sveltekit`](./examples/sveltekit) — SvelteKit, server-side rendering. Doubles as the repo's SSR gate (`bun run test:ssr`).

## Non-goals

Not in v1, and not planned for the near term:

- Drag-and-drop
- UI-framework compatibility packages (Ant Design, Bootstrap, MUI, etc.)
- `@react-querybuilder/expr` / `@react-querybuilder/datetime` UI integrations
- Async option lists
- A Redux store or a `qbId` registry — hold a `QueryManager` instance instead
- Deprecated-prop fallbacks from the React package

## License

MIT
