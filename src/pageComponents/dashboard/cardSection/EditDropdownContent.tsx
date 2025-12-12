import { memo, useMemo } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";

import AriaMultiSelect from "../../../components/ariaMultiSelect";
import AriaSearchableSelect from "../../../components/ariaSearchableSelect";
import LabelledComponent from "../../../components/labelledComponent";
import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import {
	type SearchSelectOption,
	type TagInputOption,
} from "../../../types/componentTypes";
import {
	CATEGORIES_KEY,
	MAX_TAG_COLLECTION_NAME_LENGTH,
	MIN_TAG_COLLECTION_NAME_LENGTH,
} from "../../../utils/constants";

import useFetchUserTags from "@/async/queryHooks/userTags/useFetchUserTags";
import { Spinner } from "@/components/spinner";
import { useNameValidation } from "@/hooks/useNameValidation";
import { handleClientError } from "@/utils/error-utils/client";

interface EditDropdownContentProps {
	post: SingleListData;
	onCategoryChange: (value: SearchSelectOption | null) => Promise<void>;
	onCreateCategory: (value: SearchSelectOption | null) => Promise<void>;
	addExistingTag: (
		value: Array<{ label: string; value: number }>,
	) => Promise<void>;
	removeExistingTag: (value: TagInputOption) => Promise<void>;
	createTag: (value: Array<{ label: string }>) => Promise<void>;
	addedTags: UserTagsData[];
	isCategoryChangeLoading: boolean;
	userId: string;
}

const EditDropdownContentBase = ({
	post,
	onCategoryChange,
	onCreateCategory,
	addExistingTag,
	removeExistingTag,
	createTag,
	addedTags = [],
	isCategoryChangeLoading = false,
	userId,
}: EditDropdownContentProps) => {
	const queryClient = useQueryClient();
	const postUserId =
		typeof post?.user_id === "object" ? post?.user_id?.id : post?.user_id;
	const isOwner = userId && postUserId === userId;
	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};
	const { userTags } = useFetchUserTags();
	const filteredUserTags = userTags?.data ? userTags?.data : [];
	const { validateName } = useNameValidation();

	const categoryOptions = useMemo(() => {
		const base = [
			{
				label: "Uncategorized",
				value: 0,
			},
		];

		if (isOwner) {
			return [
				...base,
				...(categoryData?.data?.map((item) => ({
					label: item?.category_name,
					value: item?.id,
				})) ?? []),
			];
		}

		return base;
	}, [categoryData?.data, isOwner]);

	const defaultValue = useMemo(() => {
		const match = find(
			categoryData?.data,
			(item) => item?.id === post?.category_id,
		);

		if (!match) {
			return undefined;
		}

		return {
			label: match?.category_name,
			value: match?.id,
		};
	}, [categoryData?.data, post?.category_id]);

	if (!categoryData) {
		return (
			<figure className="text-gray-1000">
				<Spinner className="h-3 w-3" />
			</figure>
		);
	}

	return (
		<div className="w-64 space-y-3">
			{isOwner && (
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

								const trimmedTagName = validateName({
									errorId: "create-tag",
									value,
									emptyMessage: "Tag name cannot be empty",
									lengthMessage: `Tag name must be ${MAX_TAG_COLLECTION_NAME_LENGTH} characters or less`,
								});

								if (!trimmedTagName) {
									return;
								}

								await createTag([{ label: trimmedTagName }]);
							}
						}}
						placeholder="Tag name..."
					/>
				</LabelledComponent>
			)}
			<LabelledComponent
				label="Collection"
				labelClassName="ml-2 mb-2 block text-sm font-medium text-gray-800 max-sm:mt-px max-sm:pt-2"
			>
				<AriaSearchableSelect
					defaultValue={defaultValue?.label || ""}
					isLoading={isCategoryChangeLoading}
					list={categoryOptions.map((item) => item.label)}
					onChange={async (value) => {
						const data = find(categoryOptions, (item) => item.label === value);
						if (data) {
							await onCategoryChange(data);
						} else {
							handleClientError("Failed to change category. Please try again.");
						}
					}}
					onCreate={async (value) => {
						const validatedName = validateName({
							errorId: "create-collection",
							value: typeof value === "string" ? value : "",
							emptyMessage: "Collection name cannot be empty",
							lengthMessage: `Collection name must be between ${MIN_TAG_COLLECTION_NAME_LENGTH} and ${MAX_TAG_COLLECTION_NAME_LENGTH} characters`,
						});

						if (!validatedName) {
							return;
						}

						await onCreateCategory({
							label: validatedName,
							value: validatedName,
						});
					}}
				/>
			</LabelledComponent>
		</div>
	);
};

export const EditDropdownContent = memo(EditDropdownContentBase);
