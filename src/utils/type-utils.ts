import type { Json } from "@/types/database.types";

/* oxlint-disable @typescript-eslint/ban-types -- `& {}` forces TS to expand mapped types for readability */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
/* oxlint-enable @typescript-eslint/ban-types */

export type Dict = Record<string, unknown>;

/* oxlint-disable @typescript-eslint/no-unsafe-type-assertion -- centralized type boundary */

/**
 * Type boundary: converts Zod-validated data to Supabase's `Json` type.
 * Use for RPC parameters whose generated type is `Json` or `Json[]` but whose
 * runtime data comes from a Zod schema (structurally incompatible at the type level).
 */
export function toJson(value: unknown[]): Json[];
export function toJson(value: unknown): Json;
export function toJson(value: unknown): Json | Json[] {
  return value as Json;
}

/**
 * Type boundary: converts Zod-validated data to a Supabase DB type.
 * Use when Zod-inferred types are structurally compatible but not assignable
 * (e.g., `z.unknown()` fields vs `Json`, missing `null` in unions).
 */
export function toDbType<T>(value: unknown): T {
  return value as T;
}

/* oxlint-enable @typescript-eslint/no-unsafe-type-assertion */
