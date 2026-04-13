import type { IconProps } from "@/components/ui/recollect/icon";

import { Icon } from "@/components/ui/recollect/icon";

export const PlusIcon = (props: IconProps) => (
  <Icon fill="none" viewBox="0 0 16 16" {...props}>
    <path
      d="M8 3.33301V12.6663M3.33333 7.99967H12.6667"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </Icon>
);
