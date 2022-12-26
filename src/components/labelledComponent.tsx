import { ChildrenTypes } from '../types/componentTypes';

interface LabelledComponentProps {
  label: string;
  children: ChildrenTypes;
}

const LabelledComponent = (props: LabelledComponentProps) => {
  const { children, label } = props;
  return (
    <div className="w-full">
      <div className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2 mb-2">
        {label}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
};

export default LabelledComponent;
