import { createClient, type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import jwt from "jsonwebtoken";
import { isNull } from "lodash";
import type { NextApiResponse } from "next";

import type {
  AddBookmarkScreenshotPayloadTypes,
  NextAPIReq,
  SingleListData,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME, SCREENSHOT_API } from "../../../utils/constants";

type Data = {
  data: SingleListData[] | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextAPIReq<AddBookmarkScreenshotPayloadTypes>,
  res: NextApiResponse<Data>,
) {
  jwt.verify(
    req.body.access_token,
    process.env.SUPABASE_JWT_SECRET_KEY,
    function (err) {
      if (err) {
        res.status(500).json({ data: null, error: err });
        throw new Error("ERROR");
      }
    },
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const upload = async (base64data: string) => {
    const imgName = `img${Math.random()}.jpg`;

    await supabase.storage
      .from("bookmarks")
      .upload(`public/${imgName}`, decode(base64data), {
        contentType: "image/jpg",
      });

    const { data } = supabase.storage
      .from("bookmarks")
      .getPublicUrl(`public/${imgName}`);

    return data?.publicUrl;
  };

  // screen shot api call
  const screenShotRes = await axios.get<
    | WithImplicitCoercion<string>
    | { [Symbol.toPrimitive](hint: "string"): string }
  >(`${SCREENSHOT_API}${req.body.url}`, {
    responseType: "arraybuffer",
  });

  const base64data = Buffer.from(screenShotRes.data, "binary").toString(
    "base64",
  );

  const publicURL = await upload(base64data);

  const {
    data,
    error,
  }: {
    data: SingleListData[] | null;
    error: PostgrestError | null | string | jwt.VerifyErrors;
  } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({ ogImage: publicURL })
    .match({ id: req.body.id })
    .select();

  if (isNull(error)) {
    res.status(200).json({ data, error: null });
  } else {
    res.status(500).json({ data: null, error });
    throw new Error("ERROR");
  }
}
