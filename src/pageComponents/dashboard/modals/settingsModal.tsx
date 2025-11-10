import { useEffect, useState } from "react";

import Modal from "../../../components/modal";
import useIsMobileView from "../../../hooks/useIsMobileView";
import { AvatarIcon } from "../../../icons/avatarIcon";
import { ImportIcon } from "../../../icons/importIcon";
import { SettingsAiIcon } from "../../../icons/settingsAiIcon";
import {
	useMiscellaneousStore,
	useModalStore,
} from "../../../store/componentStore";
import Settings from "../../settings";
import { AiFeatures } from "../../settings/aiFeatures";
import ChangeEmail from "../../settings/changeEmail";
import DeleteAccout from "../../settings/deleteAccount";
import SingleListItemComponent from "../sidePane/singleListItemComponent";

// type SettingsModalTypes = {};

const SettingsModal = () => {
	const showSettingsModal = useModalStore((state) => state.showSettingsModal);
	const { isDesktop } = useIsMobileView();
	const toggleShowSettingsModal = useModalStore(
		(state) => state.toggleShowSettingsModal,
	);

	const [currentSettingsPage, setCurrentSettingsPage] = useMiscellaneousStore(
		(state) => [state.currentSettingsPage, state.setCurrentSettingsPage],
	);

	const [selectedMenuItem, setSelectedMenuItem] = useState(0);

	// reset useeffect
	useEffect(() => {
		if (!showSettingsModal) {
			setCurrentSettingsPage("main");
			// ! TODO: Fix this in priority
			setSelectedMenuItem(0);
		}
	}, [setCurrentSettingsPage, showSettingsModal, selectedMenuItem]);

	const optionsList = [
		{
			icon: (
				<figure className="flex h-6 w-6 items-center justify-center text-gray-900">
					<AvatarIcon />
				</figure>
			),
			name: "My Profile",
			href: ``,
			current: selectedMenuItem === 0,
			id: 0,
			count: undefined,
			iconColor: "",
		},
		{
			icon: (
				<figure className="flex h-6 w-6 items-center justify-center text-gray-900">
					<SettingsAiIcon />
				</figure>
			),
			name: "AI Features",
			href: ``,
			current: selectedMenuItem === 1,
			id: 1,
			count: undefined,
			iconColor: "",
		},
		{
			icon: (
				<figure className="flex h-6 w-6 items-center justify-center text-gray-900">
					<ImportIcon />
				</figure>
			),
			name: "Import",
			href: ``,
			current: selectedMenuItem === 2,
			id: 2,
			count: undefined,
			iconColor: "",
		},
	];

	const renderMainContent = () => {
		switch (currentSettingsPage) {
			case "main":
				return <Settings />;
			case "change-email":
				return <ChangeEmail />;
			case "delete":
				return <DeleteAccout />;
			case "ai-features":
				return <AiFeatures />;
			default:
				return null;
		}
	};

	return (
		<Modal
			open={showSettingsModal}
			setOpen={() => toggleShowSettingsModal()}
			// adding skip-global-paste to avoid global paste event in the modal
			wrapperClassName="skip-global-paste w-full max-w-[740px] rounded-[20px] outline-hidden self-center"
		>
			{/* <div onClick={() => toggleShowSettingsModal()}>close</div> */}
			<div className="bg-gray-0 flex h-[700px] rounded-[20px]">
				<div className="bg-gray-0 flex h-full min-w-fit flex-col rounded-l-[20px] border-r-[0.5px] border-r-gray-100 px-2 py-4 lg:min-w-[180px]">
					{isDesktop && (
						<div className="text-13 px-2 leading-[115%] font-medium tracking-[0.02em] text-gray-600">
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
									setSelectedMenuItem(item.id);
									switch (item.id) {
										case 0:
											setCurrentSettingsPage("main");
											break;
										case 1:
											setCurrentSettingsPage("ai-features");
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
		</Modal>
	);
};

export default SettingsModal;
