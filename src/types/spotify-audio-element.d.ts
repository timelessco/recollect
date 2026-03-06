// eslint-disable-next-line import/no-unassigned-import -- required for module augmentation
import "react";

declare module "react" {
	namespace JSX {
		interface IntrinsicElements {
			"spotify-audio": DetailedHTMLProps<
				HTMLAttributes<HTMLElement>,
				HTMLElement
			> & { src?: string };
		}
	}
}
