import { type MergeDeep } from "type-fest";

import { type Database as DatabaseGenerated } from "./database-generated.types";

export type { Json } from "./database-generated.types";

export type Database = MergeDeep<
	DatabaseGenerated,
	{
		// Override the type for a specific column in a view:
	}
>;
