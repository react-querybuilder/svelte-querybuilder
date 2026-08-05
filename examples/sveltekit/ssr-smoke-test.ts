/**
 * SSR phase gate.
 *
 * Assumes the library and this example have both been built (`bun run test:ssr` at the repo root
 * does that first). Boots a preview server, fetches `/`, and asserts that the query builder tree
 * was rendered *on the server*. A DOM-API reference anywhere in the library (`document`,
 * `window`, a `$effect` that runs during SSR) surfaces here as a 500 or as missing markup.
 *
 * Vite's JS API is used rather than spawning `vite preview`: it hands back a server object with a
 * real `close()`. Spawning leaves the vite process orphaned when the wrapper is killed, which in
 * turn leaves a stale server holding the port and serving a previous build.
 */

import { preview } from 'vite';

const fail = (message: string): never => {
  console.error(`\u001B[31m✗ SSR gate: ${message}\u001B[39m`);
  process.exit(1);
};

// Port 0 => an ephemeral port, so concurrent runs and stale processes can't collide.
const server = await preview({
  root: import.meta.dirname,
  preview: { port: 0, strictPort: false, open: false },
  logLevel: 'warn',
});

const origin = server.resolvedUrls?.local[0];
if (!origin) fail('preview server did not report a local URL');

try {
  const response = await fetch(origin, { signal: AbortSignal.timeout(30_000) });
  const html = await response.text();

  if (!response.ok) {
    fail(`GET / returned ${response.status}\n${html.slice(0, 2000)}`);
  }

  // A component that touches the DOM during SSR throws, and SvelteKit renders its error page
  // rather than crashing -- so check the message text explicitly instead of trusting the status.
  for (const symptom of ['document is not defined', 'window is not defined', 'ReferenceError']) {
    if (html.includes(symptom)) {
      fail(`response HTML contains "${symptom}" -- a DOM API was referenced during SSR`);
    }
  }

  const assertions: [description: string, ok: boolean][] = [
    ['root wrapper `class="queryBuilder"`', /class="queryBuilder[ "]/.test(html)],
    ['root `role="form"`', html.includes('role="form"')],
    ['`data-dnd="disabled"`', html.includes('data-dnd="disabled"')],
    ['inline combinators enabled', html.includes('data-inlinecombinators="enabled"')],
    ['root group `data-path="[]"`', html.includes('data-path="[]"')],
    ['first rule `data-path="[0]"`', html.includes('data-path="[0]"')],
    ['second rule `data-path="[2]"`', html.includes('data-path="[2]"')],
    ['nested group `data-path="[4]"`', html.includes('data-path="[4]"')],
    ['rule nested two levels `data-path="[4,0]"`', html.includes('data-path="[4,0]"')],
    ['`data-testid="rule"` present', html.includes('data-testid="rule"')],
    ['`data-testid="rule-group"` present', html.includes('data-testid="rule-group"')],
    ['inline combinator rendered', html.includes('data-testid="inline-combinator"')],
    ['server-side formatQuery output', html.includes("firstName like 'Stev%'")],
  ];

  const failures = assertions.filter(([, ok]) => !ok).map(([description]) => description);
  if (failures.length > 0) {
    fail(
      `server-rendered HTML is missing:\n${failures.map(f => `    - ${f}`).join('\n')}\n\n` +
        `First 3000 chars of the response:\n${html.slice(0, 3000)}`
    );
  }

  console.log(`\u001B[32m✓ SSR gate: ${assertions.length} assertions passed\u001B[39m`);
} finally {
  await server.close();
}
