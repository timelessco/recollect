/* oxlint-disable @typescript-eslint/ban-types -- `& {}` forces TS to expand mapped types for readability */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
/* oxlint-enable @typescript-eslint/ban-types */

export type Dict = Record<string, unknown>;
