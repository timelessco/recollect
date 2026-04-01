import type { MetadataRoute } from "next";

import { BASE_URL } from "@/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  // Define routes with their specific priorities and change frequencies
  const routeConfig = [
    // Homepage
    { changeFrequency: "daily" as const, priority: 0.7, route: "" },
    // Discover page
    { changeFrequency: "daily" as const, priority: 0.7, route: "/discover" },
  ];

  const routesInSitemapFormat = routeConfig.map((config) => ({
    changeFrequency: config.changeFrequency,
    lastModified: new Date().toISOString().split("T")[0],
    priority: config.priority,
    url: `${BASE_URL}/${config.route}`,
  }));

  return routesInSitemapFormat;
}
