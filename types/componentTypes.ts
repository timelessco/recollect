import {
  ALL_BOOKMARKS_URL,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from '../utils/constants';

export interface UrlInput {
  urlText: string;
}

export type ChildrenTypes = JSX.Element | JSX.Element[] | string | string[];

export interface TagInputOption {
  value: string | number;
  label: string;
  color?: string;
  isFixed?: boolean;
  isDisabled?: boolean;
}

export interface SearchSelectOption {
  value: number | string;
  label: string;
}

export type CategoryIdUrlTypes =
  | number
  | typeof TRASH_URL
  | null
  | typeof UNCATEGORIZED_URL
  | typeof ALL_BOOKMARKS_URL;
