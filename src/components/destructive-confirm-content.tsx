import { type ReactNode } from "react";
import { Button } from "@base-ui/react/button";

import { Spinner } from "./spinner";
import TrashIconRed from "@/icons/actionIcons/trashIconRed";

interface DestructiveConfirmContentProps {
	onConfirm: () => void;
	label: string;
	description?: string;
	pending?: boolean;
	icon?: ReactNode;
}

export function DestructiveConfirmContent({
	onConfirm,
	label,
	description,
	pending = false,
	icon = <TrashIconRed />,
}: DestructiveConfirmContentProps) {
	return (
		<>
			<p className="py-[6px] text-center text-[12px] leading-[115%] tracking-[0.02em] text-gray-600">
				Sure you want to delete?
			</p>
			{description && (
				<p className="pb-1 text-center text-[11px] leading-[115%] tracking-[0.02em] text-gray-500">
					{description}
				</p>
			)}
			<Button
				className="flex w-full items-center justify-center rounded-lg bg-gray-alpha-100 px-2 py-[5.5px] text-13 leading-[115%] font-medium tracking-[0.01em] text-red-600 hover:bg-gray-alpha-200 hover:text-red-600"
				onClick={onConfirm}
			>
				{pending ? (
					<Spinner className="h-[15px] w-[15px]" />
				) : (
					<>
						{icon}
						<p className="ml-[6px] text-red-600 hover:text-red-600">{label}</p>
					</>
				)}
			</Button>
		</>
	);
}
