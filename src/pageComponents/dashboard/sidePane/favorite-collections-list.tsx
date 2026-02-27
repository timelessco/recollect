import DownArrowGray from "../../../icons/downArrowGray";

import SingleListItemComponent, {
	type CollectionItemTypes,
} from "./singleListItemComponent";
import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";
import { Collapsible } from "@/components/ui/recollect/collapsible";

type FavoriteCollectionsListProps = {
	favoriteCollections: CollectionItemTypes[];
};

export function FavoriteCollectionsList({
	favoriteCollections,
}: FavoriteCollectionsListProps) {
	const { addCategoryToBookmarkOptimisticMutation } =
		useAddCategoryToBookmarkOptimisticMutation();
	if (favoriteCollections.length === 0) {
		return null;
	}

	const favoritesHeader = (
		<div className="group flex w-full items-center justify-between px-1 py-[7px]">
			<div className="flex items-center text-13 leading-[14.95px] font-medium tracking-[0.02em] text-gray-600">
				<p className="mr-1">Favorites</p>
				<DownArrowGray
					className="collections-sidepane-down-arrow hidden pt-px text-gray-500 group-hover:block"
					size={10}
				/>
			</div>
		</div>
	);

	return (
		<div className="pt-3">
			<Collapsible.Root>
				<Collapsible.Trigger>{favoritesHeader}</Collapsible.Trigger>
				<Collapsible.Panel>
					<ul className="flex flex-col gap-px" id="favorites-wrapper">
						{favoriteCollections.map((item) => (
							<li key={item?.id}>
								<SingleListItemComponent
									extendedClassname="py-[6px]"
									item={item}
									listNameId="favorite-collection-name"
									showDropdown
									showSpinner={
										addCategoryToBookmarkOptimisticMutation.isPending &&
										addCategoryToBookmarkOptimisticMutation.variables
											?.category_id === item?.id
									}
								/>
							</li>
						))}
					</ul>
				</Collapsible.Panel>
			</Collapsible.Root>
		</div>
	);
}
