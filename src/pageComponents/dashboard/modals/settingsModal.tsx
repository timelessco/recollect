import { useEffect } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import Modal from "../../../components/modal";
import UserAvatar from "../../../components/userAvatar";
import {
	useMiscellaneousStore,
	useModalStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { type ProfilesTableTypes } from "../../../types/apiTypes";
import { USER_PROFILE } from "../../../utils/constants";
import Settings from "../../settings";
import { ApiKey } from "../../settings/apiKey";
import ChangeEmail from "../../settings/changeEmail";
import DeleteAccout from "../../settings/deleteAccount";
import SingleListItemComponent from "../sidePane/singleListItemComponent";

// type SettingsModalTypes = {};

const SettingsModal = () => {
	const showSettingsModal = useModalStore((state) => state.showSettingsModal);
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const toggleShowSettingsModal = useModalStore(
		(state) => state.toggleShowSettingsModal,
	);

	const currentSettingsPage = useMiscellaneousStore(
		(state) => state.currentSettingsPage,
	);

	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	// reset useeffect
	useEffect(() => {
		if (!showSettingsModal) {
			setCurrentSettingsPage("main");
		}
	}, [setCurrentSettingsPage, showSettingsModal]);

	const userProfilesData = queryClient.getQueryData([
		USER_PROFILE,
		session?.user?.id,
	]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userData = userProfilesData?.data?.[0];

	const optionsList = [
		{
			icon: (
				<UserAvatar
					alt="profile-pic"
					className="h-[18px] w-[18px] rounded-full bg-black object-contain"
					height={18}
					src={userData?.profile_pic ?? ""}
					width={18}
				/>
			),
			name: "My Profile",
			href: ``,
			current: true,
			id: 0,
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
			case "api-key":
				return <ApiKey />;
			default:
				return null;
		}
	};

	return (
		<Modal
			open={showSettingsModal}
			setOpen={() => toggleShowSettingsModal()}
			// adding skip-global-paste to avoid global paste event in the modal
			wrapperClassName="skip-global-paste w-[65.4%] xl:w-[80%] h-[82%] rounded-2xl outline-none"
		>
			{/* <div onClick={() => toggleShowSettingsModal()}>close</div> */}
			<div className="flex h-full">
				<div className="h-full min-w-[220px] rounded-l-2xl border-r-[0.5px] border-r-custom-gray-4 px-2 py-4 xl:hidden">
					<div className=" px-2 text-base font-semibold leading-[18px] text-black">
						Settings
					</div>
					<div className=" mt-3">
						{optionsList?.map((item) => (
							<SingleListItemComponent
								extendedClassname="py-[6px]"
								isLink={false}
								item={item}
								key={item.id}
								showIconDropdown={false}
							/>
						))}
					</div>
				</div>
				<div className=" w-full overflow-y-scroll p-6">
					{renderMainContent()}
				</div>
			</div>
		</Modal>
	);
};

export default SettingsModal;
