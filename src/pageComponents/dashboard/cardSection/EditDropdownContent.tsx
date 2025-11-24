import { memo, useMemo } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";
import filter from "lodash/filter";

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
import { CATEGORIES_KEY } from "../../../utils/constants";

import useFetchUserTags from "@/async/queryHooks/userTags/useFetchUserTags";
import { Spinner } from "@/components/spinner";

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
	const isOwner = userId && post?.user_id?.id === userId;
	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};
	const { userTags } = useFetchUserTags();
	const filteredUserTags = userTags?.data ? userTags?.data : [];

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
		const match = filter(
			categoryData?.data,
			(item) => item?.id === post?.category_id,
		)?.[0];

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
				<LabelledComponent label="Tags">
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
								await createTag([{ label: value as string }]);
							}
						}}
						placeholder="Tag name..."
					/>
				</LabelledComponent>
			)}
			<LabelledComponent label="Collection">
				<AriaSearchableSelect
					defaultValue={defaultValue?.label || ""}
					isLoading={isCategoryChangeLoading}
					list={categoryOptions.map((item) => item.label)}
					onChange={async (value) => {
						const data = find(categoryOptions, (item) => item.label === value);
						if (data) {
							await onCategoryChange(data);
						} else {
							console.error("Payload data is empty");
						}
					}}
					onCreate={async (value) =>
						await onCreateCategory({ label: value, value })
					}
				/>
			</LabelledComponent>
		</div>
	);
};

export const EditDropdownContent = memo(EditDropdownContentBase);
