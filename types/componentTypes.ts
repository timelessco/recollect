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
