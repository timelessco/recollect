import { type JSX, type ReactNode } from "react";
import { type FileWithPath } from "react-dropzone";

export type IconData = {
	icon: (iconColor: string, size?: string, className?: string) => JSX.Element;
	label: string;
};

export type UrlInput = {
	urlText: string;
};

export type ChildrenTypes =
	| JSX.Element
	| JSX.Element[]
	| ReactNode
	| string[]
	| string;

export type TagInputOption = {
	color?: string;
	isDisabled?: boolean;
	isFixed?: boolean;
	label: string;
	value: number | string;
};

// export type CategoryIdUrlTypes =
// 	| number
// 	| typeof EVERYTHING_URL
// 	| typeof TRASH_URL
// 	| typeof UNCATEGORIZED_URL
// 	| null;

// this type is for the category ids that we sent in the api urls
export type CategoryIdUrlTypes = number | string | null;

export type FileType = FileWithPath;
