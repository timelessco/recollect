import { useState } from "react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/recollect/dialog";
import { SubscriptionIcon } from "@/icons/subscription-icon";

import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { AvatarIcon } from "../../../icons/avatarIcon";
import { ImportIcon } from "../../../icons/importIcon";
import { SettingsAiIcon } from "../../../icons/settingsAiIcon";
import { useSettingsModalStore } from "../../../store/settingsModalStore";
import { useSidePaneStore } from "../../../store/sidePaneStore";
import Settings from "../../settings";
import { AiFeatures } from "../../settings/aiFeatures";
import ChangeEmail from "../../settings/changeEmail";
import { DeleteAccount } from "../../settings/deleteAccount";
import { ImportBookmarks } from "../../settings/import";
import { Subscription } from "../../settings/subscription";
import SingleListItemComponent from "../sidePane/singleListItemComponent";
import { MobileSettingsDrawer } from "./mobile-settings-drawer";

export type SettingsPage =
  | "ai-features"
  | "change-email"
  | "delete"
  | "import"
  | "main"
  | "subscription";

/**
 * Trigger-only component that lives inside the sidebar.
 * Opens the settings modal via global store.
 */
export function SettingsModalTrigger({ children }: { children: ReactNode }) {
  const setOpen = useSettingsModalStore((state) => state.setOpen);
  const setShowSidePane = useSidePaneStore((state) => state.setShowSidePane);
  const { isDesktop } = useIsMobileView();

  return (
    <button
      className="w-full rounded-lg outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200"
      onClick={() => {
        if (!isDesktop) {
          setShowSidePane(false);
        }

        setOpen(true);
      }}
      type="button"
    >
      {children}
    </button>
  );
}

/**
 * Portal component that renders outside the sidebar drawer tree.
 * Must be placed at DashboardLayout level.
 */
export function SettingsModalPortal() {
  const { isMobile } = useIsMobileView();

  if (isMobile) {
    return <MobileSettingsDrawer />;
  }

  return <DesktopSettingsPortal />;
}

function DesktopSettingsPortal() {
  const open = useSettingsModalStore((state) => state.open);
  const setOpen = useSettingsModalStore((state) => state.setOpen);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          aria-label="Settings"
          className="skip-global-paste w-full max-w-[740px] rounded-[20px]"
        >
          <DesktopSettingsContent />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const PAGE_TO_MENU_ID: Record<SettingsPage, number> = {
  "ai-features": 1,
  "change-email": 0,
  delete: 0,
  import: 2,
  main: 0,
  subscription: 3,
};

const MENU_ID_TO_PAGE: Record<number, SettingsPage> = {
  0: "main",
  1: "ai-features",
  2: "import",
  3: "subscription",
};

function DesktopSettingsContent() {
  const { isDesktop } = useIsMobileView();
  const [currentPage, setCurrentPage] = useState<SettingsPage>("main");

  const selectedMenuItemId = PAGE_TO_MENU_ID[currentPage];

  const optionsList = [
    {
      icon: (
        <figure className="flex h-4.5 w-4.5 items-center justify-center text-gray-900">
          <AvatarIcon />
        </figure>
      ),
      name: "My Profile",
      href: ``,
      current: selectedMenuItemId === 0,
      id: 0,
      count: undefined,
      iconColor: "",
    },
    {
      icon: (
        <figure className="flex h-4.5 w-4.5 items-center justify-center text-gray-900">
          <SettingsAiIcon />
        </figure>
      ),
      name: "AI Features",
      href: ``,
      current: selectedMenuItemId === 1,
      id: 1,
      count: undefined,
      iconColor: "",
    },
    {
      icon: (
        <figure className="flex items-center justify-center text-gray-900">
          <ImportIcon className="h-4.5 w-4.5" />
        </figure>
      ),
      name: "Import",
      href: ``,
      current: selectedMenuItemId === 2,
      id: 2,
      count: undefined,
      iconColor: "",
    },
    {
      icon: (
        <figure className="flex h-4.5 w-4.5 items-center justify-center text-gray-900">
          <SubscriptionIcon />
        </figure>
      ),
      name: "Subscription",
      href: ``,
      current: selectedMenuItemId === 3,
      id: 3,
      count: undefined,
      iconColor: "",
    },
  ];

  return (
    <div className="flex h-[700px] rounded-[20px] bg-gray-0">
      <div className="flex h-full min-w-fit flex-col rounded-l-[20px] border-r-[0.5px] border-r-gray-100 bg-gray-0 px-2 py-4 lg:min-w-[180px]">
        {isDesktop && (
          <div className="px-2 text-13 leading-[115%] font-medium tracking-[0.02em] text-gray-600">
            Settings
          </div>
        )}
        <div className="mt-3 flex flex-col gap-px">
          {optionsList.map((item) => (
            <SingleListItemComponent
              extendedClassname="py-[6px]"
              isLink={false}
              item={item}
              key={item.id}
              onClick={() => {
                const page = MENU_ID_TO_PAGE[item.id];
                if (page) {
                  setCurrentPage(page);
                }
              }}
              responsiveIcon
              showIconDropdown={false}
            />
          ))}
        </div>
      </div>
      <div className="hide-scrollbar h-full w-full overflow-auto rounded-[20px] px-6 pt-6 sm:px-12 sm:pt-8">
        <SettingsMainContent currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>
    </div>
  );
}

function SettingsMainContent({
  currentPage,
  onNavigate,
}: {
  currentPage: SettingsPage;
  onNavigate: (page: SettingsPage) => void;
}) {
  if (currentPage === "main") {
    return <Settings onNavigate={onNavigate} />;
  }

  if (currentPage === "change-email") {
    return <ChangeEmail onNavigate={onNavigate} />;
  }

  if (currentPage === "delete") {
    return <DeleteAccount onNavigate={onNavigate} />;
  }

  if (currentPage === "ai-features") {
    return <AiFeatures />;
  }

  if (currentPage === "import") {
    return <ImportBookmarks onNavigate={onNavigate} />;
  }

  if (currentPage === "subscription") {
    return <Subscription />;
  }

  return null;
}
