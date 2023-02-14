import { isEmpty } from "lodash";
import find from "lodash/find";
import type { DeepRequired, FieldErrorsImpl } from "react-hook-form";

import type {
  CategoriesData,
  SingleListData,
  UserTagsData,
} from "../types/apiTypes";
import type { UrlInput } from "../types/componentTypes";

import {
  ALL_BOOKMARKS_URL,
  GET_NAME_FROM_EMAIL_PATTERN,
  INBOX_URL,
  SEARCH_URL,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from "./constants";

export const getTagAsPerId = (tagIg: number, tagsData: Array<UserTagsData>) => {
  return find(tagsData, item => {
    if (item?.id === tagIg) {
      return item;
    }
    return false;
  }) as UserTagsData;
};

export const getCountInCategory = (
  id: number | string | null,
  allBookmarks: Array<SingleListData>,
) => {
  return allBookmarks?.filter(item => item?.category_id === id)?.length;
};

export const getCategoryIdFromSlug = (
  slug: string | null,
  allCategories: CategoriesData[] | undefined,
) => {
  if (slug === TRASH_URL || slug === UNCATEGORIZED_URL) {
    return slug;
  }
  if (allCategories) {
    return find(allCategories, item => item?.category_slug === slug)?.id;
  }

  return undefined;
};

export const urlInputErrorText = (
  errors: FieldErrorsImpl<DeepRequired<UrlInput>>,
) => {
  if (errors?.urlText?.type === "pattern") {
    return "Please enter valid URL";
  }
  if (errors?.urlText?.type === "required") {
    return "Please enter URL";
  }
  return "";
};

export const getUserNameFromEmail = (email: string) => {
  if (!isEmpty(email)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const userName = email
      ?.match(GET_NAME_FROM_EMAIL_PATTERN)[1]
      ?.replace(".", "-");

    return userName;
  }

  return null;
};

export const getBaseUrl = (href: string) => {
  const url = new URL(href);
  const baseUrl = `${url.protocol}//${url.hostname}`;

  return baseUrl;
};

export const isUserInACategory = (url: string) => {
  const nonCategoryPages = [
    ALL_BOOKMARKS_URL,
    UNCATEGORIZED_URL,
    INBOX_URL,
    SEARCH_URL,
    TRASH_URL,
  ];

  return !nonCategoryPages?.includes(url);
};
