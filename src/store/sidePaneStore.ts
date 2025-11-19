import { isBrowser } from "@react-hookz/web/util/const.js";
import { create, type Mutate, type StoreApi } from "zustand";
import { persist } from "zustand/middleware";

// Below this width, reset to default
export const DEFAULT_SIDE_PANE_WIDTH = 244;

type SidePaneState = {
	setShowSidePane: (value: boolean) => void;
	setSidePaneWidth: (value: number) => void;
	showSidePane: boolean;
	sidePaneWidth: number;
};

export const useSidePaneStore = create<SidePaneState>()(
	persist(
		(set) => ({
			showSidePane: true,
			sidePaneWidth: DEFAULT_SIDE_PANE_WIDTH,
			setShowSidePane: (value) => set({ showSidePane: value }),
			setSidePaneWidth: (value) => set({ sidePaneWidth: value }),
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
