import { Webhooks } from "@polar-sh/nextjs";

import { createServerServiceClient } from "@/lib/supabase/service";

const PRODUCT_TO_PLAN: Record<string, "pro" | "plus"> = {
	[process.env.POLAR_PRO_PRODUCT_ID ?? ""]: "pro",
	[process.env.POLAR_PLUS_PRODUCT_ID ?? ""]: "plus",
};

function resolvePlan(
	productId: string,
	status: string,
): "free" | "pro" | "plus" {
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

// Syncs all subscription columns to the profiles table.
// Uses a temporal guard (plan_updated_at) to prevent out-of-order
// webhook events from overwriting newer state.
//
// Note: Polar webhook payloads arrive with snake_case keys at runtime
// despite the SDK types using camelCase. We cast to `any` to access
// the actual snake_case properties from the raw JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncSubscription(payload: any) {
	const data = payload.data;
	// Runtime payload uses snake_case: external_id, product_id, etc.
	const externalId: string | null | undefined =
		data.customer?.external_id ?? data.customer?.externalId;
	if (!externalId) {
		return;
	}

	const now = new Date().toISOString();
	const productId: string = data.product_id ?? data.productId ?? "";
	const plan = resolvePlan(productId, data.status);
	const rawPeriodEnd = data.current_period_end ?? data.currentPeriodEnd ?? null;
	const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd).toISOString() : null;

	const supabase = await createServerServiceClient();

	await supabase
		.from("profiles")
		.update({
			plan,
			subscription_status: data.status,
			subscription_current_period_end: periodEnd,
			polar_customer_id: data.customer.id,
			plan_updated_at: now,
		})
		.eq("id", externalId)
		.or(`plan_updated_at.is.null,plan_updated_at.lt.${now}`);
}

export const POST = Webhooks({
	webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
	onSubscriptionCreated: syncSubscription,
	onSubscriptionActive: syncSubscription,
	onSubscriptionUpdated: syncSubscription,
	onSubscriptionCanceled: syncSubscription,
	onSubscriptionRevoked: syncSubscription,
	onSubscriptionUncanceled: syncSubscription,
});
