import { isBrowser } from "@react-hookz/web/util/const.js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Mutate, StoreApi } from "zustand";

interface SidePaneState {
  setShowSidePane: (value: boolean) => void;
  showSidePane: boolean;
}

// We are unable to store the width and apply it to the side pane
// Issues related to allotment and its storing width logic - https://github.com/johnwalley/allotment/issues?q=sort%3Aupdated-desc%20is%3Aissue%20is%3Aopen%20width
export const useSidePaneStore = create<SidePaneState>()(
  persist(
    (set) => ({
      setShowSidePane: (value) => set({ showSidePane: value }),
      showSidePane: true,
    }),
    { name: "sidePaneOpen" },
  ),
);

// Cross-tab sync helper
type StoreWithPersist = Mutate<StoreApi<SidePaneState>, [["zustand/persist", SidePaneState]]>;

export const withStorageDOMEvents = (store: StoreWithPersist) => {
  if (!isBrowser) {
    return () => {
      // no-op: storage events are browser-only
    };
  }

  const storageEventCallback = (event: StorageEvent) => {
    if (event.key === store.persist.getOptions().name && event.newValue) {
      void store.persist.rehydrate();
    }
  };

  window.addEventListener("storage", storageEventCallback);
  return () => {
    window.removeEventListener("storage", storageEventCallback);
  };
};

withStorageDOMEvents(useSidePaneStore);
