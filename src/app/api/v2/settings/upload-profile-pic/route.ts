import slugify from "slugify";

import { deleteProfilePic } from "@/app/api/v2/profiles/remove-profile-pic/delete-logic";
import { createRawPostHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiSuccess, apiWarn } from "@/lib/api-helpers/response";
import { requireAuth } from "@/lib/supabase/api";
import {
  FILE_NAME_PARSING_PATTERN,
  PROFILES,
  R2_MAIN_BUCKET_NAME,
  STORAGE_USER_PROFILE_PATH,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

import { UploadProfilePicInputSchema, UploadProfilePicOutputSchema } from "./schema";

const ROUTE = "v2-upload-profile-pic";

export const POST = createRawPostHandler({
  handler: async ({ request, route }) => {
    const auth = await requireAuth(route);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }
    const { supabase, user } = auth;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiWarn({ message: "Invalid multipart form data", route, status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiWarn({ message: "No file provided", route, status: 400 });
    }

    if (file.size === 0) {
      return apiWarn({ message: "Empty file", route, status: 400 });
    }

    // Direct binary — no base64 round-trip (v1 did arrayBuffer → base64 → decode → Uint8Array)
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    const parsedFileName = file.name
      ? slugify(file.name, { lower: true, remove: FILE_NAME_PARSING_PATTERN })
      : "";
    const fileName = parsedFileName || crypto.randomUUID().split("-")[0];
    const fileType = file.type || undefined;

    const key = `${STORAGE_USER_PROFILE_PATH}/${user.id}/${fileName}`;

    // Delete old profile pics BEFORE upload (same as v1).
    // deleteProfilePic removes ALL files in the user's profile-pic directory,
    // so it must run before the new file is uploaded — otherwise it would nuke
    // the newly uploaded file too.
    await deleteProfilePic({ userId: user.id });

    const { error: storageError } = await storageHelpers.uploadObject(
      R2_MAIN_BUCKET_NAME,
      key,
      fileBytes,
      fileType,
    );

    if (storageError !== null) {
      return apiError({
        error: storageError,
        message: "Failed to upload file to storage",
        operation: "upload_profile_pic_storage",
        route,
        userId: user.id,
      });
    }

    const { data: storageData } = storageHelpers.getPublicUrl(key);

    const { error: dbError } = await supabase
      .from(PROFILES)
      .update({ profile_pic: storageData.publicUrl })
      .match({ id: user.id });

    if (dbError !== null) {
      return apiError({
        error: dbError,
        message: "Failed to update profile picture URL",
        operation: "upload_profile_pic_db",
        route,
        userId: user.id,
      });
    }

    return apiSuccess({
      data: { success: true },
      route,
      schema: UploadProfilePicOutputSchema,
    });
  },
  inputSchema: UploadProfilePicInputSchema,
  outputSchema: UploadProfilePicOutputSchema,
  route: ROUTE,
});
