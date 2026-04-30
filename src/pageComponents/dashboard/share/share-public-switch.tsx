import { find } from "lodash";

import { useUpdateCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-update-category-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/use-fetch-categories";
import { Switch } from "@/components/ui/recollect/switch";
import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import { useMiscellaneousStore } from "@/store/componentStore";

interface SharePublicSwitchProps {
  categoryId?: null | number | string;
}

export function SharePublicSwitch({ categoryId }: SharePublicSwitchProps) {
  const { category_id: currentCategoryId } = useGetCurrentCategoryId();
  const shareCategoryId = useMiscellaneousStore((state) => state.shareCategoryId);
  const { allCategories: categoryData } = useFetchCategories();
  const { updateCategoryOptimisticMutation } = useUpdateCategoryOptimisticMutation();

  const dynamicCategoryId = categoryId ?? shareCategoryId ?? currentCategoryId;

  let numericCategoryId: number | null;
  if (typeof dynamicCategoryId === "number") {
    numericCategoryId = dynamicCategoryId;
  } else if (typeof dynamicCategoryId === "string" && /^\d+$/u.test(dynamicCategoryId)) {
    numericCategoryId = Number.parseInt(dynamicCategoryId, 10);
  } else {
    numericCategoryId = null;
  }

  const currentCategory = find(categoryData ?? [], (item) => item?.id === numericCategoryId);

  const canToggle = numericCategoryId !== null && currentCategory !== undefined;

  const handleToggle = () => {
    if (!canToggle) {
      return;
    }

    updateCategoryOptimisticMutation.mutate({
      category_id: numericCategoryId!,
      updateData: {
        is_public: !currentCategory?.is_public,
      },
    });
  };

  return (
    <Switch
      aria-label="Make collection public"
      checked={currentCategory?.is_public ?? false}
      disabled={!canToggle}
      onClick={handleToggle}
      size="small"
    />
  );
}
