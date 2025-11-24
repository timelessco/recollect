import { memo, useMemo } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";
import filter from "lodash/filter";

import AriaMultiSelect from "../../../components/ariaMultiSelect";
import AriaSearchableSelect from "../../../components/ariaSearchableSelect";
import LabelledComponent from "../../../components/labelledComponent";
import { useSupabaseSession } from "../../../store/componentStore";
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
	const session = useSupabaseSession((state) => state.session);
	const isOwner = post?.user_id?.id === session?.user?.id;

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

		if (userId === post?.user_id?.id) {
			return [
				...base,
				...(categoryData?.data?.map((item) => ({
					label: item?.category_name,
					value: item?.id,
				})) ?? []),
			];
		}

		return base;
	}, [categoryData?.data, post?.user_id?.id, userId]);

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

							if (action === "add" && typeof value !== "string") {
								await addExistingTag(
									value?.map((addItem) => ({
										label: addItem,
										value: find(
											filteredUserTags,
											(findItem) => findItem.name === addItem,
										)?.id as number,
									})),
								);
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
