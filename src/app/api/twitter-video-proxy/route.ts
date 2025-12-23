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

		// Stream directly from response body
		if (!videoResponse.body) {
			return apiError({
				route: ROUTE,
				message: "No video data available",
				error: new Error("Response body is null"),
				operation: "twitter_video_proxy_stream",
				userId,
				extra: { videoUrl },
			});
		}

		// Create a streaming response
		const stream = new ReadableStream({
			async start(controller) {
				const body = videoResponse.body;
				if (!body) {
					controller.error(new Error("No video response body"));
					return;
				}

				const reader = body.getReader();
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) {
							controller.close();
							break;
						}

						controller.enqueue(value);
					}
				} catch (error) {
					controller.error(error);
				} finally {
					reader.releaseLock();
				}
			},
		});

		const response = new NextResponse(stream, {
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
