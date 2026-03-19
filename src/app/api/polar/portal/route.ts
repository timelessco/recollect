import { NextResponse } from "next/server";

import { createApiClient, getApiUser } from "@/lib/supabase/api";
import { polar } from "@/lib/polar";

export async function GET() {
	const { supabase, token } = await createApiClient();
	const {
		data: { user },
	} = await getApiUser(supabase, token);

	if (!user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	try {
		const session = await polar.customerSessions.create({
			externalCustomerId: user.id,
		});

		return NextResponse.redirect(session.customerPortalUrl);
	} catch (error) {
		console.error("[polar/portal] Failed to create portal session:", error);
		return NextResponse.json(
			{ error: "Failed to open customer portal" },
			{ status: 500 },
		);
	}
}
