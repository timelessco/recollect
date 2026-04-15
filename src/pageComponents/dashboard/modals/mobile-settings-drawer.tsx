import { useEffect, useState } from "react";

import { Drawer } from "@base-ui/react/drawer";
import { Tabs } from "@base-ui/react/tabs";

import type { SettingsPage } from "./settings-modal";

import { AvatarIcon } from "@/icons/avatarIcon";
import { ImportIcon } from "@/icons/importIcon";
import { SettingsAiIcon } from "@/icons/settingsAiIcon";
import Settings from "@/pageComponents/settings";
import { AiFeatures } from "@/pageComponents/settings/aiFeatures";
import ChangeEmail from "@/pageComponents/settings/changeEmail";
import { DeleteAccount } from "@/pageComponents/settings/deleteAccount";
import { ImportBookmarks } from "@/pageComponents/settings/import";
import { useSettingsModalStore } from "@/store/settingsModalStore";

export function MobileSettingsDrawer() {
  const open = useSettingsModalStore((state) => state.open);
  const setOpen = useSettingsModalStore((state) => state.setOpen);

  return (
    <Drawer.Root
      modal
      onOpenChange={setOpen}
      open={open}
      snapPoints={[0.7]}
      snapToSequentialPoints
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="data-ending-style:backdrop-blur-0 data-starting-style:backdrop-blur-0 fixed inset-0 z-102 bg-black/36 backdrop-blur-sm transition-[opacity,backdrop-filter] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
        <Drawer.Viewport className="fixed inset-0 z-102 flex items-end">
          <Drawer.Popup
            aria-label="Settings"
            className="skip-global-paste flex h-[70dvh] w-full translate-y-[calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y))] flex-col rounded-t-[20px] bg-gray-0 shadow-[0_-4px_20px_rgb(0_0_0/10%)] outline-hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:translate-y-full data-starting-style:translate-y-full data-swiping:duration-0 data-swiping:select-none"
          >
            <DrawerContent />
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DrawerContent() {
  const open = useSettingsModalStore((state) => state.open);
  const [currentPage, setCurrentPage] = useState<SettingsPage>("main");

  useEffect(() => {
    if (open) {
      setCurrentPage("main");
    }
  }, [open]);

  const isSubPage = currentPage === "change-email" || currentPage === "delete";
  const activeTab = isSubPage ? "main" : currentPage;

  const handleTabChange = (value: null | string) => {
    if (value === null) {
      return;
    }

    setCurrentPage(value as SettingsPage);
  };

  return (
    <>
      <div className="flex shrink-0 touch-none justify-center pt-2 pb-1">
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>

      <Tabs.Root
        className="flex min-h-0 flex-1 flex-col"
        onValueChange={handleTabChange}
        value={activeTab}
      >
        {isSubPage ? (
          <Drawer.Content className="min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-6 pt-4 pb-[env(safe-area-inset-bottom)]">
            {currentPage === "change-email" && <ChangeEmail onNavigate={setCurrentPage} />}
            {currentPage === "delete" && <DeleteAccount onNavigate={setCurrentPage} />}
          </Drawer.Content>
        ) : (
          <>
            <Drawer.Content className="min-h-0 flex-1 touch-auto">
              <Tabs.Panel
                className="h-full overflow-y-auto overscroll-contain px-6 pt-4"
                value="main"
              >
                <Settings onNavigate={setCurrentPage} />
              </Tabs.Panel>
              <Tabs.Panel
                className="h-full overflow-y-auto overscroll-contain px-6 pt-4"
                value="ai-features"
              >
                <AiFeatures />
              </Tabs.Panel>
              <Tabs.Panel
                className="h-full overflow-y-auto overscroll-contain px-6 pt-4"
                value="import"
              >
                <ImportBookmarks onNavigate={setCurrentPage} />
              </Tabs.Panel>
            </Drawer.Content>

            <Tabs.List className="flex shrink-0 border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
              <Tabs.Tab
                className="group flex flex-1 flex-col items-center gap-1 py-2 text-gray-400 outline-hidden aria-selected:text-gray-900"
                value="main"
              >
                <AvatarIcon />
                <span className="text-[11px] leading-3 font-medium group-aria-selected:font-semibold">
                  Profile
                </span>
              </Tabs.Tab>
              <Tabs.Tab
                className="group flex flex-1 flex-col items-center gap-1 py-2 text-gray-400 outline-hidden aria-selected:text-gray-900"
                value="ai-features"
              >
                <SettingsAiIcon />
                <span className="text-[11px] leading-3 font-medium group-aria-selected:font-semibold">
                  AI Features
                </span>
              </Tabs.Tab>
              <Tabs.Tab
                className="group flex flex-1 flex-col items-center gap-1 py-2 text-gray-400 outline-hidden aria-selected:text-gray-900"
                value="import"
              >
                <ImportIcon className="h-4.5 w-4.5" />
                <span className="text-[11px] leading-3 font-medium group-aria-selected:font-semibold">
                  Import
                </span>
              </Tabs.Tab>
            </Tabs.List>
          </>
        )}
      </Tabs.Root>
    </>
  );
}
