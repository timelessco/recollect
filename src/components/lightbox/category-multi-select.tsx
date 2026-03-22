import type { CategoriesData } from "@/types/apiTypes";

import { CollectionIcon } from "@/components/collectionIcon";
import { Combobox } from "@/components/ui/recollect/combobox";
import { ScrollArea } from "@/components/ui/recollect/scroll-area";
import { useCategoryMultiSelect } from "@/hooks/use-category-multi-select";
import { AddToCollectionsButton } from "@/icons/addToCollectionsButton";
import { useMiscellaneousStore } from "@/store/componentStore";

interface CategoryMultiSelectProps {
  bookmarkId: number;
  shouldFetch?: boolean;
}

export const CategoryMultiSelect = ({ bookmarkId, shouldFetch }: CategoryMultiSelectProps) => {
  const setIsCollectionChanged = useMiscellaneousStore((state) => state.setIsCollectionChanged);

  const {
    getItemId,
    getItemLabel,
    handleAdd,
    handleRemove,
    selectedCategories,
    visibleCategories,
  } = useCategoryMultiSelect({
    bookmarkId,
    filterUncategorized: true,
    mutationOptions: { preserveInList: true, skipInvalidation: true },
    onMutate: () => {
      setIsCollectionChanged(true);
    },
    shouldFetch,
  });

  return (
    <div className="relative pt-6">
      <div className="flex flex-wrap items-center gap-[6px]">
        <Combobox.Root
          getItemId={getItemId}
          getItemLabel={getItemLabel}
          items={visibleCategories}
          onAdd={handleAdd}
          onRemove={handleRemove}
          selectedItems={selectedCategories}
        >
          <Combobox.Chips className="min-h-0 gap-[6px] bg-transparent p-0 focus-within:ring-0 focus-within:ring-offset-0">
            <Combobox.Value>
              {(value: CategoriesData[]) => (
                <>
                  {value.map((category) => (
                    <Combobox.Chip className="py-[5.5px]" item={category} key={category.id}>
                      <CollectionIcon bookmarkCategoryData={category} iconSize="8" size="14" />
                      <Combobox.ChipContent item={category}>
                        {category.category_name}
                      </Combobox.ChipContent>
                    </Combobox.Chip>
                  ))}

                  <div className="ml-2 flex items-center gap-1 rounded px-2 focus-within:ring-2 focus-within:ring-gray-200">
                    <div className="h-[14px] w-[14px] text-gray-600">
                      <AddToCollectionsButton />
                    </div>

                    <Combobox.Input
                      className="w-[130px] border-none bg-transparent px-0.5 py-[2px] text-13 text-gray-500 outline-none placeholder:text-gray-500"
                      placeholder="Add to collection"
                    />
                  </div>
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>

          <Combobox.Portal>
            <Combobox.Positioner align="start" className="z-10000">
              <Combobox.Popup className="mt-2 w-48 rounded-xl bg-gray-50 shadow-custom-3">
                <ScrollArea hideScrollbar scrollbarGutter scrollFade scrollHeight={220}>
                  <Combobox.Empty>No collections found</Combobox.Empty>
                  <Combobox.List>
                    {(item: CategoriesData) => (
                      <Combobox.Item key={item.id} value={item}>
                        <CollectionIcon bookmarkCategoryData={item} iconSize="10" size="16" />
                        <span className="flex-1 truncate">{item.category_name}</span>
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
