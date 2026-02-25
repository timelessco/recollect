import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { AvatarIcon } from "../../../icons/avatarIcon";
import { ImportIcon } from "../../../icons/importIcon";
import { SettingsAiIcon } from "../../../icons/settingsAiIcon";
import Settings from "../../settings";
import { AiFeatures } from "../../settings/aiFeatures";
import ChangeEmail from "../../settings/changeEmail";
import { DeleteAccount } from "../../settings/deleteAccount";
import { ImportBookmarks } from "../../settings/import";
import SingleListItemComponent from "../sidePane/singleListItemComponent";

import { Dialog } from "@/components/ui/recollect/dialog";

export type SettingsPage =
	| "ai-features"
	| "change-email"
	| "delete"
	| "import"
	| "main";

type SettingsModalProps = {
	currentPage: SettingsPage;
	onNavigate: (page: SettingsPage) => void;
};

const SettingsModal = ({ currentPage, onNavigate }: SettingsModalProps) => {
	const { isDesktop } = useIsMobileView();

	// Derive selectedMenuItem from currentPage
	const getSelectedMenuItemId = () => {
		switch (currentPage) {
			case "main":
			case "change-email":
			case "delete":
				return 0;
			case "ai-features":
				return 1;
			case "import":
				return 2;
			default:
				return 0;
		}
	};

	const selectedMenuItemId = getSelectedMenuItemId();

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
	];

	const renderMainContent = () => {
		switch (currentPage) {
			case "main":
				return <Settings onNavigate={onNavigate} />;
			case "change-email":
				return <ChangeEmail onNavigate={onNavigate} />;
			case "delete":
				return <DeleteAccount onNavigate={onNavigate} />;
			case "ai-features":
				return <AiFeatures />;
			case "import":
				return <ImportBookmarks onNavigate={onNavigate} />;
			default:
				return null;
		}
	};

	return (
		<Dialog.Portal>
			<Dialog.Backdrop />
			<Dialog.Popup
				className="skip-global-paste w-full max-w-[740px] rounded-[20px]"
				aria-label="Settings"
			>
				<div className="flex h-[700px] rounded-[20px] bg-gray-0">
					<div className="flex h-full min-w-fit flex-col rounded-l-[20px] border-r-[0.5px] border-r-gray-100 bg-gray-0 px-2 py-4 lg:min-w-[180px]">
						{isDesktop && (
							<div className="px-2 text-13 leading-[115%] font-medium tracking-[0.02em] text-gray-600">
								Settings
							</div>
						)}
						<div className="mt-3">
							{optionsList?.map((item) => (
								<SingleListItemComponent
									extendedClassname="py-[6px]"
									isLink={false}
									item={item}
									key={item.id}
									onClick={() => {
										switch (item.id) {
											case 0:
												onNavigate("main");
												break;
											case 1:
												onNavigate("ai-features");
												break;
											case 2:
												onNavigate("import");
												break;
											default:
												break;
										}
									}}
									responsiveIcon
									showIconDropdown={false}
								/>
							))}
						</div>
					</div>
					<div className="hide-scrollbar h-full w-full overflow-auto rounded-[20px] px-12 pt-8">
						{renderMainContent()}
					</div>
				</div>
			</Dialog.Popup>
		</Dialog.Portal>
	);
};

export default SettingsModal;
