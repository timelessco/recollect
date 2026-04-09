// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from "next";

import isNull from "lodash/isNull";

import type { UserProfilePicTypes } from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";
import { deleteLogic } from "../settings/upload-profile-pic";

// removes user profile pic

type DataResponse = null | UserProfilePicTypes[];
type ErrorResponse = null | PostgrestError | string | VerifyErrors;

interface Data {
  data: DataResponse;
  error: ErrorResponse;
}

export default async function handler(request: NextApiRequest, response: NextApiResponse<Data>) {
  const supabase = apiSupabaseClient(request, response);
  const authResult = await supabase?.auth?.getUser();
  const userId = authResult?.data?.user?.id;

  if (userId) {
    // remove from DB
    const { data: removeData, error: removeError } = await supabase
      .from(PROFILES)
      .update({
        profile_pic: null,
      })
      .match({ id: userId })
      .select(`profile_pic`);

    if (!isNull(removeError)) {
      response.status(500).json({ data: null, error: removeError });
      throw new Error("ERROR: remove error");
    }

    // remove from bucket

    await deleteLogic(response, userId);

    response.status(200).json({ data: removeData, error: null });
  } else {
    response.status(500).json({ data: null, error: "User id is missing" });
    throw new Error("ERROR: User id is missing");
  }
}
