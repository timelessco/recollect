import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isNull } from "lodash";

import useGetUserProfilePic from "../../../async/queryHooks/user/useGetUserProfilePic";
import { signOut } from "../../../async/supabaseCrudHelpers";
import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import UserAvatar from "../../../components/userAvatar";
import DownArrowGray from "../../../icons/downArrowGray";
import { useSupabaseSession } from "../../../store/componentStore";
import { type ProfilesTableTypes } from "../../../types/apiTypes";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
	smoothHoverClassName,
} from "../../../utils/commonClassNames";
import { LOGIN_URL, USER_PROFILE } from "../../../utils/constants";
import { createClient } from "../../../utils/supabaseClient";

const SidePaneUserDropdown = () => {
	const session = useSupabaseSession((state) => state.session);
	const setSession = useSupabaseSession((state) => state.setSession);
	const router = useRouter();

	const queryClient = useQueryClient();
	const supabase = createClient();

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

	const userProfileData = userProfilesDataQuery?.data?.[0];

	return (
		<div className="group flex justify-between">
			<AriaDropdown
				menuButton={
					<div
						className={`${smoothHoverClassName} flex w-full items-center justify-between rounded-lg px-1 py-[3px] hover:bg-hover-selected-color-1 `}
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
							<p className="flex-1 overflow-hidden truncate text-left text-sm font-medium leading-4 text-main-text-1 group-hover:dark:text-main-text-2">
								{userProfileData?.display_name || userProfileData?.user_name}
							</p>
						</div>
						<figure>
							<DownArrowGray />
						</figure>
					</div>
				}
				menuButtonActiveClassName="bg-hover-selected-color-1 rounded-lg"
				menuButtonClassName="w-full"
				menuClassName={dropdownMenuClassName}
			>
				{[{ label: "Sign Out", value: "sign-out" }]?.map((item) => (
					<AriaDropdownMenu
						key={item?.value}
						onClick={async () => {
							await signOut(supabase);
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
							// @ts-expect-error
							setSession({});
							void router.push(`/${LOGIN_URL}`);
						}}
					>
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
