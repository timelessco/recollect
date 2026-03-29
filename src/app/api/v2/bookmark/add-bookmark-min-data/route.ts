import { after } from "next/server";

import * as Sentry from "@sentry/nextjs";
import ogs from "open-graph-scraper";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { addRemainingBookmarkData } from "@/lib/bookmarks/add-remaining-bookmark-data";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import { isNullable } from "@/utils/assertion-utils";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "@/utils/category-auth";
import {
  AUDIO_OG_IMAGE_FALLBACK_URL,
  BOOKMARK_CATEGORIES_TABLE_NAME,
  bookmarkType,
  getBaseUrl,
  IMAGE_MIME_PREFIX,
  isAcceptedMimeType,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  OG_IMAGE_PREFERRED_SITES,
  SKIP_OG_IMAGE_DOMAINS,
} from "@/utils/constants";
import { vet } from "@/utils/try";

import { AddBookmarkMinDataInputSchema, AddBookmarkMinDataOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-add-bookmark-min-data";
const OG_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
const IFRAME_TIMEOUT_MS = 5000;

// ============================================================
// Server-safe inlined helpers (avoid importing @/utils/helpers which pulls in next/router)
// ============================================================

async function getMediaType(url: string): Promise<null | string> {
  try {
    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(
      `${getBaseUrl()}${NEXT_API_URL}/v1/bookmarks/get/get-media-type?url=${encodedUrl}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.media_type_error = "upstream_not_ok";
        ctx.fields.media_type_status = response.status;
      }
      return null;
    }

    const json: unknown = await response.json();
    if (json !== null && json !== undefined && typeof json === "object" && "mediaType" in json) {
      const { mediaType } = json;
      return typeof mediaType === "string" ? mediaType : null;
    }

    return null;
  } catch (error) {
    const ctx = getServerContext();
    if (ctx?.fields) {
      ctx.fields.media_type_error = error instanceof Error ? error.message : String(error);
    }
    return null;
  }
}

function getNormalisedUrl(url: string): null | string {
  if (typeof url !== "string" || url.trim() === "") {
    return null;
  }

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (url.startsWith("//")) {
      return `https:${url}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function getNormalisedImageUrl(imageUrl: null | string, url: string): Promise<null | string> {
  try {
    const { hostname } = new URL(url);

    if (imageUrl) {
      const normalisedUrl = getNormalisedUrl(imageUrl);
      if (normalisedUrl) {
        return normalisedUrl;
      }
      return new URL(imageUrl, `https://${hostname}`).href;
    }

    const response = await fetch(
      `https://www.google.com/s2/favicons?sz=128&domain_url=${hostname}`,
    );

    if (!response.ok) {
      throw new Error(`Invalid response for ${hostname}: ${response.statusText}`);
    }

    return response.url;
  } catch (error) {
    const ctx = getServerContext();
    if (ctx?.fields) {
      ctx.fields.favicon_error = error instanceof Error ? error.message : String(error);
    }
    return null;
  }
}

async function canEmbedInIframe(url: string): Promise<boolean> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return false;
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(IFRAME_TIMEOUT_MS),
    });

    if (!response.ok) {
      return false;
    }

    // Check X-Frame-Options
    const xFrameOptions = response.headers.get("x-frame-options")?.toLowerCase();
    if (
      xFrameOptions === "deny" ||
      xFrameOptions === "sameorigin" ||
      xFrameOptions?.startsWith("allow-from ")
    ) {
      return false;
    }

    // Check Content-Security-Policy frame-ancestors
    const csp = response.headers.get("content-security-policy");
    if (csp) {
      const frameAncestorsMatch = /frame-ancestors\s+([^;]+)/iu.exec(csp);
      if (frameAncestorsMatch) {
        const directive = frameAncestorsMatch.at(1)?.trim().toLowerCase();
        if (directive === "'none'" || directive === "'self'") {
          return false;
        }
        const sources = directive?.split(/\s+/u).filter(Boolean) ?? [];
        if (sources.length === 0) {
          return false;
        }
        const allowsEmbedding = sources.some((source) => {
          if (source === "*") {
            return true;
          }
          if (source === "'none'" || source === "'self'") {
            return false;
          }
          if (source.includes("*")) {
            return false;
          }
          return source.startsWith("http");
        });
        if (!allowsEmbedding) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Route handler
// ============================================================

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const { email } = user;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.url = data.url;
        ctx.fields.category_id = data.category_id;
      }

      if (!data.update_access) {
        throw new RecollectApiError("forbidden", {
          message: "User does not have update access",
          operation: "validate_access",
        });
      }

      if (!email) {
        throw new RecollectApiError("bad_request", {
          message: "User email not available",
          operation: "validate_email",
        });
      }

      const urlHost = new URL(data.url).hostname.toLowerCase();
      const isOgImagePreferred = OG_IMAGE_PREFERRED_SITES.some((keyword) =>
        urlHost.includes(keyword),
      );
      const shouldSkipOgImage = SKIP_OG_IMAGE_DOMAINS.some((keyword) => urlHost.includes(keyword));

      // OG scraping
      let scrapperData = {
        description: null as null | string,
        favIcon: null as null | string,
        ogImage: null as null | string,
        title: null as null | string,
      };

      const [scrapperError, ogsResult] = await vet(() =>
        ogs({ fetchOptions: { headers: { "user-agent": OG_USER_AGENT } }, url: data.url }),
      );

      if (scrapperError) {
        if (ctx?.fields) {
          ctx.fields.scraper_failed = true;
        }
        scrapperData = {
          description: null,
          favIcon: null,
          ogImage: null,
          title: new URL(data.url).hostname,
        };
      } else {
        scrapperData = {
          description: ogsResult?.result?.ogDescription ?? null,
          favIcon: ogsResult?.result?.favicon ?? null,
          ogImage: shouldSkipOgImage ? null : (ogsResult?.result?.ogImage?.at(0)?.url ?? null),
          title: ogsResult?.result?.ogTitle ?? null,
        };
      }

      // Compute category — 0 = uncategorized
      const computedCategoryId = data.category_id === 0 ? 0 : data.category_id;

      if (computedCategoryId !== 0) {
        const hasAccess = await checkIfUserIsCategoryOwnerOrCollaborator({
          categoryId: computedCategoryId,
          email,
          supabase,
          userId,
        });

        if (!hasAccess) {
          throw new RecollectApiError("forbidden", {
            message:
              "User is neither owner or collaborator for the collection or does not have edit access",
            operation: "check_category_access",
          });
        }
      }

      // Media type detection — single HTTP call, derive all flags
      const mediaType = await getMediaType(data.url);
      const isUrlOfMimeType = isAcceptedMimeType(mediaType);
      const isUrlAnImage = mediaType?.startsWith(IMAGE_MIME_PREFIX) ?? false;

      // Determine ogImage
      let ogImageToBeAdded: null | string = null;
      let iframeAllowedValue: boolean | null = null;

      if (isUrlOfMimeType) {
        if (isUrlAnImage) {
          ogImageToBeAdded = data.url;
        } else {
          ogImageToBeAdded = mediaType?.includes("audio") ? AUDIO_OG_IMAGE_FALLBACK_URL : null;
        }
      } else {
        ogImageToBeAdded = scrapperData.ogImage;
        iframeAllowedValue = isOgImagePreferred ? false : await canEmbedInIframe(data.url);
        if (!iframeAllowedValue && ctx?.fields) {
          ctx.fields.iframe_not_allowed = true;
        }
      }

      const favIcon = await getNormalisedImageUrl(scrapperData.favIcon, data.url);

      // Insert bookmark
      const { data: insertedData, error: insertError } = await supabase
        .from(MAIN_TABLE_NAME)
        .insert([
          {
            description: scrapperData.description,
            meta_data: {
              favIcon,
              iframeAllowed: iframeAllowedValue,
              isOgImagePreferred,
              mediaType,
            },
            ogImage: ogImageToBeAdded,
            title: scrapperData.title,
            type: bookmarkType,
            url: data.url,
            user_id: userId,
          },
        ])
        .select();

      if (insertError) {
        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Error inserting bookmark",
          operation: "insert_min_bookmark",
        });
      }

      if (isNullable(insertedData) || insertedData.length === 0) {
        throw new RecollectApiError("bad_request", {
          message: "Bookmark data is empty after adding",
          operation: "insert_min_bookmark",
        });
      }

      const [insertedBookmark] = insertedData;

      if (ctx?.fields) {
        ctx.fields.bookmark_id = insertedBookmark.id;
        ctx.fields.is_media_url = isUrlOfMimeType;
      }

      // Insert junction table entry
      const { error: junctionError } = await supabase.from(BOOKMARK_CATEGORIES_TABLE_NAME).insert({
        bookmark_id: insertedBookmark.id,
        category_id: computedCategoryId,
        user_id: userId,
      });

      if (junctionError && ctx?.fields) {
        // Non-blocking: don't fail the request, log via wide event
        ctx.fields.junction_error = true;
        ctx.fields.junction_error_code = junctionError.code;
      }

      // Revalidate if public category
      if (computedCategoryId !== 0) {
        void revalidateCategoryIfPublic(computedCategoryId, {
          operation: "add_bookmark",
          userId,
        });
      }

      // Conditional fire-and-forget enrichment — only for media URLs (v1 line 405)
      if (isUrlOfMimeType) {
        after(async () => {
          try {
            await addRemainingBookmarkData({
              favIcon: favIcon ?? undefined,
              id: insertedBookmark.id,
              supabase,
              url: data.url,
              userId,
            });
          } catch (error) {
            Sentry.captureException(error, {
              extra: { bookmarkId: insertedBookmark.id },
              tags: { operation: "after_remaining_bookmark_data", userId },
            });
          }
        });
      }

      return insertedData;
    },
    inputSchema: AddBookmarkMinDataInputSchema,
    outputSchema: AddBookmarkMinDataOutputSchema,
    route: ROUTE,
  }),
);
