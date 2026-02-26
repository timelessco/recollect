import { useRouter } from "next/router";
import { Popover } from "@base-ui/react/popover";
import isNull from "lodash/isNull";

import { signOut } from "../../../async/supabaseCrudHelpers";
import UserAvatar from "../../../components/userAvatar";
import DownArrowGray from "../../../icons/downArrowGray";
import { useSupabaseSession } from "../../../store/componentStore";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";
import { LOGIN_URL } from "../../../utils/constants";
import { createClient } from "../../../utils/supabaseClient";

import useFetchUserProfile from "@/async/queryHooks/user/useFetchUserProfile";

const menuItems = [{ label: "Sign Out", value: "sign-out" }];

const SidePaneUserDropdown = () => {
	const setSession = useSupabaseSession((state) => state.setSession);
	const router = useRouter();

	const supabase = createClient();

	const handleSignOut = async () => {
		await signOut(supabase);
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		setSession({});
		void router.push(`/${LOGIN_URL}`);
	};

	const dropdownContent = (
		<>
			{menuItems.map((item) => (
				<div
					key={item.value}
					className={`rounded-lg focus:bg-transparent focus:text-gray-800 focus-visible:outline-hidden ${dropdownMenuItemClassName} hover:bg-gray-200 hover:text-gray-900`}
					onClick={() => {
						void handleSignOut();
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							void handleSignOut();
						}
					}}
					role="menuitem"
					tabIndex={-1}
				>
					{item.label}
				</div>
			))}
		</>
	);

	return (
		<div className="flex justify-between">
			<SidePaneUserPopover>{dropdownContent}</SidePaneUserPopover>
		</div>
	);
};

interface SidePaneUserPopoverProps {
	children: React.ReactNode;
}

const SidePaneUserPopover = ({ children }: SidePaneUserPopoverProps) => (
	<Popover.Root>
		<Popover.Trigger
			className="text-text-color w-full rounded-lg px-1.5 py-[3px] text-gray-800 outline-hidden hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-hidden data-popup-open:rounded-lg data-popup-open:bg-gray-100 data-popup-open:text-gray-900"
			nativeButton={false}
			title="User menu"
		>
			<div className="flex w-full items-center justify-between">
				<SidePaneUserTrigger />
				<figure className="mt-px">
					<DownArrowGray />
				</figure>
			</div>
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Positioner align="start" sideOffset={1}>
				<Popover.Popup
					className={`z-20 leading-[20px] outline-hidden focus-visible:outline-hidden ${dropdownMenuClassName}`}
				>
					{children}
				</Popover.Popup>
			</Popover.Positioner>
		</Popover.Portal>
	</Popover.Root>
);

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
