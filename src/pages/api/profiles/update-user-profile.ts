/** @deprecated Use v2 route at /api/v2/profiles/update-user-profile instead. Kept for mobile/extension consumers. */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";

import type {
  CategoriesData,
  NextApiRequest,
  UpdateUserProfileApiPayload,
} from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = CategoriesData[] | null;
type ErrorResponse = { message: string } | null | PostgrestError | string;

interface Data {
  data: DataResponse;
  error: ErrorResponse;
}

/**
 * Updates profile for a user
 */
export default async function handler(
  request: NextApiRequest<UpdateUserProfileApiPayload>,
  response: NextApiResponse<Data>,
): Promise<void> {
  try {
    // Validate request body
    if (!request.body?.updateData || isEmpty(request.body.updateData)) {
      console.error("[update-user-profile] Invalid request: Missing updateData", {
        body: request.body,
      });
      Sentry.captureException(
        new Error("[update-user-profile] Invalid request: Missing updateData"),
        { tags: { operation: "validate_request" } },
      );
      response.status(400).json({
        data: null,
        error: { message: "Invalid request: Missing profile data to update" },
      });
      return;
    }

    // Initialize Supabase client
    const supabase = apiSupabaseClient(request, response);

    // Get authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Check for auth errors and userId
    if (userError || !userId) {
      console.warn("[update-user-profile] User authentication failed:", {
        error: userError?.message,
      });
      response.status(401).json({
        data: null,
        error: {
          message: "Unauthorized: Please log in to update your profile",
        },
      });
      return;
    }

    // Update user profile
    const { data, error }: { data: DataResponse; error: ErrorResponse } = await supabase
      .from(PROFILES)
      .update(request.body.updateData)
      .match({ id: userId })
      .select();

    // Handle database error
    if (error) {
      console.error("[update-user-profile] Database error:", {
        error,
        operation: "update",
        table: PROFILES,
        userId,
      });
      Sentry.captureException(error, {
        tags: { operation: "update_profile", userId },
      });

      response.status(500).json({
        data: null,
        error: { message: "Failed to update profile" },
      });
      return;
    }

    // Check if update was successful (data should not be empty)
    if (isEmpty(data) || !data) {
      console.error("[update-user-profile] Update failed: No data returned after update", {
        updateData: request.body.updateData,
        userId,
      });
      Sentry.captureException(
        new Error("[update-user-profile] Update failed: No data returned after update"),
        { tags: { operation: "update_profile", userId } },
      );
      response.status(500).json({
        data: null,
        error: { message: "Profile update failed: No data returned" },
      });
      return;
    }

    // Success - return updated data
    response.status(200).json({ data, error: null });
  } catch (unexpectedError) {
    // Catch any unexpected errors
    console.error("[update-user-profile] Unexpected error:", unexpectedError, {
      body: request.body,
      method: request.method,
      url: request.url,
    });
    Sentry.captureException(unexpectedError, {
      tags: { operation: "update_profile" },
    });

    response.status(500).json({
      data: null,
      error: {
        message: "An unexpected error occurred while updating profile",
      },
    });
  }
}
