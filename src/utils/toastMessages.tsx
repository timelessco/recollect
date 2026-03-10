import File from "../icons/toastIcons/file";
import User from "../icons/toastIcons/user";

import { toastManager } from "@/components/ui/recollect/toast";

const PULSE_DURATION = 200;

let pulseTimeout: ReturnType<typeof setTimeout> | null = null;

// Track active toast titles to detect duplicates on the frontmost toast
const activeTitles: Array<{ id: string; title: string }> = [];

function removeActiveTitle(id: string) {
	const index = activeTitles.findIndex((toast) => toast.id === id);
	if (index !== -1) {
		activeTitles.splice(index, 1);
	}
}

function getFrontmostTitle(): string | null {
	if (activeTitles.length === 0) {
		return null;
	}

	return activeTitles[activeTitles.length - 1].title;
}

function pulseExistingToast() {
	const toastElements =
		document.querySelectorAll<HTMLElement>("[data-toast-root]");
	if (toastElements.length === 0) {
		return;
	}

	let frontToast = toastElements[0];
	for (const el of toastElements) {
		const zIndex = Number.parseInt(getComputedStyle(el).zIndex, 10) || 0;
		const frontZ =
			Number.parseInt(getComputedStyle(frontToast).zIndex, 10) || 0;
		if (zIndex > frontZ) {
			frontToast = el;
		}
	}

	if (pulseTimeout) {
		clearTimeout(pulseTimeout);
		frontToast.style.transform = "";
	}

	requestAnimationFrame(() => {
		frontToast.style.transform = "scale(1.05)";
		pulseTimeout = setTimeout(() => {
			frontToast.style.transform = "";
			pulseTimeout = null;
		}, PULSE_DURATION);
	});
}

function addOrPulse(
	title: string,
	options: Parameters<typeof toastManager.add>[0],
) {
	if (getFrontmostTitle() === title) {
		pulseExistingToast();
		return;
	}

	// Use onClose to clean up tracking — subscribe events only fire for
	// explicit toastManager.close() calls, not auto-dismiss via timeout.
	const id: string = toastManager.add({
		...options,
		onClose: (): void => removeActiveTitle(id),
	});
	activeTitles.push({ id, title });
}

export function errorToast(error: string, type?: "fileSizeError") {
	if (!error) {
		return;
	}

	if (type === "fileSizeError") {
		addOrPulse("Unable to add item", {
			title: "Unable to add item",
			description: "Max file size is 10MB",
			type: "error",
			data: { icon: <File /> },
		});
		return;
	}

	addOrPulse(error, { title: error, type: "error" });
}

export function successToast(message: string, type?: "userInvite") {
	if (!message) {
		return;
	}

	if (type === "userInvite") {
		addOrPulse("Share invitation sent", {
			title: "Share invitation sent",
			type: "success",
			data: { icon: <User /> },
		});
		return;
	}

	addOrPulse(message, { title: message, type: "success" });
}
