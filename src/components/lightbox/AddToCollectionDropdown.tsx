/**
 * AddToCollectionDropdown Component
 *
 * A dropdown component that allows users to:
 * - View available collections
 * - Search through collections
 * - Add the current bookmark to a selected collection
 * - Shows the current collection of the bookmark
 *
 * Features:
 * - Real-time search filtering
 * - Optimistic UI updates
 * - Keyboard navigation support via Ariakit
 * - Responsive design
 * - Visual feedback for the current collection
 *
 * @component
 * @example
 * ```tsx
 * <AddToCollectionDropdown
 *   bookmarkId={123}
 *   category_id={currentCollectionId}
 * />
 * ```
 */

import { memo, startTransition, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import * as Ariakit from "@ariakit/react";
import { useQueryClient } from "@tanstack/react-query";

// Custom hooks and utilities
import useAddCategoryToBookmarkOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type CategoriesData, type SingleListData } from "../../types/apiTypes";
import {
	ALL_BOOKMARKS_URL,
	CATEGORIES_KEY,
	CATEGORY_ID_PATHNAME,
	PREVIEW_PATH,
} from "../../utils/constants";
import { getCategorySlugFromRouter } from "../../utils/url";
// UI Components
import { CollectionIcon } from "../collectionIcon";

/**
 * Props for the AddToCollectionDropdown component
 */
type AddToCollectionDropdownProps = {
	allbookmarksdata: SingleListData[];
	bookmarkId: number;
};

export const AddToCollectionDropdown = memo(
	({ bookmarkId, allbookmarksdata }: AddToCollectionDropdownProps) => {
		// State for search functionality
		const [searchTerm, setSearchTerm] = useState("");
		// Get current session and query client
		const session = useSupabaseSession((state) => state.session);
		const queryClient = useQueryClient();

		// Mutation hook for adding a bookmark to a collection
		const { addCategoryToBookmarkOptimisticMutation } =
			useAddCategoryToBookmarkOptimisticMutation();

		// Get collections from the query cache
		const collections = useMemo(() => {
			const categoryData = queryClient?.getQueryData<{
				data: CategoriesData[];
			}>([CATEGORIES_KEY, session?.user?.id]);
			return categoryData?.data ?? [];
		}, [queryClient, session?.user?.id]);

		const category_id = allbookmarksdata.find(
			(bookmark) => bookmark?.id === bookmarkId,
		)?.category_id;

		// Find the current collection based on category_id
		const currentCollection = useMemo(() => {
			if (!category_id) return null;
			return collections.find((collection) => collection?.id === category_id);
		}, [collections, category_id]);

		// Filter collections based on search term and exclude current collection
		const filteredCollections = useMemo(() => {
			// Filter out current collection
			const availableCollections = collections.filter(
				(collection) => collection?.id !== currentCollection?.id,
			);

			// Return filtered collections if no search term
			if (!searchTerm.trim()) return availableCollections;

			// Filter collections by name (case-insensitive)
			return availableCollections.filter((collection) =>
				collection.category_name
					.toLowerCase()
					.includes(searchTerm.toLowerCase()),
			);
		}, [collections, searchTerm, currentCollection?.id]);

		const router = useRouter();
		const { setLightboxId, setLightboxOpen } = useMiscellaneousStore();

		const shallowRouteTo = useCallback(
			(item: SingleListData | undefined) => {
				if (!item) return;
				setLightboxId(item?.id.toString());
				setLightboxOpen(true);
				const categorySlug = getCategorySlugFromRouter(router);
				void router.push(
					{
						pathname: `${CATEGORY_ID_PATHNAME}`,
						query: {
							category_id: categorySlug,
							id: item?.id,
						},
					},
					`/${categorySlug}${PREVIEW_PATH}/${item?.id}`,
					{ shallow: true },
				);
			},
			[router, setLightboxId, setLightboxOpen],
		);

		// Handle when a collection is selected
		const handleCollectionClick = useCallback(
			async (collection: CategoriesData | null) => {
				if (!bookmarkId) return;

				try {
					await addCategoryToBookmarkOptimisticMutation?.mutateAsync({
						bookmark_id: bookmarkId,
						category_id: collection?.id ?? null,
						update_access: true,
					});
					setSearchTerm("");

					const currentIndex = allbookmarksdata.findIndex(
						(b) => b.id === bookmarkId,
					);
					const nextItem = allbookmarksdata[currentIndex + 1];

					if (nextItem) {
						// If there's a next item, navigate to it
						shallowRouteTo(nextItem);
					} else {
						// If this is the last item, close the lightbox and update URL
						setLightboxId(null);
						setLightboxOpen(false);
						void router.push(
							{
								pathname: `${CATEGORY_ID_PATHNAME}`,
								query: {
									category_id: router?.query?.category_id ?? ALL_BOOKMARKS_URL,
								},
							},
							getCategorySlugFromRouter(router) ?? ALL_BOOKMARKS_URL,
							{ shallow: true },
						);
					}
				} catch (error) {
					console.error("Error adding to collection:", error);
				}
			},
			[
				bookmarkId,
				addCategoryToBookmarkOptimisticMutation,
				allbookmarksdata,
				shallowRouteTo,
				setLightboxId,
				setLightboxOpen,
				router,
			],
		);

		return (
			// Main container with relative positioning for dropdown
			<div className="relative pt-[22px]">
				{/* Combobox provider for search functionality */}
				<Ariakit.ComboboxProvider
					// Update search term with debouncing using startTransition
					setValue={(value) =>
						startTransition(() => {
							setSearchTerm(value);
						})
					}
					value={searchTerm}
				>
					{/* Select provider for dropdown selection */}
					<Ariakit.SelectProvider
						// Handle collection selection
						setValue={(value) => {
							const collection = collections.find(
								(coll) => coll?.category_name === value,
							);
							if (collection) void handleCollectionClick(collection);
						}}
						// Set current collection name or empty string
						value={currentCollection ? currentCollection?.category_name : ""}
					>
						<div className="flex items-center gap-[6px]">
							<Ariakit.Select className="flex items-center gap-[6px]">
								{/* Collection icon or add icon */}
								<div className="h-[14px] w-[14px]">
									{currentCollection ? (
										<CollectionIcon bookmarkCategoryData={currentCollection} />
									) : (
										<AddToCollectionsButton />
									)}
								</div>
								{/* Dropdown button */}
								<button
									className="w-[160px] rounded-md border border-transparent py-[2px] text-left text-[13px] text-[#858585] hover:text-gray-700 focus:outline-none"
									type="button"
								>
									{/* Show current collection name or default text */}
									{currentCollection
										? currentCollection?.category_name
										: "Add to collection"}
								</button>
							</Ariakit.Select>
							{/* Dropdown popover with search and collection list */}
							<Ariakit.SelectPopover
								className="z-50 mt-1 max-h-[250px] w-[180px] overflow-y-auto rounded-xl bg-white p-1 shadow-md"
								// Allow interaction with the rest of the page
								modal={false}
							>
								{/* Search input for filtering collections */}
								<div className="pb-1">
									<Ariakit.Combobox
										// Auto-focus the search input when dropdown opens
										autoFocus
										className="w-full rounded-lg bg-[rgba(0,0,0,0.047)] px-2 py-[5px] text-[13px] text-[rgba(112,112,112,1)] focus:outline-none"
										placeholder="Search"
									/>
								</div>
								{/* List of collections */}
								<Ariakit.ComboboxList>
									{/* Show Uncategorized option only if current item is in a collection */}
									{currentCollection && (
										<Ariakit.ComboboxItem
											className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left hover:bg-[rgba(243,243,243,1)] aria-selected:bg-[rgba(243,243,243,1)]"
											onClick={() => handleCollectionClick(null)}
											onMouseDown={(event) => {
												event.preventDefault();
												void handleCollectionClick(null);
											}}
											value="Uncategorized"
										>
											<span className="text-[13px] font-[450] text-[rgba(56,56,56,1)]">
												Uncategorized
											</span>
										</Ariakit.ComboboxItem>
									)}
									{filteredCollections.length ? (
										filteredCollections.map((collection) => (
											<Ariakit.ComboboxItem
												// Styling for each collection item
												className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left hover:bg-[rgba(243,243,243,1)] aria-selected:bg-[rgba(243,243,243,1)]"
												key={collection?.id}
												onClick={() => handleCollectionClick(collection)}
												onMouseDown={(event) => {
													// Prevent default to avoid losing focus
													event.preventDefault();
													void handleCollectionClick(collection);
												}}
												value={collection?.category_name}
											>
												<CollectionIcon
													bookmarkCategoryData={collection}
													iconSize="12"
													size="16"
												/>
												{/* Collection name */}
												<span className="text-[13px] font-[450] text-[rgba(56,56,56,1)]">
													{collection?.category_name}
												</span>
											</Ariakit.ComboboxItem>
										))
									) : searchTerm.trim() ? (
										// Show message when no collections match the search
										<div className="px-3 py-2 text-sm text-gray-400">
											No collections found
										</div>
									) : null}
								</Ariakit.ComboboxList>
							</Ariakit.SelectPopover>
						</div>
					</Ariakit.SelectProvider>
				</Ariakit.ComboboxProvider>
			</div>
		);
	},
);
