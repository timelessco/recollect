import { memo, useMemo } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";

import AriaMultiSelect from "../../../components/ariaMultiSelect";
import { CategoryMultiSelect } from "../../../components/categoryMultiSelect";
import LabelledComponent from "../../../components/labelledComponent";
import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { type TagInputOption } from "../../../types/componentTypes";
import {
	CATEGORIES_KEY,
	MAX_TAG_NAME_LENGTH,
	UNCATEGORIZED_CATEGORY_ID,
} from "../../../utils/constants";

import { useChangeDiscoverable } from "@/async/mutationHooks/bookmarks/useChangeDiscoverable";
import { useAddCategoryToBookmarkMutation } from "@/async/mutationHooks/category/useAddCategoryToBookmarkMutation";
import { useRemoveCategoryFromBookmarkMutation } from "@/async/mutationHooks/category/useRemoveCategoryFromBookmarkMutation";
import useFetchUserTags from "@/async/queryHooks/userTags/useFetchUserTags";
import { Spinner } from "@/components/spinner";
import { handleClientError } from "@/utils/error-utils/client";

interface EditDropdownContentProps {
	post: SingleListData;
	addExistingTag: (
		value: Array<{ label: string; value: number }>,
	) => Promise<void>;
	removeExistingTag: (value: TagInputOption) => Promise<void>;
	createTag: (value: Array<{ label: string }>) => Promise<void>;
	addedTags: UserTagsData[];
	userId: string;
}

const EditDropdownContentBase = ({
	post,
	addExistingTag,
	removeExistingTag,
	createTag,
	addedTags = [],
	userId,
}: EditDropdownContentProps) => {
	const queryClient = useQueryClient();
	const { addCategoryToBookmarkMutation } = useAddCategoryToBookmarkMutation();
	const { removeCategoryFromBookmarkMutation } =
		useRemoveCategoryFromBookmarkMutation();
	const postUserId =
		typeof post?.user_id === "object" ? post?.user_id?.id : post?.user_id;
	const isOwner = userId && postUserId === userId;
	const { changeDiscoverableMutation } = useChangeDiscoverable();
	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};
	const { userTags } = useFetchUserTags();
	const filteredUserTags = userTags?.data ? userTags?.data : [];

	// Get all categories for the multi-select dropdown
	const allCategories = useMemo(
		() => categoryData?.data ?? [],
		[categoryData?.data],
	);

	// Get selected category IDs from the bookmark
	const selectedCategoryIds = useMemo(
		() =>
			post.addedCategories?.length
				? post.addedCategories.map((cat) => cat.id)
				: [UNCATEGORIZED_CATEGORY_ID],
		[post.addedCategories],
	);

	if (!categoryData) {
		return (
			<figure className="text-gray-1000">
				<Spinner className="h-3 w-3" />
			</figure>
		);
	}

	if (!isOwner) {
		return null;
	}

	return (
		<div className="w-64 space-y-3">
			<LabelledComponent
				label="Tags"
				labelClassName="ml-2 mb-2 block text-sm font-medium text-gray-800 max-sm:mt-px max-sm:pt-2"
			>
				<AriaMultiSelect
					defaultList={addedTags?.map((item) => item?.name) || []}
					list={filteredUserTags?.map((item) => item?.name) ?? []}
					onChange={async (action, value) => {
						if (action === "remove") {
							const tagData = find(
								addedTags,
								(findItem) => findItem.name === value,
							);
							if (tagData) {
								await removeExistingTag({
									label: tagData?.name,
									value: tagData?.id,
								});
							}
						}

						if (action === "add" && Array.isArray(value)) {
							const mapped = value
								.map((addItem) => {
									const match = find(
										filteredUserTags,
										(item) => item.name === addItem,
									);
									return match
										? { label: match.name, value: match.id }
										: undefined;
								})
								.filter(Boolean);

							if (mapped.length) {
								await addExistingTag(
									mapped as Array<{ label: string; value: number }>,
								);
							}
						}

						if (action === "create") {
							if (typeof value !== "string") {
								handleClientError("create-tag", "Invalid tag name");
								return;
							}

							const trimmedTagName = value.trim();

							if (!trimmedTagName) {
								handleClientError("create-tag", "Tag name cannot be empty");
								return;
							}

							if (trimmedTagName.length > MAX_TAG_NAME_LENGTH) {
								handleClientError(
									"create-tag",
									`Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`,
								);
								return;
							}

							await createTag([{ label: trimmedTagName }]);
						}
					}}
					placeholder="Tag name..."
				/>
			</LabelledComponent>

			<LabelledComponent
				label="Collections"
				labelClassName="ml-2 mb-2 block text-sm font-medium text-gray-800 max-sm:mt-px max-sm:pt-2"
			>
				<CategoryMultiSelect
					allCategories={allCategories}
					onAddCategory={(categoryId) => {
						addCategoryToBookmarkMutation.mutate({
							bookmark_id: post.id,
							category_id: categoryId,
						});
					}}
					onRemoveCategory={(categoryId) => {
						removeCategoryFromBookmarkMutation.mutate({
							bookmark_id: post.id,
							category_id: categoryId,
						});
					}}
					selectedCategoryIds={selectedCategoryIds}
				/>
			</LabelledComponent>
			<div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1">
				<input
					aria-label="Discoverable"
					checked={Boolean(post?.make_discoverable)}
					className="h-4 w-4"
					disabled={!isOwner}
					onChange={() => {
						if (!post?.id || !isOwner) {
							return;
						}

						changeDiscoverableMutation.mutate({
							bookmark_id: post?.id,
							make_discoverable: !post?.make_discoverable,
						});
					}}
					type="checkbox"
				/>
				<span className="text-sm text-gray-800">Discoverable</span>
			</div>
		</div>
	);
};

export const EditDropdownContent = memo(EditDropdownContentBase);
