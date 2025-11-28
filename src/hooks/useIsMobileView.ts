import { useMediaQuery } from "@react-hookz/web";

// tells if the screen is in mobile view or not
export default function useIsMobileView() {
	const isMobile = useMediaQuery("(max-width: 600px)");
	const isTablet = useMediaQuery("(min-width: 601px) and (max-width: 1023px)");
	const isDesktop = !isMobile && !isTablet;

	return { isMobile, isTablet, isDesktop };
}
