import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";
import filter from "lodash/filter";

import AriaMultiSelect from "../../../components/ariaMultiSelect";
import AriaSearchableSelect from "../../../components/ariaSearchableSelect";
import Button from "../../../components/atoms/button";
// import Input from "../../../components/atoms/input";
import LabelledComponent from "../../../components/labelledComponent";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
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
	// categoryId: string | number | null;
	userId: string;
	userTags?: UserTagsData[];
};

const AddModalContent = (props: AddModalContentProps) => {
	const {
		urlData,
		// addBookmark,
		userTags,
		createTag,
		addExistingTag,
		removeExistingTag,
		addedTags,
		mainButtonText,
		// urlString,
		onCategoryChange,
		// categoryId,
		userId,
		isCategoryChangeLoading = false,
		showMainButton = true,
		onCreateCategory,
	} = props;

	const queryClient = useQueryClient();
	const session = useSession();

	// tells if the logged in user is the bookmark owner
	const isOwner = urlData?.user_id?.id === session?.user?.id;

	const { category_id: categoryId } = useGetCurrentCategoryId();
	const latestBookmarkData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		session?.user?.id,
		categoryId,
	]) as {
		pages: Array<{
			data: SingleListData[];
		}>;
	};

	// as {
	//   data: SingleListData[];
	//   error: PostgrestError;
	// };

	// const latestCurrentBookmarkData = find(
	//   latestBookmarkData?.data,
	//   item => item?.id === urlData?.id,
	// ) as unknown as SingleListData;

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	// const renderBookmarkDataCard = () => {
	// 	if (urlData) {
	// 		return (
	// 			<>
	// 				<div className="shrink-0">
	// 					<img
	// 						alt=""
	// 						className="h-10 w-10 rounded-sm"
	// 						src={urlData?.ogImage || urlData?.screenshot}
	// 					/>
	// 				</div>
	// 				<div className="min-w-0 flex-1">
	// 					{/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
	// 					<a className="focus:outline-none" href="#">
	// 						<span aria-hidden="true" className="absolute inset-0" />
	// 						<p className="text-sm font-medium text-gray-900">
	// 							{urlData?.title}
	// 						</p>
	// 						<p className="truncate text-sm text-gray-500">
	// 							{urlData?.description}
	// 						</p>
	// 					</a>
	// 				</div>
	// 			</>
	// 		);
	// 	}

	// 	return (
	// 		<div className="flex w-full animate-pulse flex-row items-center space-x-4">
	// 			<div className="h-10 w-10 rounded-sm bg-slate-200" id="image-load" />
	// 			<div className="min-w-0 flex-1">
	// 				<div className="mb-1 h-3 w-1/2 rounded bg-slate-200" />
	// 				<div className="space-y-1">
	// 					<div className="h-2 rounded  bg-slate-200" />
	// 					<div className="h-2 w-4/5 rounded bg-slate-200" />
	// 				</div>
	// 			</div>
	// 		</div>
	// 	);
	// };

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

	// const bookmarkData = latestBookmarkData?.pages[0]?.data?.filter(
	//   item => item?.id === urlData?.id,
	// );

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
			{/* <div className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400">
				{renderBookmarkDataCard()}
			</div> */}
			<div className="pt-4">
				{/* <LabelledComponent label="Url">
					<Input
						className="px-2 py-1 opacity-50"
						errorText=""
						isDisabled
						isError={false}
						placeholder=""
						value={urlData?.url ?? ""}
					/>
				</LabelledComponent> */}
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
