import { useMemo } from "react";
import type { ReactNode } from "react";

import type { CategoriesData, SingleListData, UserTagsData } from "@/types/apiTypes";

import { useAddTagToBookmarkOptimisticMutation } from "@/async/mutationHooks/tags/use-add-tag-to-bookmark-optimistic-mutation";
import { useCreateAndAssignTagOptimisticMutation } from "@/async/mutationHooks/tags/use-create-and-assign-tag-optimistic-mutation";
import { useRemoveTagFromBookmarkOptimisticMutation } from "@/async/mutationHooks/tags/use-remove-tag-from-bookmark-optimistic-mutation";
import useFetchUserTags from "@/async/queryHooks/userTags/use-fetch-user-tags";
import { CollectionIcon } from "@/components/collectionIcon";
import { Combobox } from "@/components/ui/recollect/combobox";
import { Popover } from "@/components/ui/recollect/popover";
import { ScrollArea } from "@/components/ui/recollect/scroll-area";
import { useBookmarkTags } from "@/hooks/use-bookmark-tags";
import { useCategoryMultiSelect } from "@/hooks/use-category-multi-select";
import { useIsPublicPage } from "@/hooks/use-is-public-page";
import { EditIcon } from "@/icons/edit-icon";
import { HashIcon } from "@/icons/hash-icon";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import { DiscoverSwitch } from "@/pageComponents/dashboard/cardSection/discover-switch";
import { OgPreferenceSwitch } from "@/pageComponents/dashboard/cardSection/og-preference-switch";
import { SKIP_OG_IMAGE_DOMAINS } from "@/utils/constants";
import { getDomain } from "@/utils/domain";
import { cn } from "@/utils/tailwind-merge";

interface EditPopoverProps {
  post: SingleListData;
  userId: string;
}

export const EditPopover = ({ post, userId }: EditPopoverProps) => {
  const postUserId = typeof post?.user_id === "object" ? post?.user_id?.id : post?.user_id;
  const isOwner = userId && postUserId === userId;

  // Non-owners see nothing
  if (!isOwner) {
    return null;
  }

  return (
    <EditPopoverShell>
      <div className="mb-2 w-[231px]">
        <div className="w-full">
          <div className="mx-1 my-1.5 block text-xs leading-[115%] font-450 tracking-[0.24px] text-gray-600 max-sm:mt-px max-sm:pt-2">
            Collections
          </div>

          <div className="w-full">
            <CategoryMultiSelect bookmarkId={post.id} />
          </div>
        </div>
        <div className="w-full">
          <div className="mx-1 my-1.5 block text-xs leading-[115%] font-450 tracking-[0.24px] text-gray-600 max-sm:mt-px max-sm:pt-2">
            Tags
          </div>

          <div className="w-full">
            <TagMultiSelect bookmarkId={post.id} />
          </div>
        </div>
      </div>
      <div className="w-full">
        <DiscoverSwitch bookmarkId={post.id} isDiscoverable={post.make_discoverable !== null} />
      </div>
      {(() => {
        const domain = getDomain(post.url);
        // Don't render switch for domains that are already skipped for OG images
        return domain && !SKIP_OG_IMAGE_DOMAINS.includes(domain) ? (
          <>
            <div className="px-2.5 py-1">
              <div className="h-px bg-gray-200" />
            </div>

            <div className="w-full">
              <OgPreferenceSwitch bookmarkUrl={post.url} userId={userId} />
            </div>
          </>
        ) : null;
      })()}
    </EditPopoverShell>
  );
};

function EditPopoverShell({ children }: { children: ReactNode }) {
  const isPublicPage = useIsPublicPage();

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "z-15 flex rounded-lg bg-whites-700 p-[5px] text-gray-1000 backdrop-blur-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          !isPublicPage && "invisible group-hover:visible data-popup-open:visible",
          isPublicPage && "invisible",
        )}
      >
        <EditIcon />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={4}>
          <Popover.Popup className="p-1.5">{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface TagMultiSelectProps {
  bookmarkId: number;
}

export const TagMultiSelect = ({ bookmarkId }: TagMultiSelectProps) => {
  const { userTags } = useFetchUserTags();
  const { addTagToBookmarkOptimisticMutation } = useAddTagToBookmarkOptimisticMutation();
  const { removeTagFromBookmarkOptimisticMutation } = useRemoveTagFromBookmarkOptimisticMutation();
  const { createAndAssignTagOptimisticMutation } = useCreateAndAssignTagOptimisticMutation();

  const selectedTagIds = useBookmarkTags(bookmarkId);
  const allTags = useMemo(() => userTags ?? [], [userTags]);

  const tagMap = useMemo(() => new Map(allTags.map((tag) => [tag.id, tag])), [allTags]);

  const selectedTags = useMemo(
    () =>
      selectedTagIds
        .map((id) => tagMap.get(id))
        .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined),
    [selectedTagIds, tagMap],
  );

  const handleAdd = (tag: UserTagsData) => {
    addTagToBookmarkOptimisticMutation.mutate({
      bookmarkId,
      tagId: tag.id,
    });
  };

  const handleRemove = (tag: UserTagsData) => {
    removeTagFromBookmarkOptimisticMutation.mutate({
      bookmarkId,
      tagId: tag.id,
    });
  };

  const handleCreate = (tagName: string) => {
    createAndAssignTagOptimisticMutation.mutate({
      // Pre-generate temp ID so both BOOKMARKS_KEY and USER_TAGS_KEY caches use same ID
      _tempId: -Date.now(),
      bookmarkId,
      name: tagName,
    });
  };

  return (
    <Combobox.Root
      createSchema={tagCategoryNameSchema}
      getItemId={(tag) => tag.id}
      getItemLabel={(tag) => tag.name}
      items={allTags}
      onAdd={handleAdd}
      onCreate={handleCreate}
      onRemove={handleRemove}
      selectedItems={selectedTags}
    >
      <Combobox.Chips>
        <Combobox.Value>
          {(value: UserTagsData[]) => (
            <>
              {value.map((tag) => (
                <Combobox.Chip
                  className="bg-plain shadow-[0_1px_1px_0_rgba(0,0,0,0.10),0_0_0.5px_0_rgba(0,0,0,0.60)]"
                  item={tag}
                  key={tag.id}
                >
                  <HashIcon className="h-3.5 w-3.5 text-gray-600" />
                  <Combobox.ChipContent item={tag} />
                </Combobox.Chip>
              ))}

              <Combobox.Input className="py-[4.5px]" placeholder="Add tags" />
            </>
          )}
        </Combobox.Value>
      </Combobox.Chips>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <ScrollArea
              className="rounded-lg bg-gray-90"
              hideScrollbar
              scrollbarGutter
              scrollFade
              scrollHeight={220}
            >
              <Combobox.Empty>No tags found</Combobox.Empty>
              <Combobox.List>
                {(item: UserTagsData) => (
                  <Combobox.Item key={item.id} value={item}>
                    <span className="truncate">{item.name}</span>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                )}
              </Combobox.List>
            </ScrollArea>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
};

interface CategoryMultiSelectProps {
  bookmarkId: number;
}

export const CategoryMultiSelect = ({ bookmarkId }: CategoryMultiSelectProps) => {
  const {
    getItemId,
    getItemLabel,
    handleAdd,
    handleRemove,
    selectedCategories,
    visibleCategories,
  } = useCategoryMultiSelect({ bookmarkId });

  return (
    <Combobox.Root
      getItemId={getItemId}
      getItemLabel={getItemLabel}
      items={visibleCategories}
      onAdd={handleAdd}
      onRemove={handleRemove}
      selectedItems={selectedCategories}
    >
      <Combobox.Chips>
        <Combobox.Value>
          {(value: CategoriesData[]) => (
            <>
              {value.map((category) => (
                <Combobox.Chip
                  className="bg-plain shadow-[0_1px_1px_0_rgba(0,0,0,0.10),0_0_0.5px_0_rgba(0,0,0,0.60)]"
                  item={category}
                  key={category.id}
                >
                  <CollectionIcon bookmarkCategoryData={category} iconSize="8" size="14" />
                  <Combobox.ChipContent item={category}>
                    {category.category_name}
                  </Combobox.ChipContent>
                </Combobox.Chip>
              ))}
              <Combobox.Input className="py-[4.5px]" placeholder="Add collection" />
            </>
          )}
        </Combobox.Value>
      </Combobox.Chips>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <ScrollArea
              className="rounded-lg bg-gray-90"
              hideScrollbar
              scrollbarGutter
              scrollFade
              scrollHeight={220}
            >
              <Combobox.Empty>No collections found</Combobox.Empty>
              <Combobox.List>
                {(item: CategoriesData) => (
                  <Combobox.Item key={item.id} value={item}>
                    <CollectionIcon bookmarkCategoryData={item} iconSize="10" size="16" />
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
  );
};
