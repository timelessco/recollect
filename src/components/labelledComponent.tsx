import { isEmpty } from "lodash";

import { cn } from "@/utils/tailwind-merge";

import { type ChildrenTypes } from "../types/componentTypes";

type LabelledComponentProps = {
  children: ChildrenTypes;
  label: string;
  // if this is present then the def label styles will not be taken
  labelClassName?: string;
};

const LabelledComponent = (props: LabelledComponentProps) => {
  const { children, label, labelClassName = "" } = props;
  const labelClass = cn({
    "mb-2 block text-sm font-medium text-gray-800 max-sm:mt-px max-sm:pt-2":
      isEmpty(labelClassName),
    [labelClassName]: !isEmpty(label),
  });
  return (
    <div className="w-full">
      <div className={labelClass}>{label}</div>
      <div className="w-full">{children}</div>
    </div>
  );
};

export default LabelledComponent;
