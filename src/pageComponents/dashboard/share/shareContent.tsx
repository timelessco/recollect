import { useEffect, useState } from "react";
import { TrashIcon } from "@heroicons/react/20/solid";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { find, isEmpty, isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import { useUpdateCategoryOptimisticMutation } from "../../../async/mutationHooks/category/use-update-category-optimistic-mutation";
import useDeleteSharedCategoriesUserMutation from "../../../async/mutationHooks/share/useDeleteSharedCategoriesUserMutation";
import useSendCollaborationEmailInviteMutation from "../../../async/mutationHooks/share/useSendCollaborationEmailInviteMutation";
import useUpdateSharedCategoriesUserAccessMutation from "../../../async/mutationHooks/share/useUpdateSharedCategoriesUserAccessMutation";
import useGetUserProfilePic from "../../../async/queryHooks/user/useGetUserProfilePic";
import AriaSelect from "../../../components/ariaSelect";
import Input from "../../../components/atoms/input";
import { Spinner } from "../../../components/spinner";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import DownArrowGray from "../../../icons/downArrowGray";
import GlobeIcon from "../../../icons/globeIcon";
import LinkIcon from "../../../icons/linkIcon";
import DefaultUserIcon from "../../../icons/user/defaultUserIcon";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type CategoriesData,
	type CollabDataInCategory,
} from "../../../types/apiTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { CATEGORIES_KEY, EMAIL_CHECK_PATTERN } from "../../../utils/constants";
import { errorToast, successToast } from "../../../utils/toastMessages";

const rightTextStyles = "text-13 font-medium leading-[15px] text-gray-600";

const AccessUserInfo = (props: {
	isLoggedinUserTheOwner: boolean;
	item: CollabDataInCategory;
}) => {
	const { item, isLoggedinUserTheOwner } = props;

	const { updateSharedCategoriesUserAccessMutation } =
		useUpdateSharedCategoriesUserAccessMutation();

	const { deleteSharedCategoriesUserMutation } =
		useDeleteSharedCategoriesUserMutation();

	const renderRightContent = () => {
		if (item.is_accept_pending) {
			return (
				<div className="flex items-center space-x-1">
					<p className={rightTextStyles}>pending</p>
					{isLoggedinUserTheOwner && (
						<figure>
							<TrashIcon
								className="h-4 w-4 cursor-pointer text-red-400 hover:text-red-600"
								onClick={() => {
									if (isLoggedinUserTheOwner) {
										void mutationApiCall(
											deleteSharedCategoriesUserMutation.mutateAsync({
												id: item.share_id as number,
											}),
										);
									} else {
										errorToast(
											"You cannot perform this action as you are not the owner of this collection",
										);
									}
								}}
							/>
						</figure>
					)}
				</div>
			);
		}

		const renderSelectOption = () => {
			if (isLoggedinUserTheOwner) {
				return (
					<AriaSelect
						defaultValue={item.edit_access ? "Editor" : "Viewer"}
						onOptionClick={async (value) => {
							if (value !== "No Access") {
								const response = (await mutationApiCall(
									updateSharedCategoriesUserAccessMutation.mutateAsync({
										id: item.share_id as number,
										updateData: {
											edit_access: Boolean(
												Number.parseInt(value === "Editor" ? "1" : "0", 10),
											),
										},
									}),
								)) as { error: Error };

								if (isNull(response?.error)) {
									successToast("User role changed");
								}
							} else {
								void mutationApiCall(
									deleteSharedCategoriesUserMutation.mutateAsync({
										id: item.share_id as number,
									}),
								);
							}
						}}
						options={[
							{ label: "Editor", value: "Editor" },
							{ label: "Viewer", value: "Viewer" },
							{ label: "No Access", value: "No Access" },
						]}
						renderCustomSelectButton={() => (
							<div className="flex items-center">
								<p className="mr-1 text-gray-800">
									{item.edit_access ? "Editor" : "Viewer"}
								</p>
								<figure>
									<DownArrowGray />
								</figure>
							</div>
						)}
					/>
				);
			} else {
				return (
					<div className={rightTextStyles}>
						{item.edit_access ? "Editor" : "Viewer"}
					</div>
				);
			}
		};

		return (
			<>
				{item.isOwner ? (
					<p className={rightTextStyles}>Owner</p>
				) : (
					renderSelectOption()
				)}
			</>
		);
	};

	const { userProfilePicData } = useGetUserProfilePic(item?.userEmail);

	return (
		<div className="flex items-center justify-between px-2 py-[5px]">
			<div className="flex items-center justify-between">
				{!isNull(userProfilePicData?.data) &&
				userProfilePicData?.data[0]?.profile_pic ? (
					// disabling as we dont know the src origin url of the img
					// eslint-disable-next-line @next/next/no-img-element
					<img
						alt="profile-pic"
						className="mr-1 h-5 w-5 rounded-full object-cover"
						src={userProfilePicData?.data[0]?.profile_pic}
					/>
				) : (
					<DefaultUserIcon className="h-5 w-5" />
				)}
				<p className="ml-[6px] w-[171px] truncate text-13 leading-[15px] font-450 text-gray-800">
					{item.userEmail}
				</p>
			</div>
			<div>{renderRightContent()}</div>
		</div>
	);
};

type EmailInput = {
	email: string;
};

type ShareContentProps = {
	categoryId?: string | number | null;
};

const ShareContent = (props: ShareContentProps) => {
	const [publicUrl, setPublicUrl] = useState("");
	const [linkCopied, setLinkCopied] = useState(false);
	const [inviteUserEditAccess, setInviteUserEditAccess] = useState(false);

	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: currentCategoryId } = useGetCurrentCategoryId();

	const shareCategoryId = useMiscellaneousStore(
		(state) => state.shareCategoryId,
	);
	// Priority: props.categoryId > shareCategoryId > currentCategoryId
	const dynamicCategoryId =
		props.categoryId ?? shareCategoryId ?? currentCategoryId;

	const { updateCategoryOptimisticMutation } = useUpdateCategoryOptimisticMutation();

	const { sendCollaborationEmailInviteMutation } =
		useSendCollaborationEmailInviteMutation();

	useEffect(() => {
		if (typeof window !== "undefined") {
			const categorySlug = currentCategory?.category_slug as string;
			const userName = currentCategory?.user_id?.user_name;
			const url = `${window?.location?.origin}/public/${userName}/${categorySlug}`;
			setPublicUrl(url);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user?.id, dynamicCategoryId]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<EmailInput>();

	// this resets all the state
	useEffect(() => {
		setInviteUserEditAccess(false);
		setLinkCopied(false);
		reset({ email: "" });
	}, [reset]);

	const onSubmit: SubmitHandler<EmailInput> = async (data) => {
		const emailList = data?.email?.split(",");
		try {
			const email = emailList[0];

			const isEmailExist = find(
				currentCategory?.collabData,
				(item) => item?.userEmail === email,
			);

			if (!isEmailExist) {
				await mutationApiCall(
					sendCollaborationEmailInviteMutation.mutateAsync({
						emailList,
						edit_access: inviteUserEditAccess,
						category_id: dynamicCategoryId as number,
						hostUrl: window?.location?.origin,
					}),
				);

				reset({ email: "" });
				successToast("Invite sent");
			} else {
				errorToast("This email is already a collaborator");
			}
		} catch {
			errorToast("Something went wrong");
		}
	};

	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const currentCategory = find(
		categoryData?.data,
		(item) => item?.id === dynamicCategoryId,
	);

	const isUserTheCategoryOwner =
		currentCategory?.user_id?.id === session?.user?.id;

	const inputClassName = classNames({
		"rounded-none bg-transparent text-sm leading-4 shadow-none outline-none text-gray-800 placeholder:text-gray-alpha-600": true,
		"cursor-not-allowed": !isUserTheCategoryOwner,
	});

	return (
		<div>
			{!isUserTheCategoryOwner && (
				<p className="p-2 text-xs text-red-600">
					Actions cannot be performed as you are not the collection owner
				</p>
			)}
			<form onSubmit={handleSubmit(onSubmit)}>
				<Input
					{...register("email", {
						required: true,
						pattern: EMAIL_CHECK_PATTERN,
					})}
					className={inputClassName}
					errorClassName="ml-2"
					errorIconClassName="right-[48px]"
					errorText={errors.email ? "Enter valid email" : ""}
					isDisabled={!isUserTheCategoryOwner}
					isError={!isEmpty(errors)}
					placeholder="Enter emails or names"
					rendedRightSideElement={
						sendCollaborationEmailInviteMutation?.isPending ? (
							<Spinner
								className="h-3 w-3 animate-spin"
								style={{ color: "var(--color-plain-reverse)" }}
							/>
						) : (
							<AriaSelect
								defaultValue="View"
								disabled={!isUserTheCategoryOwner}
								onOptionClick={(value) =>
									setInviteUserEditAccess(value === "Editor")
								}
								options={[
									{ label: "Editor", value: "Editor" },
									{ label: "View", value: "View" },
								]}
								// disabled
								renderCustomSelectButton={() => (
									<div className="flex items-center text-gray-alpha-600">
										<p className="mr-1">
											{inviteUserEditAccess ? "Editor" : "View"}
										</p>
										<figure>
											<DownArrowGray />
										</figure>
									</div>
								)}
							/>
						)
					}
					wrapperClassName="py-[7px] px-[10px] bg-gray-alpha-100 rounded-lg flex items-center justify-between relative"
				/>
			</form>
			<div className="pt-3">
				<p className="px-2 py-[6px] text-xs leading-[14px] font-450 text-gray-500">
					People with access
				</p>
				<div className="pb-2">
					{currentCategory?.collabData
						?.slice()
						.toSorted((a, b) => {
							// Move owner to the top
							if (a.isOwner) {
								return -1;
							}

							if (b.isOwner) {
								return 1;
							}

							return 0;
						})
						.map((item) => (
							<AccessUserInfo
								isLoggedinUserTheOwner={isUserTheCategoryOwner}
								item={item}
								key={item.userEmail}
							/>
						))}
				</div>
				<div className="mx-2 flex items-end justify-between border-y py-[15.5px]">
					<div className="flex items-center">
						<figure className="text-gray-1000">
							<GlobeIcon />
						</figure>
						<p className="ml-[6px] text-13 leading-[15px] font-450 text-gray-800">
							Anyone with link
						</p>
					</div>
					{isUserTheCategoryOwner ? (
						<AriaSelect
							defaultValue={
								currentCategory?.is_public ? "View access" : "No access"
							}
							onOptionClick={(value) => {
								if (typeof dynamicCategoryId !== "number") {
									return;
								}

								updateCategoryOptimisticMutation.mutate(
									{
										category_id: dynamicCategoryId,
										updateData: {
											is_public: value === "View access",
										},
									},
									{
										onSuccess: () => {
											setLinkCopied(false);
										},
									},
								);
							}}
							options={[
								{ label: "View access", value: "View access" },
								{ label: "No access", value: "No access" },
							]}
							renderCustomSelectButton={() => (
								<div className="flex items-center">
									<p className="mr-1 text-gray-800">
										{currentCategory?.is_public ? "View access" : "No access"}
									</p>
									<figure className="text-gray-500">
										<DownArrowGray />
									</figure>
								</div>
							)}
						/>
					) : (
						<div className={rightTextStyles}>
							{currentCategory?.is_public ? "View access" : "No access"}
						</div>
					)}
				</div>
				<div
					className={`flex items-center p-2 ${
						currentCategory?.is_public
							? "cursor-pointer"
							: "cursor-not-allowed opacity-50"
					}`}
					onClick={() => {
						if (currentCategory?.is_public) {
							void navigator.clipboard.writeText(publicUrl);
							setLinkCopied(true);
						}
					}}
					onKeyDown={() => {}}
					role="button"
					tabIndex={0}
				>
					<figure className="text-gray-1000">
						<LinkIcon />
					</figure>
					<p className="ml-[6px] text-13 leading-[15px] font-450 text-[#007bf4e5]">
						{linkCopied ? "Link copied" : "Copy link"}
					</p>
				</div>
			</div>
		</div>
	);
};

export default ShareContent;
