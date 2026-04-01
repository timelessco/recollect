import type { MetadataRoute } from "next";

import { env } from "@/env/server";
import { BASE_URL } from "@/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    host: BASE_URL,
    rules:
      env.NODE_ENV === "production"
        ? {
            allow: "/",
            disallow: ["/404", "/api/**", "/api-docs", "/~offline"],
            userAgent: "*",
          }
        : {
            disallow: "/",
            userAgent: "*",
          },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
