import useFetchUserProfile from "@/async/queryHooks/user/use-fetch-user-profile";
import { PlanBadge } from "@/components/planBadge";
import { settingsMainHeadingClassName } from "@/utils/commonClassNames";

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    price: "$5",
    interval: "month",
    description: "Monthly plan with Pro features",
  },
  {
    id: "plus",
    name: "Plus",
    price: "$50",
    interval: "year",
    description: "Annual plan with Plus features",
  },
] as const;

function hasActivePaidAccess(
  plan: string | undefined,
  status: string | null | undefined,
  periodEnd: string | null | undefined,
): boolean {
  if (plan === "free" || !plan) {
    return false;
  }

  if (status === "active" || status === "past_due") {
    return true;
  }

  if (status === "canceled" && periodEnd) {
    return new Date(periodEnd).getTime() > Date.now();
  }

  return false;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return "";
  }

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function handleCheckout(planId: string) {
  window.location.assign(`/api/polar/checkout?plan=${planId}`);
}

function handleManageSubscription() {
  window.location.assign("/api/polar/portal");
}

export function Subscription() {
  const { userProfileData } = useFetchUserProfile();
  const userData = userProfileData?.[0];
  const currentPlan = userData?.plan ?? "free";
  const isSubscribed = hasActivePaidAccess(
    currentPlan,
    userData?.subscription_status,
    userData?.subscription_current_period_end,
  );
  const isCanceled = userData?.subscription_status === "canceled" && isSubscribed;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <p className={settingsMainHeadingClassName}>Subscription</p>
        {isSubscribed && currentPlan !== "free" && (
          <PlanBadge plan={currentPlan as "pro" | "plus"} size="md" />
        )}
      </div>

      {isSubscribed ? (
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[14px] leading-[150%] font-medium text-gray-900">
            You&apos;re on the <span className="capitalize">{currentPlan}</span> plan
          </p>
          {isCanceled ? (
            <p className="mt-1 text-[14px] leading-[150%] text-gray-600">
              Your subscription ends on {formatDate(userData?.subscription_current_period_end)}. You
              can resubscribe through the customer portal.
            </p>
          ) : (
            <>
              <p className="mt-1 text-[14px] leading-[150%] text-gray-600">
                Manage your subscription, update payment methods, or cancel through the customer
                portal.
              </p>
              {userData?.subscription_current_period_end && (
                <p className="mt-1 text-[13px] leading-[150%] text-gray-500">
                  Next renewal: {formatDate(userData.subscription_current_period_end)}
                </p>
              )}
            </>
          )}
          <button
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-13 font-medium text-gray-0 hover:bg-gray-800"
            onClick={handleManageSubscription}
            type="button"
          >
            Manage Subscription
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] leading-[150%] text-gray-600">
            Upgrade your account to unlock additional features.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => (
              <div className="flex flex-col rounded-lg border border-gray-100 p-4" key={plan.id}>
                <p className="text-[14px] font-semibold text-gray-900">{plan.name}</p>
                <p className="mt-1 text-[24px] leading-[115%] font-semibold text-gray-900">
                  {plan.price}
                  <span className="text-[14px] font-normal text-gray-600">/{plan.interval}</span>
                </p>
                <p className="mt-2 text-[13px] leading-[150%] text-gray-600">{plan.description}</p>
                <button
                  className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-13 font-medium text-gray-0 hover:bg-gray-800"
                  onClick={() => {
                    handleCheckout(plan.id);
                  }}
                  type="button"
                >
                  Subscribe
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
