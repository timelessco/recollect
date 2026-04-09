import { toastManager } from "@/components/ui/recollect/toast";

import File from "../icons/toastIcons/file";
import User from "../icons/toastIcons/user";

const PULSE_DURATION = 200;

let pulseTimeout: null | ReturnType<typeof setTimeout> = null;

// Track active toast titles to detect duplicates on the frontmost toast
const activeTitles: { id: string; title: string }[] = [];

function removeActiveTitle(id: string) {
  const index = activeTitles.findIndex((toast) => toast.id === id);
  if (index !== -1) {
    activeTitles.splice(index, 1);
  }
}

function getFrontmostTitle(): null | string {
  if (activeTitles.length === 0) {
    return null;
  }

  return activeTitles.at(-1)?.title ?? null;
}

function pulseExistingToast() {
  const toastElements = document.querySelectorAll<HTMLElement>("[data-toast-root]");
  if (toastElements.length === 0) {
    return;
  }

  let [frontToast] = toastElements;
  for (const el of toastElements) {
    const zIndex = Number.parseInt(getComputedStyle(el).zIndex, 10) || 0;
    const frontZ = Number.parseInt(getComputedStyle(frontToast).zIndex, 10) || 0;
    if (zIndex > frontZ) {
      frontToast = el;
    }
  }

  if (pulseTimeout) {
    clearTimeout(pulseTimeout);
    frontToast.style.removeProperty("--toast-pulse-scale");
  }

  requestAnimationFrame(() => {
    frontToast.style.setProperty("--toast-pulse-scale", "1.05");
    pulseTimeout = setTimeout(() => {
      frontToast.style.removeProperty("--toast-pulse-scale");
      pulseTimeout = null;
    }, PULSE_DURATION);
  });
}

function addOrPulse(title: string, options: Parameters<typeof toastManager.add>[0]) {
  if (getFrontmostTitle() === title) {
    pulseExistingToast();
    return;
  }

  // Use onClose to clean up tracking — subscribe events only fire for
  // explicit toastManager.close() calls, not auto-dismiss via timeout.
  const id: string = toastManager.add({
    ...options,
    onClose: (): void => {
      removeActiveTitle(id);
    },
  });
  activeTitles.push({ id, title });
}

export function errorToast(error: string, type?: "fileSizeError") {
  if (!error) {
    return;
  }

  if (type === "fileSizeError") {
    addOrPulse("Unable to add item", {
      data: { icon: <File /> },
      description: "Max file size is 10MB",
      title: "Unable to add item",
      type: "error",
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
      data: { icon: <User /> },
      title: "Share invitation sent",
      type: "success",
    });
    return;
  }

  addOrPulse(message, { title: message, type: "success" });
}
