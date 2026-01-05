import { useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";

import { useAddTagToBookmarkOptimisticMutation } from "@/async/mutationHooks/tags/use-add-tag-to-bookmark-optimistic-mutation";
import { useCreateAndAssignTagOptimisticMutation } from "@/async/mutationHooks/tags/use-create-and-assign-tag-optimistic-mutation";
import { useRemoveTagFromBookmarkOptimisticMutation } from "@/async/mutationHooks/tags/use-remove-tag-from-bookmark-optimistic-mutation";
import useFetchUserTags from "@/async/queryHooks/userTags/useFetchUserTags";
import { CollectionIcon } from "@/components/collectionIcon";
import { Combobox } from "@/components/ui/recollect/combobox";
import { ScrollArea } from "@/components/ui/recollect/scroll-area";
import { useBookmarkTags } from "@/hooks/use-bookmark-tags";
import { useCategoryMultiSelect } from "@/hooks/use-category-multi-select";
import { useIsPublicPage } from "@/hooks/use-is-public-page";
import { EditIcon } from "@/icons/edit-icon";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "@/types/apiTypes";
import { cn } from "@/utils/tailwind-merge";

type EditPopoverProps = {
	post: SingleListData;
	userId: string;
};

export const EditPopover = ({ post, userId }: EditPopoverProps) => {
	const [open, setOpen] = useState(false);
	const isPublicPage = useIsPublicPage();

	const postUserId =
		typeof post?.user_id === "object" ? post?.user_id?.id : post?.user_id;
	const isOwner = userId && postUserId === userId;

	// Non-owners see nothing
	if (!isOwner) {
		return null;
	}

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			{/* When popover is open, always show trigger (flex) */}
			{/* When closed, show only on hover (hidden group-hover:flex) */}
			<Popover.Trigger
				className={cn(
					"z-15 rounded-lg bg-whites-700 p-[5px] text-gray-1000 backdrop-blur-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
					!isPublicPage && (open ? "flex" : "hidden group-hover:flex"),
					isPublicPage && "hidden",
				)}
			>
				<EditIcon />
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Positioner sideOffset={4} align="start">
					<Popover.Popup className="z-10 rounded-xl bg-gray-50 p-1 shadow-custom-3">
						<div className="w-64 space-y-3">
							<div className="w-full">
								<div className="mb-2 ml-2 block text-sm font-medium text-gray-800 max-sm:mt-px max-sm:pt-2">
									Tags
								</div>

								<div className="w-full">
									<TagMultiSelect bookmarkId={post.id} />
								</div>
							</div>

							<div className="w-full">
								<div className="mb-2 ml-2 block text-sm font-medium text-gray-800 max-sm:mt-px max-sm:pt-2">
									Collections
								</div>

								<div className="w-full">
									<CategoryMultiSelect bookmarkId={post.id} />
								</div>
							</div>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};

type TagMultiSelectProps = {
	bookmarkId: number;
};

export const TagMultiSelect = ({ bookmarkId }: TagMultiSelectProps) => {
	const { userTags } = useFetchUserTags();
	const { addTagToBookmarkOptimisticMutation } = useAddTagToBookmarkOptimisticMutation();
	const { removeTagFromBookmarkOptimisticMutation } = useRemoveTagFromBookmarkOptimisticMutation();
	const { createAndAssignTagOptimisticMutation } = useCreateAndAssignTagOptimisticMutation();

	const selectedTagIds = useBookmarkTags(bookmarkId);
	const allTags = useMemo(() => userTags?.data ?? [], [userTags?.data]);

	const tagMap = useMemo(
		() => new Map(allTags.map((tag) => [tag.id, tag])),
		[allTags],
	);

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
			name: tagName,
			bookmarkId,
			// Pre-generate temp ID so both BOOKMARKS_KEY and USER_TAGS_KEY caches use same ID
			_tempId: -Date.now(),
		});
	};

	return (
		<Combobox.Root
			items={allTags}
			selectedItems={selectedTags}
			getItemId={(tag) => tag.id}
			getItemLabel={(tag) => tag.name}
			onAdd={handleAdd}
			onRemove={handleRemove}
			onCreate={handleCreate}
			createSchema={tagCategoryNameSchema}
		>
			<Combobox.Chips>
				<Combobox.Value>
					{(value: UserTagsData[]) => (
						<>
							{value.map((tag) => (
								<Combobox.Chip key={tag.id}>
									<Combobox.ChipContent item={tag} />
									<Combobox.ChipRemove />
								</Combobox.Chip>
							))}

							<Combobox.Input placeholder="Tag name..." />
						</>
					)}
				</Combobox.Value>
			</Combobox.Chips>
			<Combobox.Portal>
				<Combobox.Positioner>
					<Combobox.Popup>
						<ScrollArea scrollbarGutter scrollFade scrollHeight={220}>
							<Combobox.List>
								{(item: UserTagsData) => (
									<Combobox.Item key={item.id} value={item}>
										<Combobox.ItemIndicator />
										<span className="truncate">{item.name}</span>
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

type CategoryMultiSelectProps = {
	bookmarkId: number;
};

export const CategoryMultiSelect = ({
	bookmarkId,
}: CategoryMultiSelectProps) => {
	const {
		visibleCategories,
		selectedCategories,
		handleAdd,
		handleRemove,
		getItemId,
		getItemLabel,
	} = useCategoryMultiSelect({ bookmarkId });

	return (
		<Combobox.Root
			items={visibleCategories}
			selectedItems={selectedCategories}
			getItemId={getItemId}
			getItemLabel={getItemLabel}
			onAdd={handleAdd}
			onRemove={handleRemove}
		>
			<Combobox.Chips>
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
							<Combobox.Input placeholder="Search Collections..." />
						</>
					)}
				</Combobox.Value>
			</Combobox.Chips>
			<Combobox.Portal>
				<Combobox.Positioner>
					<Combobox.Popup>
						<ScrollArea scrollbarGutter scrollFade scrollHeight={220}>
							<Combobox.Empty>No collections found</Combobox.Empty>
							<Combobox.List>
								{(item: CategoriesData) => (
									<Combobox.Item key={item.id} value={item}>
										<Combobox.ItemIndicator />
										<CollectionIcon
											bookmarkCategoryData={item}
											iconSize="10"
											size="16"
										/>
										<span className="truncate">{item.category_name}</span>
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
