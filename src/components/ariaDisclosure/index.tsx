import {
	Disclosure,
	DisclosureContent,
	DisclosureProvider,
} from "@ariakit/react";

import { type ChildrenTypes } from "../../types/componentTypes";

type AriaDisclosureTypes = {
	children: ChildrenTypes;
	renderDisclosureButton: ChildrenTypes;
};

const AriaDisclosure = ({
	renderDisclosureButton,
	children,
}: AriaDisclosureTypes) => (
	<DisclosureProvider defaultOpen>
		{/* // eslint-disable-next-line tailwindcss/no-custom-classname */}
		<Disclosure className="aria-disclosure-button w-full">
			{renderDisclosureButton}
		</Disclosure>
		<DisclosureContent>{children}</DisclosureContent>
	</DisclosureProvider>
);

export default AriaDisclosure;
