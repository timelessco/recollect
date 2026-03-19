import { create } from "zustand";

type SettingsModalState = {
	open: boolean;
	setOpen: (value: boolean) => void;
};

export const useSettingsModalStore = create<SettingsModalState>()((set) => ({
	open: false,
	setOpen: (value) => set({ open: value }),
}));
