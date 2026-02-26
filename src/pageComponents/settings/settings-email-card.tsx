import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import { GoogleLoginIcon } from "../../icons/googleLoginIcon";
import { InfoIcon } from "../../icons/info-icon";
import { MailIconBlack } from "../../icons/miscellaneousIcons/mailIconBlack";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";

import { SettingsToggleCard } from "./settingsToggleCard";

export function SettingsEmailCard() {
	return (
		<div className="pt-10">
			<p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">
				Email
			</p>
			<SettingsEmailCardContent />
		</div>
	);
}

function SettingsEmailCardContent() {
	const session = useSupabaseSession((state) => state.session);
	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);
	const { userProfileData } = useFetchUserProfile();

	const userData = userProfileData?.data?.[0];
	const isEmailProvider = session?.user?.app_metadata?.provider === "email";

	const handleChangeEmail = () => {
		setCurrentSettingsPage("change-email");
	};

	return (
		<>
			<SettingsToggleCard
				icon={
					isEmailProvider ? (
						<MailIconBlack className="h-5.5 w-5.5 text-gray-900" />
					) : (
						<GoogleLoginIcon className="h-5 w-5" />
					)
				}
				title={userData?.email ?? ""}
				description="Current email"
				buttonLabel={isEmailProvider ? "Change email" : undefined}
				onClick={isEmailProvider ? handleChangeEmail : undefined}
			/>
			{!isEmailProvider && (
				<div className="mt-2 flex items-center gap-x-2 text-13 leading-[150%] font-normal text-gray-600">
					<figure className="text-gray-900">
						<InfoIcon className="h-4.5 w-4.5" />
					</figure>
					You have logged in with your Google account.
				</div>
			)}
		</>
	);
}
