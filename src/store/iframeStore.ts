import { isBrowser } from "@react-hookz/web/util/const.js";
import { create, type Mutate, type StoreApi } from "zustand";
import { persist } from "zustand/middleware";

type IframeState = {
	iframeEnabled: boolean;
	setIframeEnabled: (value: boolean) => void;
};

export const useIframeStore = create<IframeState>()(
	persist(
		(set) => ({
			iframeEnabled: true,
			setIframeEnabled: (value) => set({ iframeEnabled: value }),
		}),
		{ name: "iframeEnabled" },
	),
);

// Cross-tab sync
type StoreWithPersist = Mutate<
	StoreApi<IframeState>,
	[["zustand/persist", unknown]]
>;

/**
 * Syncs the store across different tabs/windows by listening to the "storage" event.
 * When the local storage value changes (e.g. from another tab), this function
 * triggers a rehydration of the store to ensure state consistency.
 */
const withStorageDOMEvents = (store: StoreWithPersist) => {
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

withStorageDOMEvents(useIframeStore as StoreWithPersist);
