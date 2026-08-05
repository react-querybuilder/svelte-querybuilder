/**
 * Full DOM parity: the verbatim `class` attribute of every element with one, in document order,
 * for all 49 scenario × query pairs.
 *
 * ## Pre-flush extraction
 *
 * The fixtures were produced with `renderToStaticMarkup`, so no React effect has run. The Svelte
 * port has one effect that can change rendered output — the value-editor reset from step 3 — so
 * the conformance assertion extracts immediately after `render()`, before awaiting `tick()`, and
 * a separate test asserts that the surface is *stable* across a flush. If the reset ever does
 * change a class post-flush, that second test is where it surfaces, as a documented divergence
 * rather than a conformance failure.
 */

import { cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { loadFixture, renderAndExtract, renderPairs } from './cases';
import { extract, type ClassNameEntry } from './extract';
import { scenarios } from './scenarios';

interface ClassNamesFixture {
  scenarios: { name: string; description: string; props: Record<string, unknown> }[];
  cases: { scenario: string; query: string; classNames: ClassNameEntry[] }[];
}

const fixture = await loadFixture<ClassNamesFixture>('classnames.json');

afterEach(cleanup);

describe('conformance: classnames', () => {
  it('renders the same number of cases the fixture recorded', () => {
    expect(renderPairs).toHaveLength(fixture.cases.length);
    expect(renderPairs.map(p => [p.scenario.name, p.queryName])).toEqual(
      fixture.cases.map(c => [c.scenario, c.query])
    );
  });

  it('reproduces the recorded scenario definitions', () => {
    // Function-valued props serialize as `null`, so this compares the JSON projection of the
    // local scenarios against the recorded one. It catches a scenario renamed, reordered, or
    // given a different boolean prop upstream — the drift a bumped `CONFORMANCE_TAG` can hide.
    const local = scenarios.map(({ name, description, props }) => ({
      name,
      description,
      props: JSON.parse(JSON.stringify(props, (_k, v) => (typeof v === 'function' ? null : v))),
    }));

    expect(local).toEqual(fixture.scenarios);
  });

  for (const [i, pair] of renderPairs.entries()) {
    const expected = fixture.cases[i];

    it(`${expected.scenario} × ${expected.query}`, () => {
      const { classNames } = renderAndExtract(pair);

      expect(classNames).toEqual(expected.classNames);
    });
  }

  describe('post-flush stability', () => {
    for (const [i, pair] of renderPairs.entries()) {
      const expected = fixture.cases[i];

      it(`${expected.scenario} × ${expected.query}`, async () => {
        const { container, classNames } = renderAndExtract(pair);
        expect(classNames).toEqual(expected.classNames);

        await tick();

        expect(extract(container).classNames).toEqual(classNames);
      });
    }
  });
});
