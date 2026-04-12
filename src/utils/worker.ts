import * as Sentry from "@sentry/nextjs";
import axios from "axios";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AI_ENRICHMENT_API,
  getBaseUrl,
  instagramType,
  NEXT_API_URL,
  tweetType,
  WORKER_SCREENSHOT_API,
} from "./constants";

interface ProcessParameters {
  batchSize: number;
  queue_name: string;
}

const SLEEP_SECONDS = 30;

// max retries for a message
const MAX_RETRIES = 2;
export const processImageQueue = async (
  supabase: SupabaseClient,
  parameters: ProcessParameters,
) => {
  const { batchSize, queue_name } = parameters;

  try {
    const { data: messages, error: messageError } = await supabase
      .schema("pgmq_public")
      .rpc("read", {
        n: batchSize,
        queue_name,
        sleep_seconds: SLEEP_SECONDS,
      });

    if (messageError) {
      console.error("[process-image-queue] Error fetching messages from queue:", messageError);
      throw messageError;
    }

    if (!messages?.length) {
      console.log("[process-image-queue] No messages found in queue");
    }

    for (const message of messages ?? []) {
      try {
        const { id, url, user_id } = message.message;

        // this is the number of retries
        const { read_ct } = message;
        const isFinalRetry = message.message?.is_final_retry === true;

        // Final retry: delete from queue before processing (one-shot)
        // Whether the API succeeds or fails, the message is already gone
        if (isFinalRetry) {
          console.log(
            "[process-image-queue] Final retry — deleting from queue before processing:",
            { msg_id: message.msg_id, url },
          );

          const { error: deleteError } = await supabase
            .schema("pgmq_public")
            .rpc("delete", { message_id: message.msg_id, queue_name });

          if (deleteError) {
            console.error("[process-image-queue] Final-retry delete failed, skipping:", {
              deleteError,
              msg_id: message.msg_id,
              queue_name,
              url,
            });
            Sentry.captureException(new Error("Final-retry queue delete failed"), {
              extra: { msg_id: message.msg_id, queue_name, url },
              tags: {
                operation: "final_retry_delete_failed",
                userId: user_id,
              },
            });
            continue;
          }

          // Fall through to processing below
        }

        // Normal items: archive after max retries exhausted
        if (!isFinalRetry && read_ct > MAX_RETRIES) {
          const rawLastError: unknown = message.message?.last_error;
          const lastError = typeof rawLastError === "string" ? rawLastError : undefined;
          const archiveReason = lastError
            ? `max_retries_exceeded: ${lastError}`
            : "max_retries_exceeded";

          const targetApi = message.message.ogImage ? "ai_enrichment" : "screenshot";

          Sentry.captureException(
            new Error(`Queue processing failed after ${MAX_RETRIES} retries (${targetApi})`),
            {
              extra: {
                bookmarkId: id,
                lastError,
                msg_id: message.msg_id,
                queueName: queue_name,
                read_ct,
                url,
              },
              tags: {
                operation: `${targetApi}_archived`,
                userId: user_id,
              },
            },
          );

          console.log("[process-image-queue] archiving message from queue", message);

          const { error: archiveError } = await supabase.rpc("archive_with_reason", {
            p_msg_id: message.msg_id,
            p_queue_name: queue_name,
            p_reason: archiveReason,
          });

          if (archiveError) {
            console.error("[process-image-queue] Error archiving message from queue", archiveError);
            Sentry.captureException(new Error("Queue archive failed"), {
              extra: {
                archiveError,
                msg_id: message.msg_id,
              },
              tags: {
                operation: `${targetApi}_archive_failed`,
                userId: user_id,
              },
            });
          }

          continue;
        }

        const { ogImage } = message.message;

        const mediaType = message?.message?.meta_data?.mediaType;

        const isTwitterBookmark = message.message.type === tweetType;

        const isInstagramBookmark = message.message.type === instagramType;

        const isRaindropBookmark = message.message.meta_data.is_raindrop_bookmark;

        if (ogImage) {
          // here we upload the image into R2 if it is a raindrop bookmark
          // and generate ocr imagecaption and bulhash for both twitter and raindrop bookmarks,
          // we are not awaiting, because we fire this api and vercel will handle the response

          void axios.post(`${getBaseUrl()}${NEXT_API_URL}${AI_ENRICHMENT_API}`, {
            id,
            isInstagramBookmark,
            isRaindropBookmark,
            isTwitterBookmark,
            message,
            ogImage,
            queue_name,
            url,
            user_id,
          });
        } else {
          // here we take screenshot of the url for both twitter and raindrop bookmarks
          // we are not awaiting, because we fire this api and vercel will handle the response

          void axios.post(`${getBaseUrl()}${NEXT_API_URL}${WORKER_SCREENSHOT_API}`, {
            id,
            mediaType,
            message,
            queue_name,
            url,
            user_id,
          });
        }
      } catch (error) {
        console.error("[process-image-queue] Processing failed for message:", message, error);
      }
    }

    return { messageId: messages[0]?.msg_id };
  } catch (error) {
    console.error("[process-image-queue] Queue processing error:", error);
    throw error;
  }
};
