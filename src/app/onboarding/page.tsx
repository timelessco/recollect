import type { Metadata } from "next";

import { OnboardingModal } from "@/pageComponents/onboarding/onboarding-modal";
import { BASE_URL } from "@/site-config";
import { generatePageMetadata } from "@/utils/metadata-utils";

export const metadata: Metadata = generatePageMetadata({
  title: "Welcome to Recollect",
  url: `${BASE_URL}/onboarding`,
});

export default function OnboardingPage() {
  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-gray-100"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgb(255 184 107 / 0.55), transparent 40%), radial-gradient(circle at 85% 30%, rgb(255 99 132 / 0.45), transparent 45%), radial-gradient(circle at 50% 85%, rgb(120 186 255 / 0.45), transparent 45%)",
      }}
    >
      <OnboardingModal />
    </div>
  );
}
