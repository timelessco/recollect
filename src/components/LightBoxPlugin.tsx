// plugins/MetaButtonPlugin.tsx
import { useState } from "react";
import { addToolbarButton, type Plugin } from "yet-another-react-lightbox";

export default function MetaButtonPlugin(): Plugin {
	const [showSidepane, setShowSidepane] = useState(false);
	return ({ addSibling, augment }) => {
		addSibling("toolbar", {
			name: "meta-button",
			component: () => (
				<div className="absolute bottom-auto left-auto right-0 top-0 flex w-[200px] justify-end bg-red-950 " />
			),
		});
		augment(({ toolbar, ...restProps }) => ({
			toolbar: addToolbarButton(
				toolbar,
				"Meta",
				<button
					className=" text-gray-500 transition hover:text-gray-700"
					key="show-pane"
					onClick={() => setShowSidepane(true)}
					type="button"
				>
					Show Meta Data
				</button>,
			),
			...restProps,
		}));
	};
}
