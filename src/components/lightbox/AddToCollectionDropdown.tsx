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
import * as Ariakit from "@ariakit/react";
import { useQueryClient } from "@tanstack/react-query";

// Custom hooks and utilities
import useAddCategoryToBookmarkOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import { useSupabaseSession } from "../../store/componentStore";
import { type CategoriesData } from "../../types/apiTypes";
import { CATEGORIES_KEY } from "../../utils/constants";
// UI Components
import { CollectionIcon } from "../collectionIcon";

/**
 * Props for the AddToCollectionDropdown component
 */
type AddToCollectionDropdownProps = {
	bookmarkId: number;
	category_id: number;
};

export const AddToCollectionDropdown = memo(
	({ bookmarkId, category_id }: AddToCollectionDropdownProps) => {
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

		// Handle when a collection is selected
		const handleCollectionClick = useCallback(
			async (collection: CategoriesData) => {
				// Guard clause for missing required data
				if (!bookmarkId || !collection?.id) return;

				try {
					// Optimistically update the UI
					await addCategoryToBookmarkOptimisticMutation?.mutateAsync({
						bookmark_id: bookmarkId,
						category_id: collection?.id,
						// Allow updating the collection
						update_access: true,
					});

					// Clear search term after selection
					setSearchTerm("");
				} catch (error) {
					console.error("Error adding to collection:", error);
				}
			},
			[bookmarkId, addCategoryToBookmarkOptimisticMutation],
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
									{/* Show filtered collections if available */}
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
									) : (
										// Show message when no collections match the search
										<div className="px-3 py-2 text-sm text-gray-400">
											No collections found
										</div>
									)}
								</Ariakit.ComboboxList>
							</Ariakit.SelectPopover>
						</div>
					</Ariakit.SelectProvider>
				</Ariakit.ComboboxProvider>
			</div>
		);
	},
);
