/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/settings/upload-profile-pic
 * This Pages Router route will be removed after all consumers are migrated.
 */
// oxlint-disable-next-line no-warning-comments -- pre-existing: needs priority fix for profile pic upload
// TODO: Fix this in priority

import { Readable } from "node:stream";

import type { NextApiRequest, NextApiResponse } from "next";

import { decode } from "base64-arraybuffer";
import { isEmpty, isNull } from "lodash";
import isNil from "lodash/isNil";
import uniqid from "uniqid";

import type { ProfilesTableTypes, UploadProfilePicApiResponse } from "../../../types/apiTypes";

import { PROFILES, R2_MAIN_BUCKET_NAME, STORAGE_USER_PROFILE_PATH } from "../../../utils/constants";
import { parseUploadFileName } from "../../../utils/helpers";
import { storageHelpers } from "../../../utils/storageClient";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// first we need to disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// deletes all current profile pic in the users profile pic bucket
export const deleteLogic = async (response: NextApiResponse, userId: ProfilesTableTypes["id"]) => {
  const { data: list, error: listError } = await storageHelpers.listObjects(
    R2_MAIN_BUCKET_NAME,
    `${STORAGE_USER_PROFILE_PATH}/${userId}/`,
  );

  if (!isNull(listError)) {
    response.status(500).json({
      error: (listError as Error)?.message,
      success: false,
    });
    throw new Error("ERROR: list error!!");
  }

  const filesToRemove = !isEmpty(list) && list ? list?.map((x) => `${x.Key}`) : [];

  if (!isNil(filesToRemove) && !isEmpty(filesToRemove)) {
    const { error: deleteError } = await storageHelpers.deleteObjects(
      R2_MAIN_BUCKET_NAME,
      filesToRemove,
    );

    if (!isNil(deleteError)) {
      response.status(500).json({
        error: (deleteError as Error)?.message,
        success: false,
      });
      throw new Error("ERROR: delete error");
    }
  }

  const { error: folderDeleteError } = await storageHelpers.deleteObjects(R2_MAIN_BUCKET_NAME, [
    `${STORAGE_USER_PROFILE_PATH}/${userId}/`,
  ]);

  if (!isNil(folderDeleteError)) {
    response.status(500).json({
      error: (folderDeleteError as Error)?.message,
      success: false,
    });
    throw new Error("ERROR: folder delete error");
  }
};

/**
 * Parses multipart form data from a Pages Router request using the Web Request API.
 * Converts the Node.js IncomingMessage stream to a Web Request to use native formData().
 */
function parseFormData(request: NextApiRequest) {
  const headers: [string, string][] = [];
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.push([name, item]);
      }
    } else {
      headers.push([name, value]);
    }
  }

  const webStream = Readable.toWeb(request) as ReadableStream<Uint8Array<ArrayBuffer>>;
  const webRequest = new Request("http://localhost", {
    body: webStream,
    // @ts-expect-error -- Node.js supports duplex but types don't expose it
    duplex: "half",
    headers,
    method: request.method,
  });

  return webRequest.formData();
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<UploadProfilePicApiResponse>,
) {
  const supabase = apiSupabaseClient(request, response);

  let formData: FormData;
  try {
    formData = await parseFormData(request);
  } catch {
    response.status(400).json({
      error: "Invalid or missing multipart form data",
      success: false,
    });
    return;
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    response.status(400).json({
      error: "No file provided",
      success: false,
    });
    return;
  }

  const authResult = await supabase?.auth?.getUser();
  const userId = authResult?.data?.user?.id;

  if (!userId) {
    response.status(401).json({ error: "Unauthorized", success: false });
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const contents = Buffer.from(arrayBuffer).toString("base64");

  const parsedFileName = file.name ? parseUploadFileName(file.name) : "";
  const fileName = parsedFileName || uniqid.time();
  const fileType = file.type || undefined;

  if (contents) {
    await deleteLogic(response, userId);
    const { error: storageError } = await storageHelpers.uploadObject(
      R2_MAIN_BUCKET_NAME,
      `${STORAGE_USER_PROFILE_PATH}/${userId}/${fileName}`,
      new Uint8Array(decode(contents)),
      fileType,
    );

    if (!isNil(storageError)) {
      response.status(500).json({
        error: (storageError as Error)?.message,
        success: false,
      });

      throw new Error("ERROR: storage error");
    }

    const { data: storageData, error: publicUrlError } = storageHelpers.getPublicUrl(
      `${STORAGE_USER_PROFILE_PATH}/${userId}/${fileName}`,
    );

    if (!isNil(publicUrlError)) {
      response.status(500).json({
        error: String(publicUrlError),
        success: false,
      });

      throw new Error("ERROR: public url error");
    }

    const { error: databaseError } = await supabase
      .from(PROFILES)
      .update({ profile_pic: storageData?.publicUrl })
      .match({ id: userId });

    if (!isNil(databaseError)) {
      response.status(500).json({
        error: databaseError,
        success: false,
      });

      throw new Error("ERROR: DB error");
    }

    response.status(200).json({
      error: null,
      success: true,
    });
  } else {
    response.status(500).json({
      error: "error in payload file data",
      success: false,
    });

    throw new Error("ERROR: payload error");
  }
}
