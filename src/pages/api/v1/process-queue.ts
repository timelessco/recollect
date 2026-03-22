import type { NextApiRequest, NextApiResponse } from "next";

import { createServiceClient } from "../../../utils/supabaseClient";
import { processImageQueue } from "../../../utils/worker";

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
