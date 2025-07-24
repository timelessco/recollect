import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { SCREENSHOT_URL } from "../../../utils/constants";

type EmbedWithFallbackProps = {
	placeholder?: string;
	placeholderHeight?: number;
	placeholderWidth?: number;
	src: string;
};

export const EmbedWithFallback = ({
	src,
	placeholder,
	placeholderHeight,
	placeholderWidth,
}: EmbedWithFallbackProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const fallbackRef = useRef<HTMLDivElement>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let attempts = 0;
		const maxAttempts = 10;

		const check = () => {
			const fallback = fallbackRef.current;

			if (!fallback) return;

			const viewHeight = fallback.getBoundingClientRect().height;

			if (viewHeight > 0) {
				setFailed(true);
			} else if (attempts < maxAttempts) {
				attempts++;
				setTimeout(check, 200);
			}
		};

		setFailed(false);
		setTimeout(check, 300);
	}, [src]);

	if (failed && placeholder) {
		const isScreenshot = placeholder.startsWith(SCREENSHOT_URL);
		const scaledWidth = isScreenshot
			? (placeholderWidth ?? 0) * 0.5
			: placeholderWidth ?? 0;
		const scaledHeight = isScreenshot
			? (placeholderHeight ?? 0) * 0.5
			: placeholderHeight ?? 0;

		const exceedsWidth = scaledWidth > 1_200;
		const underHeight = scaledHeight > window.innerHeight * 0.8;

		if (exceedsWidth || underHeight) {
			return (
				<div className="flex h-full w-full  items-center justify-center ">
					<div
						className={`flex ${exceedsWidth ? "max-w-[1200px]" : ""} ${
							underHeight ? "max-h-[90vh]" : ""
						}`}
					>
						<Image
							alt="Preview"
							className="object-contain"
							height={scaledHeight}
							src={placeholder}
							width={scaledWidth}
						/>
					</div>
				</div>
			);
		}

		return (
			<div
				className={`flex min-h-screen origin-center items-center justify-center ${
					isScreenshot ? "scale-50" : ""
				}`}
			>
				<Image
					alt="Preview"
					className="h-auto w-auto"
					height={placeholderHeight}
					src={placeholder}
					width={placeholderWidth}
				/>
			</div>
		);
	}

	return (
		<div
			className="relative h-full min-h-[500px] w-full max-w-[1200px]"
			ref={containerRef}
		>
			<object
				className="h-full w-full"
				data={src}
				title="Website Preview"
				type="text/html"
			>
				{/* This is the fallback content. If this becomes visible, object failed to load */}
				<div ref={fallbackRef} style={{ height: "5px", width: "100%" }} />
			</object>
		</div>
	);
};
