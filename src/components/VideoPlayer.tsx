import React, { useRef } from "react";
import ReactPlayer from "react-player";

import { NEXT_API_URL, TWITTER_VIDEO_PROXY_API } from "@/utils/constants";

export const VideoPlayer = ({
	src,
	isActive,
}: {
	isActive: boolean;
	src: string;
}) => {
	const playerRef = useRef<HTMLVideoElement | null>(null);

	// Example twitter video url: https://video.twimg.com/amplify_video/1990067319197069312/vid/avc1/1080x1920/_nmYyHDOfj9paRpR.mp4?tag=21
	const isTwitterVideo = src?.includes("video.twimg.com");

	const proxiedSrc = isTwitterVideo
		? `${NEXT_API_URL}${TWITTER_VIDEO_PROXY_API}?url=${encodeURIComponent(src)}`
		: src;

	return (
		<ReactPlayer
			height="100%"
			playing={isActive}
			ref={playerRef}
			src={proxiedSrc}
			style={{ maxHeight: "80vh", margin: "auto", width: "100%" }}
		/>
	);
};
