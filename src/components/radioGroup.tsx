import { type RefObject } from "react";
import {
	RadioGroup as AriaRadioGroup,
	Radio,
	useRadioState,
} from "ariakit/radio";

import TickIcon from "../icons/tickIcon";
import { type ChildrenTypes } from "../types/componentTypes";

type RadioGroupProps = {
	initialRadioRef?:
		| RefObject<HTMLInputElement>
		| ((instance: HTMLInputElement | null) => void)
		| null
		| undefined;
	onChange: (value: string) => void;
	radioList: Array<{ icon: ChildrenTypes; label: string; value: string }>;
	value: string;
};

const RadioGroup = (props: RadioGroupProps) => {
	const { radioList, onChange, value, initialRadioRef } = props;
	const radio = useRadioState();
	return (
		<AriaRadioGroup className="dropdown-container flex flex-col" state={radio}>
			{radioList?.map((item) => {
				const isRadioSelected = value === item?.value;
				return (
					// as per docs htmlFor is not needed ref: https://ariakit.org/components/radio
					// eslint-disable-next-line jsx-a11y/label-has-associated-control
					<label
						className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-[5px] text-sm leading-4 text-custom-gray-1 hover:bg-custom-gray-9"
						key={item?.value}
					>
						<div className="flex items-center text-[13px] font-450 text-custom-gray-1">
							<figure className="mr-2 flex h-4 w-4 items-center justify-center">
								{/* <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    opacity="0.12"
                    d="M2 5.86663C2 4.74652 2 4.18647 2.21799 3.75864C2.40973 3.38232 2.71569 3.07636 3.09202 2.88461C3.51984 2.66663 4.0799 2.66663 5.2 2.66663H10.8C11.9201 2.66663 12.4802 2.66663 12.908 2.88461C13.2843 3.07636 13.5903 3.38232 13.782 3.75864C14 4.18647 14 4.74652 14 5.86663V6.66663H2V5.86663Z"
                    fill="black"
                    fillOpacity="0.91"
                  />
                  <path
                    d="M14 6.66671H2M10.6667 1.33337V4.00004M5.33333 1.33337V4.00004M5.2 14.6667H10.8C11.9201 14.6667 12.4802 14.6667 12.908 14.4487C13.2843 14.257 13.5903 13.951 13.782 13.5747C14 13.1469 14 12.5868 14 11.4667V5.86671C14 4.7466 14 4.18655 13.782 3.75873C13.5903 3.3824 13.2843 3.07644 12.908 2.88469C12.4802 2.66671 11.9201 2.66671 10.8 2.66671H5.2C4.0799 2.66671 3.51984 2.66671 3.09202 2.88469C2.71569 3.07644 2.40973 3.3824 2.21799 3.75873C2 4.18655 2 4.7466 2 5.86671V11.4667C2 12.5868 2 13.1469 2.21799 13.5747C2.40973 13.951 2.71569 14.257 3.09202 14.4487C3.51984 14.6667 4.0799 14.6667 5.2 14.6667Z"
                    stroke="black"
                    strokeOpacity="0.91"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg> */}
								{item?.icon}
							</figure>
							<Radio
								// className="mr-1 h-4 w-4 border-gray-300 text-indigo-600 transition-all duration-200 ease-in-out focus:ring-indigo-500"
								checked={isRadioSelected}
								onChange={(event) =>
									onChange((event.target as HTMLInputElement).value)
								}
								ref={isRadioSelected ? initialRadioRef : null}
								value={item?.value}
							/>
							{item?.label}
						</div>
						{isRadioSelected && (
							<figure>
								<TickIcon />
							</figure>
						)}
					</label>
				);
			})}
		</AriaRadioGroup>
	);
};

RadioGroup.displayName = "RadioGroup";

export default RadioGroup;
