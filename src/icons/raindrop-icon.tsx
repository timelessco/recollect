import type { IconProps } from "@/components/atoms/icon";

import { Icon } from "@/components/atoms/icon";

export const RaindropIcon = (props: IconProps) => (
  <Icon fill="none" viewBox="0 0 32 26" {...props}>
    <path
      clipRule="evenodd"
      d="M23.535 3.505a10.667 10.667 0 0 1-.4 15.468l-7.134 6.733-7.134-6.667-.4-.466A10.667 10.667 0 1 1 23.535 3.505Z"
      fill="#1988E0"
      fillRule="evenodd"
    />
    <path d="M8 9.705a8 8 0 0 1 8.001 8v8.001h-8a8 8 0 1 1 0-16Z" fill="#2CD4ED" />
    <mask
      height="17"
      id="a"
      maskUnits="userSpaceOnUse"
      style={{ maskType: "luminance" }}
      width="17"
      x="0"
      y="9"
    >
      <path d="M8 9.705a8 8 0 0 1 8.001 8v8.001h-8a8 8 0 1 1 0-16Z" fill="#fff" />
    </mask>
    <g mask="url(#a)">
      <path
        clipRule="evenodd"
        d="M23.535 3.505a10.667 10.667 0 0 1-.4 15.468l-7.134 6.733-7.134-6.667-.4-.466A10.667 10.667 0 1 1 23.535 3.505Z"
        fill="#0DB4E2"
        fillRule="evenodd"
      />
    </g>
    <path d="M16.001 25.706v-8.2a8 8 0 1 1 8 8.2h-8Z" fill="#3169FF" />
    <mask
      height="17"
      id="b"
      maskUnits="userSpaceOnUse"
      style={{ maskType: "luminance" }}
      width="16"
      x="16"
      y="9"
    >
      <path d="M16.001 25.706v-8.2a8 8 0 1 1 8 8.2h-8Z" fill="#fff" />
    </mask>
    <g mask="url(#b)">
      <path
        clipRule="evenodd"
        d="M23.535 3.505a10.667 10.667 0 0 1-.4 15.468l-7.134 6.733-7.134-6.667-.4-.466A10.667 10.667 0 1 1 23.535 3.505Z"
        fill="#3153FF"
        fillRule="evenodd"
      />
    </g>
  </Icon>
);
