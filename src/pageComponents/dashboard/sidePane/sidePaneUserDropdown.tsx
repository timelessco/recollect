import { ChevronDoubleLeftIcon } from "@heroicons/react/solid";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isEmpty, isNull } from "lodash";

import useGetUserProfilePic from "../../../async/queryHooks/user/useGetUserProfilePic";
import { signOut } from "../../../async/supabaseCrudHelpers";
import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import Button from "../../../components/atoms/button";
import UserAvatar from "../../../components/userAvatar";
import DownArrowGray from "../../../icons/downArrowGray";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { type ProfilesTableTypes } from "../../../types/apiTypes";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
	smoothHoverClassName,
} from "../../../utils/commonClassNames";
import { USER_PROFILE } from "../../../utils/constants";

const SidePaneUserDropdown = () => {
	const session = useSession();
	const queryClient = useQueryClient();
	const supabase = useSupabaseClient();
	const setShowSidePane = useMiscellaneousStore(
		(state) => state.setShowSidePane,
	);

	const { userProfilePicData } = useGetUserProfilePic(
		session?.user?.email ?? "",
	);

	const userProfilesDataQuery = queryClient.getQueryData([
		USER_PROFILE,
		session?.user?.id,
	]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userProfileData = !isEmpty(userProfilesDataQuery?.data)
		? userProfilesDataQuery?.data[0]
		: {};

	return (
		<div className="flex justify-between">
			<AriaDropdown
				menuButton={
					<div
						className={`${smoothHoverClassName} flex w-full items-center justify-between rounded-lg px-1 py-[3px] hover:bg-custom-gray-8`}
					>
						<div className="flex w-4/5 items-center space-x-2">
							<UserAvatar
								alt="user-avatar"
								className="h-6 w-6 rounded-full bg-black object-contain"
								height={24}
								src={
									!isNull(userProfilePicData?.data)
										? userProfilePicData?.data[0]?.profile_pic ?? ""
										: ""
								}
								width={24}
							/>
							<p className="flex-1 overflow-hidden truncate text-left text-sm font-medium leading-4 text-custom-gray-1">
								{userProfileData?.user_name}
							</p>
						</div>
						<figure>
							<DownArrowGray />
						</figure>
					</div>
				}
				menuButtonActiveClassName="bg-custom-gray-8 rounded-lg"
				menuButtonClassName="w-full"
				menuClassName={dropdownMenuClassName}
			>
				{[{ label: "Sign Out", value: "sign-out" }]?.map((item) => (
					<AriaDropdownMenu key={item?.value} onClick={() => signOut(supabase)}>
						<div className={dropdownMenuItemClassName}>{item?.label}</div>
					</AriaDropdownMenu>
				))}
			</AriaDropdown>
			{/* <Button onClick={() => setShowSidePane(false)}>
				<figure>
					<ChevronDoubleLeftIcon className="h-4 w-4 shrink-0 text-gray-400" />
				</figure>
			</Button> */}
		</div>
	);
};

export default SidePaneUserDropdown;
