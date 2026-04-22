import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { polar } from "@/lib/polar";
import { createApiClient, getApiUser } from "@/lib/supabase/api";

const PLAN_TO_PRODUCT_ID: Record<string, string | undefined> = {
  pro: process.env.POLAR_PRO_PRODUCT_ID,
  plus: process.env.POLAR_PLUS_PRODUCT_ID,
};

export async function GET(request: NextRequest) {
  const { supabase, token } = await createApiClient();
  const {
    data: { user },
  } = await getApiUser(supabase, token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const plan = request.nextUrl.searchParams.get("plan");

  if (!plan || !PLAN_TO_PRODUCT_ID[plan]) {
    return NextResponse.json(
      { error: "Invalid plan. Use ?plan=pro or ?plan=plus" },
      { status: 400 },
    );
  }

  // Already validated above that PLAN_TO_PRODUCT_ID[plan] exists
  const productId = PLAN_TO_PRODUCT_ID[plan];

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/everything?checkout=success`,
      externalCustomerId: user.id,
      customerEmail: user.email,
    });

    return NextResponse.redirect(checkout.url);
  } catch (error) {
    console.error("[polar/checkout] Failed to create checkout:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
