import { type MergeDeep } from "type-fest";

import { type Database as DatabaseGenerated } from "./database-generated.types";

export type { Json } from "./database-generated.types";

export type Database = MergeDeep<
	DatabaseGenerated,
	{
		public: {
			Functions: {
				// Fix: Generated types don't infer nullable columns in RETURNS TABLE
				// The make_discoverable column can be NULL but Supabase CLI assumes NOT NULL
				search_bookmarks_url_tag_scope: {
					Returns: Array<{
						make_discoverable: string | null;
					}>;
				};
			};
		};
	}
>;
