interface PlanBadgeProps {
  plan: "pro" | "plus";
  size?: "sm" | "md";
}

const PLAN_STYLES = {
  pro: "bg-blue-100 text-blue-700",
  plus: "bg-amber-100 text-amber-700",
} as const;

const SIZE_STYLES = {
  sm: "px-1.5 py-px text-[10px]",
  md: "px-1.5 py-[3px] text-[12px]",
} as const;

export function PlanBadge({ plan, size = "sm" }: PlanBadgeProps) {
  return (
    <span
      className={`shrink-0 rounded-full leading-[115%] font-semibold uppercase ${PLAN_STYLES[plan]} ${SIZE_STYLES[size]}`}
    >
      {plan}
    </span>
  );
}
