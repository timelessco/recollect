import { useEffect, useMemo, useState } from "react";
import { isEmpty } from "lodash";
import {
	Mention,
	MentionsInput,
	type MentionsInputProps,
} from "react-mentions";

import useFetchUserTags from "@/async/queryHooks/userTags/useFetchUserTags";
import Button from "@/components/atoms/button";
import { Spinner } from "@/components/spinner";
import useDebounce from "@/hooks/useDebounce";
import SearchInputSearchIcon from "@/icons/searchInputSearchIcon";
import { useLoadersStore, useMiscellaneousStore } from "@/store/componentStore";
import { type CategoriesData } from "@/types/apiTypes";
import { type CategoryIdUrlTypes } from "@/types/componentTypes";
import { extractTagNamesFromSearch } from "@/utils/helpers";

const SEARCH_DEBOUNCE_MS = 500;

type SearchBarProps = {
	showSearchBar: boolean;
	isDesktop: boolean;
	currentCategoryData: CategoriesData | undefined;
	currentPath: string | null;
	categoryId: CategoryIdUrlTypes;
	onShowSearchBar: (value: boolean) => void;
};

export function SearchBar(props: SearchBarProps) {
	const {
		showSearchBar,
		isDesktop,
		currentCategoryData,
		currentPath,
		categoryId,
		onShowSearchBar,
	} = props;

	const setSearchText = useMiscellaneousStore((state) => state.setSearchText);

	useEffect(() => {
		setSearchText("");
	}, [categoryId, setSearchText]);

	if (showSearchBar) {
		return (
			<div className="w-[246px] max-lg:my-[2px] max-lg:w-full">
				<SearchInput
					key={categoryId}
					onBlur={() => !isDesktop && onShowSearchBar(false)}
					placeholder={`Search in ${
						currentCategoryData?.category_name ?? currentPath
					}`}
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
	placeholder: string;
};

const SearchInput = (props: SearchInputTypes) => {
	const { placeholder, onBlur } = props;
	const [addedTags, setAddedTags] = useState<string[] | undefined>([]);
	const [isFocused, setIsFocused] = useState(false);
	const setSearchText = useMiscellaneousStore((state) => state.setSearchText);

	const [localValue, setLocalValue] = useState("");
	const debouncedValue = useDebounce(localValue, SEARCH_DEBOUNCE_MS);

	// Sync debounced value to store - API only fires after user stops typing for 500ms
	useEffect(() => {
		setSearchText(debouncedValue);
	}, [debouncedValue, setSearchText]);

	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
	const { userTags } = useFetchUserTags();
	const userTagsData = useMemo(() => userTags?.data ?? [], [userTags]);

	const filteredTagsData = useMemo(
		() =>
			userTagsData
				?.map((item) => ({
					id: String(item?.id || ""),
					display: String(item?.name || ""),
				}))
				?.filter(
					(filterItem) =>
						!addedTags?.includes(String(filterItem?.display || "")),
				),
		[userTagsData, addedTags],
	);

	const handleChange = (value: string) => {
		setLocalValue(value);
		setAddedTags(extractTagNamesFromSearch(value));
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
					handleChange(event.target.value);
				}}
				onFocus={() => setIsFocused(true)}
				placeholder={placeholder}
				singleLine
				style={styles}
				value={localValue}
			>
				<Mention
					appendSpaceOnAdd
					data={filteredTagsData}
					displayTransform={(_url, display) => `#${display}`}
					markup="#[__display__](__id__)"
					trigger="#"
				/>
			</MentionsInput>
			{isSearchLoading && !isEmpty(localValue) && (
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

const styles: MentionsInputProps["style"] = {
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
		color: "var(--color-gray-800)",

		width: "100%",
		padding: "6px",
		borderRadius: 11,
		height: 30,
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
		backgroundColor: "transparent",
		zIndex: 5,
		list: {
			marginTop: "20px",

			backgroundColor: "var(--color-plain)",
			padding: "4px",
			borderRadius: "12px",
			overflowY: "auto",
			maxHeight: "220px",
			maxWidth: "260px",
			boxShadow:
				"0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)",
		},
		item: {
			padding: "7px 8px",
			borderRadius: "8px",
			fontWeight: "450",
			fontSize: "13px",
			lineHeight: "15px",
			color: "var(--color-gray-800)",
			cursor: "pointer",
			transition: "plain-color 0.2s ease",

			"&focused": {
				backgroundColor: "var(--color-gray-200)",
			},
		},
	},
};
