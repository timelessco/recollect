import { redirect } from "next/navigation";
import { ApiReference } from "@scalar/nextjs-api-reference";

import { createServerClient } from "@/lib/supabase/server";

const scalarHandler = ApiReference({
	url: "/openapi.json",
	pageTitle: "Recollect API Reference",
	favicon: "/favicon.ico",
	hideModels: true,
	hideClientButton: true,
	metaData: {
		title: "Recollect API Reference",
	},
	customCss: `
		.light-mode {
			--scalar-color-accent: #0289f7;
		}
		.dark-mode {
			--scalar-color-accent: #0289f7;
		}
	`,
});

export async function GET() {
	const supabase = await createServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login?next=/api-docs");
	}

	return scalarHandler();
}
