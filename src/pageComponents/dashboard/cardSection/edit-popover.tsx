import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";

import type { CategoriesData, SingleListData, UserTagsData } from "@/types/apiTypes";

import { useSaveFromDiscoverMutation } from "@/async/mutationHooks/bookmarks/use-save-from-discover-mutation";
import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";
import { useRemoveCategoryFromBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-remove-category-from-bookmark-optimistic-mutation";
import { useAddTagToBookmarkOptimisticMutation } from "@/async/mutationHooks/tags/use-add-tag-to-bookmark-optimistic-mutation";
import { useCreateAndAssignTagOptimisticMutation } from "@/async/mutationHooks/tags/use-create-and-assign-tag-optimistic-mutation";
import { useRemoveTagFromBookmarkOptimisticMutation } from "@/async/mutationHooks/tags/use-remove-tag-from-bookmark-optimistic-mutation";
import { useFetchDiscoverableBookmarkById } from "@/async/queryHooks/bookmarks/use-fetch-discoverable-bookmark-by-id";
import useFetchCategories from "@/async/queryHooks/category/use-fetch-categories";
import useFetchUserTags from "@/async/queryHooks/userTags/use-fetch-user-tags";
import { CollectionIcon } from "@/components/collectionIcon";
import { Combobox } from "@/components/ui/recollect/combobox";
import { Popover } from "@/components/ui/recollect/popover";
import { ScrollArea } from "@/components/ui/recollect/scroll-area";
import { useBookmarkTags } from "@/hooks/use-bookmark-tags";
import { useCategoryMultiSelect } from "@/hooks/use-category-multi-select";
import { useIsPublicPage } from "@/hooks/use-is-public-page";
import { usePageContext } from "@/hooks/use-page-context";
import { EditIcon } from "@/icons/edit-icon";
import { HashIcon } from "@/icons/hash-icon";
import { PlusIcon } from "@/icons/plus-icon";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import { DiscoverSwitch } from "@/pageComponents/dashboard/cardSection/discover-switch";
import { OgPreferenceSwitch } from "@/pageComponents/dashboard/cardSection/og-preference-switch";
import { BOOKMARKS_KEY, DISCOVER_URL, SKIP_OG_IMAGE_DOMAINS } from "@/utils/constants";
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

  // Base UI unmounts Portal children when the popover is closed, so
  // <EditPopoverContent> does not mount (and its hooks do not run) until the
  // user opens the popover. Without this split, every owned card on /discover
  // would fire its own useFetchDiscoverableBookmarkById request on mount,
  // saturating the browser connection pool and queuing the
  // /_next/data/.../discover.json navigation fetch behind N parallel requests.
  return (
    <EditPopoverShell>
      <EditPopoverContent post={post} userId={userId} />
    </EditPopoverShell>
  );
};

interface EditPopoverContentProps {
  post: SingleListData;
  userId: string;
}

const EditPopoverContent = ({ post, userId }: EditPopoverContentProps) => {
  const { isDiscoverPage } = usePageContext();
  const queryClient = useQueryClient();

  // Discover bookmarks are fetched without relations; pull the discoverable
  // bookmark by id (server runs BOOKMARK_CATEGORIES + BOOKMARK_TAGS junction
  // queries) so we can source chip state for the popover.
  const { bookmark: discoverableBookmark, isLoading: isDiscoverableLoading } =
    useFetchDiscoverableBookmarkById(post.id, {
      enabled: isDiscoverPage,
    });

  // Need the full all-categories / all-tags lists so we can resolve the
  // discoverable response to the SAME object references the dropdowns use as
  // their items — Base UI's selection (and the tick) match by reference, not id.
  const { allCategories } = useFetchCategories();
  const { userTags } = useFetchUserTags();

  const { addCategoryToBookmarkOptimisticMutation } = useAddCategoryToBookmarkOptimisticMutation();
  const { removeCategoryFromBookmarkOptimisticMutation } =
    useRemoveCategoryFromBookmarkOptimisticMutation();
  const { addTagToBookmarkOptimisticMutation } = useAddTagToBookmarkOptimisticMutation();
  const { removeTagFromBookmarkOptimisticMutation } = useRemoveTagFromBookmarkOptimisticMutation();
  const { createAndAssignTagOptimisticMutation } = useCreateAndAssignTagOptimisticMutation();

  // Refetch the discoverable bookmark after each mutation so the chips reflect
  // the post-mutation server state. The optimistic mutations target the
  // dashboard cache, which doesn't contain this bookmark, so we settle on
  // invalidate-and-refetch for visual consistency on /discover.
  const invalidateDiscoverableBookmark = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [BOOKMARKS_KEY, DISCOVER_URL, post.id],
    });
  }, [queryClient, post.id]);

  const categoryItemsMap = useMemo(
    () => new Map((allCategories ?? []).map((cat) => [cat.id, cat])),
    [allCategories],
  );

  const tagItemsMap = useMemo(
    () => new Map((userTags ?? []).map((tag) => [tag.id, tag])),
    [userTags],
  );

  // Resolve server-fetched ids against the items list so selectedItems contain
  // the same references as items — required for ItemIndicator (the tick).
  const discoverSelectedCategories = useMemo<CategoriesData[] | undefined>(
    () =>
      isDiscoverPage && discoverableBookmark?.addedCategories
        ? discoverableBookmark.addedCategories
            .map((cat) => categoryItemsMap.get(cat.id))
            .filter((cat): cat is CategoriesData => cat !== undefined)
        : undefined,
    [isDiscoverPage, discoverableBookmark?.addedCategories, categoryItemsMap],
  );

  const discoverSelectedTags = useMemo<UserTagsData[] | undefined>(
    () =>
      isDiscoverPage && discoverableBookmark?.addedTags
        ? discoverableBookmark.addedTags
            .map((tag) => tagItemsMap.get(tag.id))
            .filter((tag): tag is UserTagsData => tag !== undefined)
        : undefined,
    [isDiscoverPage, discoverableBookmark?.addedTags, tagItemsMap],
  );

  const handleDiscoverAddCategory = useCallback(
    (category: CategoriesData) => {
      addCategoryToBookmarkOptimisticMutation.mutate(
        { bookmark_id: post.id, category_id: category.id },
        { onSettled: invalidateDiscoverableBookmark },
      );
    },
    [addCategoryToBookmarkOptimisticMutation, post.id, invalidateDiscoverableBookmark],
  );

  const handleDiscoverRemoveCategory = useCallback(
    (category: CategoriesData) => {
      removeCategoryFromBookmarkOptimisticMutation.mutate(
        { bookmark_id: post.id, category_id: category.id },
        { onSettled: invalidateDiscoverableBookmark },
      );
    },
    [removeCategoryFromBookmarkOptimisticMutation, post.id, invalidateDiscoverableBookmark],
  );

  const handleDiscoverAddTag = useCallback(
    (tag: UserTagsData) => {
      addTagToBookmarkOptimisticMutation.mutate(
        { bookmarkId: post.id, tagId: tag.id },
        { onSettled: invalidateDiscoverableBookmark },
      );
    },
    [addTagToBookmarkOptimisticMutation, post.id, invalidateDiscoverableBookmark],
  );

  const handleDiscoverRemoveTag = useCallback(
    (tag: UserTagsData) => {
      removeTagFromBookmarkOptimisticMutation.mutate(
        { bookmarkId: post.id, tagId: tag.id },
        { onSettled: invalidateDiscoverableBookmark },
      );
    },
    [removeTagFromBookmarkOptimisticMutation, post.id, invalidateDiscoverableBookmark],
  );

  const handleDiscoverCreateTag = useCallback(
    (name: string) => {
      createAndAssignTagOptimisticMutation.mutate(
        { _tempId: -Date.now(), bookmarkId: post.id, name },
        { onSettled: invalidateDiscoverableBookmark },
      );
    },
    [createAndAssignTagOptimisticMutation, post.id, invalidateDiscoverableBookmark],
  );

  const domain = getDomain(post.url);
  // Don't render switch for domains that are already skipped for OG images
  const showOgPreference = domain && !SKIP_OG_IMAGE_DOMAINS.includes(domain);

  // On /discover the chip selection is resolved by looking discoverable ids
  // up in `allCategories` / `userTags`. If either reference list isn't
  // populated yet, the lookups miss and selectedItems collapses to [] — the
  // same empty-flash the skeleton is meant to hide. Keep the skeleton up
  // until the discoverable fetch AND both reference lists are ready.
  const showDiscoverSkeleton =
    isDiscoverPage && (isDiscoverableLoading || !allCategories || !userTags);

  return (
    <>
      <div className="mb-2 w-[231px]">
        <div className="w-full">
          <div className="mx-1 my-1.5 block text-xs leading-[115%] font-450 tracking-[0.24px] text-gray-600 max-sm:mt-px max-sm:pt-2">
            Collections
          </div>

          <div className="w-full">
            {showDiscoverSkeleton ? (
              <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <CategoryMultiSelect
                bookmarkId={post.id}
                onAdd={isDiscoverPage ? handleDiscoverAddCategory : undefined}
                onRemove={isDiscoverPage ? handleDiscoverRemoveCategory : undefined}
                selectedItems={discoverSelectedCategories}
              />
            )}
          </div>
        </div>
        <div className="w-full">
          <div className="mx-1 my-1.5 block text-xs leading-[115%] font-450 tracking-[0.24px] text-gray-600 max-sm:mt-px max-sm:pt-2">
            Tags
          </div>

          <div className="w-full">
            {showDiscoverSkeleton ? (
              <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <TagMultiSelect
                bookmarkId={post.id}
                onAdd={isDiscoverPage ? handleDiscoverAddTag : undefined}
                onCreate={isDiscoverPage ? handleDiscoverCreateTag : undefined}
                onRemove={isDiscoverPage ? handleDiscoverRemoveTag : undefined}
                selectedItems={discoverSelectedTags}
              />
            )}
          </div>
        </div>
      </div>
      <div className="w-full">
        <DiscoverSwitch bookmarkId={post.id} isDiscoverable={post.make_discoverable !== null} />
      </div>
      {showOgPreference ? (
        <>
          <div className="px-2.5 py-1">
            <div className="h-px bg-gray-200" />
          </div>

          <div className="w-full">
            <OgPreferenceSwitch bookmarkUrl={post.url} userId={userId} />
          </div>
        </>
      ) : null}
    </>
  );
};

interface DiscoverSavePopoverProps {
  post: SingleListData;
}

export const DiscoverSavePopover = ({ post }: DiscoverSavePopoverProps) => {
  const { allCategories } = useFetchCategories();
  const saveFromDiscoverMutation = useSaveFromDiscoverMutation();

  // Synthetic "Everything" item prepended to the list
  const everythingItem: CategoriesData = useMemo(
    () => ({
      category_name: "Everything",
      category_slug: "everything",
      category_views: {
        bookmarksView: "moodboard" as const,
        cardContentViewArray: [],
        moodboardColumns: [],
        sortBy: "date-sort-ascending" as const,
      },
      collabData: [],
      created_at: "",
      icon: null,
      icon_color: "",
      id: 0,
      is_public: false,
      user_id: { email: "", id: "", profile_pic: "", user_name: "" },
    }),
    [],
  );

  const items = useMemo(() => {
    const cats = allCategories ?? [];
    return [everythingItem, ...cats];
  }, [allCategories, everythingItem]);

  // Local state for selected categories — "Everything" pre-selected
  const [selectedCategories, setSelectedCategories] = useState([everythingItem]);

  const handleAdd = useCallback((category: CategoriesData) => {
    setSelectedCategories((prev) => [...prev, category]);
  }, []);

  const handleRemove = useCallback((category: CategoriesData) => {
    setSelectedCategories((prev) => prev.filter((c) => c.id !== category.id));
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      // Fire mutation on close if at least one collection selected
      if (!open && selectedCategories.length > 0) {
        saveFromDiscoverMutation.mutate({
          category_ids: selectedCategories.map((c) => c.id),
          source_bookmark_id: post.id,
        });
        // Reset to default for next open
        setSelectedCategories([everythingItem]);
      }
    },
    [selectedCategories, saveFromDiscoverMutation, post.id, everythingItem],
  );

  return (
    <EditPopoverShell onOpenChange={handleOpenChange} triggerIcon={<PlusIcon />}>
      <div className="mb-2 w-[231px]">
        <div className="w-full">
          <div className="mx-1 my-1.5 block text-xs leading-[115%] font-450 tracking-[0.24px] text-gray-600 max-sm:mt-px max-sm:pt-2">
            Add to Collection
          </div>
          <div className="w-full">
            <CategoryMultiSelect
              items={items}
              onAdd={handleAdd}
              onRemove={handleRemove}
              selectedItems={selectedCategories}
            />
          </div>
        </div>
      </div>
    </EditPopoverShell>
  );
};

interface EditPopoverShellProps {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
  triggerIcon?: ReactNode;
}

export function EditPopoverShell({ children, onOpenChange, triggerIcon }: EditPopoverShellProps) {
  const isPublicPage = useIsPublicPage();

  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger
        className={cn(
          "z-15 flex rounded-lg bg-whites-700 p-[5px] text-gray-1000 backdrop-blur-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          !isPublicPage && "invisible group-hover:visible data-popup-open:visible",
          isPublicPage && "invisible",
        )}
      >
        {triggerIcon ?? <EditIcon />}
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
  onAdd?: (tag: UserTagsData) => void;
  onCreate?: (tagName: string) => void;
  onRemove?: (tag: UserTagsData) => void;
  selectedItems?: UserTagsData[];
}

export const TagMultiSelect = ({
  bookmarkId,
  onAdd: onAddOverride,
  onCreate: onCreateOverride,
  onRemove: onRemoveOverride,
  selectedItems,
}: TagMultiSelectProps) => {
  const { userTags } = useFetchUserTags();
  const { addTagToBookmarkOptimisticMutation } = useAddTagToBookmarkOptimisticMutation();
  const { removeTagFromBookmarkOptimisticMutation } = useRemoveTagFromBookmarkOptimisticMutation();
  const { createAndAssignTagOptimisticMutation } = useCreateAndAssignTagOptimisticMutation();

  const selectedTagIds = useBookmarkTags(bookmarkId);
  const allTags = useMemo(() => userTags ?? [], [userTags]);

  const tagMap = useMemo(() => new Map(allTags.map((tag) => [tag.id, tag])), [allTags]);

  const selectedTagsFromCache = useMemo(
    () =>
      selectedTagIds
        .map((id) => tagMap.get(id))
        .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined),
    [selectedTagIds, tagMap],
  );

  const selectedTags = selectedItems ?? selectedTagsFromCache;

  const handleAdd =
    onAddOverride ??
    ((tag: UserTagsData) => {
      addTagToBookmarkOptimisticMutation.mutate({
        bookmarkId,
        tagId: tag.id,
      });
    });

  const handleRemove =
    onRemoveOverride ??
    ((tag: UserTagsData) => {
      removeTagFromBookmarkOptimisticMutation.mutate({
        bookmarkId,
        tagId: tag.id,
      });
    });

  const handleCreate =
    onCreateOverride ??
    ((tagName: string) => {
      createAndAssignTagOptimisticMutation.mutate({
        // Pre-generate temp ID so both BOOKMARKS_KEY and USER_TAGS_KEY caches use same ID
        _tempId: -Date.now(),
        bookmarkId,
        name: tagName,
      });
    });

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
  bookmarkId?: number;
  items?: CategoriesData[];
  onAdd?: (category: CategoriesData) => void;
  onRemove?: (category: CategoriesData) => void;
  selectedItems?: CategoriesData[];
}

export const CategoryMultiSelect = ({
  bookmarkId = 0,
  items: itemsOverride,
  onAdd: onAddOverride,
  onRemove: onRemoveOverride,
  selectedItems: selectedItemsOverride,
}: CategoryMultiSelectProps) => {
  const {
    getItemId,
    getItemLabel,
    handleAdd,
    handleRemove,
    selectedCategories,
    visibleCategories,
  } = useCategoryMultiSelect({ bookmarkId, shouldFetch: itemsOverride === undefined });

  return (
    <Combobox.Root
      getItemId={getItemId}
      getItemLabel={getItemLabel}
      items={itemsOverride ?? visibleCategories}
      onAdd={onAddOverride ?? handleAdd}
      onRemove={onRemoveOverride ?? handleRemove}
      selectedItems={selectedItemsOverride ?? selectedCategories}
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
