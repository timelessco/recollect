import { useEffect, useState } from "react";
import isEmpty from "lodash/isEmpty";

import { useUpdateCategoryOptimisticMutation } from "../../../async/mutationHooks/category/use-update-category-optimistic-mutation";
import ToolTip from "../../../components/tooltip";
import GlobeIcon from "../../../icons/globeIcon";
import UsersCollabIcon from "../../../icons/usersCollabIcon";
import { type CategoriesData } from "../../../types/apiTypes";

type NavBarHeadingProps = {
	currentCategoryData: CategoriesData | undefined;
	headerName: string | undefined;
	triggerEdit?: boolean;
};

export const NavBarHeading = (props: NavBarHeadingProps) => {
	const { currentCategoryData, headerName, triggerEdit } = props;

	const [showHeadingInput, setShowHeadingInput] = useState(false);
	const [headingInputValue, setHeadingInputValue] = useState(headerName ?? "");

	useEffect(() => {
		if (headerName) {
			setHeadingInputValue(headerName);
		}
	}, [headerName]);

	useEffect(() => {
		if (triggerEdit) {
			setShowHeadingInput(true);
		}
	}, [triggerEdit]);

	const handleEditMode = () => {
		if (currentCategoryData) {
			setShowHeadingInput(true);
		}

		if (headerName) {
			setHeadingInputValue(headerName);
		}
	};

	if (!showHeadingInput) {
		return (
			<>
				<div
					className="truncate text-xl font-semibold text-gray-950"
					onClick={(event) => {
						event.preventDefault();
						if (event.detail === 2) {
							handleEditMode();
						}
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							handleEditMode();
						}
					}}
					role="button"
					tabIndex={currentCategoryData ? 0 : -1}
				>
					{headingInputValue}
				</div>

				<CollectionStatusIcons currentCategoryData={currentCategoryData} />
			</>
		);
	}

	return (
		<NavBarHeadingInput
			currentCategoryData={currentCategoryData}
			headingInputValue={headingInputValue}
			setHeadingInputValue={setHeadingInputValue}
			setShowHeadingInput={setShowHeadingInput}
		/>
	);
};

type NavBarHeadingInputProps = {
	currentCategoryData: CategoriesData | undefined;
	headingInputValue: string;
	setHeadingInputValue: (value: string) => void;
	setShowHeadingInput: (value: boolean) => void;
};

const NavBarHeadingInput = (props: NavBarHeadingInputProps) => {
	const {
		currentCategoryData,
		headingInputValue,
		setHeadingInputValue,
		setShowHeadingInput,
	} = props;

	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();

	const updateCategoryName = (categoryId: number, name: string) => {
		updateCategoryOptimisticMutation.mutate({
			category_id: categoryId,
			updateData: {
				category_name: name,
			},
		});
	};

	const handleSave = () => {
		setShowHeadingInput(false);

		if (
			currentCategoryData?.id &&
			!isEmpty(headingInputValue) &&
			headingInputValue !== currentCategoryData?.category_name
		) {
			updateCategoryName(currentCategoryData?.id, headingInputValue);
		}
	};

	return (
		<input
			type="text"
			name="category-name"
			className="m-0 h-[28px] rounded-none border-none bg-gray-0 p-0 text-xl leading-[16px] font-semibold text-gray-900 focus:outline-hidden"
			onBlur={handleSave}
			onChange={(event) => {
				setHeadingInputValue(event.target.value);
			}}
			autoFocus
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					handleSave();
				}
			}}
			placeholder="Enter name"
			onFocus={(event) => event.target.select()}
			value={headingInputValue}
		/>
	);
};

type CollectionStatusIconsProps = {
	currentCategoryData: CategoriesData | undefined;
};

const CollectionStatusIcons = (props: CollectionStatusIconsProps) => {
	const { currentCategoryData } = props;

	const showPublicIcon = currentCategoryData?.is_public;
	const showSharedIcon =
		currentCategoryData?.collabData &&
		currentCategoryData?.collabData?.length > 1;

	if (!showPublicIcon && !showSharedIcon) {
		return null;
	}

	return (
		<div className="ml-2 flex space-x-2">
			{showPublicIcon && (
				<ToolTip toolTipContent="Public collection">
					<figure className="text-gray-1000">
						<GlobeIcon />
					</figure>
				</ToolTip>
			)}
			{showSharedIcon && (
				<ToolTip toolTipContent="Shared collection">
					<figure className="text-gray-1000">
						<UsersCollabIcon />
					</figure>
				</ToolTip>
			)}
		</div>
	);
};
