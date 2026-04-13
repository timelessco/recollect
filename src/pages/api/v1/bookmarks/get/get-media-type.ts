/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/bookmarks/get/get-media-type
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiRequest, NextApiResponse } from "next";

import axios from "axios";
import { z } from "zod";

const schema = z.object({
  url: z.url("Invalid URL format"),
});

// this api returns the media type of the given url
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") {
    response.status(405).json({
      error: "Only GET requests allowed",
    });
    return;
  }

  const parseResult = schema.safeParse(request.query);

  if (!parseResult.success) {
    console.warn(`Unable to parse query params:`, parseResult.error);
    response.status(400).json({
      error: "Unable to parse query params",
    });
    return;
  }

  const { url } = parseResult.data;

  try {
    const result = await axios.head(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 5000,
    });

    if (result.status !== 200) {
      console.log(`Failed to check media type for url: ${url}`);
      response.status(200).json({
        error: "Failed to check media type",
        mediaType: null,
        success: false,
      });
      return;
    }

    const mediaType = result.headers["content-type"];

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    response.status(200).json({ error: null, mediaType, success: true });
  } catch {
    console.log(`Failed to check media type for url: ${url}`);
    response.status(200).json({
      error: "Failed to check media type",
      mediaType: null,
      success: false,
    });
  }
}
