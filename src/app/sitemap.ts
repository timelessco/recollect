import type { MetadataRoute } from "next";

import { BASE_URL } from "@/site-config";

// To do later - /public/[user_name]/[id] routes need a DB query to enumerate — add dynamic sitemap generation
export default function sitemap(): MetadataRoute.Sitemap {
  const [lastModified] = new Date().toISOString().split("T");

  return [
    {
      changeFrequency: "daily",
      lastModified,
      priority: 0.7,
      url: `${BASE_URL}/discover`,
    },
    {
      changeFrequency: "monthly",
      lastModified,
      priority: 0.3,
      url: `${BASE_URL}/login`,
    },
  ];
}
