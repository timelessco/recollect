import { type FileWithPath } from "react-dropzone";

import { type CategoriesData } from "./apiTypes";

export type UrlInput = {
	urlText: string;
};

export type ChildrenTypes = JSX.Element | JSX.Element[] | string[] | string;

export type TagInputOption = {
	color?: string;
	isDisabled?: boolean;
	isFixed?: boolean;
	label: string;
	value: number | string;
};

export type SearchSelectOption = {
	label: string;
	value: number | string;
};

// export type CategoryIdUrlTypes =
// 	| number
// 	| typeof ALL_BOOKMARKS_URL
// 	| typeof TRASH_URL
// 	| typeof UNCATEGORIZED_URL
// 	| null;

// this type is for the category ids that we sent in the api urls
export type CategoryIdUrlTypes = number | string | null;

export type FileType = FileWithPath;

export type CategoryIconsDropdownTypes = {
	buttonIconSize: number;
	iconColor: CategoriesData["icon_color"];
	iconValue: string | null;
	onIconColorChange: (value: string, id?: CategoriesData["id"]) => void;
	onIconSelect: (value: string) => void;
};
