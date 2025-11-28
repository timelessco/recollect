import { useMediaQuery } from "react-responsive";

// tells if the screen is in mobile view or not
export default function useIsMobileView() {
	const isMobile = useMediaQuery({ maxWidth: 600 });
	const isTablet = useMediaQuery({ minWidth: 600, maxWidth: 1_023 });
	const isDesktop = !isMobile && !isTablet;
	const isLessthan768 = useMediaQuery({ maxWidth: 768 });

	return { isMobile, isTablet, isDesktop, isLessthan768 };
}
