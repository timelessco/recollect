/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2RevalidateSupplement = {
  description:
    "Invalidates the Next.js ISR cache for the given page path. Called internally by `revalidation-helpers.ts` after public category mutations. Requires `REVALIDATE_SECRET_TOKEN` as bearer token (not a user JWT).",
  method: "post",
  path: "/v2/revalidate",
  requestExample: {
    path: "/public/john/my-category",
  },
  responseExample: {
    revalidated: true,
  },
  security: [{ [bearerAuth.name]: [] }],
  summary: "Trigger on-demand ISR revalidation for a page path",
  tags: ["Cron"],
} satisfies EndpointSupplement;
