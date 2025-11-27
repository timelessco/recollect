import { AriaDropdown, AriaDropdownMenu } from "./ariaDropdown";
import { ClearTrashContent } from "./clearTrashContent";
import TrashIconGray from "@/icons/actionIcons/trashIconGray";

interface ClearTrashDropdownProps {
	onClearTrash: () => void;
	isClearingTrash: boolean;
	label?: string;
	isBottomBar?: boolean;
	isOpen?: boolean;
	menuOpenToggle?: (isOpen: boolean) => void;
}

export const ClearTrashDropdown = (props: ClearTrashDropdownProps) => {
	const {
		onClearTrash,
		isClearingTrash,
		label,
		isBottomBar = false,
		isOpen,
		menuOpenToggle,
	} = props;
	return (
		<AriaDropdown
			isOpen={isOpen}
			menuOpenToggle={menuOpenToggle}
			menuButton={
				isBottomBar ? (
					<div
						className="mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
						role="button"
						tabIndex={0}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
							}
						}}
					>
						Delete Forever
					</div>
				) : (
					<div
						className="z-15 ml-2 rounded-lg bg-whites-700 p-[5px] backdrop-blur-xs group-hover:flex"
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
							}
						}}
						role="button"
						tabIndex={0}
					>
						<figure
							onPointerDown={(event) => {
								event.stopPropagation();
							}}
						>
							<TrashIconGray
								onPointerDown={(event) => {
									event.stopPropagation();
								}}
							/>
						</figure>
					</div>
				)
			}
		>
			<AriaDropdownMenu onClick={() => {}}>
				<div
					className={`z-10 ${!isBottomBar ? "ml-2" : ""} w-[180px] rounded-xl bg-gray-50 p-1 leading-[20px] shadow-custom-3 outline-hidden focus-visible:outline-hidden`}
				>
					<ClearTrashContent
						onClearTrash={() => {
							onClearTrash();
						}}
						isClearingTrash={isClearingTrash}
						label={label}
					/>
				</div>
			</AriaDropdownMenu>
		</AriaDropdown>
	);
};
