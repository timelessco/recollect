// eslint-disable-next-line import/no-unassigned-import -- required for module augmentation
import "react";

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
