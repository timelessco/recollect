import { isBrowser } from "@react-hookz/web/util/const.js";
import { create, type Mutate, type StoreApi } from "zustand";
import { persist } from "zustand/middleware";

type SidePaneState = {
	setShowSidePane: (value: boolean) => void;
	showSidePane: boolean;
};

// We are unable to store the width and apply it to the side pane
// Issues related to allotment and its storing width logic - https://github.com/johnwalley/allotment/issues?q=sort%3Aupdated-desc%20is%3Aissue%20is%3Aopen%20width
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
