import type { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { normalizeDomain } from "@/utils/domain";
import { HttpStatus } from "@/utils/error-utils/common";

import {
  TogglePreferredOgDomainPayloadSchema,
  TogglePreferredOgDomainResponseSchema,
} from "./schema";

const ROUTE = "toggle-preferred-og-domain";

export type TogglePreferredOgDomainPayload = z.infer<typeof TogglePreferredOgDomainPayloadSchema>;

export type TogglePreferredOgDomainResponse = z.infer<typeof TogglePreferredOgDomainResponseSchema>;

/**
 * @deprecated Use /api/v2/profiles/toggle-preferred-og-domain instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { domain: rawDomain } = data;

    const domain = normalizeDomain(rawDomain);
    if (!domain) {
      return apiWarn({
        context: { rawDomain },
        message: "Invalid domain",
        route,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const { data: rows, error: rpcError } = await supabase.rpc("toggle_preferred_og_domain", {
      p_domain: domain,
    });

    if (rpcError) {
      return apiError({
        error: rpcError,
        extra: { domain },
        message: "Failed to toggle preferred OG domain",
        operation: "rpc_toggle_preferred_og_domain",
        route,
        userId: user.id,
      });
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.out_id) {
      const err = new Error("RPC returned no profile");
      return apiError({
        error: err,
        extra: { domain },
        message: "RPC returned no profile",
        operation: "rpc_toggle_preferred_og_domain",
        route,
        userId: user.id,
      });
    }

    return {
      id: row.out_id,
      preferred_og_domains: row.out_preferred_og_domains,
    };
  },
  inputSchema: TogglePreferredOgDomainPayloadSchema,
  outputSchema: TogglePreferredOgDomainResponseSchema,
  route: ROUTE,
});
