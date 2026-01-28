import Button from "./atoms/button";
import { Spinner } from "./spinner";
import TrashIconRed from "@/icons/actionIcons/trashIconRed";

interface ClearTrashContentProps {
	onClearTrash: () => void;
	isClearingTrash: boolean;
	label?: string;
}

export const ClearTrashContent = (props: ClearTrashContentProps) => {
	const { onClearTrash, isClearingTrash, label = "Clear All Trash" } = props;

	return (
		<>
			<p className="py-[6px] pl-2 text-[12px] leading-[115%] tracking-[0.02em] text-gray-600">
				Sure you want to delete?
			</p>
			<Button
				className="flex w-full justify-center bg-gray-alpha-100 py-[5.5px] leading-[115%] tracking-[0.01em] hover:bg-gray-alpha-200"
				id="warning-button"
				onClick={onClearTrash}
			>
				{isClearingTrash ? (
					<Spinner className="h-[15px] w-[15px]" />
				) : (
					<>
						<TrashIconRed />
						<p className="ml-[6px] text-red-700 hover:text-red-700">{label}</p>
					</>
				)}
			</Button>
		</>
	);
};
