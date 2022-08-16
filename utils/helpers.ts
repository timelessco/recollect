import find from 'lodash/find';
import { SingleListData, UserTagsData, CategoriesData } from '../types/apiTypes';

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
  if (allCategories) {
    return find(allCategories, (item) => item?.category_slug === slug)?.id;
  }
};