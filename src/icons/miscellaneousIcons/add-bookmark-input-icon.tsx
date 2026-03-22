import type { IconProps } from "@/components/atoms/icon";

import { Icon } from "@/components/atoms/icon";

export const AddBookmarkInputIcon = (props: IconProps) => (
  <Icon {...props} fill="none" viewBox="0 0 16 16">
    <g clipPath="url(#a)" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect
        fill="var(--color-gray-100)"
        height="11.015"
        rx="3"
        transform="rotate(7.33 6.585 3)"
        width="9.589"
        x="6.585"
        y="3"
      />
      <rect
        fill="var(--color-gray-100)"
        height="12.133"
        rx="3"
        transform="rotate(-13.882 0 3.488)"
        width="10.372"
        y="3.488"
      />
      <path d="m5.876 5.75 1.228 4.5M8.74 7.387l-4.5 1.227" />
    </g>
    <defs>
      <clipPath id="a">
        <path d="M0 0h16v16H0z" fill="#fff" />
      </clipPath>
    </defs>
  </Icon>
);
