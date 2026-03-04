import { toastManager } from "@/components/ui/recollect/toast";

import File from "../icons/toastIcons/file";
import User from "../icons/toastIcons/user";

export function errorToast(error: string, type?: "fileSizeError") {
	if (!error) {
		return;
	}

	if (type === "fileSizeError") {
		toastManager.add({
			title: "Unable to add item",
			description: "Max file size is 10MB",
			type: "error",
			data: { icon: <File /> },
		});
		return;
	}

	toastManager.add({ title: error, type: "error" });
}

export function successToast(message: string, type?: "userInvite") {
	if (!message) {
		return;
	}

	if (type === "userInvite") {
		toastManager.add({
			title: "Share invitation sent",
			type: "success",
			data: { icon: <User /> },
		});
		return;
	}

	toastManager.add({ title: message, type: "success" });
}
