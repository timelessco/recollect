import type { JSX, ReactNode } from "react";
import type { FileWithPath } from "react-dropzone";

export interface IconData {
  icon: (iconColor: string, size?: string, className?: string) => JSX.Element;
  label: string;
}

export interface UrlInput {
  urlText: string;
}

export type ChildrenTypes = JSX.Element | JSX.Element[] | ReactNode | string | string[];

export interface TagInputOption {
  color?: string;
  isDisabled?: boolean;
  isFixed?: boolean;
  label: string;
  value: number | string;
}

// export type CategoryIdUrlTypes =
// 	| number
// 	| typeof EVERYTHING_URL
// 	| typeof TRASH_URL
// 	| typeof UNCATEGORIZED_URL
// 	| null;

// this type is for the category ids that we sent in the api urls
export type CategoryIdUrlTypes = null | number | string;

export type FileType = FileWithPath;
