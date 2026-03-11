/**
 * LightBoxPlugin Component
 *
 * A custom plugin for the react-lightbox component that displays metadata in a side pane.
 * Features:
 * - Shows bookmark metadata including title, description, and domain
 * - Displays favicon when available
 * - Formats dates for better readability
 * - Integrates with the main lightbox component for a seamless experience
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { DrawerPreview as Drawer } from "@base-ui/react/drawer";
import { useMediaQuery } from "@react-hookz/web";
import { AnimatePresence, motion } from "motion/react";
import {
	createModule,
	useLightboxState,
	type Plugin,
} from "yet-another-react-lightbox";

import { useFetchBookmarkById } from "../../async/queryHooks/bookmarks/useFetchBookmarkById";
import { Spinner } from "../spinner";

import { type CustomSlide } from "./LightboxUtils";
import { SidepaneContent } from "./sidepane-content";
import { useMiscellaneousStore } from "@/store/componentStore";

const SNAP_POINTS: Drawer.Root.Props["snapPoints"] = [0.6, 1];
const DEFAULT_SNAP_POINT = 0.6;

const MyComponent = () => {
	const { currentIndex, slides } = useLightboxState();
	const [isInitialMount, setIsInitialMount] = useState(true);
	const isMobile = useMediaQuery("(max-width: 768px)");

	const [snapPoint, setSnapPoint] = useState<
		Drawer.Root.SnapPoint | null | undefined
	>(DEFAULT_SNAP_POINT);

	useEffect(() => {
		setIsInitialMount(false);
	}, []);

	const router = useRouter();

	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state.lightboxShowSidepane,
	);
	const setLightboxShowSidepane = useMiscellaneousStore(
		(state) => state.setLightboxShowSidepane,
	);

	// Get bookmark from slide data (primary source)
	const currentSlide = slides[currentIndex] as CustomSlide | undefined;
	let currentBookmark = currentSlide?.data?.bookmark;

	// Fallback: fetch by ID only if bookmark not in slide data (direct URL access)
	const { id } = router.query;
	const shouldFetch =
		!currentBookmark && typeof id === "string" && id.length > 0;

	const { data: bookmark } = useFetchBookmarkById(id as string, {
		enabled: shouldFetch,
	});

	if (!currentBookmark && bookmark?.data) {
		currentBookmark = bookmark.data;
	}

	// Reset snap point to default when navigating between slides
	useEffect(() => {
		setSnapPoint(DEFAULT_SNAP_POINT);
	}, [currentBookmark?.id]);

	const handleDrawerOpenChange = (open: boolean) => {
		setLightboxShowSidepane(open);
		try {
			localStorage.setItem("lightboxSidepaneOpen", String(open));
		} catch {
			// Silently fail if localStorage is unavailable
		}
	};

	if (!currentBookmark) {
		if (isMobile) {
			return null;
		}

		return (
			<div className="absolute top-0 right-0 flex h-full w-1/5 max-w-[400px] min-w-[320px] flex-col items-center justify-center border-l-[0.5px] border-gray-100 bg-gray-0 backdrop-blur-[41px]">
				<Spinner
					className="h-3 w-3 animate-spin"
					style={{ color: "var(--color-plain-reverse)" }}
				/>
			</div>
		);
	}

	if (isMobile) {
		return (
			<Drawer.Root
				modal={false}
				onOpenChange={handleDrawerOpenChange}
				onSnapPointChange={setSnapPoint}
				open={lightboxShowSidepane}
				snapPoint={snapPoint}
				snapPoints={SNAP_POINTS}
			>
				<Drawer.Portal keepMounted>
					<Drawer.Viewport className="pointer-events-none fixed inset-0 z-10000 flex items-end">
						<Drawer.Popup className="pointer-events-auto relative flex w-full transform-[translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] flex-col overflow-hidden rounded-t-xl bg-gray-0 shadow-[0_-4px_20px_rgb(0_0_0/15%)] outline-hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:transform-[translateY(100%)] data-starting-style:transform-[translateY(100%)] data-swiping:transition-none">
							<div className="flex shrink-0 justify-center py-3">
								<div className="h-1 w-8 rounded-full bg-gray-300" />
							</div>
							<div className="hide-scrollbar max-h-[calc(100dvh-48px)] overflow-y-auto">
								<SidepaneContent
									currentBookmark={currentBookmark}
									currentIndex={currentIndex}
									shouldFetch={shouldFetch}
								/>
							</div>
						</Drawer.Popup>
					</Drawer.Viewport>
				</Drawer.Portal>
			</Drawer.Root>
		);
	}

	return (
		<AnimatePresence>
			{lightboxShowSidepane && (
				<motion.div
					animate={{
						x: 0,
						opacity: 1,
						scale: 1,
						transition:
							isInitialMount && lightboxShowSidepane
								? {
										duration: 0.25,
										ease: "easeInOut",
										opacity: { duration: 0.25, ease: "easeInOut" },
										scale: {
											from: 0.97,
											duration: 0.25,
											ease: "easeInOut",
										},
									}
								: {
										type: "tween",
										duration: 0.15,
										ease: "easeInOut",
									},
					}}
					className="absolute top-0 right-0 flex h-full w-1/5 max-w-[400px] min-w-[320px] flex-col border-l-[0.5px] border-gray-100 bg-gray-0 backdrop-blur-[41px]"
					exit={{
						x: "100%",
						transition: { type: "tween", duration: 0.25, ease: "easeInOut" },
					}}
					initial={
						isInitialMount && lightboxShowSidepane
							? { x: 0, opacity: 0, scale: 0.97 }
							: { x: "100%" }
					}
				>
					<SidepaneContent
						currentBookmark={currentBookmark}
						currentIndex={currentIndex}
						shouldFetch={shouldFetch}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

// https://yet-another-react-lightbox.com/advanced
const myModule = createModule("MyModule", MyComponent);

export default function MetaButtonPlugin(): Plugin {
	return ({ addSibling }) => {
		addSibling("controller", myModule, false);
	};
}
