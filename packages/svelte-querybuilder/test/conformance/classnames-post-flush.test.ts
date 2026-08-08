/**
 * The class surface *after* effects have flushed, against `classnames-post-flush.json`.
 *
 * Upstream renders this layer UNCONTROLLED (`defaultQuery`, no `onQueryChange`) so effect-driven
 * query changes actually land instead of being reverted by a controlled-prop sync. This port
 * reproduces that wiring in `renderAndExtractPostFlush`.
 *
 * Each case carries `differsFromStatic`, so both directions are asserted: `false` cases must be
 * byte-identical to their `classnames.json` counterpart (the stability invariant this port
 * previously invented, now fixture-authorized), `true` cases must *not* be — which is what catches
 * a port whose reset effect never runs. Upstream currently records `false` for all 50 cases (the
 * mount-query-change effect clobbers the mount-time reset), so the `true` branch is wired but
 * unexercised; keep it.
 */

import { cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { loadFixture, renderAndExtractPostFlush, renderPairs } from './cases';
import type { ClassNameEntry } from './extract';

interface PostFlushFixture {
  description: string;
  cases: {
    scenario: string;
    query: string;
    differsFromStatic: boolean;
    classNames: ClassNameEntry[];
  }[];
}

interface ClassNamesFixture {
  cases: { scenario: string; query: string; classNames: ClassNameEntry[] }[];
}

const fixture = await loadFixture<PostFlushFixture>('classnames-post-flush.json');
const staticFixture = await loadFixture<ClassNamesFixture>('classnames.json');

afterEach(cleanup);

describe('conformance: classnames (post-flush)', () => {
  it('renders the same number of cases the fixture recorded', () => {
    expect(renderPairs).toHaveLength(fixture.cases.length);
    expect(renderPairs.map(p => [p.scenario.name, p.queryName])).toEqual(
      fixture.cases.map(c => [c.scenario, c.query])
    );
  });

  it('is aligned case-for-case with the static layer', () => {
    expect(fixture.cases.map(c => [c.scenario, c.query])).toEqual(
      staticFixture.cases.map(c => [c.scenario, c.query])
    );
  });

  for (const [i, pair] of renderPairs.entries()) {
    const expected = fixture.cases[i];
    const staticEntry = staticFixture.cases[i];

    it(`${expected.scenario} × ${expected.query}`, async () => {
      const { classNames } = await renderAndExtractPostFlush(pair);

      expect(classNames).toEqual(expected.classNames);

      if (expected.differsFromStatic) {
        // A port that never runs its reset effect would pass both layers without this.
        expect(classNames).not.toEqual(staticEntry.classNames);
      } else {
        expect(classNames).toEqual(staticEntry.classNames);
      }
    });
  }
});
