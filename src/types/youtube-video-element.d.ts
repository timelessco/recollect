import { type DetailedHTMLProps, type VideoHTMLAttributes } from "react";

declare module "react" {
	namespace JSX {
		interface IntrinsicElements {
			"youtube-video": DetailedHTMLProps<
				VideoHTMLAttributes<HTMLVideoElement>,
				HTMLVideoElement
			>;
		}
	}
}
