import { isBrowser } from "@react-hookz/web/util/const.js";
import { create, type Mutate, type StoreApi } from "zustand";
import { persist } from "zustand/middleware";

type SidePaneState = {
	setShowSidePane: (value: boolean) => void;
	showSidePane: boolean;
};

export const useSidePaneStore = create<SidePaneState>()(
	persist(
		(set) => ({
			showSidePane: true,
			setShowSidePane: (value) => set({ showSidePane: value }),
		}),
		{ name: "sidePaneOpen" },
	),
);

// Cross-tab sync helper
type StoreWithPersist = Mutate<
	StoreApi<SidePaneState>,
	[["zustand/persist", unknown]]
>;

export const withStorageDOMEvents = (store: StoreWithPersist) => {
	if (!isBrowser) {
		return () => {};
	}

	const storageEventCallback = (event: StorageEvent) => {
		if (event.key === store.persist.getOptions().name && event.newValue) {
			void store.persist.rehydrate();
		}
	};

	window.addEventListener("storage", storageEventCallback);
	return () => window.removeEventListener("storage", storageEventCallback);
};

withStorageDOMEvents(useSidePaneStore as StoreWithPersist);
