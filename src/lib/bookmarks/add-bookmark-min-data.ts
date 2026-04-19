import { after } from "next/server";

import ogs from "open-graph-scraper";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/api-helpers/axiom";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { addRemainingBookmarkData } from "@/lib/bookmarks/add-remaining-bookmark-data";
import { isLikelyValidImageUrl, preflightImageUrl } from "@/lib/bookmarks/image-url-validation";
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
  V2_GET_MEDIA_TYPE_API,
} from "@/utils/constants";
import { vet } from "@/utils/try";

const OG_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
const IFRAME_TIMEOUT_MS = 5000;

export interface AddBookmarkMinDataParams {
  categoryId: number;
  email: string | undefined;
  supabase: SupabaseClient<Database>;
  updateAccess: boolean;
  url: string;
  userId: string;
}

// ============================================================
// Server-safe inlined helpers (avoid importing @/utils/helpers which pulls in next/router)
// ============================================================

async function getMediaType(url: string): Promise<null | string> {
  try {
    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(
      `${getBaseUrl()}${NEXT_API_URL}/${V2_GET_MEDIA_TYPE_API}?url=${encodedUrl}`,
      { method: "GET" },
    );

    if (!response.ok) {
      setPayload(getServerContext(), {
        media_type_error: "upstream_not_ok",
        media_type_status: response.status,
      });
      return null;
    }

    const json: unknown = await response.json();
    if (json !== null && json !== undefined && typeof json === "object" && "mediaType" in json) {
      const { mediaType } = json;
      return typeof mediaType === "string" ? mediaType : null;
    }

    return null;
  } catch (error) {
    setPayload(getServerContext(), {
      media_type_error: error instanceof Error ? error.message : String(error),
    });
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
    setPayload(getServerContext(), {
      favicon_error: error instanceof Error ? error.message : String(error),
    });
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
// Shared bookmark creation function
// ============================================================

export async function addBookmarkMinData({
  categoryId,
  email,
  supabase,
  updateAccess,
  url,
  userId,
}: AddBookmarkMinDataParams) {
  const ctx = getServerContext();
  if (ctx?.fields) {
    ctx.fields.user_id = userId;
    ctx.fields.category_id = categoryId;
  }
  setPayload(ctx, { url });

  if (!updateAccess) {
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

  // Compute category — 0 = uncategorized
  const computedCategoryId = categoryId === 0 ? 0 : categoryId;

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

  const urlHost = new URL(url).hostname.toLowerCase();
  const isOgImagePreferred = OG_IMAGE_PREFERRED_SITES.some((keyword) => urlHost.includes(keyword));
  const shouldSkipOgImage = SKIP_OG_IMAGE_DOMAINS.some((keyword) => urlHost.includes(keyword));

  // OG scraping
  let scrapperData = {
    description: null as null | string,
    favIcon: null as null | string,
    ogImage: null as null | string,
    title: null as null | string,
  };

  const [scrapperError, ogsResult] = await vet(() =>
    ogs({ fetchOptions: { headers: { "user-agent": OG_USER_AGENT } }, url }),
  );

  if (scrapperError) {
    setPayload(ctx, { scraper_failed: true });
    scrapperData = {
      description: null,
      favIcon: null,
      ogImage: null,
      title: new URL(url).hostname,
    };
  } else {
    // Shape-check the scraper's ogImage — rejects placeholder URLs like
    // `https://undefined/...` (Next.js pages with unset metadataBase) before
    // they enter the system.
    const rawScrapedOgImage = ogsResult?.result?.ogImage?.at(0)?.url ?? null;
    const sanitizedOgImage = isLikelyValidImageUrl(rawScrapedOgImage) ? rawScrapedOgImage : null;
    if (rawScrapedOgImage && !sanitizedOgImage) {
      setPayload(ctx, { og_image_shape_rejected: true });
    }

    scrapperData = {
      description: ogsResult?.result?.ogDescription ?? null,
      favIcon: ogsResult?.result?.favicon ?? null,
      ogImage: shouldSkipOgImage ? null : sanitizedOgImage,
      title: ogsResult?.result?.ogTitle ?? null,
    };
  }

  // Media type detection — single HTTP call, derive all flags
  const mediaType = await getMediaType(url);
  const isUrlOfMimeType = isAcceptedMimeType(mediaType);
  const isUrlAnImage = mediaType?.startsWith(IMAGE_MIME_PREFIX) ?? false;

  setPayload(ctx, { is_media_url: isUrlOfMimeType });

  // Determine ogImage
  let ogImageToBeAdded: null | string = null;
  let iframeAllowedValue: boolean | null = null;

  if (isUrlOfMimeType) {
    if (isUrlAnImage) {
      ogImageToBeAdded = url;
    } else {
      ogImageToBeAdded = mediaType?.includes("audio") ? AUDIO_OG_IMAGE_FALLBACK_URL : null;
    }
  } else {
    ogImageToBeAdded = scrapperData.ogImage;
    iframeAllowedValue = isOgImagePreferred ? false : await canEmbedInIframe(url);
    if (!iframeAllowedValue) {
      setPayload(ctx, { iframe_not_allowed: true });
    }
  }

  // HEAD-preflight the scraped ogImage. Catches dead domains, 404s, and
  // non-image content that shape-validation alone can't see. Skip for our
  // own AUDIO_OG_IMAGE_FALLBACK_URL and for URLs we already know resolve
  // (the bookmark URL itself when it IS the image).
  if (
    ogImageToBeAdded &&
    ogImageToBeAdded !== url &&
    ogImageToBeAdded !== AUDIO_OG_IMAGE_FALLBACK_URL
  ) {
    const preflighted = await preflightImageUrl(ogImageToBeAdded);
    if (!preflighted) {
      setPayload(ctx, { og_image_preflight_rejected: true });
    }
    ogImageToBeAdded = preflighted;
  }

  const favIcon = await getNormalisedImageUrl(scrapperData.favIcon, url);

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
        url,
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
  }
  setPayload(ctx, { has_og_image: ogImageToBeAdded !== null });

  // Insert junction table entry
  const { error: junctionError } = await supabase.from(BOOKMARK_CATEGORIES_TABLE_NAME).insert({
    bookmark_id: insertedBookmark.id,
    category_id: computedCategoryId,
    user_id: userId,
  });

  if (junctionError) {
    // Non-blocking: don't fail the request, log via wide event
    setPayload(ctx, { junction_error: true, junction_error_code: junctionError.code });
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
          url,
          userId,
        });
      } catch (error) {
        logger.warn("[add-bookmark-min-data] after() enrichment failed", {
          bookmark_id: insertedBookmark.id,
          error: error instanceof Error ? error.message : String(error),
          user_id: userId,
        });
      }
    });
  }

  return insertedData;
}
