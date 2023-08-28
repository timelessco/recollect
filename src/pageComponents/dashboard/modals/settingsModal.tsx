import Image from "next/image";
import { useSession } from "@supabase/auth-helpers-react";

import Modal from "../../../components/modal";
import { useModalStore } from "../../../store/componentStore";
import Settings from "../../settings";
import SingleListItemComponent from "../sidePane/singleListItemComponent";

// type SettingsModalTypes = {};

const SettingsModal = () => {
	const showSettingsModal = useModalStore((state) => state.showSettingsModal);
	const session = useSession();

	const toggleShowSettingsModal = useModalStore(
		(state) => state.toggleShowSettingsModal,
	);

	const optionsList = [
		{
			icon: (
				<Image
					alt="profile-pic"
					className="rounded-full"
					height={18}
					src={session?.user.user_metadata?.avatar_url}
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
				<div className=" w-full px-[68px] py-[43px]">
					<Settings />
				</div>
			</div>
		</Modal>
	);
};

export default SettingsModal;
