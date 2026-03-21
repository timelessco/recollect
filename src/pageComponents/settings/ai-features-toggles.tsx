import { AiSummaryIcon } from "@/icons/ai-summary-icon";
import { AutoAssignCollectionIcon } from "@/icons/auto-assign-collection-icon";
import { ImageKeywordsIcon } from "@/icons/image-keywords-icon";
import { OcrIcon } from "@/icons/ocr-icon";
import { type AiFeaturesToggle } from "@/types/apiTypes";

import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import { SettingsToggleCard } from "./settingsToggleCard";

interface AiToggleConfig {
  description: string;
  icon: React.ReactNode;
  key: keyof AiFeaturesToggle;
  title: string;
}

const TOGGLES: AiToggleConfig[] = [
  {
    key: "auto_assign_collections",
    title: "Auto Collections",
    description: "Automatically assign bookmarks to collections",
    icon: <AutoAssignCollectionIcon className="h-5.5 w-5.5 text-gray-900" />,
  },
  {
    key: "ai_summary",
    title: "Auto summarise all bookmarks",
    description: "Generate descriptions for bookmarks",
    icon: <AiSummaryIcon className="h-5.5 w-5.5 text-gray-900" />,
  },
  {
    key: "image_keywords",
    title: "Bookmark Keywords",
    description: "Generate searchable keywords from bookmarks",
    icon: <ImageKeywordsIcon className="h-5.5 w-5.5 text-gray-900" />,
  },
  {
    key: "ocr",
    title: "Extract text from all screenshots and images",
    description: "So you can search all your memes by text",
    icon: <OcrIcon className="h-5.5 w-5.5 text-gray-900" />,
  },
];

export function AiFeaturesToggleSection() {
  const { userProfileData, isLoading } = useFetchUserProfile();
  const { updateUserProfileOptimisticMutation } = useUpdateUserProfileOptimisticMutation();

  const userData = userProfileData?.data?.[0];
  const aiFeatures = userData?.ai_features_toggle;

  return (
    <div className="pt-10">
      <p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">Features</p>
      <div className="space-y-2.5">
        {TOGGLES.map((toggle) => {
          const enabled = aiFeatures?.[toggle.key] !== false;

          const handleToggle = () => {
            updateUserProfileOptimisticMutation.mutate({
              updateData: {
                ai_features_toggle: {
                  ...aiFeatures,
                  [toggle.key]: !enabled,
                },
              },
            });
          };

          return (
            <SettingsToggleCard
              key={toggle.key}
              icon={<span className="text-gray-900">{toggle.icon}</span>}
              title={toggle.title}
              description={toggle.description}
              isSwitch
              enabled={isLoading ? false : enabled}
              onToggle={isLoading ? undefined : handleToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
