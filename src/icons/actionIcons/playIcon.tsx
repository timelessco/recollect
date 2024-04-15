import { type PointerEvent } from "react";

const PlayIcon = ({
	className,
	onClick,
	onPointerDown,
}: {
	className: string;
	onClick?: () => void;
	onPointerDown?: (event: PointerEvent) => void;
}) => (
	<svg
		className={className}
		fill="none"
		height="32"
		onClick={onClick}
		onPointerDown={onPointerDown}
		viewBox="0 0 33 32"
		width="33"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g filter="url(#filter0_i_8563_28930)">
			<g filter="url(#filter1_b_8563_28930)">
				<circle cx="16.5" cy="16" fill="black" fillOpacity="0.41" r="16" />
			</g>
			<path
				d="M13.5 20.1315V11.8685C13.5 11.0698 14.3901 10.5934 15.0547 11.0365L21.2519 15.1679C21.8457 15.5638 21.8457 16.4362 21.2519 16.8321L15.0547 20.9635C14.3901 21.4066 13.5 20.9302 13.5 20.1315Z"
				fill="white"
			/>
		</g>
		<defs>
			<filter
				colorInterpolationFilters="sRGB"
				filterUnits="userSpaceOnUse"
				height="32"
				id="filter0_i_8563_28930"
				width="32"
				x="0.5"
				y="0"
			>
				<feFlood floodOpacity="0" result="BackgroundImageFix" />
				<feBlend
					in="SourceGraphic"
					in2="BackgroundImageFix"
					mode="normal"
					result="shape"
				/>
				<feColorMatrix
					in="SourceAlpha"
					result="hardAlpha"
					type="matrix"
					values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
				/>
				<feOffset />
				<feGaussianBlur stdDeviation="0.5" />
				<feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
				<feColorMatrix
					type="matrix"
					values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"
				/>
				<feBlend
					in2="shape"
					mode="normal"
					result="effect1_innerShadow_8563_28930"
				/>
			</filter>
			<filter
				colorInterpolationFilters="sRGB"
				filterUnits="userSpaceOnUse"
				height="53.6"
				id="filter1_b_8563_28930"
				width="53.6"
				x="-10.3"
				y="-10.8"
			>
				<feFlood floodOpacity="0" result="BackgroundImageFix" />
				<feGaussianBlur in="BackgroundImageFix" stdDeviation="5.4" />
				<feComposite
					in2="SourceAlpha"
					operator="in"
					result="effect1_backgroundBlur_8563_28930"
				/>
				<feBlend
					in="SourceGraphic"
					in2="effect1_backgroundBlur_8563_28930"
					mode="normal"
					result="shape"
				/>
			</filter>
		</defs>
	</svg>
);

export default PlayIcon;
