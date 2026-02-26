import { find } from "lodash";

import { useUpdateCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-update-category-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/useFetchCategories";
import { Switch } from "@/components/ui/recollect/switch";
import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import { useMiscellaneousStore } from "@/store/componentStore";

type SharePublicSwitchProps = {
	categoryId?: string | number | null;
};

export function SharePublicSwitch({ categoryId }: SharePublicSwitchProps) {
	const { category_id: currentCategoryId } = useGetCurrentCategoryId();
	const shareCategoryId = useMiscellaneousStore(
		(state) => state.shareCategoryId,
	);
	const { allCategories: categoryData } = useFetchCategories();
	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();

	const dynamicCategoryId = categoryId ?? shareCategoryId ?? currentCategoryId;

	const numericCategoryId =
		typeof dynamicCategoryId === "number"
			? dynamicCategoryId
			: typeof dynamicCategoryId === "string" &&
				  /^\d+$/u.test(String(dynamicCategoryId))
				? Number.parseInt(dynamicCategoryId, 10)
				: null;

	const currentCategory = find(
		categoryData?.data ?? [],
		(item) => item?.id === numericCategoryId,
	);

	const canToggle = numericCategoryId !== null && currentCategory !== undefined;

	const handleToggle = () => {
		if (!canToggle) {
			return;
		}

		updateCategoryOptimisticMutation.mutate({
			category_id: numericCategoryId,
			updateData: {
				is_public: !currentCategory?.is_public,
			},
		});
	};

	return (
		<Switch
			aria-label="Make collection public"
			disabled={!canToggle}
			checked={currentCategory?.is_public ?? false}
			onClick={handleToggle}
			size="small"
		/>
	);
}
