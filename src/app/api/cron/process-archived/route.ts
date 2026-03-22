import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { apiError } from "@/lib/api-helpers/response";
import { SUPABASE_SERVICE_KEY } from "@/lib/supabase/constants";
import { createServiceClient } from "@/utils/supabaseClient";

const ROUTE = "cron/process-archived";

const RpcResultSchema = z.object({
  requested: z.int().optional(),
  requeued: z.int(),
});

const InputSchema = z.union([
  z.object({ retry_all: z.literal(true) }),
  z.object({ count: z.int().min(1).max(1000) }),
  z.object({ msg_ids: z.array(z.int()).min(1).max(100) }),
]);

async function handlePost(request: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_KEY) {
      console.error(`[${ROUTE}] SUPABASE_SERVICE_KEY is not configured`);
      return NextResponse.json(
        { data: null, error: "Server configuration error" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${SUPABASE_SERVICE_KEY}`) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { data: null, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      const [firstError] = parsed.error.issues;
      return NextResponse.json(
        { data: null, error: firstError?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const input = parsed.data;
    console.log(`[${ROUTE}] API called:`, { input });

    const supabase = createServiceClient();

    if ("retry_all" in input || "count" in input) {
      const count = "count" in input ? input.count : undefined;

      const { data, error } = await supabase.rpc(
        "admin_retry_ai_embeddings_archives",
        count !== undefined ? { p_count: count } : {},
      );

      if (error) {
        console.error(`[${ROUTE}] Error retrying archives:`, error);
        return apiError({
          error,
          message: "Failed to retry archived queue items",
          operation: "retry_archives_bulk",
          route: ROUTE,
        });
      }

      const rpcParsed = RpcResultSchema.safeParse(data);
      if (!rpcParsed.success) {
        console.error(`[${ROUTE}] Unexpected RPC response:`, data);
        return apiError({
          error: rpcParsed.error,
          message: "Unexpected response from retry operation",
          operation: "retry_archives_bulk_parse",
          route: ROUTE,
        });
      }

      return NextResponse.json({
        data: { requested: count ?? null, requeued: rpcParsed.data.requeued },
        error: null,
      });
    }

    const { data, error } = await supabase.rpc("retry_ai_embeddings_archive", {
      p_msg_ids: input.msg_ids,
    });

    if (error) {
      console.error(`[${ROUTE}] Error retrying archives:`, error);
      return apiError({
        error,
        message: "Failed to retry archived queue items",
        operation: "retry_archives",
        route: ROUTE,
      });
    }

    const rpcParsed = RpcResultSchema.safeParse(data);
    if (!rpcParsed.success) {
      console.error(`[${ROUTE}] Unexpected RPC response:`, data);
      return apiError({
        error: rpcParsed.error,
        message: "Unexpected response from retry operation",
        operation: "retry_archives_parse",
        route: ROUTE,
      });
    }

    return NextResponse.json({
      data: {
        requested: rpcParsed.data.requested ?? null,
        requeued: rpcParsed.data.requeued,
      },
      error: null,
    });
  } catch (error) {
    console.error(`[${ROUTE}] Unexpected error:`, error);
    Sentry.captureException(error, {
      tags: { operation: "cron_process_archived_unexpected" },
    });

    return NextResponse.json(
      { data: null, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

export const POST = handlePost;
