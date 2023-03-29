import {
	type ALL_BOOKMARKS_URL,
	type TRASH_URL,
	type UNCATEGORIZED_URL,
} from "../utils/constants";

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
