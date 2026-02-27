import { useRef, useState } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Allotment, type AllotmentHandle } from "allotment";
import find from "lodash/find";
import Drawer from "react-modern-drawer";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useSupabaseSession } from "../../../store/componentStore";
import { useSidePaneStore } from "../../../store/sidePaneStore";
import {
	type BookmarksCountTypes,
	type CategoriesData,
} from "../../../types/apiTypes";
import { optionsMenuListArray } from "../../../utils/commonData";
import { BOOKMARKS_COUNT_KEY, CATEGORIES_KEY } from "../../../utils/constants";
import SidePane from "../sidePane";

import {
	AllotmentWrapper,
	SIDE_PANE_ANIMATION_DELAY,
	SIDE_PANE_DEFAULT_WIDTH,
} from "./allotmentWrapper";
import { DashboardContent } from "./dashboardContent";

import "react-modern-drawer/dist/index.css";

import { HeaderOptionsPopover } from "./header-options-popover";

type DashboardLayoutProps = {
	children: React.ReactNode;
};

const DashboardLayout = (props: DashboardLayoutProps) => {
	const { children } = props;

	const session = useSupabaseSession((state) => state.session);
	const userId = session?.user?.id ?? "";
	const { category_id: categoryId } = useGetCurrentCategoryId();

	const [showSearchBar, setShowSearchBar] = useState(true);

	const allotmentRef = useRef<AllotmentHandle>(null);
	const sidePaneRef = useRef<HTMLDivElement>(null);
	const sidePaneContentRef = useRef<HTMLDivElement>(null);

	const showSidePane = useSidePaneStore((state) => state.showSidePane);
	const setShowSidePane = useSidePaneStore((state) => state.setShowSidePane);

	const { isDesktop } = useIsMobileView();

	const [prevIsDesktop, setPrevIsDesktop] = useState(isDesktop);
	if (prevIsDesktop !== isDesktop) {
		setPrevIsDesktop(isDesktop);
		setShowSearchBar(isDesktop);
	}

	const queryClient = useQueryClient();

	const currentPath = useGetCurrentUrlPath();

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const bookmarksCountData = queryClient.getQueryData([
		BOOKMARKS_COUNT_KEY,
		userId,
	]) as {
		data: BookmarksCountTypes;
		error: PostgrestError;
	};

	const optionsMenuList = optionsMenuListArray(currentPath, bookmarksCountData);

	const currentCategoryData = find(
		categoryData?.data,
		(item) => item?.category_slug === currentPath,
	);
	const headerName =
		currentCategoryData?.category_name ??
		find(optionsMenuList, (item) => item?.current === true)?.name;

	const dashboardContentElement = () => {
		const onExpandSidePane = () => {
			if (isDesktop) {
				setShowSidePane(true);
				setTimeout(
					() => allotmentRef.current?.reset(),
					SIDE_PANE_ANIMATION_DELAY,
				);
			} else {
				setShowSidePane(true);
			}
		};

		return (
			<DashboardContent
				categoryId={categoryId}
				currentCategoryData={currentCategoryData}
				currentPath={currentPath}
				headerName={headerName}
				headerOptions={<HeaderOptionsPopover />}
				isDesktop={isDesktop}
				onExpandSidePane={onExpandSidePane}
				onShowSearchBar={setShowSearchBar}
				optionsMenuList={optionsMenuList}
				showSearchBar={showSearchBar}
				showSidePane={showSidePane}
			>
				{children}
			</DashboardContent>
		);
	};

	if (isDesktop) {
		return (
			<div className="h-screen w-screen">
				<AllotmentWrapper
					allotmentRef={allotmentRef}
					sidePaneRef={sidePaneRef}
					sidePaneContentRef={sidePaneContentRef}
					className="split-view-container"
					separator={false}
				>
					<Allotment.Pane
						ref={sidePaneRef}
						className="split-left-pane"
						maxSize={350}
						minSize={0}
						preferredSize={SIDE_PANE_DEFAULT_WIDTH}
						visible={showSidePane}
						snap
					>
						<div className="h-full min-w-[200px]" ref={sidePaneContentRef}>
							<SidePane />
						</div>
					</Allotment.Pane>
					<Allotment.Pane className="split-right-pane">
						{dashboardContentElement()}
					</Allotment.Pane>
				</AllotmentWrapper>
			</div>
		);
	}

	return (
		<div className="flex">
			<Drawer
				direction="left"
				onClose={() => setShowSidePane(false)}
				open={showSidePane}
			>
				<SidePane />
			</Drawer>

			{dashboardContentElement()}

			{/* Portal container so side-pane dropdowns render above the Drawer on small screens */}
			<div
				className="pointer-events-none fixed inset-0 z-9999"
				id="side-pane-dropdown-portal"
			/>
		</div>
	);
};

export default DashboardLayout;
