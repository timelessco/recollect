import { CollectionIcon } from "@/components/collectionIcon";
import { Combobox } from "@/components/ui/recollect/combobox";
import { ScrollArea } from "@/components/ui/recollect/scroll-area";
import { useCategoryMultiSelect } from "@/hooks/use-category-multi-select";
import { AddToCollectionsButton } from "@/icons/addToCollectionsButton";
import { useMiscellaneousStore } from "@/store/componentStore";
import { type CategoriesData } from "@/types/apiTypes";

type CategoryMultiSelectProps = {
	bookmarkId: number;
	shouldFetch?: boolean;
};

export const CategoryMultiSelect = ({
	bookmarkId,
	shouldFetch,
}: CategoryMultiSelectProps) => {
	const setIsCollectionChanged = useMiscellaneousStore(
		(state) => state.setIsCollectionChanged,
	);

	const {
		visibleCategories,
		selectedCategories,
		handleAdd,
		handleRemove,
		getItemId,
		getItemLabel,
	} = useCategoryMultiSelect({
		bookmarkId,
		shouldFetch,
		filterUncategorized: true,
		onMutate: () => setIsCollectionChanged(true),
		mutationOptions: { skipInvalidation: true, preserveInList: true },
	});

	return (
		<div className="relative pt-6">
			<div className="flex flex-wrap items-center gap-[6px]">
				<Combobox.Root
					items={visibleCategories}
					selectedItems={selectedCategories}
					getItemId={getItemId}
					getItemLabel={getItemLabel}
					onAdd={handleAdd}
					onRemove={handleRemove}
				>
					<Combobox.Chips className="min-h-0 gap-[6px] bg-transparent p-0 focus-within:ring-0 focus-within:ring-offset-0">
						<Combobox.Value>
							{(value: CategoriesData[]) => (
								<>
									{value.map((category) => (
										<Combobox.Chip key={category.id}>
											<CollectionIcon
												bookmarkCategoryData={category}
												iconSize="8"
												size="12"
											/>
											<Combobox.ChipContent item={category}>
												{category.category_name}
											</Combobox.ChipContent>
											<Combobox.ChipRemove />
										</Combobox.Chip>
									))}

									<div className="flex items-center gap-1 rounded focus-within:ring-2 focus-within:ring-blue-500">
										<div className="h-[14px] w-[14px] text-gray-600">
											<AddToCollectionsButton />
										</div>

										<Combobox.Input
											placeholder={
												value.length > 0
													? "Edit collections..."
													: "Add to collection..."
											}
											className="w-[130px] border-none bg-transparent py-[2px] text-13 text-gray-500 outline-none placeholder:text-gray-500"
										/>
									</div>
								</>
							)}
						</Combobox.Value>
					</Combobox.Chips>

					<Combobox.Portal>
						<Combobox.Positioner className="z-10000">
							<Combobox.Popup>
								<ScrollArea scrollbarGutter scrollFade scrollHeight={220}>
									<Combobox.Empty>No collections found</Combobox.Empty>
									<Combobox.List>
										{(item: CategoriesData) => (
											<Combobox.Item key={item.id} value={item}>
												<CollectionIcon
													bookmarkCategoryData={item}
													iconSize="10"
													size="16"
												/>
												<span className="truncate">{item.category_name}</span>
												<Combobox.ItemIndicator />
											</Combobox.Item>
										)}
									</Combobox.List>
								</ScrollArea>
							</Combobox.Popup>
						</Combobox.Positioner>
					</Combobox.Portal>
				</Combobox.Root>
			</div>
		</div>
	);
};
