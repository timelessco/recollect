import { type CSSProperties } from "react";

const BASE_CONTROLLER_STYLE = {
	"--base": "20px",
	"--_accent-color": "#fff",
	"--media-background-color": "#000",
	"--media-primary-color": "#fff",
	"--media-control-background": "transparent",
	"--media-control-hover-background": "rgba(255, 255, 255, 0.1)",
	borderRadius: "16px",
	maxHeight: "80vh",
	maxWidth: "1200px",
} as CSSProperties;

export const CONTROLLER_STYLE = BASE_CONTROLLER_STYLE;

export const YOUTUBE_CONTROLLER_STYLE = {
	...BASE_CONTROLLER_STYLE,
	aspectRatio: "16/9",
	width: "100%",
} as CSSProperties;

export const CONTROL_BAR_STYLE = {
	alignItems: "center",
	background: "linear-gradient(transparent, rgba(0, 0, 0, 0.6))",
	gap: "12px",
	paddingBottom: "8px",
	paddingInline: "12px",
	paddingTop: "60px",
} as CSSProperties;
