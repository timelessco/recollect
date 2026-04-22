import { Webhooks } from "@polar-sh/nextjs";

import { createServerServiceClient } from "@/lib/supabase/service";

const PRODUCT_TO_PLAN: Record<string, "pro" | "plus"> = {
  [process.env.POLAR_PRO_PRODUCT_ID ?? ""]: "pro",
  [process.env.POLAR_PLUS_PRODUCT_ID ?? ""]: "plus",
};

function resolvePlan(productId: string, status: string): "free" | "pro" | "plus" {
  const plan = PRODUCT_TO_PLAN[productId];
  if (!plan) {
    return "free";
  }

  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled"
  ) {
    return plan;
  }

  return "free";
}

// Polar webhook payloads arrive with snake_case keys at runtime despite the SDK
// types using camelCase, so we read via a permissive index type. Disables are
// scoped to this function; the payload shape is external and untyped at runtime.
interface WebhookPayload {
  data: Record<string, unknown> & {
    customer?: Record<string, unknown>;
  };
}

// Syncs all subscription columns to the profiles table.
// Uses a temporal guard (plan_updated_at) to prevent out-of-order
// webhook events from overwriting newer state.
/* oxlint-disable typescript-eslint/no-unsafe-type-assertion */
async function syncSubscription(payload: WebhookPayload) {
  const { data } = payload;
  const customer = data.customer ?? {};
  // Runtime payload uses snake_case: external_id, product_id, etc.
  const externalId = (customer.external_id ?? customer.externalId) as string | null | undefined;
  if (!externalId) {
    return;
  }

  // Use Polar's event timestamp for the temporal guard so that
  // concurrent webhooks (e.g. canceled + revoked) are ordered correctly.
  const eventTimestamp = (data.modified_at ?? data.modifiedAt ?? new Date().toISOString()) as
    | string
    | number
    | Date;
  const now = new Date(eventTimestamp).toISOString();
  const productId = (data.product_id ?? data.productId ?? "") as string;
  const endedAt = data.ended_at ?? data.endedAt ?? null;
  const status = (data.status ?? "") as string;
  const plan = endedAt ? "free" : resolvePlan(productId, status);
  const rawPeriodEnd = (data.current_period_end ?? data.currentPeriodEnd ?? null) as
    | string
    | number
    | Date
    | null;
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd).toISOString() : null;

  const supabase = createServerServiceClient();

  await supabase
    .from("profiles")
    .update({
      plan,
      subscription_status: status,
      subscription_current_period_end: periodEnd,
      polar_customer_id: (customer.id ?? null) as string | null,
      plan_updated_at: now,
    })
    .eq("id", externalId)
    .or(`plan_updated_at.is.null,plan_updated_at.lte.${now}`);
}
/* oxlint-enable typescript-eslint/no-unsafe-type-assertion */

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
  onSubscriptionCreated: syncSubscription,
  onSubscriptionActive: syncSubscription,
  onSubscriptionUpdated: syncSubscription,
  onSubscriptionCanceled: syncSubscription,
  onSubscriptionRevoked: syncSubscription,
  onSubscriptionUncanceled: syncSubscription,
});
