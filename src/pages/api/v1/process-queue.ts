import type { NextApiRequest, NextApiResponse } from "next";

import type { BackgroundTask } from "../../../utils/worker";

import { createServiceClient } from "../../../utils/supabaseClient";
import { processImageQueue } from "../../../utils/worker";

// Pages Router has no after() — background fetches dispatched here still get
// orphaned on Vercel Fluid Compute once the handler's response returns. The
// try/catch inside dispatchBackgroundTask suppresses the unhandled-rejection
// noise this used to produce in Sentry (undici "fetch failed"), but does not
// fix the underlying orphaning. The v2 route at src/app/api/v2/process-queue
// uses after() and is the correct home; point the pg_cron schedule there and
// retire this file.
const dispatchBackgroundTask = async (task: BackgroundTask, messageId: number | undefined) => {
  try {
    await fetch(task.url, {
      body: task.body,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch (error) {
    console.error(
      "[v1-process-queue] background dispatch failed",
      { msg_id: messageId, url: task.url },
      error,
    );
  }
};

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const supabase = createServiceClient();

  try {
    const result = await processImageQueue(supabase, {
      batchSize: 1,
      queue_name: "ai-embeddings",
    });

    for (const task of result.backgroundTasks) {
      void dispatchBackgroundTask(task, result.messageId);
    }

    console.log(
      !result?.messageId
        ? "queue is empty or all the queue items are processed"
        : `Queue Id: ${result?.messageId} processed successfully`,
    );

    response.status(200).json({
      message: `Queue processed successfully`,
      success: true,
    });
  } catch {
    response.status(500).json({ error: "Error processing queue", success: false });
  }
}
