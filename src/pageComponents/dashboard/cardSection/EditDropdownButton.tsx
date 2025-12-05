import { find } from "lodash";

import { EditDropdownContent } from "./EditDropdownContent";
import useAddTagToBookmarkMutation from "@/async/mutationHooks/tags/useAddTagToBookmarkMutation";
import useCreateAndAssignTagMutation from "@/async/mutationHooks/tags/useCreateAndAssignTagMutation";
import useRemoveTagFromBookmarkMutation from "@/async/mutationHooks/tags/useRemoveTagFromBookmarkMutation";
import { AriaDropdown, AriaDropdownMenu } from "@/components/ariaDropdown";
import EditIcon from "@/icons/editIcon";
import { type BookmarksTagData, type SingleListData } from "@/types/apiTypes";
import { mutationApiCall } from "@/utils/apiHelpers";
import { handleClientError } from "@/utils/error-utils/client";

export const EditDropdownButton = ({
	isMenuOpen,
	iconBgClassName,
	isPublicPage,
	setOpenedMenuId,
	post,
	onCategoryChange,
	onCreateNewCategory,
	bookmarksList,
	isCategoryChangeLoading,
	userId,
}: {
	isMenuOpen: boolean;
	iconBgClassName: string;
	isPublicPage: boolean;
	setOpenedMenuId: (id: number | null) => void;
	post: SingleListData;
	onCategoryChange: (bookmark_ids: number[], category_id: number) => void;
	onCreateNewCategory: (category: {
		label: string;
		value: string | number;
	}) => Promise<void>;
	bookmarksList: SingleListData[];
	isCategoryChangeLoading: boolean;
	userId: string;
}) => {
	const { addTagToBookmarkMutation } = useAddTagToBookmarkMutation();
	const { createAndAssignTagMutation } = useCreateAndAssignTagMutation();
	const { removeTagFromBookmarkMutation } = useRemoveTagFromBookmarkMutation();

	return (
		<div className="relative">
			<AriaDropdown
				isOpen={isMenuOpen}
				menuButton={
					<div
						className={`${iconBgClassName} ${!isPublicPage ? (window?.Cypress ? "flex" : isMenuOpen ? "flex" : "hidden") : "hidden"} ${isMenuOpen ? "bg-gray-100" : ""}`}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							setOpenedMenuId(isMenuOpen ? null : post.id);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								event.stopPropagation();
								setOpenedMenuId(isMenuOpen ? null : post.id);
							}
						}}
						onPointerDown={(event) => {
							event.stopPropagation();
						}}
						role="button"
						tabIndex={0}
					>
						<figure className="text-gray-1000">
							<EditIcon />
						</figure>
					</div>
				}
				// Use relative positioning to keep menu anchored to button
				menuClassName="absolute top-full left-0 z-10  mt-1 bg-gray-50 shadow-custom-3 rounded-md focus:outline-none p-2 dropdown-content"
				menuOpenToggle={(isOpen) => {
					setOpenedMenuId(isOpen ? post.id : null);
				}}
			>
				{isMenuOpen ? (
					<AriaDropdownMenu
						className="dropdown-content"
						onClick={(event: React.MouseEvent) => {
							event.stopPropagation();
							event.preventDefault();
						}}
					>
						<EditDropdownContent
							post={post}
							onCategoryChange={async (value) => {
								if (value) {
									onCategoryChange([post.id], Number(value.value));
								}
							}}
							onCreateCategory={async (value) => {
								if (value) {
									await onCreateNewCategory(value);
								}
							}}
							addExistingTag={async (tag) => {
								const tagValue = tag[tag.length - 1]?.value;
								if (!tagValue) {
									return;
								}

								const bookmarkTagsData = {
									bookmark_id: post.id,
									tag_id: Number.parseInt(String(tagValue), 10),
								} as unknown as BookmarksTagData;

								await mutationApiCall(
									addTagToBookmarkMutation.mutateAsync({
										selectedData: bookmarkTagsData,
									}),
								);
							}}
							removeExistingTag={async (tag) => {
								const delValue = tag.value;
								const currentBookark = find(
									bookmarksList,
									(item) => item?.id === post?.id,
								);
								if (!currentBookark) {
									handleClientError("Bookmark not found in bookmarksList");
									return;
								}

								const delData = find(
									currentBookark?.addedTags,
									(item) => item?.id === delValue || item?.name === delValue,
								);

								if (!delData) {
									handleClientError("Tag not found in bookmark tags");
									return;
								}

								await mutationApiCall(
									removeTagFromBookmarkMutation.mutateAsync({
										selectedData: {
											tag_id: delData.id as number,
											bookmark_id: currentBookark.id,
										},
									}),
								);
							}}
							createTag={async (tagData) => {
								try {
									const newTagLabel = tagData[tagData.length - 1]?.label;
									if (!newTagLabel) {
										handleClientError("Invalid tag data: missing label");
										return;
									}

									// Optimistic mutation - UI updates instantly
									await mutationApiCall(
										createAndAssignTagMutation.mutateAsync({
											tagName: newTagLabel,
											bookmarkId: post.id,
										}),
									);
								} catch (error) {
									handleClientError(error, "Failed to create tag");
								}
							}}
							addedTags={post.addedTags}
							isCategoryChangeLoading={isCategoryChangeLoading}
							userId={userId}
						/>
					</AriaDropdownMenu>
				) : null}
			</AriaDropdown>
		</div>
	);
};
