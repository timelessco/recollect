/**
 * Mutation Hook Template
 *
 * Replace placeholders:
 * - {Entity} → entity name PascalCase (e.g., Tag, Category)
 * - {entity} → entity name camelCase (e.g., tag, category)
 * - {ENTITY} → entity name UPPER_SNAKE (e.g., TAG, CATEGORY)
 * - {route-path} → API route path (e.g., /tags/create-user-tags)
 *
 * Customize:
 * - Query key pattern based on cache structure
 * - Optimistic update logic based on data shape
 * - Cache invalidation based on affected queries
 */

import { useQueryClient } from "@tanstack/react-query";

import {
	type {Entity}Payload,
	type {Entity}Response,
} from "@/app/api{route-path}/route";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { type {Entity}Data } from "@/types/apiTypes";
import {
	{ENTITY}_KEY,
	{ROUTE_CONSTANT},
} from "@/utils/constants";

// ============================================================================
// Types
// ============================================================================

// Cache data shape (adjust based on your query structure)
type CacheData = { data: {Entity}Data[] } | undefined;

// For paginated data:
// type CacheData = {
// 	pages: Array<{ data: {Entity}Data[] }>;
// } | undefined;

// ============================================================================
// Hook
// ============================================================================

export function use{Entity}Mutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const queryKey = [{ENTITY}_KEY, session?.user?.id] as const;

	const {entity}Mutation = useReactQueryOptimisticMutation<
		{Entity}Response,
		Error,
		{Entity}Payload,
		typeof queryKey,
		CacheData
	>({
		mutationFn: (payload) =>
			postApi<{Entity}Response>(`/api${{{ROUTE_CONSTANT}}}`, payload),
		queryKey,

		// ========================================================================
		// Optimistic Update
		// ========================================================================
		updater: (currentData, variables) => {
			if (!currentData?.data) {
				return currentData;
			}

			// Create optimistic placeholder with temp ID
			const optimistic{Entity} = {
				id: -Date.now(), // Negative temp ID
				name: variables.name,
				user_id: session?.user?.id,
			} as unknown as {Entity}Data;

			return {
				...currentData,
				data: [...currentData.data, optimistic{Entity}],
			};
		},

		// ========================================================================
		// Optional: Additional Optimistic Updates (for multi-cache scenarios)
		// ========================================================================
		// additionalOptimisticUpdates: [
		// 	{
		// 		getQueryKey: () => [OTHER_KEY, session?.user?.id],
		// 		updater: (currentData, variables) => {
		// 			// Update other cache...
		// 			return currentData;
		// 		},
		// 	},
		// ],

		// ========================================================================
		// Cache Invalidation
		// ========================================================================
		onSettled: (_data, error) => {
			if (error) {
				return;
			}

			void queryClient.invalidateQueries({
				queryKey: [{ENTITY}_KEY, session?.user?.id],
			});

			// Invalidate related caches if needed:
			// void queryClient.invalidateQueries({
			// 	queryKey: [OTHER_KEY, session?.user?.id],
			// });
		},

		// ========================================================================
		// Toast Configuration
		// ========================================================================
		showSuccessToast: true,
		successMessage: "{Entity} created",
	});

	return { {entity}Mutation };
}

// ============================================================================
// Paginated Data Example
// ============================================================================
/*
updater: (currentData, variables) => {
	if (!currentData?.pages) {
		return currentData;
	}

	const tempId = -Date.now();

	return {
		...currentData,
		pages: currentData.pages.map((page) => ({
			...page,
			data: page.data?.map((item) => {
				if (item.id === variables.targetId) {
					return {
						...item,
						relatedItems: [
							...(item.relatedItems || []),
							{ id: tempId, name: variables.name },
						],
					};
				}
				return item;
			}),
		})),
	};
},
*/
