import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import useAddCategoryToBookmarkOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import { useSupabaseSession } from "../../store/componentStore";
import { type CategoriesData } from "../../types/apiTypes";
import { CATEGORIES_KEY } from "../../utils/constants";
import AriaDropDown from "../ariaDropdown/ariaDropdown";
import Input from "../atoms/input";
import { CollectionIcon } from "../collectionIcon";

type AddToCollectionDropdownProps = {
	bookmarkId: number;
	category_id: number;
};

type MessageType = {
	text: string;
	type: "error" | "success";
};

export const AddToCollectionDropdown = memo(
	({ bookmarkId, category_id }: AddToCollectionDropdownProps) => {
		const [message, setMessage] = useState<MessageType | null>(null);
		const [searchTerm, setSearchTerm] = useState("");
		const timeoutRef = useRef<NodeJS.Timeout | null>(null);
		const session = useSupabaseSession((state) => state.session);
		const queryClient = useQueryClient();
		const { addCategoryToBookmarkOptimisticMutation } =
			useAddCategoryToBookmarkOptimisticMutation();

		const collections = useMemo(() => {
			const categoryData = queryClient?.getQueryData<{
				data: CategoriesData[];
			}>([CATEGORIES_KEY, session?.user?.id]);
			return categoryData?.data ?? [];
		}, [queryClient, session?.user?.id]);

		// Find current collection if any
		const currentCollection = useMemo(() => {
			if (!category_id) return null;
			return collections.find((collection) => collection.id === category_id);
		}, [collections, category_id]);

		// Filtered by searchTerm
		const filteredCollections = useMemo(() => {
			if (!searchTerm.trim()) return collections;
			return collections.filter((collection) =>
				collection.category_name
					.toLowerCase()
					.includes(searchTerm.toLowerCase()),
			);
		}, [collections, searchTerm]);

		const showMessage = useCallback(
			(text: string, type: "error" | "success") => {
				setMessage({ text, type });
				if (timeoutRef.current) clearTimeout(timeoutRef.current);
				timeoutRef.current = setTimeout(() => setMessage(null), 2_500);
			},
			[],
		);

		const handleCollectionClick = useCallback(
			async (collection: CategoriesData) => {
				if (!bookmarkId || !collection?.id) return;
				try {
					await addCategoryToBookmarkOptimisticMutation?.mutateAsync({
						bookmark_id: bookmarkId,
						category_id: collection?.id,
						update_access: true,
					});
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

// Item unchanged
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
