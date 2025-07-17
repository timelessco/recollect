import React, { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";

export const VideoPlayer = ({
	src,
	isActive,
}: {
	isActive: boolean;
	src: string;
}) => {
	const playerRef = useRef<typeof ReactPlayer | null>(null);
	const [playing, setPlaying] = useState(isActive);

	useEffect(() => {
		setPlaying((previous) => (isActive ? true : previous));
	}, [isActive]);

	return (
		<ReactPlayer
			controls
			height="100%"
			onPause={() => setPlaying(false)}
			onPlay={() => setPlaying(true)}
			playing={playing}
			// @ts-expect-error ref type
			ref={playerRef}
			src={src}
			style={{ maxHeight: "80vh" }}
			width="100%"
		/>
	);
};
