import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = function (...inputs) {
	return twMerge(clsx(inputs));
};
