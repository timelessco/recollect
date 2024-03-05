import { useEffect, useState } from "react";
import isNil from "lodash/isNil";

// tells if the screen is in mobile view or not
export default function useIsMobileView() {
	const [width, setWidth] = useState<number | null>(
		typeof window !== "undefined" ? window.innerWidth : null,
	);

	const handleWindowSizeChange = () => {
		setWidth(window.innerWidth);
	};

	useEffect(() => {
		window.addEventListener("resize", handleWindowSizeChange);
		return () => {
			window.removeEventListener("resize", handleWindowSizeChange);
		};
	}, []);

	let isMobile = false;
	let isTablet = false;

	if (isNil(width)) {
		isMobile = false;
	} else {
		isMobile = width <= 600;
		isTablet = width <= 1_300 && width >= 600;
	}

	return { isMobile, isTablet };
}
