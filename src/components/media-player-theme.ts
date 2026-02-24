import { type CSSProperties } from "react";

const BASE_CONTROLLER_STYLE = {
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

export const MEDIA_STYLE = {
	height: "auto",
	maxHeight: "80vh",
	maxWidth: "min(1200px, 90vw)",
	width: "auto",
} as CSSProperties;

export const AUDIO_CONTROLLER_STYLE = {
	"--media-background-color": "#f3f3f3",
	"--media-primary-color": "#1a1a1a",
	"--media-control-background": "transparent",
	"--media-control-hover-background": "rgba(0, 0, 0, 0.06)",
	borderRadius: "9999px",
	maxHeight: "none",
	maxWidth: "min(600px, 90vw)",
	width: "100%",
} as CSSProperties;

export const AUDIO_CONTROL_BAR_STYLE = {
	alignItems: "center",
	display: "flex",
	gap: "16px",
	paddingBlock: "14px",
	paddingInline: "20px",
	width: "100%",
} as CSSProperties;

export const CONTROL_BAR_STYLE = {
	alignItems: "center",
	gap: "12px",
	paddingBottom: "8px",
	paddingInline: "12px",
	paddingTop: "60px",
} as CSSProperties;
