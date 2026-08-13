/**
 * `bind:query` at the component level: the parent owns the query, so what it ends up holding —
 * including the query the builder seeds for itself when the parent starts empty — is the whole
 * contract.
 */

import type { FullField, RuleGroupType } from '@react-querybuilder/core';
import { TestID } from '@react-querybuilder/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Harness from './BindQueryHarness.test.svelte';

const fields: FullField[] = [
  { name: 'firstName', label: 'First Name', value: 'firstName' },
  { name: 'lastName', label: 'Last Name', value: 'lastName' },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QueryBuilder bind:query', () => {
  it('writes the seeded query back to the parent', () => {
    const report = vi.fn();
    // `state_unsafe_mutation` would mean the seeding write happens inside a derivation.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(Harness, { props: { fields, report } });

    const bound = report.mock.lastCall![0] as RuleGroupType;
    expect(bound).toMatchObject({ combinator: 'and', rules: [] });
    expect(bound.id).toBeDefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('writes later commits back to the parent', async () => {
    const report = vi.fn();
    render(Harness, { props: { fields, report } });

    await userEvent.click(screen.getByTestId(TestID.addRule));

    expect((report.mock.lastCall![0] as RuleGroupType).rules).toHaveLength(1);
  });
});
