import { AriaDropdown, AriaDropdownMenu } from "./ariaDropdown";
import { ClearTrashContent } from "./clearTrashContent";

interface ClearTrashDropdownProps {
	onClearTrash: () => void;
	isClearingTrash: boolean;
	isClearAllTrash: boolean;
}

export const ClearTrashDropdown = (props: ClearTrashDropdownProps) => {
	const { onClearTrash, isClearingTrash, isClearAllTrash } = props;
	return (
		<AriaDropdown
			menuButton={
				<div
					className="mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
					role="button"
					tabIndex={0}
				>
					Delete Forever
				</div>
			}
		>
			<AriaDropdownMenu onClick={() => {}}>
				<div className="z-10 w-[180px] rounded-xl bg-gray-50 p-1 leading-[20px] shadow-custom-3 outline-hidden focus-visible:outline-hidden">
					<ClearTrashContent
						onClearTrash={() => {
							onClearTrash();
						}}
						isClearingTrash={isClearingTrash}
						isClearAllTrash={isClearAllTrash}
					/>
				</div>
			</AriaDropdownMenu>
		</AriaDropdown>
	);
};
