import { Popover } from "@base-ui/react/popover";

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

export function ClearTrashDropdown(props: ClearTrashDropdownProps) {
	const {
		onClearTrash,
		isClearingTrash,
		label,
		isBottomBar = false,
		isOpen,
		menuOpenToggle,
	} = props;

	return (
		<Popover.Root
			open={isOpen}
			onOpenChange={(nextOpen) => {
				menuOpenToggle?.(nextOpen);
			}}
		>
			<Popover.Trigger
				render={<button type="button" />}
				className={
					isBottomBar
						? "mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
						: "z-15 ml-2 rounded-lg bg-whites-700 p-[5px] backdrop-blur-xs group-hover:flex"
				}
			>
				{isBottomBar ? (
					"Delete Forever"
				) : (
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
				)}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="start" className="z-10" sideOffset={1}>
					<Popover.Popup
						className={`${!isBottomBar ? "ml-2" : ""} w-[180px] rounded-xl bg-gray-50 p-1 leading-[20px] shadow-custom-3 outline-hidden`}
					>
						<ClearTrashContent
							onClearTrash={onClearTrash}
							isClearingTrash={isClearingTrash}
							label={label}
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
