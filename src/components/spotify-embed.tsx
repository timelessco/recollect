import { getSpotifyEmbedInfo } from "./lightbox/LightboxUtils";

export interface SpotifyEmbedProps {
	src: string;
}

export function SpotifyEmbed({ src }: SpotifyEmbedProps) {
	const embedInfo = getSpotifyEmbedInfo(src);

	if (!embedInfo) {
		return null;
	}

	return (
		<div
			className="w-full max-w-[min(600px,90vw)]"
			onPointerDown={(event) => event.stopPropagation()}
		>
			<iframe
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
				loading="lazy"
				sandbox="allow-scripts allow-popups"
				src={embedInfo.embedUrl}
				style={{
					border: "none",
					borderRadius: 12,
					height: embedInfo.height,
					width: "100%",
				}}
				title="Spotify Player"
			/>
		</div>
	);
}
