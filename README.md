# svelte-querybuilder

A Svelte 5 port of [React Query Builder](https://react-querybuilder.js.org). Builds a nested query structure from a field/operator/value UI, backed by `@react-querybuilder/core`.

## Install

```bash
npm i svelte-querybuilder
# OR yarn add / pnpm add / bun add
```

## Quick start

```svelte
<script lang="ts">
  import { QueryBuilder } from 'svelte-querybuilder';
  import 'svelte-querybuilder/dist/query-builder.css';

  const fields = [
    { name: 'firstName', label: 'First Name' },
    { name: 'lastName', label: 'Last Name' },
  ];

  let query = $state({ combinator: 'and', rules: [] });
</script>

<QueryBuilder {fields} bind:query />
```

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
