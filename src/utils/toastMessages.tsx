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
			<p className="text-sm font-450 not-italic leading-[18px] tracking-[0.14px] text-white">
				{message}
			</p>
			{description && (
				<p className="mt-[4px] text-13 font-450 not-italic leading-[14px] tracking-[0.13px] text-gray-light-1">
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
			autoClose: false,
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
