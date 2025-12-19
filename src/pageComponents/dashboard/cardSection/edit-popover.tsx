import { useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Popover } from "@base-ui/react/popover";
import { z } from "zod";

import { useChangeDiscoverableOptimisticMutation } from "@/async/mutationHooks/bookmarks/useChangeDiscoverableOptimisticMutation";
import { useAddCategoryToBookmarkMutation } from "@/async/mutationHooks/category/useAddCategoryToBookmarkMutation";
import { useRemoveCategoryFromBookmarkMutation } from "@/async/mutationHooks/category/useRemoveCategoryFromBookmarkMutation";
import { useAddTagToBookmarkMutation } from "@/async/mutationHooks/tags/useAddTagToBookmarkMutation";
import { useCreateAndAssignTagMutation } from "@/async/mutationHooks/tags/useCreateAndAssignTagMutation";
import { useRemoveTagFromBookmarkMutation } from "@/async/mutationHooks/tags/useRemoveTagFromBookmarkMutation";
import useFetchCategories from "@/async/queryHooks/category/useFetchCategories";
import useFetchUserTags from "@/async/queryHooks/userTags/useFetchUserTags";
import { CollectionIcon } from "@/components/collectionIcon";
import {
	EditPopoverMultiSelect,
	useTypedEditPopoverContext,
} from "@/components/edit-popover-multi-select";
import { Checkbox } from "@/components/ui/recollect/checkbox";
import { useBookmarkCategories } from "@/hooks/useBookmarkCategories";
import { useBookmarkTags } from "@/hooks/useBookmarkTags";
import { useIsPublicPage } from "@/hooks/useIsPublicPage";
import { EditIcon } from "@/icons/edit-icon";
import { LightboxCloseIcon } from "@/icons/lightbox-close-icon";
import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "@/types/apiTypes";
import { MAX_TAG_NAME_LENGTH } from "@/utils/constants";
import { cn } from "@/utils/tailwind-merge";

const TAG_CREATE_SCHEMA = z.string().max(MAX_TAG_NAME_LENGTH);

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
					"z-15 rounded-lg bg-whites-700 p-[5px] text-gray-1000 backdrop-blur-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
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

							<div className="w-full">
								<DiscoverableCheckbox
									bookmarkId={post.id}
									isDiscoverable={post.make_discoverable !== null}
								/>
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
	const { addTagToBookmarkMutation } = useAddTagToBookmarkMutation();
	const { removeTagFromBookmarkMutation } = useRemoveTagFromBookmarkMutation();
	const { createAndAssignTagMutation } = useCreateAndAssignTagMutation();

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
		addTagToBookmarkMutation.mutate({
			selectedData: {
				bookmark_id: bookmarkId,
				tag_id: tag.id,
			},
		});
	};

	const handleRemove = (tag: UserTagsData) => {
		removeTagFromBookmarkMutation.mutate({
			selectedData: {
				bookmark_id: bookmarkId,
				tag_id: tag.id,
			},
		});
	};

	const handleCreate = (tagName: string) => {
		createAndAssignTagMutation.mutate({
			tagName,
			bookmarkId,
		});
	};

	return (
		<EditPopoverMultiSelect.Root
			items={allTags}
			selectedItems={selectedTags}
			getItemId={(tag) => tag.id}
			getItemLabel={(tag) => tag.name}
			onAdd={handleAdd}
			onRemove={handleRemove}
			onCreate={handleCreate}
			createSchema={TAG_CREATE_SCHEMA}
		>
			<EditPopoverMultiSelect.Chips>
				<EditPopoverMultiSelect.Chip />
				<EditPopoverMultiSelect.Input placeholder="Tag name..." />
			</EditPopoverMultiSelect.Chips>
			<EditPopoverMultiSelect.Portal>
				<EditPopoverMultiSelect.Positioner>
					<EditPopoverMultiSelect.Popup>
						<EditPopoverMultiSelect.List
							renderItem={(item: UserTagsData) => (
								<EditPopoverMultiSelect.Item value={item}>
									<span className="truncate">{item.name}</span>
								</EditPopoverMultiSelect.Item>
							)}
						/>
					</EditPopoverMultiSelect.Popup>
				</EditPopoverMultiSelect.Positioner>
			</EditPopoverMultiSelect.Portal>
		</EditPopoverMultiSelect.Root>
	);
};

// Custom chips component using context
const CategoryChips = () => {
	const { selectedItems, getItemId } =
		useTypedEditPopoverContext<CategoriesData>();

	return (
		<>
			{selectedItems.map((item) => (
				<Combobox.Chip
					key={getItemId(item)}
					className="flex cursor-pointer items-center gap-1 rounded-md bg-gray-800 px-2 py-[2px] text-xs leading-[15px] font-450 tracking-[0.01em] text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
					aria-label={item.category_name}
				>
					<CollectionIcon bookmarkCategoryData={item} iconSize="8" size="12" />

					<span className="max-w-[100px] truncate">{item.category_name}</span>

					<Combobox.ChipRemove
						className="rounded-full p-0.5 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
						aria-label="Remove"
					>
						<LightboxCloseIcon className="size-2.5" />
					</Combobox.ChipRemove>
				</Combobox.Chip>
			))}
		</>
	);
};

type CategoryMultiSelectProps = {
	bookmarkId: number;
};

export const CategoryMultiSelect = ({
	bookmarkId,
}: CategoryMultiSelectProps) => {
	const { allCategories: categoriesResponse } = useFetchCategories();
	const { addCategoryToBookmarkMutation } = useAddCategoryToBookmarkMutation();
	const { removeCategoryFromBookmarkMutation } =
		useRemoveCategoryFromBookmarkMutation();

	const selectedCategoryIds = useBookmarkCategories(bookmarkId);
	const visibleCategories = useMemo(
		() => categoriesResponse?.data ?? [],
		[categoriesResponse?.data],
	);

	const categoryMap = useMemo(
		() => new Map(visibleCategories.map((cat) => [cat.id, cat])),
		[visibleCategories],
	);

	const selectedCategories = useMemo(
		() =>
			selectedCategoryIds
				.map((id) => categoryMap.get(id))
				.filter((cat): cat is NonNullable<typeof cat> => cat !== undefined),
		[selectedCategoryIds, categoryMap],
	);

	const handleAdd = (category: CategoriesData) => {
		addCategoryToBookmarkMutation.mutate({
			bookmark_id: bookmarkId,
			category_id: category.id,
		});
	};

	const handleRemove = (category: CategoriesData) => {
		removeCategoryFromBookmarkMutation.mutate({
			bookmark_id: bookmarkId,
			category_id: category.id,
		});
	};

	return (
		<EditPopoverMultiSelect.Root
			items={visibleCategories}
			selectedItems={selectedCategories}
			getItemId={(cat) => cat.id}
			getItemLabel={(cat) => cat.category_name}
			onAdd={handleAdd}
			onRemove={handleRemove}
		>
			<EditPopoverMultiSelect.Chips>
				<CategoryChips />
				<EditPopoverMultiSelect.Input placeholder="Search Collections..." />
			</EditPopoverMultiSelect.Chips>
			<EditPopoverMultiSelect.Portal>
				<EditPopoverMultiSelect.Positioner>
					<EditPopoverMultiSelect.Popup>
						<EditPopoverMultiSelect.Empty>
							No categories found
						</EditPopoverMultiSelect.Empty>
						<EditPopoverMultiSelect.List
							renderItem={(item: CategoriesData) => (
								<EditPopoverMultiSelect.Item value={item}>
									<CollectionIcon
										bookmarkCategoryData={item}
										iconSize="10"
										size="16"
									/>
									<span className="truncate">{item.category_name}</span>
								</EditPopoverMultiSelect.Item>
							)}
						/>
					</EditPopoverMultiSelect.Popup>
				</EditPopoverMultiSelect.Positioner>
			</EditPopoverMultiSelect.Portal>
		</EditPopoverMultiSelect.Root>
	);
};

type DiscoverableCheckboxProps = {
	bookmarkId: number;
	isDiscoverable: boolean;
};

const DiscoverableCheckbox = ({
	bookmarkId,
	isDiscoverable,
}: DiscoverableCheckboxProps) => {
	const { changeDiscoverableMutation } =
		useChangeDiscoverableOptimisticMutation();

	const handleCheckedChange = (checked: boolean) => {
		changeDiscoverableMutation.mutate({
			bookmark_id: bookmarkId,
			make_discoverable: checked,
		});
	};

	return (
		<div className="flex items-center gap-2 px-2 py-1.5">
			<Checkbox
				id={`discoverable-${bookmarkId}`}
				checked={isDiscoverable}
				onCheckedChange={handleCheckedChange}
				className="flex size-4 items-center justify-center rounded border-2 border-gray-400 data-checked:border-gray-800 data-checked:bg-gray-800 [&_svg]:text-white"
			/>
			<label
				htmlFor={`discoverable-${bookmarkId}`}
				className="cursor-pointer text-sm font-medium text-gray-800"
			>
				Make discoverable
			</label>
		</div>
	);
};
