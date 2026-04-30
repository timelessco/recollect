import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

import { env } from "@/env/client";
import { api } from "@/lib/api-helpers/api-v2";

import {
  PDF_MIME_TYPE,
  STORAGE_FILES_PATH,
  V2_GET_PDF_BUFFER_API,
  V2_UPLOAD_FILE_REMAINING_DATA_API,
} from "./constants";
import { getStoragePublicBaseUrl, storageHelpers } from "./storageClient";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function generatePdfThumbnail(file: string): Promise<Blob | null> {
  const response = await api.get(V2_GET_PDF_BUFFER_API, {
    retry: 0,
    searchParams: { url: file },
  });

  const arrayBuffer = await response.arrayBuffer();

  try {
    const pdf = await pdfjsLib?.getDocument({
      data: arrayBuffer,
      disableAutoFetch: true,
    })?.promise;

    const page = await pdf?.getPage(1);
    const scale = 1.5;
    const viewport = page?.getViewport({ scale });

    const canvas = document?.createElement("canvas");
    canvas.width = viewport?.width;
    canvas.height = viewport?.height;
    const context = canvas?.getContext("2d");
    if (!context) {
      return null;
    }

    await page?.render({ canvasContext: context, viewport })?.promise;

    // eslint-disable-next-line promise/avoid-new -- wrapping callback-based canvas.toBlob API
    return await new Promise((resolve) => {
      canvas?.toBlob((blob) => {
        resolve(blob);
      }, "image/jpg");
    });
  } catch (error) {
    console.error("Thumbnail generation error", error);
    throw new Error("No thumbnail generated.", { cause: error });
  }
}

export const handlePdfThumbnailAndUpload = async ({
  fileId,
  fileUrl,
  sessionUserId,
}: {
  fileId: number;
  fileUrl: string;
  sessionUserId: string | undefined;
}): Promise<void> => {
  try {
    const thumbnailBlob = await generatePdfThumbnail(fileUrl);

    if (!thumbnailBlob) {
      console.warn("No thumbnail generated.");
      throw new Error("No thumbnail generated.");
    }

    const fileNameWithExtension = decodeURIComponent(
      fileUrl?.split("/").pop()?.split("?")[0]?.split("#")[0] ?? "",
    );

    const fileName = fileNameWithExtension?.replace(/\.pdf$/iu, "");
    const thumbnailFileName = `thumb-${fileName}.jpg`;

    const { data: thumbUploadUrl, error: thumbError } = await storageHelpers.createSignedUploadUrl(
      env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME,
      `${STORAGE_FILES_PATH}/${sessionUserId}/${thumbnailFileName}`,
    );

    if (!thumbUploadUrl?.signedUrl || thumbError) {
      console.error("Failed to get signed URL for thumbnail upload.");
      throw new Error("Failed to get signed URL for thumbnail upload.");
    }

    const uploadResponse = await fetch(thumbUploadUrl?.signedUrl, {
      body: thumbnailBlob,
      headers: {
        "Content-Type": "image/png",
      },
      method: "PUT",
    });

    if (!uploadResponse.ok) {
      const message = await uploadResponse.text();
      console.error("Thumbnail upload failed:", message);
      throw new Error(`Thumbnail upload failed: ${message}`);
    }

    const publicUrl = `${getStoragePublicBaseUrl()}/${STORAGE_FILES_PATH}/${sessionUserId}/${thumbnailFileName}`;

    try {
      await api
        .post(V2_UPLOAD_FILE_REMAINING_DATA_API, {
          json: {
            id: fileId,
            mediaType: PDF_MIME_TYPE,
            publicUrl,
          },
        })
        .json();
    } catch (error) {
      console.error("Error in uploading file remaining data");
      throw error;
    }
  } catch (error) {
    console.error("Error in handlePdfThumbnailAndUpload:", error);
    throw error;
  }
};
