/* eslint-disable @next/next/no-img-element */

import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";
import filter from "lodash/filter";
// import find from "lodash/find";
import { type OnChangeValue } from "react-select";

import Button from "../../../components/atoms/button";
import Input from "../../../components/atoms/input";
import CreatableSearchSelect from "../../../components/creatableSearchSelect";
import LabelledComponent from "../../../components/labelledComponent";
import TagInput from "../../../components/tagInput";
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
	addExistingTag: (value: OnChangeValue<TagInputOption, true>) => Promise<void>;
	addedTags: UserTagsData[];
	createTag: (value: OnChangeValue<TagInputOption, true>) => Promise<void>;
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

	const renderBookmarkDataCard = () => {
		if (urlData) {
			return (
				<>
					<div className="shrink-0">
						<img
							alt=""
							className="h-10 w-10 rounded-sm"
							src={urlData?.ogImage || urlData?.screenshot}
						/>
					</div>
					<div className="min-w-0 flex-1">
						{/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
						<a className="focus:outline-none" href="#">
							<span aria-hidden="true" className="absolute inset-0" />
							<p className="text-sm font-medium text-gray-900">
								{urlData?.title}
							</p>
							<p className="truncate text-sm text-gray-500">
								{urlData?.description}
							</p>
						</a>
					</div>
				</>
			);
		}

		return (
			<div className="flex w-full animate-pulse flex-row items-center space-x-4">
				<div className="h-10 w-10 rounded-sm bg-slate-200" id="image-load" />
				<div className="min-w-0 flex-1">
					<div className="mb-1 h-3 w-1/2 rounded bg-slate-200" />
					<div className="space-y-1">
						<div className="h-2 rounded  bg-slate-200" />
						<div className="h-2 w-4/5 rounded bg-slate-200" />
					</div>
				</div>
			</div>
		);
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
			<div className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400">
				{renderBookmarkDataCard()}
			</div>
			<div className="pt-4">
				<LabelledComponent label="Url">
					<Input
						className="px-2 py-1"
						errorText=""
						isDisabled
						isError={false}
						placeholder=""
						value={urlData?.url ?? ""}
					/>
				</LabelledComponent>
				<LabelledComponent label="Tags">
					<TagInput
						addExistingTag={addExistingTag}
						createTag={createTag}
						defaultValue={addedTags?.map((item) => ({
							value: item?.id,
							label: item?.name,
						}))}
						options={userTags?.map((item) => ({
							value: item?.id,
							label: item?.name,
						}))}
						removeExistingTag={removeExistingTag}
					/>
				</LabelledComponent>
				<LabelledComponent label="Add Category">
					<CreatableSearchSelect
						createOption={onCreateCategory}
						defaultValue={defaultValue}
						isLoading={isCategoryChangeLoading}
						onChange={onCategoryChange}
						options={categoryOptions()}
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
