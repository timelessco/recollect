import { useRouter } from "next/router";
import isNull from "lodash/isNull";

import { signOut } from "../../../async/supabaseCrudHelpers";
import UserAvatar from "../../../components/userAvatar";
import DownArrowGray from "../../../icons/downArrowGray";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useSupabaseSession } from "../../../store/componentStore";
import { Menu } from "@/components/ui/recollect/menu";
import { LOGIN_URL } from "../../../utils/constants";
import { createClient } from "../../../utils/supabaseClient";

import useFetchUserProfile from "@/async/queryHooks/user/useFetchUserProfile";

const SidePaneUserDropdown = () => {
	const setSession = useSupabaseSession((state) => state.setSession);
	const router = useRouter();
	const { isDesktop } = useIsMobileView();

	const supabase = createClient();

	const handleSignOut = async () => {
		await signOut(supabase);
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		setSession({});
		void router.push(`/${LOGIN_URL}`);
	};

	return (
		<div className="flex justify-between">
			<Menu.Root modal={false}>
				<Menu.Trigger
					className="text-text-color w-full rounded-lg px-1.5 py-[3px] text-gray-800 outline-hidden hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-1 focus-visible:ring-gray-200 data-popup-open:rounded-lg data-popup-open:bg-gray-100 data-popup-open:text-gray-900"
					title="User menu"
				>
					<div className="flex w-full items-center justify-between">
						<SidePaneUserTrigger />
						<span className="mt-px" aria-hidden="true">
							<DownArrowGray />
						</span>
					</div>
				</Menu.Trigger>
				<Menu.Portal
					container={
						!isDesktop
							? (document.querySelector("#side-pane-dropdown-portal") as
									| HTMLElement
									| undefined)
							: undefined
					}
				>
					<Menu.Positioner align="start" className="pointer-events-auto">
						<Menu.Popup className="z-20 leading-[20px]">
							<Menu.Item
								onClick={() => {
									void handleSignOut();
								}}
							>
								Sign Out
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
		</div>
	);
};

const SidePaneUserTrigger = () => {
	const { userProfileData, isLoading } = useFetchUserProfile();
	const userData = userProfileData?.data?.[0];

	return (
		<div className="-ml-0.25 flex w-4/5 items-center space-x-2">
			<UserAvatar
				alt="user-avatar"
				className="h-6 w-6 rounded-full bg-gray-1000 object-contain"
				height={24}
				src={
					!isNull(userData?.profile_pic) ? (userData?.profile_pic ?? "") : ""
				}
				width={24}
			/>
			<p className="flex-1 truncate overflow-hidden text-left text-sm leading-4 font-medium text-gray-800">
				{isLoading
					? "Loading..."
					: userData?.display_name || userData?.user_name || userData?.email}
			</p>
		</div>
	);
};

export default SidePaneUserDropdown;
