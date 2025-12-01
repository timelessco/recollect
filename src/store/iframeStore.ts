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

withStorageDOMEvents(useIframeStore as StoreWithPersist);
