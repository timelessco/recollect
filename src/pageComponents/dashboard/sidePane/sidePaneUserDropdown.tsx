import Image from "next/image";
import { ChevronDoubleLeftIcon } from "@heroicons/react/solid";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { isEmpty, isNull } from "lodash";

import useGetUserProfilePic from "../../../async/queryHooks/user/useGetUserProfilePic";
import { signOut } from "../../../async/supabaseCrudHelpers";
import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import Button from "../../../components/atoms/button";
import DownArrowGray from "../../../icons/downArrowGray";
import { useMiscellaneousStore } from "../../../store/componentStore";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
	smoothHoverClassName,
} from "../../../utils/commonClassNames";

const SidePaneUserDropdown = () => {
	const session = useSession();
	const supabase = useSupabaseClient();
	const setShowSidePane = useMiscellaneousStore(
		(state) => state.setShowSidePane,
	);

	const { userProfilePicData } = useGetUserProfilePic(
		session?.user?.email ?? "",
	);

	const userData = session?.user?.user_metadata;

	return (
		<div className="flex justify-between">
			<AriaDropdown
				menuButton={
					<div
						className={`${smoothHoverClassName} flex w-full items-center justify-between rounded-lg px-1 py-[3px] hover:bg-custom-gray-8`}
					>
						<div className="flex w-4/5 items-center space-x-2">
							{!isEmpty(userProfilePicData?.data) &&
							!isNull(userProfilePicData?.data) &&
							!isNull(userProfilePicData?.data[0]?.profile_pic) ? (
								<Image
									alt=""
									className="h-6 w-6 rounded-full object-cover"
									height={24}
									src={
										!isNull(userProfilePicData?.data)
											? userProfilePicData?.data[0]?.profile_pic ?? ""
											: ""
									}
									width={24}
								/>
							) : (
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200">
									<svg
										fill="#000000"
										height="14"
										viewBox="0 0 18 18"
										width="14"
									>
										<use href="/sprite.svg#user" />
									</svg>
								</div>
							)}
							<p className="flex-1 overflow-hidden truncate text-left text-sm font-medium leading-4 text-custom-gray-1">
								{userData?.name || session?.user?.email}
							</p>
						</div>
						<figure className="mr-3">
							<DownArrowGray />
						</figure>
					</div>
				}
				menuButtonActiveClassName="bg-custom-gray-8 rounded-lg"
				menuButtonClassName="w-[86%]"
				menuClassName={dropdownMenuClassName}
			>
				{[{ label: "Sign Out", value: "sign-out" }]?.map((item) => (
					<AriaDropdownMenu key={item?.value} onClick={() => signOut(supabase)}>
						<div className={dropdownMenuItemClassName}>{item?.label}</div>
					</AriaDropdownMenu>
				))}
			</AriaDropdown>
			<Button onClick={() => setShowSidePane(false)}>
				<figure>
					<ChevronDoubleLeftIcon className="h-4 w-4 shrink-0 text-gray-400" />
				</figure>
			</Button>
		</div>
	);
};

export default SidePaneUserDropdown;
