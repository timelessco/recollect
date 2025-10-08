import classNames from "classnames";
import { isEmpty } from "lodash";

import { type ChildrenTypes } from "../types/componentTypes";

type LabelledComponentProps = {
	children: ChildrenTypes;
	label: string;
	// if this is present then the def label styles will not be taken
	labelClassName?: string;
};

const LabelledComponent = (props: LabelledComponentProps) => {
	const { children, label, labelClassName = "" } = props;
	const labelClass = classNames({
		"mb-2 block text-sm font-medium text-gray-400 sm:mt-px sm:pt-2":
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
