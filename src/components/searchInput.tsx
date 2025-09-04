import React, { useState } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { isEmpty, isNull } from "lodash";
import { Mention, MentionsInput } from "react-mentions";

import SearchInputSearchIcon from "../icons/searchInputSearchIcon";
import {
	useLoadersStore,
	useMiscellaneousStore,
} from "../store/componentStore";
import { type UserTagsData } from "../types/apiTypes";
import { GET_TEXT_WITH_AT_CHAR, USER_TAGS_KEY } from "../utils/constants";

import { SearchLoader } from "./search-loader";

const styles = {
	input: {
		left: 27,
		top: 6.5,
		width: "80%",
	},
	control: {
		backgroundColor: "rgba(0, 0, 0, 0.047)",

		fontSize: 14,
		fontWeight: 400,
		lineHeight: "16px",
		color: "#707070",

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
			// backgroundColor: "#FFFFFF",
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
			color: "#383838",

			// borderBottom: "1px solid rgba(0,0,0,0.15)",
			"&focused": {
				backgroundColor: "#EDEDED",
			},
		},
	},
};

type SearchInputTypes = {
	inputClassName?: string;
	onBlur: () => void;
	onChange: (value: string) => void;
	onEnterPress: (value: string) => void;
	placeholder: string;
	userId: string;
	wrapperClassName?: string;
};

const SearchInput = (props: SearchInputTypes) => {
	const {
		placeholder,
		onChange,
		userId,
		onBlur,
		wrapperClassName = "",
		inputClassName = "",
		onEnterPress = () => null,
	} = props;
	const [addedTags, setAddedTags] = useState<string[] | undefined>([]);

	const queryClient = useQueryClient();
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

	const searchText = useMiscellaneousStore((state) => state.searchText);
	const userTagsData = queryClient.getQueryData([USER_TAGS_KEY, userId]) as {
		data: UserTagsData[];
		error: PostgrestError;
	};

	const wrapperClassNameBuilder = classNames("search-wrapper relative", {
		[wrapperClassName]: true,
	});

	const inputClassNamesBuilder = classNames("search-bar", {
		[inputClassName]: true,
	});

	return (
		<div className={wrapperClassNameBuilder}>
			<figure className=" absolute left-[9px] top-[7px] ">
				<SearchInputSearchIcon size="14" />
			</figure>
			{/* // classname added to remove default focus-visible style */}
			<MentionsInput
				className={inputClassNamesBuilder}
				onBlur={onBlur}
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
				// onKeyUp={(e) => e.key === "Enter" && onEnterPress(e.target.value)}
				onKeyUp={(event) => {
					if (event.key === "Enter") {
						onEnterPress(searchText);
						// setSearchText("");
					}
				}}
				placeholder={placeholder}
				singleLine
				style={styles}
				value={searchText}
			>
				<Mention
					appendSpaceOnAdd
					data={userTagsData?.data
						?.map((item) => ({
							id: item?.id,
							display: item?.name,
						}))
						?.filter((filterItem) => !addedTags?.includes(filterItem?.display))}
					displayTransform={(_url, display) => `#${display}`}
					markup="@__display__"
					trigger="#"
				/>
			</MentionsInput>
			{isSearchLoading && !isEmpty(searchText) && (
				<div className="absolute right-2 top-1/2 -translate-y-1/2">
					<SearchLoader className="h-3 w-3 animate-spin" />
				</div>
			)}
			{/* <button
				className={aiButtonClassName}
				onClick={() => setAiButtonToggle(!aiButtonToggle)}
				type="button"
			>
				<ToolTip
					toolTipContent={`${
						aiButtonToggle ? "disable" : "enable"
					} vector search`}
				>
					<AiIcon selected={aiButtonToggle} />
				</ToolTip>
			</button> */}
		</div>
	);
};

export default SearchInput;
