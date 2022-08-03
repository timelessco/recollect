import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import find from 'lodash/find';
import { UserTagsData, SingleListData } from '../../types/apiTypes';
import {
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
  TAG_TABLE_NAME,
} from '../../utils/constants';

// gets all bookmarks data mapped with the data related to other tables , like tags , catrgories etc...

type Data = {
  data?: Array<SingleListData>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const accessToken = req.query.access_token as string;
  const {} = supabase.auth.setAuth(accessToken);

  const { data } = await supabase.from(MAIN_TABLE_NAME).select();
  const { data: bookmarkTags } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .select();
  const { data: tagsData } = await supabase.from(TAG_TABLE_NAME).select();

  const getTagAsPerId = (tagIg: number) => {
    return find(tagsData, (item) => {
      if (item?.id === tagIg) {
        return item;
      }
    });
  };

  const finalData = data?.map((item) => {
    let addedTags = [] as Array<UserTagsData>;

    bookmarkTags?.forEach((bookmarkTagsItem) => {
      if (bookmarkTagsItem?.bookmark_id === item?.id) {
        addedTags = [...addedTags, getTagAsPerId(bookmarkTagsItem?.tag_id)];
      }
    });

    return {
      ...item,
      addedTags,
    };
  });

  res.status(200).json({ data: finalData });
}
