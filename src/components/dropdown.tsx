import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";

import OptionsIconGray from "../icons/optionsIconGray";
import { tcm } from "../utils/tailwindMerge";

import Button from "./atoms/button";

type DropdownProps = {
	buttonClassExtension?: string;
	menuClassName: string;
	onOptionClick: (value: number | string) => void;
	options: Array<{ label: string; value: number | string }>;
	renderRightItems?: () => JSX.Element;
};

const Dropdown = (props: DropdownProps) => {
	const {
		menuClassName = "",
		options,
		onOptionClick,
		buttonClassExtension = "",
		renderRightItems = () => <div />,
	} = props;

	const menuClass = tcm(
		"origin-top-left right-0 absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 focus:outline-none",
		menuClassName,
	);

	return (
		<Menu as="div" className="relative shrink-0">
			{({ open }) => (
				<div>
					<div className="flex">
						<Menu.Button as="div">
							<Button
								className={`-mx-2 bg-black/[0.004]  py-0 hover:bg-black/[0.004] ${
									!open ? buttonClassExtension : ""
								}`}
								type="light"
							>
								<figure className="h-3 w-3">
									<OptionsIconGray />
								</figure>
							</Button>
						</Menu.Button>
						<Transition
							as={Fragment}
							enter="transition ease-out duration-100"
							enterFrom="transform opacity-0 scale-95"
							enterTo="transform opacity-100 scale-100"
							leave="transition ease-in duration-75"
							leaveFrom="transform opacity-100 scale-100"
							leaveTo="transform opacity-0 scale-95"
						>
							<Menu.Items className={menuClass}>
								{options?.map((item) => (
									<Menu.Item key={item?.value}>
										{({ active }) => (
											<div
												className={` cursor-pointer ${clsx(
													active ? "bg-gray-100" : "",
													"block px-4 py-2 text-sm text-gray-700",
												)}`}
												onClick={(event) => {
													event.preventDefault();
													onOptionClick(item?.value);
												}}
												onKeyDown={() => {}}
												role="button"
												tabIndex={0}
											>
												{item?.label}
											</div>
										)}
									</Menu.Item>
								))}
							</Menu.Items>
						</Transition>
					</div>
					{!open && renderRightItems()}
				</div>
			)}
		</Menu>
	);
};

export default Dropdown;
