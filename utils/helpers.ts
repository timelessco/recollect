import find from 'lodash/find';
import { SingleListData, UserTagsData } from '../types/apiTypes';

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
