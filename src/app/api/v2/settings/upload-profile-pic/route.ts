import { NextResponse } from "next/server";

import slugify from "slugify";

import { deleteProfilePic } from "@/app/api/v2/profiles/remove-profile-pic/delete-logic";
import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createApiClient, getApiUser } from "@/lib/supabase/api";
import {
  FILE_NAME_PARSING_PATTERN,
  PROFILES,
  R2_MAIN_BUCKET_NAME,
  STORAGE_USER_PROFILE_PATH,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

import { UploadProfilePicInputSchema, UploadProfilePicOutputSchema } from "./schema";

const ROUTE = "v2-upload-profile-pic";

export const POST = createAxiomRouteHandler(
  withRawBody({
    auth: "required",
    handler: async ({ request }) => {
      // Inline auth — withRawBody doesn't enforce auth
      const { supabase, token } = await createApiClient();
      const {
        data: { user },
        error: userError,
      } = await getApiUser(supabase, token);

      if (userError || !user) {
        throw new RecollectApiError("unauthorized", {
          message: userError?.message ?? "Not authenticated",
        });
      }

      const ctx = getServerContext();
      if (ctx) {
        ctx.user_id = user.id;
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (error) {
        throw new RecollectApiError("bad_request", {
          cause: error,
          message: "Invalid multipart form data",
        });
      }

      const file = formData.get("file");
      if (!(file instanceof File)) {
        throw new RecollectApiError("bad_request", {
          message: "No file provided",
        });
      }

      if (file.size === 0) {
        throw new RecollectApiError("bad_request", {
          message: "Empty file",
        });
      }

      if (ctx?.fields) {
        ctx.fields.file_name = file.name;
        ctx.fields.file_size = file.size;
        ctx.fields.file_type = file.type;
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
        throw new RecollectApiError("service_unavailable", {
          cause: storageError,
          message: "Failed to upload file to storage",
          operation: "upload_profile_pic_storage",
        });
      }

      const { data: storageData } = storageHelpers.getPublicUrl(key);

      const { error: dbError } = await supabase
        .from(PROFILES)
        .update({ profile_pic: storageData.publicUrl })
        .match({ id: user.id });

      if (dbError !== null) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to update profile picture URL",
          operation: "upload_profile_pic_db",
        });
      }

      // AFTER operation — outcome
      if (ctx?.fields) {
        ctx.fields.profile_pic_uploaded = true;
      }

      return NextResponse.json({ success: true });
    },
    inputSchema: UploadProfilePicInputSchema,
    outputSchema: UploadProfilePicOutputSchema,
    route: ROUTE,
  }),
);
