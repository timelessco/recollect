import type { IconProps } from "@/components/atoms/icon";

import { Icon } from "@/components/atoms/icon";

export const IframeIcon = (props: IconProps) => (
  <Icon
    {...props}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1"
  >
    <rect height="7" rx="1" width="18" x="3" y="3" />
    <rect height="7" rx="1" width="9" x="3" y="14" />
    <rect height="7" rx="1" width="5" x="16" y="14" />
  </Icon>
);
