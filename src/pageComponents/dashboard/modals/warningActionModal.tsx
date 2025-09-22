import React from "react";

import Button from "../../../components/atoms/button";
import Modal from "../../../components/modal";
import { SearchLoader } from "../../../components/search-loader";

type WarningActionModalTypes = {
	buttonText: string;
	isLoading?: boolean;
	onContinueCick: () => void;
	open: boolean;
	setOpen: () => void;
	warningText: string;
};

const WarningActionModal = (props: WarningActionModalTypes) => {
	const {
		warningText,
		buttonText,
		onContinueCick,
		isLoading = false,
		open,
		setOpen,
	} = props;

	return (
		<Modal open={open} setOpen={setOpen}>
			<div className=" p-4">
				{!isLoading ? (
					<>
						<p className="pb-7">{warningText}</p>
						<Button
							className="flex w-full justify-center bg-red-700 py-3 text-center text-white hover:bg-red-900"
							id="warning-button"
							onClick={() => onContinueCick()}
							type="dark"
						>
							{buttonText}
						</Button>
					</>
				) : (
					<div className="flex justify-center">
						<SearchLoader className="h-3 w-3 animate-spin" />
					</div>
				)}
			</div>
		</Modal>
	);
};

export default WarningActionModal;
