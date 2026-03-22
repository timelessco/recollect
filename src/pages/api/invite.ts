// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import { decode } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import type { PostgrestError } from "@supabase/supabase-js";

import { EVERYTHING_URL, SHARED_CATEGORIES_TABLE_NAME } from "../../utils/constants";
import { createServiceClient } from "../../utils/supabaseClient";

/**
 * Adds user as colaborator in DB
 */

// NOTE: check https://app.asana.com/0/1202643527638612/1205842037172641 for this apis short comings

interface Data {
  error: null | PostgrestError | string;
  success: null | string;
}

interface InviteTokenData {
  category_id: number;
  edit_access: boolean;
  email: string;
  userId: string;
}

export default async function handler(request: NextApiRequest, response: NextApiResponse<Data>) {
  // using service client as this api should work irrespective of user auth
  const supabase = createServiceClient();

  if (request?.query?.token) {
    const decoded = decode(request?.query?.token as string);

    if (!decoded || typeof decoded === "string") {
      response.status(400).json({
        error: "Invalid invite token",
        success: null,
      });
      return;
    }

    const tokenData = decoded as InviteTokenData;

    const insertData = {
      category_id: tokenData.category_id,
      email: tokenData.email,
      // edit_access: tokenData?.edit_access,
      // userId: tokenData?.userId,
    };

    // check if user with category Id is already there in DB
    const { data, error } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .select("*")
      .eq("category_id", insertData?.category_id)
      .eq("email", insertData?.email);

    // if data is empty then the user invite was deleted
    if (isEmpty(data) && isNull(error)) {
      response.status(500).json({
        error: `This user invite has been deleted , error: ${
          isNull(error) ? "db error null" : error
        }`,
        success: null,
      });
      Sentry.captureException(
        `This user invite has been deleted , error: ${isNull(error) ? "db error null" : error}`,
      );
      return;
    }

    // the data will be present as it will be added with is_accept_pending true when invite is sent
    if (!isNull(data) && data[0]?.is_accept_pending === true) {
      // const { error: catError } = await supabase
      //   .from(SHARED_CATEGORIES_TABLE_NAME)
      //   .insert({
      //     category_id: insertData?.category_id,
      //     email: insertData?.email,
      //     edit_access: false,
      //     user_id: insertData?.userId,
      //   })
      //   .select();

      const { error: catError } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .update({
          is_accept_pending: false,
        })
        .eq("email", insertData?.email)
        .eq("category_id", insertData?.category_id);

      if (isNull(catError)) {
        // User has been added as a colaborator to the category
        response?.redirect(`/${EVERYTHING_URL}`);
      } else if (catError?.code === "23503") {
        // if collab user does not have an existing account
        response.status(500).json({
          error: `You do not have an existing account , please create one and visit this invite lint again ! error : ${catError?.message}`,
          success: null,
        });
      } else {
        response.status(500).json({
          error: catError?.message,
          success: null,
        });
        Sentry.captureException(`Min bookmark data is empty`);
      }
    } else {
      response.status(500).json({
        error: isNull(error) ? "The user is already a colaborator of this category" : error,
        success: null,
      });
      Sentry.captureException(
        isNull(error) ? "The user is already a colaborator of this category" : error,
      );
    }
  }
}
