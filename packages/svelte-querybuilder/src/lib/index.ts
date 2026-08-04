/**
 * `svelte-querybuilder` public API.
 *
 * Components and types are added in steps 2–5 of the implementation plan. For now this barrel only
 * re-exports the core, so downstream consumers never need a direct `@react-querybuilder/core`
 * dependency.
 */

export type * from './types';
export * from '@react-querybuilder/core';
