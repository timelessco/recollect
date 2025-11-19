import classNames from "classnames";

import AddBookmarkDropdown, {
	type AddBookmarkDropdownTypes,
} from "../../../components/customDropdowns.tsx/addBookmarkDropdown";
import { type CategoriesData } from "../../../types/apiTypes";
import { type CategoryIdUrlTypes } from "../../../types/componentTypes";
import { TRASH_URL } from "../../../utils/constants";

import { NavBarLogo, SidePaneCollapseButton } from "./components";
import { NavBarHeading } from "./headingComponents";
import { SearchBar } from "./searchComponents";

type DashboardContentProps = {
	categoryId: CategoryIdUrlTypes;
	children: React.ReactNode;
	currentCategoryData?: CategoriesData;
	currentPath: string | null;
	headerName?: string | null;
	headerOptions: React.ReactNode;
	isDesktop: boolean;
	onAddBookmark: AddBookmarkDropdownTypes["onAddBookmark"];
	onExpandSidePane: () => void;
	onShowSearchBar: (value: boolean) => void;
	optionsMenuList: Array<{ current?: boolean; icon?: React.ReactNode }>;
	showSearchBar: boolean;
	showSidePane: boolean;
	triggerHeadingEdit: boolean;
	uploadFileFromAddDropdown: AddBookmarkDropdownTypes["uploadFile"];
	userId: string;
};

export const DashboardContent = (props: DashboardContentProps) => {
	const {
		categoryId,
		children,
		currentCategoryData,
		currentPath,
		headerName,
		headerOptions,
		isDesktop,
		onAddBookmark,
		onExpandSidePane,
		onShowSearchBar,
		optionsMenuList,
		showSearchBar,
		showSidePane,
		triggerHeadingEdit,
		uploadFileFromAddDropdown,
		userId,
	} = props;

	return (
		<div className="relative w-full">
			<header className="absolute top-0 z-5 flex w-full items-center justify-between bg-[rgb(255_255_255/90%)] py-[6.5px] pr-3 pl-[13px] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.06)] backdrop-blur-[20.5px] dark:bg-[rgb(16_16_16/90%)]">
				{(isDesktop ? true : !showSearchBar) && (
					<div className="flex w-1/5 items-center px-2 py-[3px] max-xl:w-3/4">
						<SidePaneCollapseButton
							showSidePane={showSidePane}
							onToggle={onExpandSidePane}
						/>
						<figure className="mr-2 flex max-h-[20px] min-h-[20px] w-full max-w-[20px] min-w-[20px] items-center text-plain-reverse">
							<NavBarLogo
								currentCategoryData={currentCategoryData}
								optionsMenuList={optionsMenuList}
							/>
						</figure>
						<NavBarHeading
							currentCategoryData={currentCategoryData}
							headerName={headerName ?? undefined}
							triggerEdit={triggerHeadingEdit}
						/>
					</div>
				)}

				<div
					className={classNames({
						"flex w-4/5 items-center justify-between max-xl:justify-end max-sm:mt-0": true,
						"max-xl:w-full": showSearchBar,
						"max-xl:w-1/4": !showSearchBar,
					})}
				>
					{/* this div is there for centering needs */}
					<div className="h-5 w-[1%] max-xl:hidden" />
					<SearchBar
						showSearchBar={showSearchBar}
						isDesktop={isDesktop}
						categoryId={categoryId}
						currentCategoryData={currentCategoryData}
						currentPath={currentPath}
						userId={userId}
						onShowSearchBar={onShowSearchBar}
					/>
					<div className="flex w-[27%] items-center justify-end gap-3 max-xl:w-max max-xl:gap-2">
						{headerOptions}
						{currentPath !== TRASH_URL && (
							<AddBookmarkDropdown
								onAddBookmark={onAddBookmark}
								uploadFile={uploadFileFromAddDropdown}
							/>
						)}
						{/* Dark/Light toggle here */}
					</div>
				</div>
			</header>

			<main>{children}</main>
		</div>
	);
};
