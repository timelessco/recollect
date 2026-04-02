import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#FFF",
    description: SITE_DESCRIPTION,
    dir: "auto",
    display: "standalone",
    display_override: ["window-controls-overlay"],
    icons: [
      {
        sizes: "192x192",
        src: "/pwa/icons/android-chrome-192x192.png",
        type: "image/png",
      },
      {
        sizes: "512x512",
        src: "/pwa/icons/android-chrome-512x512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "192x192",
        src: "/pwa/icons/android-chrome-maskable-192x192.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/pwa/icons/android-chrome-maskable-512x512.png",
        type: "image/png",
      },
    ],
    id: "/?source=pwa",
    lang: "en-US",
    name: SITE_NAME,
    orientation: "portrait-primary",
    scope: "/",
    short_name: SITE_NAME,
    start_url: "/?source=pwa",
    theme_color: "#FFF",
  };
}
