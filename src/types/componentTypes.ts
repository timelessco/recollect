import {
	type ALL_BOOKMARKS_URL,
	type TRASH_URL,
	type UNCATEGORIZED_URL,
} from "../utils/constants";

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

export type CategoryIdUrlTypes =
	| number
	| typeof ALL_BOOKMARKS_URL
	| typeof TRASH_URL
	| typeof UNCATEGORIZED_URL
	| null;

export type FileType = File;

export type CategoryIconsDropdownTypes = {
	buttonIconSize: number;
	iconColor: CategoriesData["icon_color"];
	iconValue: string | null;
	onIconColorChange: (value: string, id?: CategoriesData["id"]) => void;
	onIconSelect: (value: string) => void;
};
