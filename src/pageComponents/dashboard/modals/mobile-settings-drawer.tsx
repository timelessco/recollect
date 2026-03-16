import { useCallback, useState, type ReactNode } from "react";
import { DrawerPreview as Drawer } from "@base-ui/react/drawer";
import { Tabs } from "@base-ui/react/tabs";

import { AvatarIcon } from "../../../icons/avatarIcon";
import { ImportIcon } from "../../../icons/importIcon";
import { SettingsAiIcon } from "../../../icons/settingsAiIcon";
import Settings from "../../settings";
import { AiFeatures } from "../../settings/aiFeatures";
import ChangeEmail from "../../settings/changeEmail";
import { DeleteAccount } from "../../settings/deleteAccount";
import { ImportBookmarks } from "../../settings/import";

import { type SettingsPage } from "./settings-modal";

export function MobileSettingsDrawer({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);

	return (
		<Drawer.Root
			modal
			onOpenChange={setOpen}
			open={open}
			snapToSequentialPoints
			swipeDirection="down"
		>
			<Drawer.Trigger
				className="w-full rounded-lg outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200"
				render={<button type="button" />}
			>
				{children}
			</Drawer.Trigger>
			<Drawer.Portal>
				<Drawer.Backdrop className="fixed inset-0 z-102 bg-black opacity-[calc(0.36*(1-var(--drawer-swipe-progress)))] transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
				<Drawer.Viewport className="fixed inset-0 z-102 flex items-end">
					<Drawer.Popup
						className="skip-global-paste flex h-[70dvh] w-full translate-y-[var(--drawer-swipe-movement-y)] flex-col rounded-t-[20px] bg-gray-0 shadow-[0_-4px_20px_rgb(0_0_0/10%)] outline-hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:translate-y-full data-starting-style:translate-y-full data-swiping:duration-0 data-swiping:select-none"
						aria-label="Settings"
					>
						<DrawerContent />
					</Drawer.Popup>
				</Drawer.Viewport>
			</Drawer.Portal>
		</Drawer.Root>
	);
}

function DrawerContent() {
	const [currentPage, setCurrentPage] = useState<SettingsPage>("main");
	const [activeTab, setActiveTab] = useState<string>("main");

	const isSubPage = currentPage === "change-email" || currentPage === "delete";

	const handleNavigate = useCallback((page: SettingsPage) => {
		setCurrentPage(page);
		if (page === "ai-features") {
			setActiveTab("ai-features");
		} else if (page === "import") {
			setActiveTab("import");
		} else if (page === "main") {
			setActiveTab("main");
		}
	}, []);

	const handleTabChange = useCallback((value: unknown) => {
		if (value === null) {
			return;
		}

		const tab = String(value as string);
		setActiveTab(tab);
		if (tab === "main") {
			setCurrentPage("main");
		} else if (tab === "ai-features") {
			setCurrentPage("ai-features");
		} else if (tab === "import") {
			setCurrentPage("import");
		}
	}, []);

	return (
		<>
			{!isSubPage && (
				<div className="flex shrink-0 touch-none justify-center pt-2 pb-1">
					<div className="h-1 w-10 rounded-full bg-gray-300" />
				</div>
			)}

			<Tabs.Root
				className="flex min-h-0 flex-1 flex-col"
				onValueChange={handleTabChange}
				value={activeTab}
			>
				{isSubPage ? (
					<Drawer.Content className="min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-6 pt-4 pb-[env(safe-area-inset-bottom)]">
						{currentPage === "change-email" && (
							<ChangeEmail onNavigate={handleNavigate} />
						)}
						{currentPage === "delete" && (
							<DeleteAccount onNavigate={handleNavigate} />
						)}
					</Drawer.Content>
				) : (
					<>
						<Drawer.Content className="min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-6 pt-4">
							<Tabs.Panel className="h-full" value="main">
								<Settings onNavigate={handleNavigate} />
							</Tabs.Panel>
							<Tabs.Panel className="h-full" value="ai-features">
								<AiFeatures />
							</Tabs.Panel>
							<Tabs.Panel className="h-full" value="import">
								<ImportBookmarks onNavigate={handleNavigate} />
							</Tabs.Panel>
						</Drawer.Content>

						<Tabs.List className="flex shrink-0 border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
							<Tabs.Tab
								className="flex flex-1 flex-col items-center gap-1 py-2 text-gray-500 outline-hidden data-selected:text-gray-900"
								value="main"
							>
								<AvatarIcon />
								<span className="text-[11px] leading-3 font-medium">
									Profile
								</span>
							</Tabs.Tab>
							<Tabs.Tab
								className="flex flex-1 flex-col items-center gap-1 py-2 text-gray-500 outline-hidden data-selected:text-gray-900"
								value="ai-features"
							>
								<SettingsAiIcon />
								<span className="text-[11px] leading-3 font-medium">
									AI Features
								</span>
							</Tabs.Tab>
							<Tabs.Tab
								className="flex flex-1 flex-col items-center gap-1 py-2 text-gray-500 outline-hidden data-selected:text-gray-900"
								value="import"
							>
								<ImportIcon className="h-4.5 w-4.5" />
								<span className="text-[11px] leading-3 font-medium">
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
