import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import { UserTagsData, SingleListData } from '../../types/apiTypes';
import {
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
  TAG_TABLE_NAME,
} from '../../utils/constants';
import { getTagAsPerId } from '../../utils/helpers';
import isNull from 'lodash/isNull';
import { PostgrestError } from '@supabase/supabase-js';

// gets all bookmarks data mapped with the data related to other tables , like tags , catrgories etc...

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const category_id = req.query.category_id;

  const accessToken = req.query.access_token as string;
  const {} = supabase.auth.setAuth(accessToken);

  let data;

  if (category_id === 'null') {
    const { data: bookmarkData } = await supabase
      .from(MAIN_TABLE_NAME)
      .select();
    data = bookmarkData;
  } else {
    const { data: bookmarkData } = await supabase
      .from(MAIN_TABLE_NAME)
      .select()
      .eq('category_id', category_id);

    data = bookmarkData;
  }

  const { data: bookmarkTags } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .select();
  const { data: tagsData, error } = await supabase
    .from(TAG_TABLE_NAME)
    .select();

  if (!isNull(tagsData)) {
    const finalData = data?.map((item) => {
      let addedTags = [] as Array<UserTagsData>;

      bookmarkTags?.forEach((bookmarkTagsItem) => {
        if (bookmarkTagsItem?.bookmark_id === item?.id) {
          addedTags = [
            ...addedTags,
            {
              ...getTagAsPerId(bookmarkTagsItem?.tag_id, tagsData),
              bookmark_tag_id: bookmarkTagsItem?.id,
            },
          ];
        }
      });

      return {
        ...item,
        addedTags,
      };
    }) as Array<SingleListData>;

    res.status(200).json({ data: finalData, error });
  } else {
    res.status(500).json({ data, error });
  }
}
