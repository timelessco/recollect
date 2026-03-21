import { bearerAuth } from "@/lib/openapi/registry";
/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2RevalidateSupplement = {
  path: "/v2/revalidate",
  method: "post",
  tags: ["Cron"],
  summary: "Trigger on-demand ISR revalidation for a page path",
  description:
    "Invalidates the Next.js ISR cache for the given page path. Called internally by `revalidation-helpers.ts` after public category mutations. Requires `REVALIDATE_SECRET_TOKEN` as bearer token (not a user JWT).",
  security: [{ [bearerAuth.name]: [] }],
  requestExample: {
    path: "/public/john/my-category",
  },
  responseExample: {
    data: { revalidated: true },
    error: null,
  },
} satisfies EndpointSupplement;
