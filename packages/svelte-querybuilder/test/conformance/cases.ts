/**
 * Shared plumbing for the conformance suites: fixture loading, and rendering one scenario × query
 * pair the way `utils/conformance/generate.tsx` rendered it upstream.
 */

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { render } from '@testing-library/svelte';
import { tick, type ComponentProps } from 'svelte';
import { QueryBuilder } from '../../src/lib';
import { extract, type ExtractResult } from './extract';
import { queries, type QueryFixtureName } from './queries';
import { scenarios, type Scenario } from './scenarios';

const fixturesDir = path.resolve(import.meta.dirname, '../fixtures');

export interface FixtureMeta {
  schemaVersion: number;
  generator: { package: string; version: string; source: string; renderMode: string };
}

/**
 * Reads one fixture file, with an actionable message when it is missing — the files are
 * gitignored and fetched on demand, so "not found" is the expected first-run failure.
 *
 * `node:fs` rather than `Bun.file`: Vitest runs these tests under Node, not Bun.
 */
export const loadFixture = async <T>(name: string): Promise<T & FixtureMeta> => {
  const file = path.join(fixturesDir, name);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error(
      `Conformance fixture ${name} could not be read. Run \`bun run conformance:fetch\` (or ` +
        `\`bun run conformance\`, which fetches first).`
    );
  }
};

/** One scenario × query pair, in the order `generate.tsx` flattened them. */
export interface RenderPair {
  scenario: Scenario;
  queryName: string;
  query: unknown;
}

/**
 * Flattens scenarios into render pairs. The order must match `generate.tsx` exactly, since the
 * fixture `cases` array is positional as well as keyed.
 */
export const renderPairs: RenderPair[] = scenarios.flatMap(scenario => {
  const cases: [string, unknown][] = scenario.query
    ? [['inline', scenario.query]]
    : (scenario.queries ?? []).map(name => [name, queries[name as QueryFixtureName]]);

  return cases.map(([queryName, query]) => ({ scenario, queryName, query }));
});

/**
 * Renders a pair and extracts its class surface and accessible descriptions.
 *
 * The props mirror `generate.tsx`: controlled `query`, no-op `onQueryChange`. Nothing here
 * awaits `tick()`, because the fixtures come from `renderToStaticMarkup` — see the note in
 * `classnames.test.ts`.
 */
export const renderAndExtract = ({
  scenario,
  query,
}: RenderPair): ExtractResult & { container: Element } => {
  // Scenario props are deliberately untyped (see `scenarios.ts`), so the cast is where that
  // looseness is contained rather than something the component API is missing.
  const props = { ...scenario.props, query, onQueryChange: () => {} } as ComponentProps<
    typeof QueryBuilder
  >;
  const { container } = render(QueryBuilder, { props });

  return { container, ...extract(container) };
};

/**
 * Bounded stabilization loop. A reset write triggers a re-render which may schedule further
 * effects, so the tick count is discovered rather than hard-coded. Non-convergence is the
 * `effect_update_depth_exceeded`-class failure and must fail loudly.
 */
const drain = async (container: Element, max = 10): Promise<void> => {
  let previous = JSON.stringify(extract(container));
  for (let i = 0; i < max; i++) {
    await tick();
    const current = JSON.stringify(extract(container));
    if (current === previous) return;
    previous = current;
  }
  throw new Error(`Surface did not stabilize within ${max} ticks — probable effect loop.`);
};

/**
 * Renders a pair UNCONTROLLED (`defaultQuery`, no `onQueryChange`) and extracts after effects
 * have settled — the wiring `classnames-post-flush.json` was generated with. Controlled wiring
 * would make effect-driven query changes a fixed point and the layer vacuous.
 */
export const renderAndExtractPostFlush = async ({
  scenario,
  query,
}: RenderPair): Promise<ExtractResult & { container: Element }> => {
  const props = { ...scenario.props, defaultQuery: query } as ComponentProps<typeof QueryBuilder>;
  const { container } = render(QueryBuilder, { props });
  await drain(container);

  return { container, ...extract(container) };
};
