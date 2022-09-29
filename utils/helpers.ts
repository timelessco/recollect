import { isEmpty } from 'lodash';
import find from 'lodash/find';
import { DeepRequired, FieldErrorsImpl } from 'react-hook-form';
import {
  SingleListData,
  UserTagsData,
  CategoriesData,
} from '../types/apiTypes';
import { UrlInput } from '../types/componentTypes';
import { GET_NAME_FROM_EMAIL_PATTERN, TRASH_URL } from './constants';

export const getTagAsPerId = (tagIg: number, tagsData: Array<UserTagsData>) => {
  return find(tagsData, (item) => {
    if (item?.id === tagIg) {
      return item;
    }
  }) as UserTagsData;
};

export const getCountInCategory = (
  id: number | string | null,
  allBookmarks: Array<SingleListData>
) => {
  return allBookmarks?.filter((item) => item?.category_id === id)
    ?.length as number;
};

export const getCategoryIdFromSlug = (
  slug: string | null,
  allCategories: CategoriesData[] | undefined
) => {
  if (slug === TRASH_URL) {
    return slug;
  } else {
    if (allCategories) {
      return find(allCategories, (item) => item?.category_slug === slug)?.id;
    }
  }
};

export const urlInputErrorText = (
  errors: FieldErrorsImpl<DeepRequired<UrlInput>>
) => {
  if (errors?.urlText?.type === 'pattern') {
    return 'Please enter valid URL';
  } else if (errors?.urlText?.type === 'required') {
    return 'Please enter URL';
  } else {
    return '';
  }
};

export const getUserNameFromEmail = (email: string) => {
  if (!isEmpty(email)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const userName = email
      ?.match(GET_NAME_FROM_EMAIL_PATTERN)[1]
      ?.replace('.', '-');

    return userName;
  }

  return null;
};
