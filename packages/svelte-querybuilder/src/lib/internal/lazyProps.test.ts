import { describe, expect, it } from 'vitest';
import { withCommonProps } from './lazyProps.js';

describe('withCommonProps', () => {
  it('copies shared props as getters rather than invoking them', () => {
    let reads = 0;
    const common = {
      get schema() {
        reads++;
        return 'schema';
      },
    };

    const merged = withCommonProps(common, { testID: 'x' });

    // The whole point: merging must not evaluate anything, or the caller subscribes to every
    // source of every key at once. See the note in `lazyProps.ts`.
    expect(reads).toBe(0);
    expect(merged.schema).toBe('schema');
    expect(reads).toBe(1);
  });

  it('does not evaluate the other keys when one is read', () => {
    const reads: string[] = [];
    const common = {
      get a() {
        reads.push('a');
        return 1;
      },
      get b() {
        reads.push('b');
        return 2;
      },
    };

    const merged = withCommonProps(common, {});
    void merged.a;

    expect(reads).toEqual(['a']);
  });

  it("keeps the control's own value when a key collides, matching spread order", () => {
    const common = { testID: 'common', schema: 'schema' };

    const merged = withCommonProps(common, { testID: 'own' });

    expect(merged.testID).toBe('own');
    expect(merged.schema).toBe('schema');
  });

  it('exposes shared props as own enumerable keys', () => {
    // `spread_props` enumerates with `for...in` and `Object.getOwnPropertySymbols`, and
    // `Control` forwards through `{...props}`, so the merged keys have to survive enumeration.
    const merged = withCommonProps({ schema: 'schema' }, { testID: 'x' });

    expect(Object.keys(merged).toSorted()).toEqual(['schema', 'testID']);
  });
});
