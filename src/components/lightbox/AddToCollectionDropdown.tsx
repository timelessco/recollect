import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";

import useAddCategoryToBookmarkOptimisticMutation from "../../async/mutationHooks/category/useAddCategoryToBookmarkOptimisticMutation";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import { useSupabaseSession } from "../../store/componentStore";
import { type CategoriesData } from "../../types/apiTypes";
import { options } from "../../utils/commonData";
import { CATEGORIES_KEY, colorPickerColors } from "../../utils/constants";

type AddToCollectionDropdownProps = {
	bookmarkId: number;
};

type MessageType = {
	text: string;
	type: "error" | "success";
};

export const AddToCollectionDropdown = memo(
	({ bookmarkId }: AddToCollectionDropdownProps) => {
		const [isOpen, setIsOpen] = useState(false);
		const [message, setMessage] = useState<MessageType | null>(null);
		const timeoutRef = useRef<NodeJS.Timeout | null>(null);
		const session = useSupabaseSession((state) => state.session);
		const queryClient = useQueryClient();
		const { addCategoryToBookmarkOptimisticMutation } =
			useAddCategoryToBookmarkOptimisticMutation(true);

		// Memoize collections data
		const collections = useMemo(() => {
			const categoryData = queryClient.getQueryData<{ data: CategoriesData[] }>(
				[CATEGORIES_KEY, session?.user?.id],
			);
			return categoryData?.data ?? [];
		}, [queryClient, session?.user?.id]);

		const iconsList = useMemo(() => options(), []);

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
					await addCategoryToBookmarkOptimisticMutation.mutateAsync({
						bookmark_id: bookmarkId,
						category_id: collection.id,
						update_access: true,
					});
					showMessage(`Added to "${collection.category_name}"`, "success");
					setIsOpen(false);
				} catch (error) {
					console.error("Error adding to collection:", error);
					showMessage("Failed to add to collection", "error");
				}
			},
			[bookmarkId, addCategoryToBookmarkOptimisticMutation, showMessage],
		);

		// Cleanup timeout on unmount
		useEffect(
			() => () => {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}
			},
			[],
		);

		const toggleDropdown = useCallback(
			() => setIsOpen((previous) => !previous),
			[],
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
				<button
					className="flex items-center gap-2 text-[13px] leading-[138%] tracking-[1%] text-[#858585] hover:text-gray-700"
					onClick={toggleDropdown}
					type="button"
				>
					<div className="h-[14px] w-[14px]">
						<AddToCollectionsButton />
					</div>
					<span>Add to collection</span>
				</button>
				{isOpen && (
					<div className="absolute left-0 z-50 mt-1 w-[150px] rounded-xl bg-white p-1 shadow-[0_0_1px_0_rgba(0,0,0,0.19),0_1px_2px_0_rgba(0,0,0,0.07),0_6px_15px_-5px_rgba(0,0,0,0.11)]">
						{collections.map((collection) => {
							const iconData = find(
								iconsList,
								(item) => item?.label === collection?.icon,
							);

							return (
								<CollectionItem
									collection={collection}
									iconData={iconData}
									key={collection.id}
									onClick={handleCollectionClick}
								/>
							);
						})}
					</div>
				)}
			</div>
		);
	},
);

// Memoized collection item component
const CollectionItem = memo(
	({
		collection,
		iconData,
		onClick,
	}: {
		collection: CategoriesData;
		iconData:
			| {
					icon: (
						iconColor: string,
						size?: string,
						className?: string,
					) => JSX.Element;
					label: string;
			  }
			| undefined;
		onClick: (collection: CategoriesData) => void;
	}) => {
		const handleClick = useCallback(() => {
			onClick(collection);
		}, [collection, onClick]);

		return (
			<button
				className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left hover:bg-[rgba(243,243,243,1)]"
				onClick={handleClick}
				type="button"
			>
				{iconData?.icon && (
					<div
						className="flex h-4 w-4 items-center justify-center rounded-full"
						style={{ backgroundColor: collection?.icon_color }}
					>
						{iconData.icon(
							collection?.icon_color === colorPickerColors[0]
								? colorPickerColors[1]
								: colorPickerColors[0],
							"12",
						)}
					</div>
				)}
				<span className="align-middle text-[13px] font-[450] leading-[115%] tracking-[1%] text-[rgba(56,56,56,1)]">
					{collection.category_name}
				</span>
			</button>
		);
	},
	(previousProps, nextProps) =>
		// Only re-render if these props change
		previousProps.collection.id === nextProps.collection.id &&
		previousProps.collection.icon === nextProps.collection.icon &&
		previousProps.collection.icon_color === nextProps.collection.icon_color &&
		previousProps.collection.category_name ===
			nextProps.collection.category_name,
);
