/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/profiles/update-username
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiResponse } from "next";

import { isEmpty } from "lodash";
import isNull from "lodash/isNull";
import slugify from "slugify";

import type {
  NextApiRequest,
  ProfilesTableTypes,
  UpdateUsernameApiPayload,
} from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse =
  | {
      user_name: ProfilesTableTypes["user_name"];
    }[]
  | null;
type ErrorResponse = { message: string } | null | PostgrestError | string;

interface Data {
  data: DataResponse;
  error: ErrorResponse;
}

/**
 * Updates username for a user
 */

export default async function handler(
  request: NextApiRequest<UpdateUsernameApiPayload>,
  response: NextApiResponse<Data>,
) {
  const supabase = apiSupabaseClient(request, response);

  const authResult = await supabase?.auth?.getUser();
  const userId = authResult?.data?.user?.id;

  const username = slugify(request?.body?.username ?? "", {
    lower: true,
    strict: true,
  });

  // check if username is already present
  const { data: checkData, error: checkError }: { data: DataResponse; error: ErrorResponse } =
    await supabase.from(PROFILES).select(`user_name`).eq("user_name", username);

  if (!isNull(checkError)) {
    response.status(500).json({
      data: null,
      error: checkError,
    });
    throw new Error("ERROR: check username DB error");
  }

  if (isEmpty(checkData)) {
    // user name is not there so we update
    const { data: updateData, error: updateError }: { data: DataResponse; error: ErrorResponse } =
      await supabase
        .from(PROFILES)
        .update({
          user_name: username,
        })
        .match({ id: userId })
        .select(`user_name`);

    if (!isNull(updateError)) {
      response.status(500).json({
        data: null,
        error: updateError,
      });
      throw new Error("ERROR: update username in db error");
    }

    response.status(200).json({
      data: updateData,
      error: null,
    });
  } else {
    // user name is already present in the DB
    response.status(500).json({
      data: null,
      error: "Username already exists, please try another username",
    });
  }
}
