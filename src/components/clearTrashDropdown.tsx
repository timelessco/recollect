import { DestructiveConfirmContent } from "./destructive-confirm-content";
import { Popover } from "@/components/ui/recollect/popover";
import TrashIconGray from "@/icons/trash-icon-gray";

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
							className="size-4"
						/>
					</figure>
				)}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="start">
					<Popover.Popup
						className={`${!isBottomBar ? "ml-2" : ""} w-[180px] leading-[20px]`}
					>
						<DestructiveConfirmContent
							onConfirm={onClearTrash}
							pending={isClearingTrash}
							label={label ?? "Clear All Trash"}
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
