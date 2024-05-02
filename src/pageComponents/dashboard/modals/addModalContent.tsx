import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";
import filter from "lodash/filter";

import AriaMultiSelect from "../../../components/ariaMultiSelect";
import AriaSearchableSelect from "../../../components/ariaSearchableSelect";
import Button from "../../../components/atoms/button";
import LabelledComponent from "../../../components/labelledComponent";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
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
import { BOOKMARKS_KEY, CATEGORIES_KEY } from "../../../utils/constants";

// Modal for adding a bookmark
type AddModalContentProps = {
	addExistingTag: (
		value: Array<{ label: string; value: number }>,
	) => Promise<void>;
	addedTags: UserTagsData[];
	createTag: (value: Array<{ label: string }>) => Promise<void>;
	isCategoryChangeLoading: boolean;
	mainButtonText: string;
	onCategoryChange: (value: SearchSelectOption | null) => Promise<void>;
	onCreateCategory: (value: SearchSelectOption | null) => Promise<void>;
	removeExistingTag: (value: TagInputOption) => Promise<void>;
	showMainButton: boolean;
	urlData?: SingleListData;
	userId: string;
	userTags?: UserTagsData[];
};

const AddModalContent = (props: AddModalContentProps) => {
	const {
		urlData,
		userTags,
		createTag,
		addExistingTag,
		removeExistingTag,
		addedTags,
		mainButtonText,
		onCategoryChange,
		userId,
		isCategoryChangeLoading = false,
		showMainButton = true,
		onCreateCategory,
	} = props;

	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { sortBy } = useGetSortBy();
	// tells if the logged in user is the bookmark owner
	const isOwner = urlData?.user_id?.id === session?.user?.id;

	const { category_id: categoryId } = useGetCurrentCategoryId();
	const latestBookmarkData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		session?.user?.id,
		categoryId,
		sortBy,
	]) as {
		pages: Array<{
			data: SingleListData[];
		}>;
	};

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	// if the bookmaks is not created by logged in user , then only show the option in else case
	const categoryOptions = () => {
		if (userId === urlData?.user_id?.id) {
			return [
				{
					label: "Uncategorized",
					value: 0,
				},
				...categoryData.data.map((item) => ({
					label: item?.category_name,
					value: item?.id,
				})),
			];
		}

		return [
			{
				label: "Uncategorized",
				value: 0,
			},
		];
	};

	const bookmarkData = find(
		latestBookmarkData?.pages[0]?.data,
		(item) => item?.id === urlData?.id,
	);

	const defaultValue = filter(
		categoryData?.data,
		(item) => item?.id === bookmarkData?.category_id,
	)?.map((item) => ({
		label: item?.category_name,
		value: item?.id,
	}))[0];

	return (
		<div id="modal-content">
			<div className="space-y-3">
				{isOwner && (
					<LabelledComponent label="Tags">
						<AriaMultiSelect
							defaultList={addedTags?.map((item) => item?.name)}
							list={userTags?.map((item) => item?.name) ?? []}
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
												userTags,
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
				<LabelledComponent label="Add Collection">
					<AriaSearchableSelect
						defaultValue={defaultValue?.label}
						isLoading={isCategoryChangeLoading}
						list={categoryOptions()?.map((item) => item?.label)}
						onChange={async (value) => {
							const data = find(
								categoryOptions(),
								(item) => item.label === value,
							);
							if (data) {
								await onCategoryChange(data);
							} else {
								console.error("Payload data is empty");
							}
						}}
						onCreate={(value) => onCreateCategory({ label: value, value })}
					/>
				</LabelledComponent>
			</div>
			<div className="mt-4">
				{showMainButton && (
					<Button className="w-full" isDisabled={!urlData} onClick={() => null}>
						<span>{mainButtonText}</span>
					</Button>
				)}
			</div>
		</div>
	);
};

export default AddModalContent;
