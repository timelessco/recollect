import type { IconProps } from "@/components/ui/recollect/icon";

import { Icon } from "@/components/ui/recollect/icon";

export const FileLinkIcon = (props: IconProps) => (
  <Icon fill="none" viewBox="0 0 18 18" {...props}>
    <mask
      height="17"
      id="fileLinkMask"
      maskUnits="userSpaceOnUse"
      style={{ maskType: "luminance" }}
      width="16"
      x="1"
      y="0"
    >
      <path d="M17 0.527344H1V16.5273H17V0.527344Z" fill="white" />
    </mask>
    <g mask="url(#fileLinkMask)">
      <path
        d="M13.6947 4.86382L10.1353 4.40591C8.7659 4.22973 7.51294 5.19705 7.33677 6.56648L6.69688 11.5404C6.5207 12.9098 7.48802 14.1628 8.85745 14.3389L12.4168 14.7969C13.7863 14.973 15.0392 14.0057 15.2154 12.6363L15.8553 7.66238C16.0315 6.29295 15.0641 5.04 13.6947 4.86382Z"
        stroke="currentColor"
      />
      <path
        d="M7.91574 2.73204L3.671 3.78106C2.33062 4.11232 1.51256 5.46746 1.84381 6.80784L3.31516 12.7614C3.64642 14.1018 5.00155 14.9199 6.34194 14.5886L10.5867 13.5396C11.9271 13.2083 12.7451 11.8532 12.4139 10.5128L10.9425 4.55923C10.6113 3.21884 9.25612 2.40078 7.91574 2.73204Z"
        fill="#3A3E40"
        stroke="currentColor"
      />
      <path d="M6.51514 6.27734L7.74241 10.7773" stroke="currentColor" />
      <path d="M9.37891 7.91406L4.87891 9.14133" stroke="currentColor" />
    </g>
  </Icon>
);
