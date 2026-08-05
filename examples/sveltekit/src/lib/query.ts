import type { Field, RuleGroupTypeIC } from 'svelte-querybuilder';

export const fields: Field[] = [
  { name: 'firstName', label: 'First name' },
  { name: 'lastName', label: 'Last name' },
  { name: 'age', label: 'Age', inputType: 'number' },
  { name: 'instrument', label: 'Primary instrument' },
];

/**
 * A nested query with independent combinators -- the shape most likely to expose an SSR-only
 * failure, since it exercises `InlineCombinator` and the recursive `RuleGroup` path.
 */
export const query: RuleGroupTypeIC = {
  rules: [
    { field: 'firstName', operator: 'beginsWith', value: 'Stev' },
    'and',
    { field: 'lastName', operator: 'in', value: 'Vai,Vaughan' },
    'or',
    {
      rules: [
        { field: 'age', operator: '>', value: '28' },
        'and',
        { field: 'instrument', operator: '=', value: 'Guitar' },
      ],
    },
  ],
};
