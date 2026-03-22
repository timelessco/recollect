import { redirect } from "next/navigation";

import { ApiReference } from "@scalar/nextjs-api-reference";

import { createServerClient } from "@/lib/supabase/server";

const scalarHandler = ApiReference({
  customCss: `
		.light-mode {
			--scalar-color-accent: #0289f7;
		}
		.dark-mode {
			--scalar-color-accent: #0289f7;
		}
	`,
  favicon: "/favicon.ico",
  hideClientButton: true,
  hideModels: true,
  metaData: {
    title: "Recollect API Reference",
  },
  pageTitle: "Recollect API Reference",
  url: "/openapi.json",
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
