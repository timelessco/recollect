import type { IconProps } from "@/components/ui/recollect/icon";

import { Icon } from "@/components/ui/recollect/icon";

export const PlusIcon = (props: IconProps) => (
  <Icon fill="none" viewBox="0 0 18 18" {...props}>
    <path
      clipRule="evenodd"
      d="M9.00037 3.83301C9.27633 3.83322 9.50037 4.057 9.50037 4.33301V8.5H13.6664L13.768 8.50976C13.9956 8.55658 14.1664 8.75855 14.1664 9C14.1662 9.24132 13.9955 9.44349 13.768 9.49023L13.6664 9.5H9.50037V13.666L9.49061 13.7676C9.44387 13.9951 9.24169 14.1658 9.00037 14.166C8.75893 14.166 8.55696 13.9952 8.51014 13.7676L8.50037 13.666V9.5H4.33337C4.05736 9.5 3.83358 9.27596 3.83337 9C3.83337 8.72386 4.05723 8.5 4.33337 8.5H8.50037V4.33301C8.50037 4.05687 8.72422 3.83301 9.00037 3.83301Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </Icon>
);
