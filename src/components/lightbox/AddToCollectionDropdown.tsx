import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Custom hooks and utilities
import useAddCategoryToBookmarkOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import { useSupabaseSession } from "../../store/componentStore";
import { type CategoriesData } from "../../types/apiTypes";
import { CATEGORIES_KEY } from "../../utils/constants";
// UI Components
import AriaDropDown from "../ariaDropdown/ariaDropdown";
import Input from "../atoms/input";
import { CollectionIcon } from "../collectionIcon";

/**
 * Props for the AddToCollectionDropdown component
 * @property {number} bookmarkId - The ID of the bookmark being modified
 * @property {number} category_id - The current category ID of the bookmark (0 if none)
 */
type AddToCollectionDropdownProps = {
	bookmarkId: number;
	category_id: number;
};

/**
 * Type for displaying status messages to the user
 * @property {string} text - The message content
 * @property {"error" | "success"} type - The type of message (determines styling)
 */
type MessageType = {
	text: string;
	type: "error" | "success";
};

/**
 * A dropdown component that allows adding a bookmark to different collections
 * Uses React.memo for performance optimization
 */
export const AddToCollectionDropdown = memo(
	({ bookmarkId, category_id }: AddToCollectionDropdownProps) => {
		// State for status messages and search functionality
		const [message, setMessage] = useState<MessageType | null>(null);
		const [searchTerm, setSearchTerm] = useState("");
		const timeoutRef = useRef<NodeJS.Timeout | null>(null);

		// Get current session and query client
		const session = useSupabaseSession((state) => state.session);
		const queryClient = useQueryClient();

		// Mutation hook for adding category to bookmark
		const { addCategoryToBookmarkOptimisticMutation } =
			useAddCategoryToBookmarkOptimisticMutation();

		// Get collections from query cache
		const collections = useMemo(() => {
			const categoryData = queryClient?.getQueryData<{
				data: CategoriesData[];
			}>([CATEGORIES_KEY, session?.user?.id]);
			return categoryData?.data ?? [];
		}, [queryClient, session?.user?.id]);

		// Get current collection if bookmark is already in one
		const currentCollection = useMemo(() => {
			if (!category_id) return null;
			return collections.find((collection) => collection.id === category_id);
		}, [collections, category_id]);

		// Filter collections based on search term
		const filteredCollections = useMemo(() => {
			if (!searchTerm.trim()) return collections;
			return collections.filter((collection) =>
				collection.category_name
					.toLowerCase()
					.includes(searchTerm.toLowerCase()),
			);
		}, [collections, searchTerm]);

		/**
		 * Displays a temporary status message to the user
		 * @param {string} text - The message text to display
		 * @param {"error" | "success"} type - The type of message (determines styling)
		 */
		const showMessage = useCallback(
			(text: string, type: "error" | "success") => {
				setMessage({ text, type });
				// Clear any existing timeout to prevent message from disappearing too soon
				if (timeoutRef.current) clearTimeout(timeoutRef.current);
				// Auto-hide message after 2.5 seconds
				timeoutRef.current = setTimeout(() => setMessage(null), 2_500);
			},
			[],
		);

		/**
		 * Handles adding a bookmark to the selected collection
		 * @param {CategoriesData} collection - The collection to add the bookmark to
		 */
		const handleCollectionClick = useCallback(
			async (collection: CategoriesData) => {
				if (!bookmarkId || !collection?.id) return;

				try {
					// Optimistically update the UI
					await addCategoryToBookmarkOptimisticMutation?.mutateAsync({
						bookmark_id: bookmarkId,
						category_id: collection?.id,
						update_access: true,
					});

					// Show success message and reset search
					showMessage(`Added to "${collection?.category_name}"`, "success");
					setSearchTerm("");
				} catch (error) {
					console.error("Error adding to collection:", error);
					showMessage("Failed to add to collection", "error");
				}
			},
			[bookmarkId, addCategoryToBookmarkOptimisticMutation, showMessage],
		);

		return (
			<div className="relative pt-[22px]">
				{message && (
					<div
						className={`mb-2 rounded-md px-3 py-1 text-xs font-medium ${
							message.type === "success"
								? "bg-green-100 text-green-800"
								: "bg-red-100 text-red-800"
						}`}
					>
						{message.text}
					</div>
				)}
				<div className="flex items-center gap-[6px]">
					<AriaDropDown
						menuButton={
							<div className="flex items-center gap-[6px]">
								<div className="h-[14px] w-[14px]">
									{currentCollection ? (
										<CollectionIcon bookmarkCategoryData={currentCollection} />
									) : (
										<AddToCollectionsButton />
									)}
								</div>
								<button
									className="w-[160px] rounded-md border border-transparent py-[2px] text-left text-[13px] text-[#858585] hover:text-gray-700 focus:outline-none"
									type="button"
								>
									{currentCollection
										? currentCollection.category_name
										: "Add to collection"}
								</button>
							</div>
						}
					>
						<div className="absolute left-0 z-50 mt-1 max-h-[250px] w-[180px] overflow-y-auto rounded-xl bg-white p-1 shadow-md">
							{/* Search Input as first item */}
							<div className="pb-1">
								<Input
									autoFocus
									className="w-full rounded-lg bg-[rgba(0,0,0,0.047)] px-2 py-[5px] text-[13px] text-[rgba(112,112,112,1)] focus:outline-none"
									errorText=""
									isError={false}
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="Search"
									value={searchTerm}
								/>
							</div>
							{/* Collections list */}
							{filteredCollections.length ? (
								filteredCollections.map((collection) => (
									<CollectionItem
										collection={collection}
										key={collection.id}
										onClick={handleCollectionClick}
									/>
								))
							) : (
								<div className="px-3 py-2 text-sm text-gray-400">
									No collections found
								</div>
							)}
						</div>
					</AriaDropDown>
				</div>
			</div>
		);
	},
);

/**
 * A memoized component that renders a single collection item in the dropdown
 * @param {Object} props - Component props
 * @param {CategoriesData} props.collection - The collection data to display
 * @param {(collection: CategoriesData) => void} props.onClick - Handler for when the collection is clicked
 */
const CollectionItem = memo(
	({
		collection,
		onClick,
	}: {
		collection: CategoriesData;
		onClick: (c: CategoriesData) => void;
	}) => {
		const handleClick = useCallback(
			() => onClick(collection),
			[collection, onClick],
		);

		return (
			<button
				className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[rgba(243,243,243,1)]"
				onClick={handleClick}
				type="button"
			>
				<CollectionIcon
					bookmarkCategoryData={collection}
					iconSize="12"
					size="16"
				/>
				<span className="text-[13px] font-[450] text-[rgba(56,56,56,1)]">
					{collection.category_name}
				</span>
			</button>
		);
	},
);
