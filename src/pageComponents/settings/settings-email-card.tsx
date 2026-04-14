import type { SettingsPage } from "../dashboard/modals/settings-modal";

import useFetchUserProfile from "../../async/queryHooks/user/use-fetch-user-profile";
import { AppleIcon } from "../../icons/apple-icon";
import { GoogleLoginIcon } from "../../icons/googleLoginIcon";
import { InfoIcon } from "../../icons/info-icon";
import { MailIconBlack } from "../../icons/miscellaneousIcons/mailIconBlack";
import { useSupabaseSession } from "../../store/componentStore";
import { SettingsToggleCard } from "./settingsToggleCard";

interface SettingsEmailCardProps {
  onNavigate: (page: SettingsPage) => void;
}

export function SettingsEmailCard({ onNavigate }: SettingsEmailCardProps) {
  return (
    <div className="pt-10">
      <p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">Email</p>
      <SettingsEmailCardContent onNavigate={onNavigate} />
    </div>
  );
}

interface SettingsEmailCardContentProps {
  onNavigate: (page: SettingsPage) => void;
}

function SettingsEmailCardContent({ onNavigate }: SettingsEmailCardContentProps) {
  const session = useSupabaseSession((state) => state.session);
  const { userProfileData } = useFetchUserProfile();

  const userData = userProfileData?.[0];
  const provider = session?.user?.app_metadata?.provider;
  const isEmailProvider = provider === "email";

  return (
    <>
      <SettingsToggleCard
        buttonLabel={isEmailProvider ? "Change email" : undefined}
        description="Current email"
        icon={(() => {
          if (isEmailProvider) {
            return <MailIconBlack className="h-5.5 w-5.5 text-gray-900" />;
          }

          return provider === "apple" ? (
            <AppleIcon className="h-5 w-5" />
          ) : (
            <GoogleLoginIcon className="h-5 w-5" />
          );
        })()}
        onClick={
          isEmailProvider
            ? () => {
                onNavigate("change-email");
              }
            : undefined
        }
        title={userData?.email ?? ""}
      />
      {!isEmailProvider && (
        <div className="mt-2 flex items-center gap-x-2 text-13 leading-[150%] font-normal text-gray-600">
          <figure className="text-gray-900">
            <InfoIcon className="h-4.5 w-4.5" />
          </figure>
          You have logged in with your {provider === "apple" ? "Apple" : "Google"} account.
        </div>
      )}
    </>
  );
}
