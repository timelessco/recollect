import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { SidepaneContent, type SidepaneContentProps } from "./sidepane-content";
import { useMiscellaneousStore } from "@/store/componentStore";

export function DesktopSidepane({
	currentBookmark,
	currentIndex,
	shouldFetch,
}: SidepaneContentProps) {
	const [isInitialMount, setIsInitialMount] = useState(true);

	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state.lightboxShowSidepane,
	);

	useEffect(() => {
		setIsInitialMount(false);
	}, []);

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
}
