import { useState } from "react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/recollect/dialog";

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
import SingleListItemComponent from "../sidePane/singleListItemComponent";
import { MobileSettingsDrawer } from "./mobile-settings-drawer";

export type SettingsPage = "ai-features" | "change-email" | "delete" | "import" | "main";

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

function DesktopSettingsContent() {
  const { isDesktop } = useIsMobileView();
  const [currentPage, setCurrentPage] = useState<SettingsPage>("main");

  const getSelectedMenuItemId = () => {
    switch (currentPage) {
      case "ai-features": {
        return 1;
      }
      case "change-email":
      case "delete":
      case "main": {
        return 0;
      }
      case "import": {
        return 2;
      }
      default: {
        return 0;
      }
    }
  };

  const selectedMenuItemId = getSelectedMenuItemId();

  const optionsList = [
    {
      count: undefined,
      current: selectedMenuItemId === 0,
      href: ``,
      icon: (
        <figure className="flex h-4.5 w-4.5 items-center justify-center text-gray-900">
          <AvatarIcon />
        </figure>
      ),
      iconColor: "",
      id: 0,
      name: "My Profile",
    },
    {
      count: undefined,
      current: selectedMenuItemId === 1,
      href: ``,
      icon: (
        <figure className="flex h-4.5 w-4.5 items-center justify-center text-gray-900">
          <SettingsAiIcon />
        </figure>
      ),
      iconColor: "",
      id: 1,
      name: "AI Features",
    },
    {
      count: undefined,
      current: selectedMenuItemId === 2,
      href: ``,
      icon: (
        <figure className="flex items-center justify-center text-gray-900">
          <ImportIcon className="h-4.5 w-4.5" />
        </figure>
      ),
      iconColor: "",
      id: 2,
      name: "Import",
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
                switch (item.id) {
                  case 0: {
                    setCurrentPage("main");
                    break;
                  }
                  case 1: {
                    setCurrentPage("ai-features");
                    break;
                  }
                  case 2: {
                    setCurrentPage("import");
                    break;
                  }
                  default: {
                    break;
                  }
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

  return null;
}
