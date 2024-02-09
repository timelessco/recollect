import { type PointerEvent } from "react";

const PlayIcon = ({
	className,
	size = "40",
	onClick,
	onPointerDown,
}: {
	className: string;
	onClick?: () => void;
	onPointerDown?: (event: PointerEvent) => void;
	size?: string;
}) => (
	<svg
		className={className}
		height={size}
		id="play"
		onClick={onClick}
		onPointerDown={onPointerDown}
		viewBox="0 0 256 256"
		width={size}
	>
		<path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
	</svg>
);

export default PlayIcon;
