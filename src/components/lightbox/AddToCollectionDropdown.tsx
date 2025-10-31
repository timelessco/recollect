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
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type CategoriesData, type SingleListData } from "../../types/apiTypes";
import {
	ALL_BOOKMARKS_URL,
	CATEGORIES_KEY,
	DOCUMENTS_URL,
	IMAGES_URL,
	LINKS_URL,
	TWEETS_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
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
	shouldFetch?: boolean;
};

export const AddToCollectionDropdown = memo(
	({
		bookmarkId,
		allbookmarksdata,
		shouldFetch,
	}: AddToCollectionDropdownProps) => {
		// State for search functionality
		const [searchTerm, setSearchTerm] = useState("");
		// Get current session and query client
		const session = useSupabaseSession((state) => state.session);
		const queryClient = useQueryClient();
		const specialUrls = [
			ALL_BOOKMARKS_URL,
			UNCATEGORIZED_URL,
			DOCUMENTS_URL,
			TWEETS_URL,
			IMAGES_URL,
			VIDEOS_URL,
			LINKS_URL,
		];
		const setIsCollectionChanged = useMiscellaneousStore(
			(state) => state.setIsCollectionChanged,
		);
		const router = useRouter();
		const categorySlug = getCategorySlugFromRouter(router);

		// Mutation hook for adding a bookmark to a collection
		const { addCategoryToBookmarkOptimisticMutation } =
			useAddCategoryToBookmarkOptimisticMutation(
				!specialUrls?.includes(categorySlug ?? ""),
			);
		// Get collections from the query cache
		let collections = useMemo(() => {
			const categoryData = queryClient?.getQueryData<{
				data: CategoriesData[];
			}>([CATEGORIES_KEY, session?.user?.id]);
			return categoryData?.data ?? [];
		}, [queryClient, session?.user?.id]);

		collections = useFetchCategories(shouldFetch).allCategories?.data ?? [];

		const category_id = allbookmarksdata?.find(
			(bookmark) => bookmark?.id === bookmarkId,
		)?.category_id;

		// Find the current collection based on category_id
		const currentCollection = useMemo(() => {
			if (!category_id) return null;
			return collections?.find((collection) => collection?.id === category_id);
		}, [collections, category_id]);

		// Filter collections based on search term and exclude current collection
		const filteredCollections = useMemo(() => {
			// Filter out current collection
			const availableCollections = collections?.filter(
				(collection) => collection?.id !== currentCollection?.id,
			);

			// Return filtered collections if no search term
			if (!searchTerm?.trim()) return availableCollections;

			// Filter collections by name (case-insensitive)
			return availableCollections?.filter(
				(collection) =>
					collection?.category_name
						?.toLowerCase()
						.includes(searchTerm?.toLowerCase()),
			);
		}, [collections, searchTerm, currentCollection?.id]);

		// Handle when a collection is selected
		const handleCollectionClick = useCallback(
			async (newCollection: CategoriesData | null) => {
				// Optimistically update the current collection
				const previousCollection = currentCollection;

				try {
					// Optimistically update the UI
					const updatedCollections = [...collections];

					// Remove the new collection from available collections
					const newCollections = updatedCollections?.filter(
						(collection) => collection.id !== newCollection?.id,
					);

					// If moving from one collection to another, add the previous collection back
					if (
						previousCollection &&
						previousCollection?.id !== newCollection?.id
					) {
						newCollections?.push(previousCollection);
					}

					// Find the newly selected collection to update currentCollection
					const selectedCollection = newCollection
						? updatedCollections?.find(
								(category) => category?.id === newCollection?.id,
						  ) ?? newCollection
						: null;

					// Update the current collection optimistically
					const currentBookmark = allbookmarksdata?.find(
						(b) => b?.id === bookmarkId,
					);
					if (currentBookmark) {
						currentBookmark.category_id = selectedCollection?.id ?? null;
					}

					await addCategoryToBookmarkOptimisticMutation?.mutateAsync({
						bookmark_id: bookmarkId,
						category_id: selectedCollection?.id ?? null,
						update_access: true,
					});
					setIsCollectionChanged(true);
				} catch (error) {
					console.error("Error adding to collection:", error);
				}

				setSearchTerm("");
			},
			[
				currentCollection,
				collections,
				allbookmarksdata,
				addCategoryToBookmarkOptimisticMutation,
				bookmarkId,
				setIsCollectionChanged,
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
									className="w-[160px] rounded-md border border-transparent py-[2px] text-left text-[13px] text-gray-500 hover:text-plain-reverse-color focus:outline-none"
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
								className="z-50 mt-1 max-h-[186px] w-[150px] overflow-y-auto rounded-xl bg-gray-50 p-1 shadow-md"
								// Allow interaction with the rest of the page
								modal={false}
							>
								{/* Search input for filtering collections */}
								<div className="pb-1">
									<Ariakit.Combobox
										// Auto-focus the search input when dropdown opens
										autoFocus
										className="w-full rounded-lg bg-gray-alpha-100 px-2 py-[5px] text-[13px] text-gray-alpha-600 placeholder:text-gray-alpha-600 focus:outline-none"
										placeholder="Search"
									/>
								</div>
								{/* List of collections */}
								<Ariakit.ComboboxList>
									{/* Show Uncategorized option only if current item is in a collection */}
									{currentCollection && (
										<Ariakit.ComboboxItem
											className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-[5.5px] text-left hover:bg-gray-100 aria-selected:bg-gray-100"
											onClick={() => handleCollectionClick(null)}
											value="Uncategorized"
										>
											<span className="text-[13px] font-[450] text-gray-800">
												Uncategorized
											</span>
										</Ariakit.ComboboxItem>
									)}
									{filteredCollections?.length ? (
										filteredCollections?.map((collection) => (
											<Ariakit.ComboboxItem
												// Styling for each collection item
												className="flex w-full cursor-pointer items-center gap-2 rounded-lg  px-2 py-[5.5px] text-left hover:bg-gray-100 aria-selected:bg-gray-100"
												key={collection?.id}
												onClick={() => handleCollectionClick(collection)}
												onMouseDown={(event) => {
													// Prevent default to avoid losing focus
													event.preventDefault();
												}}
												value={collection?.category_name}
											>
												<CollectionIcon
													bookmarkCategoryData={collection}
													iconSize="12"
													size="16"
												/>
												{/* Collection name */}
												<span className="text-[13px] font-[450] text-gray-800">
													{collection?.category_name}
												</span>
											</Ariakit.ComboboxItem>
										))
									) : searchTerm?.trim() ? (
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
