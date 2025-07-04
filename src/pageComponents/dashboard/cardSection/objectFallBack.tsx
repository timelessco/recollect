import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import defaultBlur from "../../../../public/app-svgs/errorImgPlaceholder.svg";

type EmbedWithFallbackProps = {
	placeholder?: string;
	src: string;
};

export const EmbedWithFallback = ({
	src,
	placeholder,
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

			const height = fallback.getBoundingClientRect().height;

			// If fallback becomes visible, assume failure
			if (height > 0) {
				setFailed(true);
			} else if (attempts < maxAttempts) {
				attempts++;
				setTimeout(check, 200);
			}
		};

		setFailed(false);
		setTimeout(check, 300);
	}, [src]);

	if (failed) {
		return (
			<div className="flex items-center justify-center">
				<div className="relative max-w-[1200px]">
					<Image
						alt="Preview"
						className={
							placeholder
								? "h-auto max-h-[80vh] w-auto"
								: "h-auto max-h-[286px] w-full max-w-[150px]"
						}
						height={0}
						src={placeholder ? placeholder : defaultBlur}
						unoptimized={Boolean(placeholder)}
						width={0}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full max-w-[1200px]" ref={containerRef}>
			<object
				className="h-full w-full"
				data={src}
				style={{ minHeight: 500 }}
				title="Website Preview"
				type="text/html"
			>
				{/* This is the fallback content. If this becomes visible, object failed to load */}
				<div ref={fallbackRef} style={{ height: "5px", width: "100%" }} />
			</object>
		</div>
	);
};
