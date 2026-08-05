/**
 * Guards the published output against unresolvable relative import specifiers.
 *
 * `svelte-package` copies import specifiers through verbatim, so an extensionless or directory
 * import in `src/lib` survives into `dist` and breaks Node16/NodeNext ESM resolution for
 * consumers (`ERR_UNSUPPORTED_DIR_IMPORT`). Bundlers tolerate it, so nothing else in CI notices.
 *
 * `attw` can't catch this on its own: it reports `.svelte` imports in `.d.ts` files as errors too
 * (TypeScript has no built-in `.svelte` resolver), so the rule has to be ignored wholesale there.
 * This check is the narrow, false-positive-free version.
 */
import { Glob } from 'bun';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const distDir = resolve(new URL('..', import.meta.url).pathname, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `bun run build` first.');
  process.exit(1);
}

/** Extensions that resolve without further lookup in Node ESM (or via the Svelte/Vite plugin). */
const RESOLVABLE = ['.js', '.svelte', '.css', '.scss', '.json'];

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]*)\1/g;

const failures: string[] = [];

for await (const rel of new Glob('**/*.{js,d.ts}').scan(distDir)) {
  const file = resolve(distDir, rel);
  const source = await Bun.file(file).text();

  for (const [, , spec] of source.matchAll(SPECIFIER)) {
    if (!RESOLVABLE.some(ext => spec.endsWith(ext))) {
      failures.push(`${rel}: '${spec}' has no file extension (directory or extensionless import)`);
      continue;
    }
    if (!existsSync(resolve(dirname(file), spec))) {
      failures.push(`${rel}: '${spec}' does not exist in dist/`);
    }
  }
}

if (failures.length > 0) {
  console.error('Unresolvable relative specifiers in dist/:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    `\n${failures.length} problem(s). Relative imports in src/lib must carry explicit extensions.` +
      `\nNote: a '*.svelte.ts' rune module is imported as '*.svelte.js', not '*.svelte'.`
  );
  process.exit(1);
}

console.log('dist/ relative specifiers OK.');
