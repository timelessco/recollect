import { useMutation, useQueryClient } from "@tanstack/react-query";
import isNull from "lodash/isNull";

import type { PaginatedBookmarks, UploadFileApiPayload } from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { recentlyAddedUrls } from "../../../pageComponents/dashboard/cardSection/animatedBookmarkImage";
import { useSupabaseSession } from "../../../store/componentStore";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  bookmarkType,
  DOCUMENT_MIME_TYPES,
  DOCUMENTS_URL,
  IMAGE_MIME_PREFIX,
  IMAGES_URL,
  LINKS_URL,
  PDF_MIME_TYPE,
  R2_MAIN_BUCKET_NAME,
  STORAGE_FILES_PATH,
  TWEETS_URL,
  tweetType,
  VIDEO_MIME_PREFIX,
  VIDEOS_URL,
} from "../../../utils/constants";
import { handlePdfThumbnailAndUpload } from "../../../utils/file-upload";
import {
  fileTypeIdentifier,
  generateVideoThumbnail,
  parseUploadFileName,
} from "../../../utils/helpers";
import { getStoragePublicBaseUrl, storageHelpers } from "../../../utils/storageClient";
import { createClient } from "../../../utils/supabaseClient";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { uploadFile } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useFileUploadOptimisticMutation() {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { sortBy } = useGetSortBy();

  const fileUploadOptimisticMutation = useMutation({
    mutationFn: async (data: UploadFileApiPayload) => {
      // For videos, generate thumbnail if not provided
      let { thumbnailPath } = data;
      // please verify if this file type is available for mobile devices
      const isVideo = data?.file?.type?.includes("video");

      if (isVideo && !thumbnailPath) {
        try {
          const thumbnailBase64 = (await generateVideoThumbnail(data?.file)) as string;

          if (thumbnailBase64) {
            const uploadFileNamePath = data?.uploadFileNamePath;
            const thumbnailFileName = `thumbnail-${uploadFileNamePath}.jpg`;
            const supabase = createClient();
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;

            if (userId) {
              const { data: uploadTokenData, error } = await storageHelpers.createSignedUploadUrl(
                R2_MAIN_BUCKET_NAME,
                `${STORAGE_FILES_PATH}/${userId}/${thumbnailFileName}`,
              );

              if (uploadTokenData?.signedUrl && !error) {
                try {
                  const base64Data = thumbnailBase64?.split(",")?.[1];
                  if (base64Data) {
                    const buffer = Buffer.from(base64Data, "base64");
                    const uploadResponse = await fetch(uploadTokenData.signedUrl, {
                      body: buffer.buffer as BodyInit,
                      headers: {
                        "Content-Type": "image/jpg",
                      },
                      method: "PUT",
                    });

                    if (uploadResponse.ok) {
                      thumbnailPath = `${STORAGE_FILES_PATH}/${userId}/${thumbnailFileName}`;
                    }
                  }
                } catch (uploadError) {
                  console.error("Thumbnail upload error:", uploadError);
                }
              }
            }
          }
        } catch (error) {
          console.error("Error generating video thumbnail:", error);
        }
      }

      // Call the original uploadFile with the updated thumbnail path
      return uploadFile({
        ...data,
        thumbnailPath,
      });
    },
    onMutate: async (data: UploadFileApiPayload) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        BOOKMARKS_KEY,
        session?.user?.id,
        CATEGORY_ID,
        sortBy,
      ]);

      const fileName = parseUploadFileName(data?.file?.name);
      const tempId = -(Date.now() + Math.random());
      const uploadFileNamePath = data?.uploadFileNamePath;

      // Pre-generate storage URL — matches what the server will return
      const preGeneratedUrl = `${getStoragePublicBaseUrl()}/${STORAGE_FILES_PATH}/${session?.user?.id}/${uploadFileNamePath}`;

      // Optimistically update to the new value immediately
      // This shows the bookmark right away, even for videos
      queryClient.setQueryData<PaginatedBookmarks>(
        [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
        (old) => {
          if (typeof old === "object") {
            return {
              ...old,
              pages: old?.pages?.map((page, index) => {
                if (index === 0) {
                  return [
                    {
                      id: tempId,
                      title: fileName,
                      url: preGeneratedUrl,
                      type: data?.file?.type,
                      inserted_at: new Date(),
                    },
                    ...page,
                  ];
                }

                return page;
              }),
            } as PaginatedBookmarks;
          }
        },
      );

      // Mark URL for animation — BookmarkImageWithAnimation consumes this
      // via recentlyAddedUrls.delete() on its first render.
      recentlyAddedUrls.add(preGeneratedUrl);

      // Generate presigned URL for secure client-side upload
      const storagePath = `${STORAGE_FILES_PATH}/${session?.user?.id}/${uploadFileNamePath}`;

      const { data: uploadTokenData, error } = await storageHelpers.createSignedUploadUrl(
        R2_MAIN_BUCKET_NAME,
        storagePath,
      );

      // Upload file using presigned URL
      const errorCondition = isNull(error);

      if (uploadTokenData?.signedUrl && errorCondition) {
        try {
          const uploadResponse = await fetch(uploadTokenData.signedUrl, {
            method: "PUT",
            body: data?.file,
            headers: {
              "Content-Type": data?.file?.type || "application/octet-stream",
            },
          });

          if (!uploadResponse.ok) {
            const errorMessage = `Upload failed with status: ${uploadResponse.status}`;
            errorToast(errorMessage);
          }
        } catch {
          errorToast("Upload failed");
        }
      }

      if (!errorCondition) {
        errorToast("Failed to create upload URL");
      }

      // Return a context object with the snapshotted value
      return { previousData, preGeneratedUrl, tempId };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
          context.previousData,
        );
      }
      // Clean up animation tracking on failure
      if (context?.preGeneratedUrl) {
        recentlyAddedUrls.delete(context.preGeneratedUrl);
      }
    },
    // Always refetch after error or success:
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });
    },
    onSuccess: async (apiResponse, data, context) => {
      const uploadedDataType = data?.file?.type;

      const apiResponseTyped = apiResponse as {
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
        data: any;
        success: boolean;
      };

      if (apiResponseTyped?.success) {
        const realId = apiResponseTyped?.data?.[0]?.id as number | undefined;

        if (realId && context?.tempId && context?.preGeneratedUrl) {
          // Re-add URL for animation continuity across key change (temp → real id).
          // The remounted component consumes this via recentlyAddedUrls.delete().
          recentlyAddedUrls.add(context.preGeneratedUrl);

          // Replace temp ID with real server ID in a single synchronous
          // cache update — avoids the async refetch gap that causes flicker.
          queryClient.setQueryData<PaginatedBookmarks>(
            [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
            (old) => {
              if (!old) {
                return old;
              }
              return {
                ...old,
                pages: old.pages.map((page) =>
                  page.map((bookmark) => {
                    if (bookmark.id === context.tempId) {
                      return { ...bookmark, id: realId };
                    }
                    return bookmark;
                  }),
                ),
              } as PaginatedBookmarks;
            },
          );
        }
        const fileTypeName = fileTypeIdentifier(uploadedDataType);

        /* If the user uploads to a type page (links, videos) and the uploaded type is not of the page eg: user
					is uploading images in videos page then this logic fires and it tells where the item has been uploaded.
					Eg: If user uploads images in documents page then the user will get a toast message
				telling "Added to documents page"  */

        if (data?.file?.type === PDF_MIME_TYPE) {
          try {
            successToast(`generating  thumbnail`);
            await handlePdfThumbnailAndUpload({
              fileId: apiResponseTyped?.data[0].id,
              fileUrl: `${getStoragePublicBaseUrl()}/${STORAGE_FILES_PATH}/${session?.user?.id}/${data?.uploadFileNamePath}`,
              sessionUserId: session?.user?.id,
            });
          } catch {
            errorToast("Failed to generate thumbnail");
          }
        }

        if (CATEGORY_ID === IMAGES_URL && !uploadedDataType?.startsWith(IMAGE_MIME_PREFIX)) {
          successToast(`Added to ${fileTypeName}`);
        }

        if (CATEGORY_ID === VIDEOS_URL && !uploadedDataType?.startsWith(VIDEO_MIME_PREFIX)) {
          successToast(`Added to ${fileTypeName}`);
        }

        if (
          CATEGORY_ID === DOCUMENTS_URL &&
          !(DOCUMENT_MIME_TYPES as readonly string[]).includes(uploadedDataType ?? "")
        ) {
          successToast(`Added to ${fileTypeName}`);
        }

        if (CATEGORY_ID === TWEETS_URL && uploadedDataType !== tweetType) {
          successToast(`Added to ${fileTypeName}`);
        }

        if (CATEGORY_ID === LINKS_URL && uploadedDataType !== bookmarkType) {
          successToast(`Added to ${fileTypeName}`);
        }
      }
    },
  });

  return { fileUploadOptimisticMutation };
}
