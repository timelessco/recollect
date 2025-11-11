import { toast } from "react-toastify";

import File from "../icons/toastIcons/file";
import User from "../icons/toastIcons/user";

const ToastBody = ({
	icon,
	message,
	description,
}: {
	description?: string;
	icon?: JSX.Element;
	message: string;
}) => (
	<div className="flex">
		{icon && icon}
		<div className="ml-2">
			<p className="font-450 text-gray-0 text-sm not-italic leading-[18px] tracking-[0.14px]">
				{message}
			</p>
			{description && (
				<p className="text-13 font-450 mt-[4px] not-italic leading-[14px] tracking-[0.13px] text-gray-500">
					{description}
				</p>
			)}
		</div>
	</div>
);

export const errorToast = (error: string, type?: "fileSizeError") => {
	let toastBody = <ToastBody message={error} />;

	if (type === "fileSizeError") {
		toastBody = (
			<ToastBody
				description="Max file size is 10MB"
				icon={<File />}
				message="Unable to add item"
			/>
		);
	}

	return (
		error &&
		toast.error(toastBody, {
			position: "bottom-right",
			closeButton: () => null,
			icon: () => null,
			hideProgressBar: true,
		})
	);
};

export const successToast = (message: string, type?: "userInvite") => {
	let toastBody = <ToastBody message={message} />;

	if (type === "userInvite") {
		toastBody = <ToastBody icon={<User />} message="Share invitation sent" />;
	}

	return (
		message &&
		toast.success(toastBody, {
			position: "bottom-right",
			closeButton: () => null,
			icon: () => null,
			hideProgressBar: true,
		})
	);
};
