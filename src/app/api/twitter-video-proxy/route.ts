import { NextResponse, type NextRequest } from "next/server";

import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { requireAuth } from "@/lib/supabase/api";
import { vet } from "@/utils/try";

const ROUTE = "twitter-video-proxy";

/**
 * Proxy endpoint for Twitter videos
 * Fetches videos from Twitter's CDN with proper headers to bypass referrer restrictions
 */
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(ROUTE);
		if (auth.errorResponse) {
			return auth.errorResponse;
		}

		const { user } = auth;
		const userId = user.id;

		const { searchParams } = new URL(request.url);
		const videoUrl = searchParams.get("url");

		if (!videoUrl) {
			return apiWarn({
				route: ROUTE,
				message: "URL parameter required",
				status: 400,
			});
		}

		// Validate hostname - must be exactly video.twimg.com or a subdomain
		const hostname = new URL(videoUrl).hostname.toLowerCase();
		const isValidTwitterVideoHost = hostname === "video.twimg.com";

		if (!isValidTwitterVideoHost) {
			return apiWarn({
				route: ROUTE,
				message: "Invalid video URL",
				status: 400,
				context: { videoUrl: videoUrl.slice(0, 50) },
			});
		}

		console.log(`[${ROUTE}] Proxying Twitter video:`, {
			videoUrl,
			userId,
		});

		const [fetchError, videoResponse] = await vet(() =>
			fetch(videoUrl, {
				headers: {
					"User-Agent": "Mozilla/5.0",
					Referer: "https://twitter.com/",
				},
				signal: AbortSignal.timeout(30_000),
			}),
		);

		if (fetchError || !videoResponse) {
			return apiError({
				route: ROUTE,
				message: "Failed to fetch Twitter video",
				error: fetchError || new Error("No response received"),
				operation: "twitter_video_proxy_fetch",
				userId,
				extra: { videoUrl },
			});
		}

		if (!videoResponse.ok) {
			return apiError({
				route: ROUTE,
				message: "Failed to fetch Twitter video",
				error: new Error(`Twitter video fetch failed: ${videoResponse.status}`),
				operation: "twitter_video_proxy_fetch",
				userId,
				extra: {
					videoUrl,
					status: videoResponse.status,
					statusText: videoResponse.statusText,
				},
			});
		}

		// Set headers for streaming
		const contentType =
			videoResponse.headers.get("content-type") || "video/mp4";

		// Stream the Twitter video
		const [bufferError, buffer] = await vet(() => videoResponse.arrayBuffer());
		if (bufferError || !buffer) {
			return apiError({
				route: ROUTE,
				message: "Failed to read video data",
				error: bufferError || new Error("No buffer received"),
				operation: "twitter_video_proxy_buffer",
				userId,
				extra: { videoUrl },
			});
		}

		// Create response with proper headers
		const response = new NextResponse(Buffer.from(buffer), {
			status: 200,
			headers: {
				"Content-Type": contentType,
			},
		});

		return response;
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "Failed to proxy Twitter video",
			error,
			operation: "twitter_video_proxy_unexpected",
		});
	}
}
