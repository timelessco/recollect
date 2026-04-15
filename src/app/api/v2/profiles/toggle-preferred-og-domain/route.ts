import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { normalizeDomain } from "@/utils/domain";

import { TogglePreferredOgDomainInputSchema, TogglePreferredOgDomainOutputSchema } from "./schema";

const ROUTE = "v2-profiles-toggle-preferred-og-domain";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.raw_domain = data.domain;
      }

      const domain = normalizeDomain(data.domain);
      if (!domain) {
        throw new RecollectApiError("bad_request", {
          context: { raw_domain: data.domain },
          message: "Invalid domain",
          operation: "normalize_domain",
        });
      }

      if (ctx?.fields) {
        ctx.fields.normalized_domain = domain;
      }

      const { data: rows, error: rpcError } = await supabase.rpc("toggle_preferred_og_domain", {
        p_domain: domain,
      });

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to toggle preferred OG domain",
          operation: "rpc_toggle_preferred_og_domain",
        });
      }

      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row?.out_id) {
        throw new RecollectApiError("not_found", {
          message: "Profile not found for toggle",
          operation: "rpc_toggle_preferred_og_domain",
        });
      }

      const preferredOgDomains = row.out_preferred_og_domains ?? [];

      if (ctx?.fields) {
        ctx.fields.preferred_domain_count = preferredOgDomains.length;
        ctx.fields.toggled_in = preferredOgDomains.includes(domain);
      }

      return {
        id: row.out_id,
        preferred_og_domains: preferredOgDomains,
      };
    },
    inputSchema: TogglePreferredOgDomainInputSchema,
    outputSchema: TogglePreferredOgDomainOutputSchema,
    route: ROUTE,
  }),
);
