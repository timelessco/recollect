import type { IconProps } from "@/components/ui/recollect/icon";

import { Icon } from "@/components/ui/recollect/icon";

export const CopyIcon = (props: IconProps) => (
  <Icon fill="none" {...props}>
    <g clipPath="url(#a)">
      <path
        d="M3.71 3.71v-.657a1.97 1.97 0 0 1 1.97-1.97h4.267a1.97 1.97 0 0 1 1.97 1.97v4.274a1.97 1.97 0 0 1-1.97 1.97h-.656M1.083 5.68v4.268a1.97 1.97 0 0 0 1.97 1.97h4.268a1.97 1.97 0 0 0 1.97-1.97V5.68a1.97 1.97 0 0 0-1.97-1.97H3.053a1.97 1.97 0 0 0-1.97 1.97Z"
        stroke="#949494"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="a">
        <path d="M0 0h13v13H0z" fill="#fff" />
      </clipPath>
    </defs>
  </Icon>
);
