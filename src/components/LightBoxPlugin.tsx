// plugins/MetaButtonPlugin.tsx
import { type Plugin } from "yet-another-react-lightbox";

export default function MetaButtonPlugin(): Plugin {
	return ({ addSibling }) => {
		addSibling("toolbar", {
			name: "meta-button",
			component: () => (
				<div className="absolute bottom-auto left-auto right-0 top-0 flex h-[200px] w-[200px] justify-end bg-red-950 " />
			),
		});
	};
}
