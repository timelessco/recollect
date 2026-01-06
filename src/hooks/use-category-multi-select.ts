import { useMemo } from "react";

import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";
import { useRemoveCategoryFromBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-remove-category-from-bookmark-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/useFetchCategories";
import { useBookmarkCategories } from "@/hooks/use-bookmark-categories";
import { type CategoriesData } from "@/types/apiTypes";
import { UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

type UseCategoryMultiSelectProps = {
	bookmarkId: number;
	shouldFetch?: boolean;
	filterUncategorized?: boolean;
	onMutate?: () => void;
	mutationOptions?: {
		skipInvalidation?: boolean;
		preserveInList?: boolean;
	};
};

export const useCategoryMultiSelect = ({
	bookmarkId,
	shouldFetch = true,
	filterUncategorized = false,
	onMutate,
	mutationOptions = {},
}: UseCategoryMultiSelectProps) => {
	const { allCategories } = useFetchCategories(shouldFetch);

	// Get selected IDs from cache
	const selectedCategoryIds = useBookmarkCategories(bookmarkId);

	const { addCategoryToBookmarkOptimisticMutation } =
		useAddCategoryToBookmarkOptimisticMutation({
			skipInvalidation: mutationOptions.skipInvalidation,
		});
	const { removeCategoryFromBookmarkOptimisticMutation } =
		useRemoveCategoryFromBookmarkOptimisticMutation({
			skipInvalidation: mutationOptions.skipInvalidation,
			preserveInList: mutationOptions.preserveInList,
		});

	// Compute visible and selected categories
	const visibleCategories = useMemo(() => {
		const cats = allCategories?.data ?? [];
		return filterUncategorized
			? cats.filter((cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID)
			: cats;
	}, [allCategories?.data, filterUncategorized]);

	const categoryMap = useMemo(
		() => new Map(visibleCategories.map((cat) => [cat.id, cat])),
		[visibleCategories],
	);

	const selectedCategories = useMemo(
		() =>
			selectedCategoryIds
				.map((id) => categoryMap.get(id))
				.filter((cat): cat is CategoriesData => cat !== undefined),
		[selectedCategoryIds, categoryMap],
	);

	const handleAdd = (category: CategoriesData) => {
		addCategoryToBookmarkOptimisticMutation.mutate({
			bookmark_id: bookmarkId,
			category_id: category.id,
		});
		onMutate?.();
	};

	const handleRemove = (category: CategoriesData) => {
		removeCategoryFromBookmarkOptimisticMutation.mutate({
			bookmark_id: bookmarkId,
			category_id: category.id,
		});
		onMutate?.();
	};

	return {
		visibleCategories,
		selectedCategories,
		handleAdd,
		handleRemove,
		getItemId: (cat: CategoriesData) => cat.id,
		getItemLabel: (cat: CategoriesData) => cat.category_name,
		isAdding: addCategoryToBookmarkOptimisticMutation.isPending,
		isRemoving: removeCategoryFromBookmarkOptimisticMutation.isPending,
		addError: addCategoryToBookmarkOptimisticMutation.error,
		removeError: removeCategoryFromBookmarkOptimisticMutation.error,
	};
};
