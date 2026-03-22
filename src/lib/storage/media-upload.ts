import * as Sentry from "@sentry/nextjs";
import { decode } from "base64-arraybuffer";
import uniqid from "uniqid";

import {
  R2_MAIN_BUCKET_NAME,
  STORAGE_SCREENSHOT_IMAGES_PATH,
  STORAGE_SCREENSHOT_VIDEOS_PATH,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

type MediaUploadKind = "image" | "video";

interface UploadMediaOptions {
  contentType: string;
  data: Uint8Array;
  kind: MediaUploadKind;
  uploadUserId: string;
}

const uploadMedia = async ({
  contentType,
  data,
  kind,
  uploadUserId,
}: UploadMediaOptions): Promise<null | string> => {
  const fileName = kind === "image" ? `img-${uniqid?.time()}.jpg` : `video-${uniqid?.time()}.mp4`;

  const basePath =
    kind === "image" ? STORAGE_SCREENSHOT_IMAGES_PATH : STORAGE_SCREENSHOT_VIDEOS_PATH;

  const storagePath = `${basePath}/${uploadUserId}/${fileName}`;

  const { error: uploadError } = await storageHelpers.uploadObject(
    R2_MAIN_BUCKET_NAME,
    storagePath,
    data,
    contentType,
  );

  if (uploadError) {
    const operation = kind === "image" ? "storage_upload" : "video_storage_upload";

    console.error("Media storage upload failed:", {
      error: uploadError,
      kind,
      operation,
    });

    Sentry.captureException(uploadError, {
      extra: {
        kind,
        storagePath,
      },
      tags: {
        operation,
        userId: uploadUserId,
      },
    });
    return null;
  }

  const { data: storageData } = storageHelpers.getPublicUrl(storagePath);

  return storageData?.publicUrl || null;
};

export const upload = (base64info: string, uploadUserId: string): Promise<null | string> =>
  uploadMedia({
    contentType: "image/jpg",
    data: new Uint8Array(decode(base64info)),
    kind: "image",
    uploadUserId,
  });

export const uploadVideo = (
  videoBuffer: ArrayBuffer,
  uploadUserId: string,
  contentType: string,
): Promise<null | string> =>
  uploadMedia({
    contentType,
    data: new Uint8Array(videoBuffer),
    kind: "video",
    uploadUserId,
  });
