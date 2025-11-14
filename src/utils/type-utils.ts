export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type Dict = Record<string, unknown>;
