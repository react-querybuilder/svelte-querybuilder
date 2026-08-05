/**
 * The `title` attribute of every rule group, for all 49 scenario × query pairs.
 *
 * This is where `accessibleDescriptionGenerator` surfaces. The `customized` scenario supplies a
 * non-default generator, so these assertions cover more than the identity function.
 */

import { cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { loadFixture, renderAndExtract, renderPairs } from './cases';
import type { AccessibleDescriptionEntry } from './extract';

interface AccessibleDescriptionsFixture {
  cases: {
    scenario: string;
    query: string;
    accessibleDescriptions: AccessibleDescriptionEntry[];
  }[];
}

const fixture = await loadFixture<AccessibleDescriptionsFixture>('accessible-descriptions.json');

afterEach(cleanup);

describe('conformance: accessible descriptions', () => {
  it('renders the same number of cases the fixture recorded', () => {
    expect(renderPairs).toHaveLength(fixture.cases.length);
    expect(renderPairs.map(p => [p.scenario.name, p.queryName])).toEqual(
      fixture.cases.map(c => [c.scenario, c.query])
    );
  });

  for (const [i, pair] of renderPairs.entries()) {
    const expected = fixture.cases[i];

    it(`${expected.scenario} × ${expected.query}`, () => {
      const { accessibleDescriptions } = renderAndExtract(pair);

      expect(accessibleDescriptions).toEqual(expected.accessibleDescriptions);
    });
  }
});
