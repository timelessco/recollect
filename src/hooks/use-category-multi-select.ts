import { useMemo } from "react";

import type { CategoriesData } from "@/types/apiTypes";

import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";
import { useRemoveCategoryFromBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-remove-category-from-bookmark-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/use-fetch-categories";
import { useBookmarkCategories } from "@/hooks/use-bookmark-categories";
import { UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

interface UseCategoryMultiSelectProps {
  bookmarkId: number;
  filterUncategorized?: boolean;
  mutationOptions?: {
    preserveInList?: boolean;
    skipInvalidation?: boolean;
  };
  onMutate?: () => void;
  shouldFetch?: boolean;
}

export const useCategoryMultiSelect = ({
  bookmarkId,
  filterUncategorized = false,
  mutationOptions = {},
  onMutate,
  shouldFetch = true,
}: UseCategoryMultiSelectProps) => {
  const { allCategories } = useFetchCategories(shouldFetch);

  // Get selected IDs from cache
  const selectedCategoryIds = useBookmarkCategories(bookmarkId);

  const { addCategoryToBookmarkOptimisticMutation } = useAddCategoryToBookmarkOptimisticMutation({
    skipInvalidation: mutationOptions.skipInvalidation,
  });
  const { removeCategoryFromBookmarkOptimisticMutation } =
    useRemoveCategoryFromBookmarkOptimisticMutation({
      preserveInList: mutationOptions.preserveInList,
      skipInvalidation: mutationOptions.skipInvalidation,
    });

  // Compute visible and selected categories
  const visibleCategories = useMemo(() => {
    const cats = allCategories ?? [];
    return filterUncategorized ? cats.filter((cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID) : cats;
  }, [allCategories, filterUncategorized]);

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
    addError: addCategoryToBookmarkOptimisticMutation.error,
    getItemId: (cat: CategoriesData) => cat.id,
    getItemLabel: (cat: CategoriesData) => cat.category_name,
    handleAdd,
    handleRemove,
    isAdding: addCategoryToBookmarkOptimisticMutation.isPending,
    isRemoving: removeCategoryFromBookmarkOptimisticMutation.isPending,
    removeError: removeCategoryFromBookmarkOptimisticMutation.error,
    selectedCategories,
    visibleCategories,
  };
};
