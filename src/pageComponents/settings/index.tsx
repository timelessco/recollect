import Image from "next/image";
import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { type ProfilesTableTypes } from "../../types/apiTypes";
import { USER_PROFILE } from "../../utils/constants";

const Settings = () => {
	const queryClient = useQueryClient();
	const session = useSession();
	const userId = session?.user?.id;

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userData = userProfilesData?.data[0];

	return (
		<div className="p-6">
			<Image
				alt="profile-pic"
				className="rounded-full"
				height={100}
				src={userData?.profile_pic ?? ""}
				width={100}
			/>
		</div>
	);
};

export default Settings;
