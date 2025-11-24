import { useEffect, useState } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isEmpty, isNull } from "lodash";
import { Mention, MentionsInput } from "react-mentions";

import Button from "@/components/atoms/button";
import { Spinner } from "@/components/spinner";
import SearchInputSearchIcon from "@/icons/searchInputSearchIcon";
import { useLoadersStore, useMiscellaneousStore } from "@/store/componentStore";
import { type CategoriesData, type UserTagsData } from "@/types/apiTypes";
import { type CategoryIdUrlTypes } from "@/types/componentTypes";
import { GET_TEXT_WITH_AT_CHAR, USER_TAGS_KEY } from "@/utils/constants";

type SearchBarProps = {
	showSearchBar: boolean;
	isDesktop: boolean;
	currentCategoryData: CategoriesData | undefined;
	currentPath: string | null;
	userId: string;
	categoryId: CategoryIdUrlTypes;
	onShowSearchBar: (value: boolean) => void;
};

export function SearchBar(props: SearchBarProps) {
	const {
		showSearchBar,
		isDesktop,
		currentCategoryData,
		currentPath,
		userId,
		categoryId,
		onShowSearchBar,
	} = props;

	const { setSearchText } = useMiscellaneousStore();

	useEffect(() => {
		setSearchText("");
	}, [categoryId, setSearchText]);

	if (showSearchBar) {
		return (
			<div className="w-[246px] max-xl:my-[2px] max-xl:w-full">
				<SearchInput
					onBlur={() => !isDesktop && onShowSearchBar(false)}
					onChange={(value) => {
						setSearchText(value);
					}}
					placeholder={`Search in ${
						currentCategoryData?.category_name ?? currentPath
					}`}
					userId={userId}
				/>
			</div>
		);
	}

	return (
		<Button
			className="mr-1 bg-transparent hover:bg-transparent"
			onClick={() => onShowSearchBar(true)}
		>
			<SearchInputSearchIcon color="var(--color-gray-1000)" size="16" />
		</Button>
	);
}

type SearchInputTypes = {
	onBlur: () => void;
	onChange: (value: string) => void;
	placeholder: string;
	userId: string;
};

const SearchInput = (props: SearchInputTypes) => {
	const { placeholder, onChange, userId, onBlur } = props;
	const [addedTags, setAddedTags] = useState<string[] | undefined>([]);
	const [isFocused, setIsFocused] = useState(false);

	const queryClient = useQueryClient();
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

	const searchText = useMiscellaneousStore((state) => state.searchText);
	const userTagsData = queryClient.getQueryData([USER_TAGS_KEY, userId]) as {
		data: UserTagsData[];
		error: PostgrestError;
	};

	return (
		<div className="search-wrapper relative">
			<figure className="absolute top-[7px] left-[9px] z-5">
				<SearchInputSearchIcon
					color={isFocused ? "var(--color-gray-900)" : "var(--color-gray-600)"}
					size="14"
				/>
			</figure>
			<MentionsInput
				className="search-bar"
				onBlur={() => {
					setIsFocused(false);
					onBlur();
				}}
				onChange={(event: { target: { value: string } }) => {
					onChange(event.target.value);

					const search = event.target.value;

					const matchedSearchTag = search?.match(GET_TEXT_WITH_AT_CHAR);

					const tagName =
						!isEmpty(matchedSearchTag) && !isNull(matchedSearchTag)
							? matchedSearchTag?.map((item) => item?.replace("@", ""))
							: undefined;

					setAddedTags(tagName);
				}}
				onFocus={() => setIsFocused(true)}
				placeholder={placeholder}
				singleLine
				style={styles}
				value={searchText}
			>
				<Mention
					appendSpaceOnAdd
					data={userTagsData?.data
						?.map((item) => ({
							id: String(item?.id || ""),
							display: String(item?.name || ""),
						}))
						?.filter(
							(filterItem) =>
								!addedTags?.includes(String(filterItem?.display || "")),
						)}
					displayTransform={(_url, display) => `#${display}`}
					markup="#__display__"
					trigger="#"
				/>
			</MentionsInput>
			{isSearchLoading && !isEmpty(searchText) && (
				<div className="absolute top-1/2 right-2 -translate-y-1/2">
					<Spinner
						className="h-3 w-3 animate-spin"
						style={{ color: "var(--color-plain-reverse)" }}
					/>
				</div>
			)}
		</div>
	);
};

const styles = {
	input: {
		left: 27,
		top: 6.5,
		width: "80%",
	},
	control: {
		backgroundColor: "var(--color-gray-alpha-100)",

		fontSize: 14,
		fontWeight: 400,
		lineHeight: "16px",
		color: "var(--color-gray-600)",

		width: "100%",
		padding: "6px",
		// padding: "3px 10px 3px 28px",
		// padding: "2px 10px 2px 28px",
		// paddingTop: "6px",
		// paddingBottom: "6px",

		borderRadius: 11,
	},
	"&multiLine": {
		control: {},
		highlighter: {},
		input: {
			border: "unset",
			borderRadius: 8,
			padding: "inherit",
			outline: "unset",
		},
	},

	suggestions: {
		list: {
			backgroundColor: "var(--color-plain)",
			padding: "6px",
			boxShadow:
				"0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)",
			borderRadius: "12px",
			// border: "1px solid rgba(0,0,0,0.15)",
			// fontSize: 14,
		},
		item: {
			padding: "7px 8px",
			borderRadius: "8px",
			fontWeight: "450",
			fontSize: "13px",
			lineHeight: "15px",
			color: "var(--color-gray-550)",
			cursor: "pointer",
			transition: "plain-color 0.2s ease",

			// borderBottom: "1px solid rgba(0,0,0,0.15)",
			"&focused": {
				backgroundColor: "var(--color-gray-200)",
			},
		},
	},
};
