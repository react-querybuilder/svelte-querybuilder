import type { Component, Snippet } from 'svelte';
import SnippetHost from './SnippetHost.svelte';

/**
 * One wrapper component per snippet, forever. Component identity drives Svelte's mount/unmount,
 * so a fresh wrapper on every config merge would tear down and re-create the entire subtree.
 */
// oxlint-disable-next-line typescript/no-explicit-any
const wrapperCache = new WeakMap<Snippet<any>, Component<any>>();

/**
 * Adapts a snippet to the `Component` shape that {@link Controls} entries have, so a snippet
 * prop and a `controlElements` entry are interchangeable everywhere downstream.
 *
 * A Svelte component is a function of `(anchor | payload, props)`; the wrapper closes over the
 * snippet and forwards the props object through to {@link SnippetHost}. Forwarding the object
 * itself—rather than a spread copy—preserves the reactive getters the parent installed on it.
 * Works in both client and server modes.
 *
 * The result is cached by snippet identity, so calling this repeatedly with the same snippet
 * yields the same component.
 */
export const snippetToComponent = <P extends Record<string, unknown>>(
  snippet: Snippet<[P]>
): Component<P> => {
  const cached = wrapperCache.get(snippet);
  if (cached) return cached as Component<P>;

  // oxlint-disable-next-line typescript/no-explicit-any
  const wrapper = ((target: any, props: P) =>
    // oxlint-disable-next-line typescript/no-explicit-any
    (SnippetHost as unknown as (t: any, p: unknown) => unknown)(target, {
      snippet,
      props,
    })) as unknown as Component<P>;

  wrapperCache.set(snippet, wrapper);
  return wrapper;
};
