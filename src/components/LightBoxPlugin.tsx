import { type } from "os";
import * as React from "react";
import { useState } from "react";
import { type PluginProps, type Slide } from "yet-another-react-lightbox";

export const Rotate = ({ augment }: PluginProps) => {
	const [rotation, setRotation] = useState(0);

	const rotateButton = (
		<button
			key="to-right-btn"
			onClick={() => {
				setRotation((previousAngle) => previousAngle + 90);
			}}
			type="button"
		>
			R
		</button>
	);

	augment(({ toolbar, render, ...restProps }) => ({
		toolbar: {
			...toolbar,
			buttons: [...(toolbar?.buttons || []), rotateButton],
		},

		render: {
			...render,
			slide: ({ slide }: { slide: Slide }) => (
				<img
					alt={slide.alt}
					src={slide.src as string}
					style={{
						maxWidth: "100%",
						maxHeight: "100%",
						transform: `rotate(${rotation}deg)`,
						transition: "transform 0.3s ease-in-out",
					}}
				/>
			),
		},
		...restProps,
	}));

	return null;
};
