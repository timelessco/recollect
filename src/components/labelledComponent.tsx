import { type ChildrenTypes } from "../types/componentTypes";

type LabelledComponentProps = {
	children: ChildrenTypes;
	label: string;
};

const LabelledComponent = (props: LabelledComponentProps) => {
	const { children, label } = props;
	return (
		<div className="w-full">
			<div className="mb-2 block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
				{label}
			</div>
			<div className="w-full">{children}</div>
		</div>
	);
};

export default LabelledComponent;
