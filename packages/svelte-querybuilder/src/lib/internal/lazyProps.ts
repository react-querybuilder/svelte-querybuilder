/**
 * Merges a shared prop bag into a control's own prop bag **as getters**, preserving laziness.
 *
 * Control prop bags are handed to `Control`, which forwards them through `{...props}`. Svelte's
 * `spread_props` proxy resolves one key at a time, so a getter-backed bag lets each of the
 * child's props subscribe to only its own sources. An eagerly-evaluated object literal instead
 * subscribes every prop of every control to the union of all of their dependencies, which turns
 * the reaction graph from O(keys) into O(controls x keys) edges per rule.
 *
 * Spreading (`{ ...common, ...own }`) would defeat this by invoking every getter, hence the
 * descriptor copy. Keys already present on `own` win, matching spread order.
 */
export const withCommonProps = <C extends object, T extends object>(common: C, own: T): C & T => {
  const descriptors = Object.getOwnPropertyDescriptors(common);
  for (const key of Object.keys(descriptors) as (keyof typeof descriptors)[]) {
    if (!(key in own)) Object.defineProperty(own, key, descriptors[key]);
  }
  return own as C & T;
};
