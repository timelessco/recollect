import { isEmpty } from "lodash";
import slugify from "slugify";
import uniqid from "uniqid";
import { z } from "zod";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { type CategoriesData } from "@/types/apiTypes";
import { CATEGORIES_TABLE_NAME, PROFILES } from "@/utils/constants";

const ROUTE = "create-collections";

const CreateCollectionsPayloadSchema = z.object({
	collections: z
		.array(
			z.object({
				category_name: z
					.string()
					.min(1, { message: "Collection name cannot be empty" }),
			}),
		)
		.min(1, { message: "At least one collection is required" }),
});

export type CreateCollectionsPayload = z.infer<
	typeof CreateCollectionsPayloadSchema
>;

const CreateCollectionsResponseSchema = z.array(
	z.object({
		category_name: z.string(),
	}),
);

export type CreateCollectionsResponse = z.infer<
	typeof CreateCollectionsResponseSchema
>;

export const POST = createSupabasePostApiHandler({
	route: ROUTE,
	inputSchema: CreateCollectionsPayloadSchema,
	outputSchema: CreateCollectionsResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { collections } = data;
		const userId = user.id;

		// Extract collection names from the array of objects
		const collectionNames = collections.map((col) => col.category_name);

		console.log(`[${route}] API called:`, {
			userId,
			collectionNames,
			count: collectionNames.length,
		});

		// Remove duplicates and trim whitespace
		const uniqueCollectionNames = [
			...new Set(collectionNames.map((name) => name.trim())),
		].filter((name) => name.length > 0);

		if (uniqueCollectionNames.length === 0) {
			return apiWarn({
				route,
				message: "No valid collection names provided",
				status: 400,
				context: { collectionNames },
			});
		}

		// 1. Check for existing collections (matching name, icon, and icon_color)
		const { data: existingCategories, error: existingCategoriesError } =
			await supabase
				.from(CATEGORIES_TABLE_NAME)
				.select("category_name, id, icon, icon_color")
				.eq("user_id", userId)
				.eq("icon", "bookmark")
				.eq("icon_color", "#ffffff")
				.in("category_name", uniqueCollectionNames);

		if (existingCategoriesError) {
			return apiError({
				route,
				message: "Failed to check existing collections",
				error: existingCategoriesError,
				operation: "fetch_existing_collections",
				userId,
				extra: { collectionNames: uniqueCollectionNames },
			});
		}

		console.log("existingCategories", existingCategories);

		// Create a Set of existing category names that match icon and icon_color
		const existingCategoryNames = new Set(
			existingCategories?.map((category) => category.category_name) || [],
		);

		// Filter out collections that already exist
		const newCollectionNames = uniqueCollectionNames.filter(
			(name) => !existingCategoryNames.has(name),
		);

		if (newCollectionNames.length === 0) {
			console.log(`[${route}] All collections already exist`);
			// Return existing categories that match the requested names
			const matchingExisting = existingCategories?.filter((cat) =>
				uniqueCollectionNames.includes(cat.category_name || ""),
			);

			if (matchingExisting && matchingExisting.length > 0) {
				// Fetch full category data
				const { data: fullCategories, error: fetchError } = await supabase
					.from(CATEGORIES_TABLE_NAME)
					.select("*")
					.in(
						"id",
						matchingExisting.map((cat) => cat.id),
					);

				if (fetchError) {
					return apiError({
						route,
						message: "Failed to fetch existing collections",
						error: fetchError,
						operation: "fetch_existing_collections_full",
						userId,
					});
				}

				return (fullCategories || []).map((cat) => ({
					category_name: cat.category_name || "",
				}));
			}

			return apiWarn({
				route,
				message: "All collections already exist",
				status: 409,
				context: { collectionNames: uniqueCollectionNames },
			});
		}

		// 2. Create new collections
		const collectionsToInsert = newCollectionNames.map((category_name) => ({
			category_name,
			user_id: userId,
			category_slug: `${slugify(category_name, { lower: true })}-instagram-${uniqid.time()}`,
			icon: "bookmark",
			icon_color: "#ffffff",
		}));

		const {
			data: insertedCategories,
			error: insertError,
		}: { data: CategoriesData[] | null; error: unknown } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.insert(collectionsToInsert)
			.select("*");

		if (insertError) {
			return apiError({
				route,
				message: "Failed to create collections",
				error: insertError,
				operation: "insert_collections",
				userId,
				extra: { collectionNames: newCollectionNames },
			});
		}

		if (!insertedCategories || isEmpty(insertedCategories)) {
			return apiError({
				route,
				message: "No data returned after creating collections",
				error: new Error("Empty response from database"),
				operation: "insert_collections",
				userId,
				extra: { collectionNames: newCollectionNames },
			});
		}

		console.log(
			`[${route}] Created ${insertedCategories.length} new collections`,
		);

		// 3. Update category order if new collections were created
		if (insertedCategories.length > 0) {
			const { data: profileData, error: profileError } = await supabase
				.from(PROFILES)
				.select("category_order")
				.eq("id", userId)
				.single();

			if (profileError) {
				console.warn(
					`[${route}] Failed to fetch profile for category order update:`,
					profileError,
				);
				// Non-blocking: collections are created, order update is supplementary
			} else {
				const existingOrder = profileData?.category_order ?? [];
				const newIds = insertedCategories.map((item) => item.id);
				const updatedOrder = [...existingOrder, ...newIds];

				const { error: orderError } = await supabase
					.from(PROFILES)
					.update({
						category_order: updatedOrder,
					})
					.eq("id", userId);

				if (orderError) {
					console.warn(
						`[${route}] Failed to update category order:`,
						orderError,
					);
					// Non-blocking: collections are created, order update is supplementary
				} else {
					console.log(
						`[${route}] Updated category order with ${newIds.length} new collection IDs`,
					);
				}
			}
		}

		// Combine existing and newly created collections
		let allCollections: CreateCollectionsResponse = (
			insertedCategories || []
		).map((cat) => ({
			category_name: cat.category_name || "",
		}));

		// If there were existing collections, fetch and include them
		if (existingCategories && existingCategories.length > 0) {
			const { data: fullExisting, error: fetchExistingError } = await supabase
				.from(CATEGORIES_TABLE_NAME)
				.select("*")
				.in(
					"id",
					existingCategories.map((cat) => cat.id),
				);

			if (!fetchExistingError && fullExisting) {
				allCollections = [
					...allCollections,
					...fullExisting.map((cat) => ({
						category_name: cat.category_name || "",
					})),
				];
			}
		}

		return allCollections;
	},
});
