import find from 'lodash/find';
import { UserTagsData } from '../types/apiTypes';

export const getTagAsPerId = (tagIg: number, tagsData: Array<UserTagsData>) => {
  return find(tagsData, (item) => {
    if (item?.id === tagIg) {
      return item;
    }
  }) as UserTagsData;
};
