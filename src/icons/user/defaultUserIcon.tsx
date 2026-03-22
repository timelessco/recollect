import type { SVGProps } from "react";

import { cn } from "@/utils/tailwind-merge";

export const DefaultUserIcon = ({ className = "h-6 w-6", ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden
    className={cn("shrink-0", className)}
    fill="none"
    viewBox="0 0 44 44"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="22" cy="22" fill="black" r="22" />
    <path
      d="M23.1441 27.7361L28.9503 32.0745C29.6435 32.5925 30.6307 32.0978 30.6307 31.2324V22.8301V17.4165C30.6307 14.6073 28.3534 12.3301 25.5443 12.3301H22.5002H14.3696V22.8301V31.2373C14.3696 32.1018 15.355 32.5967 16.0484 32.0806L21.8873 27.7349C22.2604 27.4572 22.7715 27.4577 23.1441 27.7361Z"
      fill="white"
    />
  </svg>
);
