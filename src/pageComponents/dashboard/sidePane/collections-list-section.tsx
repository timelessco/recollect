import { useState, type ReactNode } from "react";
import router from "next/router";
import { isNull } from "lodash";

import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import AddCategoryIcon from "../../../icons/addCategoryIcon";
import DownArrowGray from "../../../icons/downArrowGray";
import OptionsIcon from "../../../icons/optionsIcon";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";

import { CollectionsListSkeleton } from "./collectionLIstSkeleton";
import { useAddCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-optimistic-mutation";
import useFetchUserProfile from "@/async/queryHooks/user/useFetchUserProfile";
import { Collapsible } from "@/components/ui/recollect/collapsible";
import { useIsMobileView } from "@/hooks/useIsMobileView";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import {
	MAX_TAG_COLLECTION_NAME_LENGTH,
	MIN_TAG_COLLECTION_NAME_LENGTH,
} from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";

type CollectionsListSectionHeaderProps = {
	onAddCollectionClick: () => void;
};
type CollectionsListSectionProps = {
	children: ReactNode;
	isLoading: boolean;
};

export function CollectionsListSection({
	children,
	isLoading,
}: CollectionsListSectionProps) {
	const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

	return (
		<Collapsible.Root>
			<Collapsible.Trigger>
				<CollectionsListSectionHeader
					onAddCollectionClick={() => setShowAddCategoryInput(true)}
				/>
			</Collapsible.Trigger>
			<Collapsible.Panel>
				<div id="collections-wrapper">
					{isLoading ? <CollectionsListSkeleton /> : children}
				</div>
				<AddCategoryInput
					onClose={() => setShowAddCategoryInput(false)}
					show={showAddCategoryInput}
				/>
				<div
					className="mt-1 flex cursor-pointer items-center rounded-lg px-2 py-[6px] hover:bg-gray-100"
					id="add-category-button"
					onClick={() => setShowAddCategoryInput(true)}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							setShowAddCategoryInput(true);
						}
					}}
					role="button"
					tabIndex={0}
				>
					<figure className="text-gray-500">
						<AddCategoryIcon />
					</figure>
					<p className="ml-2 flex-1 truncate text-sm leading-[16px] font-450 text-gray-600">
						Add Collection
					</p>
				</div>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}

function CollectionsListSectionHeader({
	onAddCollectionClick,
}: CollectionsListSectionHeaderProps) {
	const { isDesktop } = useIsMobileView();
	const [isCollectionHeaderMenuOpen, setIsCollectionHeaderMenuOpen] =
		useState(false);

	return (
		<div className="group flex w-full items-center justify-between px-1 py-[7px]">
			<div className="flex items-center text-13 leading-[14.95px] font-medium tracking-[0.02em] text-gray-600">
				<p className="mr-1">Collections</p>
				<DownArrowGray
					className="collections-sidepane-down-arrow hidden pt-px text-gray-500 group-hover:block"
					size={10}
				/>
			</div>
			<AriaDropdown
				menuButton={
					<div
						className={
							isCollectionHeaderMenuOpen
								? "block text-gray-500"
								: "hidden text-gray-500 group-hover:block"
						}
					>
						<OptionsIcon />
					</div>
				}
				menuButtonClassName="h-4 w-4"
				menuClassName={`${dropdownMenuClassName} z-10`}
				menuOpenToggle={setIsCollectionHeaderMenuOpen}
				onButtonClick={(event) => event?.stopPropagation()}
				portalElement={
					!isDesktop
						? () => {
								if (typeof document === "undefined") {
									return null;
								}

								return document.querySelector("#side-pane-dropdown-portal");
							}
						: undefined
				}
			>
				{[{ label: "Add Collection", value: "add-category" }]?.map((item) => (
					<AriaDropdownMenu
						key={item?.value}
						onClick={() => {
							if (item?.value === "add-category") {
								onAddCollectionClick();
							}
						}}
					>
						<div className={`text-justify ${dropdownMenuItemClassName}`}>
							{item?.label}
						</div>
					</AriaDropdownMenu>
				))}
			</AriaDropdown>
		</div>
	);
}

type AddCategoryInputProps = {
	onClose: () => void;
	show: boolean;
};

function AddCategoryInput({ onClose, show }: AddCategoryInputProps) {
	const { userProfileData } = useFetchUserProfile();
	const { addCategoryOptimisticMutation } = useAddCategoryOptimisticMutation();

	const handleAddNewCategory = async (newCategoryName: string) => {
		const result = tagCategoryNameSchema.safeParse(newCategoryName);

		if (!result.success) {
			handleClientError(
				new Error(result.error.issues[0]?.message ?? "Invalid collection name"),
				`Collection name must be between ${MIN_TAG_COLLECTION_NAME_LENGTH} and ${MAX_TAG_COLLECTION_NAME_LENGTH} characters`,
			);
			return;
		}

		if (userProfileData && !isNull(userProfileData.data)) {
			addCategoryOptimisticMutation.mutate(
				{
					name: result.data,
					category_order: (
						userProfileData.data[0]?.category_order ?? []
					).filter((id): id is number => id !== null),
				},
				{
					onSuccess: (data) => {
						void router.push(`/${data[0].category_slug}`);
					},
				},
			);
		}
	};

	if (!show) {
		return null;
	}

	return (
		<div className="mt-1 flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 px-2 py-[6px]">
			<div className="flex items-center">
				<figure className="mr-2 h-[18px] w-[18px]">
					<svg
						fill="var(--color-plain-reverse)"
						height="16"
						viewBox="0 0 18 18"
						width="16"
					>
						<use href="/sprite.svg#star-04" />
					</svg>
				</figure>
				<input
					autoFocus
					className="bg-black/[0.004]! text-sm! leading-4! font-450! text-plain-reverse! opacity-40! placeholder:text-plain-reverse focus:ring-0! focus:ring-offset-0! focus:outline-hidden!"
					id="add-category-input"
					onBlur={async (event) => {
						const inputValue = (event.target as HTMLInputElement)?.value;
						if (inputValue) {
							await handleAddNewCategory(inputValue);
						}

						onClose();
					}}
					onKeyUp={async (event) => {
						if (event.key === "Enter") {
							const inputValue = (event.target as HTMLInputElement)?.value;

							if (inputValue) {
								await handleAddNewCategory(inputValue);
							}

							onClose();
						}
					}}
					placeholder="Collection Name"
				/>
			</div>
		</div>
	);
}
