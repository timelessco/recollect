import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isEmpty } from "lodash";

import Modal from "../../../components/modal";
import UserAvatar from "../../../components/userAvatar";
import {
	useMiscellaneousStore,
	useModalStore,
} from "../../../store/componentStore";
import { type ProfilesTableTypes } from "../../../types/apiTypes";
import { USER_PROFILE } from "../../../utils/constants";
import Settings from "../../settings";
import ChangeEmail from "../../settings/changeEmail";
import SingleListItemComponent from "../sidePane/singleListItemComponent";

// type SettingsModalTypes = {};

const SettingsModal = () => {
	const showSettingsModal = useModalStore((state) => state.showSettingsModal);
	const session = useSession();
	const queryClient = useQueryClient();

	const toggleShowSettingsModal = useModalStore(
		(state) => state.toggleShowSettingsModal,
	);

	const currentSettingsPage = useMiscellaneousStore(
		(state) => state.currentSettingsPage,
	);

	const userProfilesData = queryClient.getQueryData([
		USER_PROFILE,
		session?.user?.id,
	]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userData = !isEmpty(userProfilesData?.data)
		? userProfilesData?.data[0]
		: {};

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
			default:
				return null;
		}
	};

	return (
		<Modal
			open={showSettingsModal}
			setOpen={() => toggleShowSettingsModal()}
			wrapperClassName="w-[75%] h-[83%] rounded-2xl"
		>
			{/* <div onClick={() => toggleShowSettingsModal()}>close</div> */}
			<div className="flex h-full">
				<div className="h-full min-w-[220px] rounded-l-2xl border-r-[0.5px] border-r-custom-gray-4 px-2 py-4">
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
				<div className=" w-full px-[68px] py-[43px]">{renderMainContent()}</div>
			</div>
		</Modal>
	);
};

export default SettingsModal;
