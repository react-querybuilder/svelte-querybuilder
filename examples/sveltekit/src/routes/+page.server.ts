import { formatQuery } from 'svelte-querybuilder';
import { query } from '$lib/query';
import type { PageServerLoad } from './$types';

// The point of this example is server-side rendering, so opt out of prerendering explicitly.
export const prerender = false;
export const ssr = true;

export const load: PageServerLoad = () => ({
  sql: formatQuery(query, 'sql'),
});
