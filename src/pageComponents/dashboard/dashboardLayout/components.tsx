import { useWindowSize } from "@react-hookz/web";
import find from "lodash/find";
import { type ImperativePanelHandle } from "react-resizable-panels";

import CategoryIconsDropdown from "../../../components/customDropdowns.tsx/categoryIconsDropdown";
import { type CategoriesData } from "../../../types/apiTypes";

import { MIN_SIZE_PIXEL } from "./panelWrapper";

type SidePaneCollapseButtonProps = {
	showSidePane: boolean;
	sidePanelRef?: React.RefObject<ImperativePanelHandle | null>;
	onToggle?: () => void;
};

export const SidePaneCollapseButton = (props: SidePaneCollapseButtonProps) => {
	const { showSidePane, sidePanelRef, onToggle } = props;

	const { width: windowWidth } = useWindowSize();
	const minSizePercentage = (MIN_SIZE_PIXEL / windowWidth) * 100;

	if (showSidePane) {
		return null;
	}

	return (
		<div className="relative">
			<button
				className="group absolute top-[-25px] left-[-25px] px-3 py-5"
				onClick={() => {
					onToggle?.();
					sidePanelRef?.current?.expand(minSizePercentage);
				}}
				type="button"
			>
				<div className="absolute top-[16px] left-[11px] mt-[-2px] h-[14px] w-[5px] rounded-md bg-gray-300 transition-transform ease-in group-hover:rotate-[-25deg]" />
				<div className="absolute top-[26px] left-[11px] mt-[-2px] h-[14px] w-[5px] rounded-md bg-gray-300 transition-transform ease-in group-hover:rotate-25" />
			</button>
		</div>
	);
};

type NavBarLogoProps = {
	currentCategoryData?: CategoriesData;
	optionsMenuList: Array<{ current?: boolean; icon?: React.ReactNode }>;
};

export const NavBarLogo = (props: NavBarLogoProps) => {
	const { currentCategoryData, optionsMenuList } = props;

	if (currentCategoryData) {
		return (
			<CategoryIconsDropdown
				iconColor={currentCategoryData?.icon_color}
				iconValue={currentCategoryData?.icon}
				iconId={currentCategoryData?.id}
			/>
		);
	}

	return find(optionsMenuList, (item) => item?.current === true)?.icon;
};
